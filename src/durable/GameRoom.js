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
import { getVirtualPlayer } from './virtualPlayers.js';

const ENGINES = { cham: chamgonu, gomoku };
const AI = { cham: chamgonuAI, gomoku: gomokuAI };
const MAX_PLAYERS = 2;
const BOT_MOVE_DELAY_MS = [450, 950]; // feels like a person thinking, not an instant server reply
const ROOM_IDLE_LIMIT_MS = 30 * 60 * 1000; // storage alarm cleans up long-abandoned rooms
const CHAT_MAX_LEN = 200;
const BOT_GREETINGS = ['안녕하세요 :)', '화이팅!', 'Hi, good luck!', 'gl hf', '좋은 게임 되세요'];

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
    else if (msg.type === 'leave') ws.close(1000, 'left');
  }

  async handleJoin(ws, connId, msg) {
    const name = String(msg.name || 'Player').slice(0, 24);
    const roomId = String(msg.roomId || '').slice(0, 64);
    if (!roomId) return this.send(ws, { type: 'error', message: 'Missing room id' });

    if (!this.room) {
      const gameType = ENGINES[msg.gameType] ? msg.gameType : 'cham';
      const engine = ENGINES[gameType];
      const engineState = gameType === 'gomoku'
        ? engine.createInitialState({ ruleset: msg.ruleset === 'renju' ? 'renju' : 'freestyle' })
        : engine.createInitialState();
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
        players: [],
        spectatorCount: 0,
        engineState,
        status: 'waiting',
        vsBot: vp ? { name: vp.name, difficulty: vp.difficulty } : null,
      };
    }

    if (this.room.players.length >= MAX_PLAYERS) {
      this.sockets.set(ws, { id: connId, role: 'spectator', name });
      this.room.spectatorCount++;
      this.send(ws, { type: 'joined', role: 'spectator', room: this.publicRoomView(), engineState: this.room.engineState });
      return;
    }

    const PLAYERS = ENGINES[this.room.gameType].PLAYERS;
    const color = this.room.players.length === 0 ? PLAYERS.A : PLAYERS.B;
    this.room.players.push({ id: connId, name, color });
    this.sockets.set(ws, { id: connId, role: 'player', color, name });

    if (this.room.vsBot && this.room.players.length === 1) {
      this.room.players.push({ id: 'bot', name: this.room.vsBot.name, color: PLAYERS.B, isBot: true });
    }

    // Include the opponent's name directly when one is already seated (the
    // vsBot case: the bot is seated above before this message goes out, in
    // the same synchronous handler, so there's no later 'opponent-joined'
    // the client could rely on instead — it'd be read after this 'joined'
    // message already triggered the match).
    const other = this.room.players.find((p) => p.id !== connId);
    this.send(ws, { type: 'joined', role: 'player', color, room: this.publicRoomView(), engineState: this.room.engineState, opponentName: other ? other.name : null });
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
      await this.setLobbyListing(false);
      this.broadcast({ type: 'state', engineState: this.room.engineState, status: this.room.status });
      if (this.room.vsBot) {
        this.sendBotGreeting();
        await this.triggerBotMoves();
      }
    } else if (this.room.isPublic) {
      await this.setLobbyListing(true);
    }
  }

  handleChat(conn, msg) {
    if (!this.room) return;
    const text = String(msg.text || '').trim().slice(0, CHAT_MAX_LEN);
    if (!text) return;
    this.broadcast({ type: 'chat', from: conn.name || 'Player', text, ts: Date.now() });
  }

  sendBotGreeting() {
    const line = BOT_GREETINGS[Math.floor(Math.random() * BOT_GREETINGS.length)];
    setTimeout(() => {
      if (this.room && this.room.vsBot) {
        this.broadcast({ type: 'chat', from: this.room.vsBot.name, text: line, ts: Date.now() });
      }
    }, 900 + Math.random() * 700);
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
    if (this.room.vsBot && this.room.status === 'playing') await this.triggerBotMoves();
  }

  // Plays the bot's side forward until it's the human's turn again (a
  // single human move can hand the turn to the bot more than once in a
  // row — e.g. Cham-gonu keeps the same player on the move after a mill
  // capture — so this loops rather than making just one bot move).
  async triggerBotMoves() {
    const ai = AI[this.room.gameType];
    const engine = ENGINES[this.room.gameType];
    const bot = this.room.players.find((p) => p.isBot);
    if (!ai || !bot) return;
    while (this.room.status === 'playing' && !this.room.engineState.winner && this.room.engineState.turn === bot.color) {
      const [min, max] = BOT_MOVE_DELAY_MS;
      await new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
      const aiMove = ai.chooseAIMove(this.room.engineState, { difficulty: this.room.vsBot.difficulty });
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
          status: this.room.status,
        }),
      });
    } catch { /* lobby unreachable shouldn't block the room itself */ }
  }
}
