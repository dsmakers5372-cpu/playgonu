import { connectToRoom, generateRoomId } from '../net/roomClient.js';

const STRINGS = {
  en: {
    namePlaceholder: 'Your name',
    createPrivate: 'Create private room (share the link)',
    createPublic: 'Create public room (anyone can join)',
    joinByLink: 'Waiting for your opponent to join via this link:',
    copy: 'Copy',
    copied: 'Copied!',
    openRooms: 'Rooms',
    noOpenRooms: 'No open public rooms right now — create one!',
    join: 'Join',
    waitingHost: (name) => `${name}'s room`,
    enterNameFirst: 'Enter your name first.',
    roomTitlePlaceholder: 'Room name (optional)',
    statusWaiting: 'Waiting',
    statusPlaying: 'Playing',
    publicCreated: 'Your public room is open — the game starts as soon as someone joins.',
    cancelRoom: 'Cancel',
    allowSpectators: 'Allow spectators',
    watch: 'Watch',
    roomGone: 'That game has already ended.',
  },
  ko: {
    namePlaceholder: '이름',
    createPrivate: '비공개 방 만들기 (링크 공유)',
    createPublic: '공개 방 만들기 (누구나 참가 가능)',
    joinByLink: '이 링크로 상대방이 들어오길 기다리는 중입니다:',
    copy: '복사',
    copied: '복사됨!',
    openRooms: '방 목록',
    noOpenRooms: '지금 열려있는 공개 방이 없습니다 — 새로 만들어보세요!',
    join: '참가',
    waitingHost: (name) => `${name}님의 방`,
    enterNameFirst: '먼저 이름을 입력해 주세요.',
    roomTitlePlaceholder: '방 이름 (선택)',
    statusWaiting: '대기 중',
    statusPlaying: '플레이 중',
    publicCreated: '공개 방을 만들었어요 — 누군가 들어오면 바로 시작됩니다.',
    cancelRoom: '취소',
    allowSpectators: '관전 허용',
    watch: '관전',
    roomGone: '이미 끝난 대국이에요.',
  },
};

