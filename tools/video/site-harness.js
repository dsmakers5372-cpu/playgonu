// Injected into the real PlayGonu online-battle page before it loads (see
// site-record.mjs). Replaces WebSocket with an in-page stand-in for the
// game server, so the page's own UI renders a pre-recorded game: the page
// joins as a player, and window.__feedState(engineState) plays each move.
// Everything else on screen is the live site code.
export function installHarness({ storage, me, opponent, myColor, gameType }) {
  for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);

  const sockets = [];
  class FakeSocket extends EventTarget {
    constructor(url) {
      super();
      this.url = url;
      this.readyState = 0;
      sockets.push(this);
      setTimeout(() => { this.readyState = 1; this.dispatchEvent(new Event('open')); }, 30);
    }
    send(raw) {
      const msg = JSON.parse(raw);
      if (msg.type === 'join') {
        window.__joinMsg = msg;
        this.reply({
          type: 'joined', role: 'player', color: myColor, opponentName: opponent, vsBot: false,
          room: { gameType, ruleset: 'freestyle', isPublic: false, hostName: opponent, playerCount: 2, status: 'playing' },
          engineState: window.__initialState,
        });
      }
    }
    reply(data) {
      this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
    close() { this.readyState = 3; }
  }
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) FakeSocket[k] = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].indexOf(k);
  window.WebSocket = FakeSocket;
  window.__feedState = (engineState, status = 'playing') => {
    for (const s of sockets) s.reply({ type: 'state', engineState, status });
  };
  window.__me = me;
}
