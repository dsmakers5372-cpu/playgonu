// A Durable Object instance per online-battle room. The first player to
// connect configures the room (game type, ruleset, public/private); the
// second becomes their opponent; anyone after that joins read-only as a
// spectator. Reuses the exact same engine modules the local/AI games use —
// `move(state, from, to)` has the same signature everywhere in this
// project, so this adapter needs no per-game special-casing.
import * as chamgonu from '../engine/chamgonu.js';
import * as gomoku from '../engine/gomoku.js';
import * as chamgonuAI from '../engine/chamgonuAI.js';
import * as gomokuAI from '../engine/gomokuAI.js';
import { getVirtualPlayer, VIRTUAL_PLAYERS } from './virtualPlayers.js';
import { botChatReply, botGameOverLine, isKorean } from './botChat.js';

const ENGINES = { cham: chamgonu, gomoku };
const AI = { cham: chamgonuAI, gomoku: gomokuAI };
const MAX_PLAYERS = 2;
const BOT_MOVE_DELAY_MS = [450, 950]; // feels like a person thinking, not an instant server reply
// When the bot opens a game (it moves first after colors swap on a rematch),
// give the player a moment to see the fresh board before the first stone lands.
const BOT_FIRST_MOVE_DELAY_MS = [2000, 3000];
const ROOM_IDLE_LIMIT_MS = 30 * 60 * 1000; // storage alarm cleans up long-abandoned rooms
const CHAT_MAX_LEN = 200;
// A public room nobody joins within this long gets a master-level virtual
// opponent, so creating a room never means waiting indefinitely.
const AUTO_OPPONENT_MS = 30 * 1000;
// AI-vs-AI "watch" rooms (the lobby's virtual games in progress) only run
// while someone is watching, at a pace a spectator can follow, and start a
// new game a few seconds after one ends.
const WATCH_MOVE_DELAY_MS = [3000, 6000];
// Now and then a watched player stops to think, like people do on a hard move.
const WATCH_LONG_THINK_CHANCE = 0.2;
const WATCH_LONG_THINK_EXTRA_MS = [3000, 5000];
const WATCH_RESTART_MS = 6000;
const WATCH_DIFFICULTY = 'hard';
const LISTING_HEARTBEAT_MS = 60 * 1000; // keeps a public room's lobby entry from going stale (Lobby STALE_MS)

function freshEngineState(gameType, ruleset) {
  const engine = ENGINES[gameType];
  return gameType === 'gomoku'
    ? engine.createInitialState({ ruleset: ruleset === 'renju' ? 'renju' : 'freestyle' })
    : engine.createInitialState();
}