// Renders the pre-game flow (name entry -> create public/private room or
// join an open one from the dashboard list) into `root`, and calls
// `onMatched({ roomClient, color, name, engineState, gameType, ruleset })`
// once two players are connected — from that point on, the caller owns the
// actual board UI.
export function mountOnlineLobby(root, { lang = 'en', gameType, ruleset, onMatched, onState, onOpponentLeft, onChat, onRematchRequested, onRematchStart }) {
  const t = STRINGS[lang] || STRINGS.en;
  root.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:20px;max-width:480px;';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = t.namePlaceholder;
  nameInput.maxLength = 24;
  nameInput.className = 'pill';
  nameInput.style.cssText = 'width:100%;box-sizing:border-box;padding:12px 16px;font-size:15px;';
  try { nameInput.value = localStorage.getItem('playgonu:name') || ''; } catch { /* ignore */ }

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = t.roomTitlePlaceholder;
  titleInput.maxLength = 30;
  titleInput.className = 'pill';
  titleInput.style.cssText = 'width:100%;box-sizing:border-box;padding:12px 16px;font-size:15px;';

  const spectateLabel = document.createElement('label');
  spectateLabel.style.cssText = 'display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;cursor:pointer;';
  const spectateCheck = document.createElement('input');
  spectateCheck.type = 'checkbox';
  spectateCheck.checked = true;
  spectateCheck.style.cssText = 'width:18px;height:18px;cursor:pointer;';
  spectateLabel.append(spectateCheck, document.createTextNode(t.allowSpectators));

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';
  const createPrivateBtn = document.createElement('button');
  createPrivateBtn.className = 'btn';
  createPrivateBtn.textContent = t.createPrivate;
  const createPublicBtn = document.createElement('button');
  createPublicBtn.className = 'btn-primary';
  createPublicBtn.textContent = t.createPublic;
  btnRow.append(createPrivateBtn, createPublicBtn);

  const statusArea = document.createElement('div');
  statusArea.style.cssText = 'display:none;flex-direction:column;gap:10px;';

  const lobbyList = document.createElement('div');
  lobbyList.style.cssText = 'display:flex;flex-direction:column;gap:14px;';
  const lobbyHeading = document.createElement('div');
  lobbyHeading.className = 'tag';
  lobbyHeading.textContent = t.openRooms;
  const lobbyRows = document.createElement('div');
  lobbyRows.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
  lobbyList.append(lobbyHeading, lobbyRows);

  wrap.append(nameInput, titleInput, spectateLabel, btnRow, statusArea, lobbyList);
  root.appendChild(wrap);

  let pollTimer = null;
  let myRoomId = null;
  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }
  function startPolling() {
    stopPolling();
    refreshLobby();
    pollTimer = setInterval(refreshLobby, 3000);
  }

  async function refreshLobby() {
    try {
      const res = await fetch(`/api/lobby?game=${encodeURIComponent(gameType)}`);
      const rooms = await res.json();
      renderRooms(rooms);
    } catch { /* transient network hiccup — try again next tick */ }
  }

  function statusBadge(waiting) {
    const badge = document.createElement('span');
    badge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--ink-soft);white-space:nowrap;';
    const dot = document.createElement('span');
    dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${waiting ? '#E0962B' : '#3C9A5F'};`;
    badge.append(dot, document.createTextNode(waiting ? t.statusWaiting : t.statusPlaying));
    return badge;
  }

  function renderRooms(rooms) {
    lobbyRows.innerHTML = '';
    const visible = rooms.filter((r) => r.roomId !== myRoomId);
    if (visible.length === 0) {
      const empty = document.createElement('p');
      empty.style.cssText = 'margin:0;font-size:13.5px;color:var(--ink-soft);';
      empty.textContent = t.noOpenRooms;
      lobbyRows.appendChild(empty);
      return;
    }
    for (const r of visible) {
      const waiting = r.status === 'waiting';
      const row = document.createElement('div');
      row.className = 'card';
      row.style.cssText = `padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-left:4px solid ${waiting ? '#E0962B' : '#3C9A5F'};`;
      const label = document.createElement('span');
      label.style.cssText = `font-size:14px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${waiting ? '' : 'color:var(--ink-soft);'}`;
      if (!waiting) label.textContent = `${r.hostName} vs ${r.guestName || '…'}`;
      else if (r.title) label.textContent = `${r.title} · ${r.hostName}`;
      else label.textContent = t.waitingHost(r.hostName);
      const right = document.createElement('div');
      right.style.cssText = 'display:flex;align-items:center;gap:12px;flex:none;';
      right.appendChild(statusBadge(waiting));
      if (!waiting && r.allowSpectators !== false) {
        const watchBtn = document.createElement('button');
        watchBtn.className = 'btn';
        watchBtn.textContent = t.watch;
        // A virtual game in progress is only a listing until someone watches
        // it — a fresh suffix gives each spectator their own live AI game.
        watchBtn.addEventListener('click', () => {
          startAsSpectator(r.isVirtual ? `${r.roomId}-${generateRoomId()}` : r.roomId);
        });
        right.appendChild(watchBtn);
      }
      if (waiting) {
        const joinBtn = document.createElement('button');
        joinBtn.className = 'btn-primary';
        joinBtn.textContent = t.join;
        // A virtual (bot) opponent's listed roomId is just a display id, not a
        // live room — generate a fresh one per challenge so each match gets
        // its own Durable Object instead of reusing a possibly-finished one.
        joinBtn.addEventListener('click', () => {
          startAsGuest(r.isVirtual ? `${r.roomId}-${generateRoomId()}` : r.roomId);
        });
        right.appendChild(joinBtn);
      }
      row.append(label, right);
      lobbyRows.appendChild(row);
    }
  }

  function requireName() {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      nameInput.placeholder = t.enterNameFirst;
      return null;
    }
    try { localStorage.setItem('playgonu:name', name); } catch { /* ignore */ }
    return name;
  }

  function connect(roomId, name, isPublic, title = null, allowSpectators = true, spectate = false) {
    btnRow.style.display = 'none';
    titleInput.style.display = 'none';
    spectateLabel.style.display = 'none';
    statusArea.style.display = 'flex';
    // A public host keeps browsing the dashboard while waiting (their own
    // room is filtered out of it); everyone else goes straight to the match.
    if (!isPublic) {
      stopPolling();
      lobbyList.style.display = 'none';
    }
    myRoomId = roomId;

    let matched = false;
    let myColor = null;
    let myRole = null;
    let opponentName = null;
    let vsBot = false;
    let players = null;

    function tryMatch(roomInfo) {
      if (matched) return;
      if (roomInfo.playerCount === 2 || myRole === 'spectator') {
        matched = true;
        stopPolling();
        onMatched({ roomClient: client, color: myColor, role: myRole, name, opponentName, vsBot, players, gameType, ruleset: roomInfo.ruleset });
      }
    }

    const client = connectToRoom({
      roomId,
      name,
      title,
      isPublic,
      allowSpectators,
      spectate,
      gameType,
      ruleset,
      handlers: {
        onJoined(msg) {
          myColor = msg.color;
          myRole = msg.role;
          // The server includes opponentName directly whenever a second
          // player is already seated at join time (the vsBot case, where
          // there's no later 'opponent-joined' message to rely on instead —
          // it'd arrive only after this 'joined' message already triggered
          // the match). Otherwise, as the guest (color B), the room's
          // hostName is whoever created the room, i.e. our opponent.
          if (msg.opponentName) opponentName = msg.opponentName;
          else if (msg.color === 'B') opponentName = msg.room.hostName;
          vsBot = !!msg.vsBot;
          players = msg.players ?? null;
          if (msg.role === 'player' && msg.room.playerCount < 2 && msg.room.isPublic) {
            statusArea.innerHTML = '';
            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = 'padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-left:4px solid #E0962B;';
            const msgEl = document.createElement('span');
            msgEl.style.cssText = 'font-size:14px;font-weight:600;';
            msgEl.textContent = t.publicCreated;
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn';
            cancelBtn.style.cssText = 'flex:none;white-space:nowrap;';
            cancelBtn.textContent = t.cancelRoom;
            cancelBtn.addEventListener('click', () => {
              client.close();
              backToLobby(null);
            });
            card.append(msgEl, cancelBtn);
            statusArea.appendChild(card);
          } else if (msg.role === 'player' && msg.room.playerCount < 2) {
            statusArea.innerHTML = '';
            const waitingMsg = document.createElement('p');
            waitingMsg.style.cssText = 'margin:0;font-size:14px;color:var(--ink-soft);';
            waitingMsg.textContent = t.joinByLink;
            const linkRow = document.createElement('div');
            linkRow.style.cssText = 'display:flex;gap:8px;';
            const linkBox = document.createElement('input');
            linkBox.type = 'text';
            linkBox.readOnly = true;
            linkBox.className = 'pill';
            linkBox.style.cssText = 'flex:1;box-sizing:border-box;padding:10px 14px;font-size:13px;';
            linkBox.value = `${location.origin}${location.pathname}?game=${encodeURIComponent(gameType)}&room=${roomId}`;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn';
            copyBtn.textContent = t.copy;
            copyBtn.addEventListener('click', async () => {
              try {
                await navigator.clipboard.writeText(linkBox.value);
                copyBtn.textContent = t.copied;
                setTimeout(() => { copyBtn.textContent = t.copy; }, 1500);
              } catch { linkBox.select(); }
            });
            linkRow.append(linkBox, copyBtn);
            statusArea.append(waitingMsg, linkRow);
          }
          tryMatch(msg.room);
          onState?.(msg.engineState, msg.room.status);
        },
        onOpponentJoined(msg) {
          opponentName = msg.name;
          if (msg.vsBot) vsBot = true;
          tryMatch(msg.room);
        },
        onState(msg) {
          onState?.(msg.engineState, msg.status);
        },
        onOpponentLeft() {
          onOpponentLeft?.();
        },
        onChat(msg) {
          onChat?.(msg);
        },
        onRematchRequested(msg) {
          onRematchRequested?.(msg);
        },
        onRematchStart(msg) {
          onRematchStart?.(msg);
        },
        onError(msg) {
          if (msg.code === 'room-gone') {
            backToLobby(t.roomGone);
            return;
          }
          console.error('[online]', msg.message);
        },
      },
    });
    return client;
  }

  function startAsHost(isPublic) {
    const name = requireName();
    if (!name) return;
    const params = new URLSearchParams(location.search);
    const roomId = params.get('room') || generateRoomId();
    connect(roomId, name, isPublic, titleInput.value.trim() || null, spectateCheck.checked);
  }

  function startAsGuest(roomId) {
    const name = requireName();
    if (!name) return;
    connect(roomId, name, false);
  }

  // Spectators never play or chat, so a name is optional for them.
  function startAsSpectator(roomId) {
    connect(roomId, nameInput.value.trim() || 'Spectator', false, null, true, true);
  }

  function backToLobby(notice) {
    myRoomId = null;
    statusArea.innerHTML = '';
    statusArea.style.display = notice ? 'flex' : 'none';
    if (notice) {
      const p = document.createElement('p');
      p.style.cssText = 'margin:0;font-size:14px;color:var(--ink-soft);';
      p.textContent = notice;
      statusArea.appendChild(p);
    }
    btnRow.style.display = 'flex';
    titleInput.style.display = '';
    spectateLabel.style.display = 'inline-flex';
    lobbyList.style.display = 'flex';
    startPolling();
  }

  createPrivateBtn.addEventListener('click', () => startAsHost(false));
  createPublicBtn.addEventListener('click', () => startAsHost(true));

  // Arriving via a shared link (?room=XXXX) skips straight to joining that
  // room once a name is entered, instead of showing the create/browse UI.
  const incomingRoom = new URLSearchParams(location.search).get('room');
  if (incomingRoom) {
    btnRow.style.display = 'none';
    titleInput.style.display = 'none';
    spectateLabel.style.display = 'none';
    lobbyList.style.display = 'none';
    const joinHint = document.createElement('button');
    joinHint.className = 'btn-primary';
    joinHint.textContent = t.join;
    joinHint.style.width = '100%';
    joinHint.addEventListener('click', () => startAsGuest(incomingRoom));
    wrap.insertBefore(joinHint, statusArea);
  } else if (new URLSearchParams(location.search).get('autoBot') === '1') {
    // "Play again" after a bot match lands here instead of the create/browse
    // UI — jump straight back into a fresh bot challenge (same name, a
    // randomly picked virtual opponent) rather than making the player
    // re-click through the lobby for a match that has no real human to wait
    // on anyway.
    const name = requireName();
    if (name) {
      fetch(`/api/lobby?game=${encodeURIComponent(gameType)}`)
        .then((res) => res.json())
        .then((rooms) => {
          const virtual = rooms.filter((r) => r.isVirtual && r.status === 'waiting');
          if (virtual.length === 0) { refreshLobby(); pollTimer = setInterval(refreshLobby, 3000); return; }
          const pick = virtual[Math.floor(Math.random() * virtual.length)];
          startAsGuest(`${pick.roomId}-${generateRoomId()}`);
        })
        .catch(() => { refreshLobby(); pollTimer = setInterval(refreshLobby, 3000); });
    } else {
      refreshLobby();
      pollTimer = setInterval(refreshLobby, 3000);
    }
  } else {
    refreshLobby();
    pollTimer = setInterval(refreshLobby, 3000);
  }

  return { stopPolling };
}
