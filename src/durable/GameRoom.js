// A Durable Object instance per online-battle room. The first player to
// connect configures the room (game type, ruleset, public/private); the
// second becomes their opponent; anyone after that joins read-only as a
// spectator. Reuses the exact same engine modules the local/AI games use —
// `move(state, from, to)` has the same signature everywhere in this
// project, so this adapter needs no per-game special-casing.
import * as chamgonu from '../engine/chamgonu.js';
import * as gomoku from '../engine/gomoku.js';

const ENGINES = { cham: chamgonu, gomoku };
const MAX_PLAYERS = 2;
const ROOM_IDLE_LIMIT_MS = 30 * 60 * 1000; // storage alarm cleans up long-abandoned rooms

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sockets = new Map(); // ws -> { id, role: 'player' | 'spectator', color? }
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
    if (msg.type === 'move') this.handleMove(ws, conn, msg);
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
      this.room = {
        roomId,
        gameType,
        ruleset: msg.ruleset === 'renju' ? 'renju' : 'freestyle',
        isPublic: !!msg.isPublic,
        hostName: name,
        players: [],
        spectatorCount: 0,
        engineState,
        status: 'waiting',
      };
    }

    if (this.room.players.length >= MAX_PLAYERS) {
      this.sockets.set(ws, { id: connId, role: 'spectator' });
      this.room.spectatorCount++;
      this.send(ws, { type: 'joined', role: 'spectator', room: this.publicRoomView(), engineState: this.room.engineState });
      return;
    }

    const PLAYERS = ENGINES[this.room.gameType].PLAYERS;
    const color = this.room.players.length === 0 ? PLAYERS.A : PLAYERS.B;
    this.room.players.push({ id: connId, name, color });
    this.sockets.set(ws, { id: connId, role: 'player', color });

    this.send(ws, { type: 'joined', role: 'player', color, room: this.publicRoomView(), engineState: this.room.engineState });
    this.broadcast({ type: 'opponent-joined', name, room: this.publicRoomView() }, ws);

    if (this.room.players.length === MAX_PLAYERS) {
      this.room.status = 'playing';
      await this.setLobbyListing(false);
      this.broadcast({ type: 'state', engineState: this.room.engineState, status: this.room.status });
    } else if (this.room.isPublic) {
      await this.setLobbyListing(true);
    }
  }

  handleMove(ws, conn, msg) {
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
