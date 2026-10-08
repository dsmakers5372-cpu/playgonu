// A single global Durable Object instance (always addressed by the fixed
// name "global") that tracks which PUBLIC rooms are currently open and
// waiting for a second player — the "온라인 대전" dashboard list. Private
// rooms never register here; they're only reachable by sharing the room
// link directly. GameRoom instances push updates in; the lobby page polls
// GET for the current list.
//
// The list also always carries a rotating subset of VIRTUAL_PLAYERS so an
// early, mostly-empty site still shows a populated "online now" dashboard —
// see virtualPlayers.js for the rationale and rotation mechanics.
import { pickVirtualLobby } from './virtualPlayers.js';

// Matches GameRoom's idle limit: a room only pushes a listing when its state
// changes, so a shorter window dropped public rooms that were simply still
// waiting for an opponent. Rooms remove themselves on close anyway.
const STALE_MS = 30 * 60 * 1000;

export class Lobby {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.rooms = null;
  }

  async ensureLoaded() {
    if (this.rooms) return;
    this.rooms = (await this.state.storage.get('rooms')) || {};
  }

  async persist() {
    await this.state.storage.put('rooms', this.rooms);
  }

  async fetch(request) {
    await this.ensureLoaded();
    const url = new URL(request.url);

    if (request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return new Response('bad request', { status: 400 }); }
      if (body.action === 'upsert' && body.roomId) {
        this.rooms[body.roomId] = {
          gameType: body.gameType,
          hostName: body.hostName,
          guestName: body.guestName || null,
          title: body.title || null,
          status: body.status === 'waiting' ? 'waiting' : 'playing',
          updatedAt: Date.now(),
        };
      } else if (body.action === 'remove' && body.roomId) {
        delete this.rooms[body.roomId];
      }
      await this.persist();
      return new Response('ok');
    }

    const gameFilter = url.searchParams.get('game');
    const now = Date.now();
    let changed = false;
    for (const [id, r] of Object.entries(this.rooms)) {
      if (now - r.updatedAt > STALE_MS) {
        delete this.rooms[id];
        changed = true;
      }
    }
    if (changed) await this.persist();

    const real = Object.entries(this.rooms)
      .filter(([, r]) => !gameFilter || r.gameType === gameFilter)
      .map(([roomId, r]) => ({ roomId, ...r }))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const { waiting, playing } = pickVirtualLobby(gameFilter || 'cham');
    const virtualWaiting = waiting.map((vp) => ({
      roomId: `vp-${vp.id}`,
      gameType: vp.gameType,
      hostName: vp.name,
      title: vp.title,
      status: 'waiting',
      updatedAt: now,
      isVirtual: true,
    }));
    const virtualPlaying = playing.map(([a, b]) => ({
      roomId: `vpm-${a.id}-${b.id}`,
      gameType: a.gameType,
      hostName: a.name,
      guestName: b.name,
      status: 'playing',
      updatedAt: now,
      isVirtual: true,
    }));

    // Open rooms first (people looking for a game want those), games in
    // progress after — real rooms ahead of virtual ones within each group.
    const list = [
      ...real.filter((r) => r.status === 'waiting'),
      ...virtualWaiting,
      ...real.filter((r) => r.status !== 'waiting'),
      ...virtualPlaying,
    ];
    return new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } });
  }
}