// A watch room should look like a game that was already under way when the
// spectator walked in, so it starts from a short AI-played opening.
function simulatedOpening(gameType, ruleset) {
  const engine = ENGINES[gameType];
  const ai = AI[gameType];
  for (let attempt = 0; attempt < 5; attempt++) {
    let state = freshEngineState(gameType, ruleset);
    const plies = (gameType === 'gomoku' ? 8 : 10) + Math.floor(Math.random() * 8);
    for (let i = 0; i < plies && !state.winner; i++) {
      const m = ai.chooseAIMove(state, { difficulty: 'normal' });
      if (!m) break;
      state = engine.move(state, m.from ?? null, m.to);
    }
    if (!state.winner) return state;
  }
  return freshEngineState(gameType, ruleset);
}

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sockets = new Map(); // ws -> { id, role: 'player' | 'spectator', color?, name }
    this.room = null;
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.attach(server);
    await this.state.storage.setAlarm(Date.now() + ROOM_IDLE_LIMIT_MS);
    return new Response(null, { status: 101, webSocket: client });
  }

  async alarm() {
    // No one reconnected in time — let this Durable Object instance go away.
    for (const [ws] of this.sockets) {
      try { ws.close(1000, 'room expired'); } catch { /* already gone */ }
    }
    this.sockets.clear();
    if (this.room) await this.setLobbyListing(false);
  }

  attach(ws) {
    const connId = crypto.randomUUID();
    ws.addEventListener('message', (evt) => this.onMessage(ws, connId, evt));
    ws.addEventListener('close', () => this.onClose(ws));
    ws.addEventListener('error', () => this.onClose(ws));
  }

  send(ws, data) {
    try { ws.send(JSON.stringify(data)); } catch { /* socket already closing */ }
  }

  broadcast(data, exclude) {
    const payload = JSON.stringify(data);
    for (const [ws] of this.sockets) {
      if (ws === exclude) continue;
      try { ws.send(payload); } catch { /* socket already closing */ }
    }
  }

  async onMessage(ws, connId, evt) {
    let msg;
    try { msg = JSON.parse(evt.data); } catch { return; }

    if (msg.type === 'join') {
      await this.handleJoin(ws, connId, msg);
      return;
    }
    const conn = this.sockets.get(ws);
    if (!conn) return;
    if (msg.type === 'move') await this.handleMove(ws, conn, msg);
    else if (msg.type === 'chat') this.handleChat(conn, msg);
    else if (msg.type === 'rematch') await this.handleRematch(ws, conn);
    else if (msg.type === 'leave') ws.close(1000, 'left');
  }

  async handleJoin(ws, connId, msg) {
    const name = String(msg.name || 'Player').slice(0, 24);
    const roomId = String(msg.roomId || '').slice(0, 64);
    if (!roomId) return this.send(ws, { type: 'error', message: 'Missing room id' });

    if (!this.room && roomId.startsWith('vpm-')) {
      this.createWatchRoom(roomId, msg);
    }
    // Someone trying to watch a room that's gone must not end up hosting a
    // brand-new empty room under its id.
    if (!this.room && msg.spectate) {
      this.send(ws, { type: 'error', code: 'room-gone', message: 'This game has already ended' });
      ws.close(1000, 'room gone');
      return;
    }

    if (!this.room) {
      const gameType = ENGINES[msg.gameType] ? msg.gameType : 'cham';
      const engineState = freshEngineState(gameType, msg.ruleset);
      // A room id like "vp-v037-K3PQ9X2A" is a one-shot challenge against a
      // virtual (bot) opponent — look it up by the vNNN segment only;
      // nothing about its strength or name is trusted from the client.
      const vpId = roomId.startsWith('vp-') ? roomId.split('-')[1] : null;
      const vp = vpId ? getVirtualPlayer(vpId) : null;
      this.room = {
        roomId,
        gameType,
        ruleset: msg.ruleset === 'renju' ? 'renju' : 'freestyle',
        isPublic: vp ? false : !!msg.isPublic,
        hostName: name,
        title: String(msg.title || '').trim().slice(0, 30) || null,
        allowSpectators: msg.allowSpectators !== false,
        players: [],
        spectatorCount: 0,
        engineState,
        status: 'waiting',
        vsBot: vp ? { name: vp.name, difficulty: vp.difficulty } : null,
        // The room's language: a Korean title, a Korean-named virtual host, or
        // a room made from a Korean page means Korean; anything else English.
        lang: isKorean(msg.title) || (vp ? isKorean(vp.name) : msg.lang === 'ko') ? 'ko' : 'en',
      };
    }

    if (this.room.players.length >= MAX_PLAYERS) {
      if (!this.room.allowSpectators) {
        this.send(ws, { type: 'error', message: 'Spectating is turned off for this room' });
        ws.close(1000, 'spectating disabled');
        return;
      }
      this.sockets.set(ws, { id: connId, role: 'spectator', name });
      this.room.spectatorCount++;
      const players = this.room.players.map((p) => ({ name: p.name, color: p.color }));
      this.send(ws, { type: 'joined', role: 'spectator', room: this.publicRoomView(), engineState: this.room.engineState, players });
      if (this.room.aiVsAi) this.triggerBotMoves();
      return;
    }

    // Courtesy as on other Omok sites: whoever made the room plays second and
    // the visitor gets the first move (Black / Red). Joining a virtual
    // player's waiting room makes the human the visitor, so they open there.
    const { PLAYERS, opponent } = ENGINES[this.room.gameType];
    const color = this.room.players.length === 0
      ? (this.room.vsBot ? PLAYERS.A : PLAYERS.B)
      : opponent(this.room.players[0].color);
    this.room.players.push({ id: connId, name, color });
    this.sockets.set(ws, { id: connId, role: 'player', color, name });

    if (this.room.vsBot && this.room.players.length === 1) {
      this.room.players.push({ id: 'bot', name: this.room.vsBot.name, color: PLAYERS.B, isBot: true, difficulty: this.room.vsBot.difficulty });
    }

    // Include the opponent's name directly when one is already seated (the
    // vsBot case: the bot is seated above before this message goes out, in
    // the same synchronous handler, so there's no later 'opponent-joined'
    // the client could rely on instead — it'd be read after this 'joined'
    // message already triggered the match).
    const other = this.room.players.find((p) => p.id !== connId);
    this.send(ws, { type: 'joined', role: 'player', color, room: this.publicRoomView(), engineState: this.room.engineState, opponentName: other ? other.name : null, vsBot: !!this.room.vsBot });
    if (this.room.vsBot) {
      // The human is the only real socket in the room — send them the
      // "opponent joined" notice directly instead of broadcast-excluding
      // themselves, which would deliver it to no one.
      this.send(ws, { type: 'opponent-joined', name: this.room.vsBot.name, room: this.publicRoomView() });
    } else {
      this.broadcast({ type: 'opponent-joined', name, room: this.publicRoomView() }, ws);
    }

    if (this.room.players.length === MAX_PLAYERS) {
      this.room.status = 'playing';
      // Public games stay on the dashboard as "playing"; private ones never list.
      await this.setLobbyListing(this.room.isPublic);
      this.broadcast({ type: 'state', engineState: this.room.engineState, status: this.room.status });
      if (this.room.vsBot) await this.triggerBotMoves();
    } else if (this.room.isPublic) {
      await this.setLobbyListing(true);
      clearTimeout(this.autoOpponentTimer);
      this.autoOpponentTimer = setTimeout(() => this.seatAutoOpponent(), AUTO_OPPONENT_MS);
    }
  }

  async seatAutoOpponent() {
    if (!this.room || this.room.status !== 'waiting' || this.room.players.length !== 1 || this.room.vsBot) return;
    const host = this.room.players[0];
    // Someone who fits the room: a Korean-named player for a Korean room.
    const sameLang = VIRTUAL_PLAYERS.filter((vp) => vp.name !== host.name && isKorean(vp.name) === (this.room.lang === 'ko'));
    const pool = sameLang.length ? sameLang : VIRTUAL_PLAYERS.filter((vp) => vp.name !== host.name);
    const vp = pool[Math.floor(Math.random() * pool.length)];
    const { opponent } = ENGINES[this.room.gameType];
    this.room.vsBot = { name: vp.name, difficulty: 'master' };
    this.room.players.push({ id: 'bot', name: vp.name, color: opponent(host.color), isBot: true, difficulty: 'master' });
    this.room.status = 'playing';
    this.broadcast({ type: 'opponent-joined', name: vp.name, room: this.publicRoomView(), vsBot: true });
    await this.setLobbyListing(true);
    this.broadcast({ type: 'state', engineState: this.room.engineState, status: this.room.status });
    await this.triggerBotMoves();
  }

  // "Play again" restarts the game in this same room with the same opponent.
  // Against a bot it starts at once; between two people it waits until both
  // have asked. Colors swap each game so the first-move advantage alternates.
  async handleRematch(ws, conn) {
    if (conn.role !== 'player' || !this.room || this.room.status !== 'finished') return;
    if (this.room.players.length < MAX_PLAYERS) return;
    this.room.rematchVotes ??= [];
    if (!this.room.rematchVotes.includes(conn.id)) this.room.rematchVotes.push(conn.id);
    const humans = this.room.players.filter((p) => !p.isBot);
    if (!humans.every((p) => this.room.rematchVotes.includes(p.id))) {
      this.broadcast({ type: 'rematch-requested', name: conn.name }, ws);
      return;
    }

    this.room.rematchVotes = null;
    const { opponent } = ENGINES[this.room.gameType];
    for (const p of this.room.players) p.color = opponent(p.color);
    for (const [, c] of this.sockets) {
      if (c.role !== 'player') continue;
      const p = this.room.players.find((pl) => pl.id === c.id);
      if (p) c.color = p.color;
    }
    this.room.engineState = freshEngineState(this.room.gameType, this.room.ruleset);
    this.room.status = 'playing';
    await this.state.storage.setAlarm(Date.now() + ROOM_IDLE_LIMIT_MS);
    for (const [sock, c] of this.sockets) {
      this.send(sock, { type: 'rematch-start', color: c.role === 'player' ? c.color : null, engineState: this.room.engineState, status: this.room.status });
    }
    if (this.room.vsBot) await this.triggerBotMoves();
  }

  // A room id like "vpm-v012-v087-K3PQ9X2A" is a spectator opening one of
  // the lobby's virtual games in progress: both seats are bots, the game
  // starts from a played-in opening, and it only runs while watched.
  createWatchRoom(roomId, msg) {
    const [, idA, idB] = roomId.split('-');
    const a = getVirtualPlayer(idA);
    const b = getVirtualPlayer(idB);
    if (!a || !b || a === b) return;
    const gameType = ENGINES[msg.gameType] ? msg.gameType : 'cham';
    const { PLAYERS } = ENGINES[gameType];
    this.room = {
      roomId,
      gameType,
      ruleset: 'freestyle',
      isPublic: false,
      hostName: a.name,
      title: null,
      allowSpectators: true,
      aiVsAi: true,
      players: [
        { id: 'bot-a', name: a.name, color: PLAYERS.A, isBot: true, difficulty: WATCH_DIFFICULTY },
        { id: 'bot-b', name: b.name, color: PLAYERS.B, isBot: true, difficulty: WATCH_DIFFICULTY },
      ],
      spectatorCount: 0,
      engineState: simulatedOpening(gameType, 'freestyle'),
      status: 'playing',
      vsBot: null,
    };
  }

  restartWatchGame() {
    if (!this.room?.aiVsAi || this.room.status !== 'finished' || this.sockets.size === 0) return;
    const { opponent } = ENGINES[this.room.gameType];
    for (const p of this.room.players) p.color = opponent(p.color);
    this.room.engineState = simulatedOpening(this.room.gameType, this.room.ruleset);
    this.room.status = 'playing';
    const players = this.room.players.map((p) => ({ name: p.name, color: p.color }));
    this.broadcast({ type: 'rematch-start', color: null, engineState: this.room.engineState, status: this.room.status, players });
    this.triggerBotMoves();
  }

  handleChat(conn, msg) {
    if (!this.room || conn.role !== 'player') return;
    const text = String(msg.text || '').trim().slice(0, CHAT_MAX_LEN);
    if (!text) return;
    this.broadcast({ type: 'chat', from: conn.name || 'Player', text, ts: Date.now() });

    // A virtual opponent answers now and then (not every message), after a
    // typing pause, in the room's language — and teases a chatterbox back to
    // the game.
    const bot = this.room.players.find((p) => p.isBot);
    if (!bot || this.room.aiVsAi) return;
    this.botChatState = this.botChatState || {};
    const reply = botChatReply(text, this.botChatState, { roomLang: this.room.lang });
    if (reply) this.botSays(bot, reply, 1500 + Math.random() * 2500);
  }

  botSays(bot, text, delay) {
    setTimeout(() => {
      if (!this.room || !this.room.players.includes(bot) || this.sockets.size === 0) return;
      this.broadcast({ type: 'chat', from: bot.name, text, ts: Date.now() });
    }, delay);
  }

  // Sometimes a "gg" when a game against a virtual opponent ends.
  botAfterGame() {
    const bot = this.room?.players.find((p) => p.isBot);
    const winner = this.room?.engineState.winner;
    if (!bot || this.room.aiVsAi || !winner || winner === 'draw') return;
    const line = botGameOverLine(winner === bot.color, this.room.lang || (isKorean(bot.name) ? 'ko' : 'en'));
    if (line) this.botSays(bot, line, 1800 + Math.random() * 1500);
  }

  async handleMove(ws, conn, msg) {
    if (conn.role !== 'player' || !this.room || this.room.status !== 'playing') return;
    const player = this.room.players.find((p) => p.id === conn.id);
    if (!player || this.room.engineState.turn !== player.color) return;
    const engine = ENGINES[this.room.gameType];
    let next;
    try {
      next = engine.move(this.room.engineState, msg.from ?? null, msg.to);
    } catch {
      this.send(ws, { type: 'error', message: 'Illegal move' });
      return;
    }
    this.room.engineState = next;
    if (next.winner) this.room.status = 'finished';
    this.broadcast({ type: 'state', engineState: next, status: this.room.status });
    if (this.room.status === 'finished') this.botAfterGame();
    if (this.room.vsBot && this.room.status === 'playing') await this.triggerBotMoves();
  }

  // Plays bot moves until it's a human's turn again (a single human move can
  // hand the turn to the bot more than once in a row — e.g. Cham-gonu keeps
  // the same player on the move after a mill capture). In an AI-vs-AI watch
  // room both seats are bots, so it plays the whole game — but stops as soon
  // as the last spectator leaves.
  async triggerBotMoves() {
    if (this.botLoopRunning) return;
    const ai = AI[this.room.gameType];
    const engine = ENGINES[this.room.gameType];
    if (!ai) return;
    const watch = !!this.room.aiVsAi;
    this.botLoopRunning = true;
    try {
      while (this.room.status === 'playing' && !this.room.engineState.winner) {
        const mover = this.room.players.find((p) => p.color === this.room.engineState.turn);
        if (!mover?.isBot) break;
        if (watch && this.sockets.size === 0) break;
        const board = this.room.engineState.cells ?? this.room.engineState.pieces;
        const openingMove = board.every((c) => c === null);
        const [min, max] = watch ? WATCH_MOVE_DELAY_MS : openingMove ? BOT_FIRST_MOVE_DELAY_MS : BOT_MOVE_DELAY_MS;
        let delay = min + Math.random() * (max - min);
        if (watch && Math.random() < WATCH_LONG_THINK_CHANCE) {
          const [emin, emax] = WATCH_LONG_THINK_EXTRA_MS;
          delay += emin + Math.random() * (emax - emin);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (watch && this.sockets.size === 0) break;
        const aiMove = ai.chooseAIMove(this.room.engineState, { difficulty: mover.difficulty, deepMidgame: !watch });
        if (!aiMove) break;
        let next;
        try {
          next = engine.move(this.room.engineState, aiMove.from ?? null, aiMove.to);
        } catch {
          break;
        }
        this.room.engineState = next;
        if (next.winner) this.room.status = 'finished';
        this.broadcast({ type: 'state', engineState: next, status: this.room.status });
        if (next.winner && !watch) this.botAfterGame();
      }
    } finally {
      this.botLoopRunning = false;
    }
    if (watch && this.room.status === 'finished' && this.sockets.size > 0) {
      setTimeout(() => this.restartWatchGame(), WATCH_RESTART_MS);
    }
  }

  onClose(ws) {
    const conn = this.sockets.get(ws);
    this.sockets.delete(ws);
    if (!conn || !this.room) return;
    if (conn.role === 'player') {
      this.room.players = this.room.players.filter((p) => p.id !== conn.id);
      if (this.room.status !== 'finished') this.room.status = 'abandoned';
      this.broadcast({ type: 'opponent-left' });
      this.setLobbyListing(false);
    } else {
      this.room.spectatorCount = Math.max(0, this.room.spectatorCount - 1);
    }
  }

  publicRoomView() {
    return {
      gameType: this.room.gameType,
      ruleset: this.room.ruleset,
      isPublic: this.room.isPublic,
      hostName: this.room.hostName,
      playerCount: this.room.players.length,
      status: this.room.status,
    };
  }

  async setLobbyListing(listed) {
    if (!this.env.LOBBY || !this.room) return;
    if (listed && !this.listingHeartbeat) {
      this.listingHeartbeat = setInterval(() => this.setLobbyListing(true), LISTING_HEARTBEAT_MS);
    } else if (!listed && this.listingHeartbeat) {
      clearInterval(this.listingHeartbeat);
      this.listingHeartbeat = null;
    }
    const id = this.env.LOBBY.idFromName('global');
    const stub = this.env.LOBBY.get(id);
    try {
      await stub.fetch('https://lobby.internal/update', {
        method: 'POST',
        body: JSON.stringify({
          action: listed ? 'upsert' : 'remove',
          roomId: this.room.roomId,
          gameType: this.room.gameType,
          hostName: this.room.hostName,
          guestName: this.room.players[1]?.name ?? null,
          title: this.room.title,
          allowSpectators: this.room.allowSpectators,
          status: this.room.status,
        }),
      });
    } catch { /* lobby unreachable shouldn't block the room itself */ }
  }
}
