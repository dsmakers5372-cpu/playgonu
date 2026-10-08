// Thin WebSocket wrapper for an online-battle room — game-agnostic, used by
// both Cham-gonu and Gomoku's online mode. One room = one Durable Object on
// the server (src/durable/GameRoom.js); this just connects, (re)sends the
// join message, and dispatches incoming messages to the caller's handlers.
export function connectToRoom({ roomId, name, title, isPublic, allowSpectators = true, spectate = false, gameType, ruleset, handlers }) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${location.host}/ws/room/${encodeURIComponent(roomId)}`);
  let closedByUs = false;

  ws.addEventListener('open', () => {
    // The page's language sets the room's language (a virtual opponent chats in it).
    const lang = (document.documentElement.lang || 'en').slice(0, 2);
    ws.send(JSON.stringify({ type: 'join', roomId, name, title, isPublic: !!isPublic, allowSpectators: !!allowSpectators, spectate: !!spectate, gameType, ruleset, lang }));
    handlers.onOpen?.();
  });

  ws.addEventListener('message', (evt) => {
    let msg;
    try { msg = JSON.parse(evt.data); } catch { return; }
    switch (msg.type) {
      case 'joined': handlers.onJoined?.(msg); break;
      case 'opponent-joined': handlers.onOpponentJoined?.(msg); break;
      case 'opponent-left': handlers.onOpponentLeft?.(msg); break;
      case 'state': handlers.onState?.(msg); break;
      case 'chat': handlers.onChat?.(msg); break;
      case 'rematch-requested': handlers.onRematchRequested?.(msg); break;
      case 'rematch-start': handlers.onRematchStart?.(msg); break;
      case 'error': handlers.onError?.(msg); break;
      default: break;
    }
  });

  ws.addEventListener('close', () => {
    if (!closedByUs) handlers.onDisconnect?.();
  });

  ws.addEventListener('error', () => handlers.onError?.({ message: 'Connection error' }));

  return {
    sendMove(from, to) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'move', from, to }));
    },
    sendChat(text) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'chat', text }));
    },
    sendRematch() {
      if (ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify({ type: 'rematch' }));
      return true;
    },
    close() {
      closedByUs = true;
      try { ws.close(1000, 'left'); } catch { /* already closed */ }
    },
  };
}

// Short, URL-friendly room codes, e.g. "K7WPKP8X" — readable enough to
// type if someone dictates it over voice chat, unlike a full UUID.
export function generateRoomId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
  let id = '';
  for (let i = 0; i < 8; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return id;
}
