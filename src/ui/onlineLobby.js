import { connectToRoom, generateRoomId } from '../net/roomClient.js';

const STRINGS = {
  en: {
    namePlaceholder: 'Your name',
    createPrivate: 'Create private room (share the link)',
    createPublic: 'Create public room (anyone can join)',
    joinByLink: 'Waiting for your opponent to join via this link:',
    copy: 'Copy',
    copied: 'Copied!',
    openRooms: 'Open public rooms',
    noOpenRooms: 'No open public rooms right now — create one!',
    join: 'Join',
    waitingHost: (name) => `${name}'s room — waiting...`,
    enterNameFirst: 'Enter your name first.',
  },
  ko: {
    namePlaceholder: '이름',
    createPrivate: '비공개 방 만들기 (링크 공유)',
    createPublic: '공개 방 만들기 (누구나 참가 가능)',
    joinByLink: '이 링크로 상대방이 들어오길 기다리는 중입니다:',
    copy: '복사',
    copied: '복사됨!',
    openRooms: '공개된 방',
    noOpenRooms: '지금 열려있는 공개 방이 없습니다 — 새로 만들어보세요!',
    join: '참가',
    waitingHost: (name) => `${name}님의 방 — 대기 중...`,
    enterNameFirst: '먼저 이름을 입력해 주세요.',
  },
};

// Renders the pre-game flow (name entry -> create public/private room or
// join an open one from the dashboard list) into `root`, and calls
// `onMatched({ roomClient, color, name, engineState, gameType, ruleset })`
// once two players are connected — from that point on, the caller owns the
// actual board UI.
export function mountOnlineLobby(root, { lang = 'en', gameType, ruleset, onMatched, onState, onOpponentLeft }) {
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

  wrap.append(nameInput, btnRow, statusArea, lobbyList);
  root.appendChild(wrap);

  let pollTimer = null;
  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  async function refreshLobby() {
    try {
      const res = await fetch(`/api/lobby?game=${encodeURIComponent(gameType)}`);
      const rooms = await res.json();
      renderRooms(rooms);
    } catch { /* transient network hiccup — try again next tick */ }
  }

  function renderRooms(rooms) {
    lobbyRows.innerHTML = '';
    if (rooms.length === 0) {
      const empty = document.createElement('p');
      empty.style.cssText = 'margin:0;font-size:13.5px;color:var(--ink-soft);';
      empty.textContent = t.noOpenRooms;
      lobbyRows.appendChild(empty);
      return;
    }
    for (const r of rooms) {
      const row = document.createElement('div');
      row.className = 'card';
      row.style.cssText = 'padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;';
      const label = document.createElement('span');
      label.style.cssText = 'font-size:14px;font-weight:600;';
      label.textContent = t.waitingHost(r.hostName);
      const joinBtn = document.createElement('button');
      joinBtn.className = 'btn-primary';
      joinBtn.textContent = t.join;
      joinBtn.addEventListener('click', () => startAsGuest(r.roomId));
      row.append(label, joinBtn);
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

  function connect(roomId, name, isPublic) {
    stopPolling();
    btnRow.style.display = 'none';
    lobbyList.style.display = 'none';
    statusArea.style.display = 'flex';

    let matched = false;
    let myColor = null;
    let myRole = null;

    function tryMatch(roomInfo) {
      if (matched) return;
      if (roomInfo.playerCount === 2 || myRole === 'spectator') {
        matched = true;
        onMatched({ roomClient: client, color: myColor, role: myRole, name, gameType, ruleset: roomInfo.ruleset });
      }
    }

    const client = connectToRoom({
      roomId,
      name,
      isPublic,
      gameType,
      ruleset,
      handlers: {
        onJoined(msg) {
          myColor = msg.color;
          myRole = msg.role;
          if (msg.role === 'player' && msg.room.playerCount < 2) {
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
          tryMatch(msg.room);
        },
        onState(msg) {
          onState?.(msg.engineState, msg.status);
        },
        onOpponentLeft() {
          onOpponentLeft?.();
        },
        onError(msg) {
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
    connect(roomId, name, isPublic);
  }

  function startAsGuest(roomId) {
    const name = requireName();
    if (!name) return;
    connect(roomId, name, false);
  }

  createPrivateBtn.addEventListener('click', () => startAsHost(false));
  createPublicBtn.addEventListener('click', () => startAsHost(true));

  // Arriving via a shared link (?room=XXXX) skips straight to joining that
  // room once a name is entered, instead of showing the create/browse UI.
  const incomingRoom = new URLSearchParams(location.search).get('room');
  if (incomingRoom) {
    btnRow.style.display = 'none';
    lobbyList.style.display = 'none';
    const joinHint = document.createElement('button');
    joinHint.className = 'btn-primary';
    joinHint.textContent = t.join;
    joinHint.style.width = '100%';
    joinHint.addEventListener('click', () => startAsGuest(incomingRoom));
    wrap.insertBefore(joinHint, statusArea);
  } else {
    refreshLobby();
    pollTimer = setInterval(refreshLobby, 3000);
  }

  return { stopPolling };
}
