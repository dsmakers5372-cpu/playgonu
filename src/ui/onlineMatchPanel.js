// Shared "during the match" panel for both online board modules (Cham-gonu
// and Gomoku): a player bar (avatar/name/color + a running clock + whose
// turn), a win/draw/loss table, and a chat box with a floating top-of-screen
// overlay for new messages — mirroring the layout of established online
// board sites (gomoku.com) so returning players don't have to re-learn it.
//
// Every string here that can originate from the OTHER player — their typed
// name, their chat text — is untrusted input and is always written via
// .textContent, never innerHTML, even though today's players are casual
// opponents rather than attackers.
const STRINGS = {
  en: {
    chatTitle: 'Chat',
    chatPlaceholder: 'Type a message…',
    send: 'Send',
    you: 'You',
    player: 'Player',
    win: 'Win',
    draw: 'Draw',
    loss: 'Loss',
  },
  ko: {
    chatTitle: '채팅',
    chatPlaceholder: '메시지를 입력하세요',
    send: '보내기',
    you: '나',
    player: '플레이어',
    win: '승',
    draw: '무',
    loss: '패',
  },
};

function loadStats(gameType) {
  try {
    const raw = JSON.parse(localStorage.getItem(`playgonu:stats:${gameType}`));
    if (raw && typeof raw === 'object') return { wins: raw.wins | 0, draws: raw.draws | 0, losses: raw.losses | 0 };
  } catch { /* ignore */ }
  return { wins: 0, draws: 0, losses: 0 };
}

function saveStats(gameType, stats) {
  try { localStorage.setItem(`playgonu:stats:${gameType}`, JSON.stringify(stats)); } catch { /* ignore */ }
}

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function avatarInitial(name) {
  const trimmed = (name || '?').trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
}

// `root` is cleared and filled with the panel's markup. `youName`/
// `opponentName` and their color hexes drive the two sides of the player
// bar; `gameType` scopes the localStorage win/draw/loss tally.
export function mountMatchPanel(root, { lang = 'en', gameType, youName, opponentName, youColorHex, opponentColorHex }) {
  const t = STRINGS[lang] || STRINGS.en;
  root.innerHTML = '';
  root.style.cssText = 'display:flex;flex-direction:column;gap:12px;margin-top:16px;';

  const playerBar = document.createElement('div');
  playerBar.className = 'card';
  playerBar.style.cssText = 'padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;';

  function side(name, colorHex, reverse) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `display:flex;align-items:center;gap:10px;${reverse ? 'flex-direction:row-reverse;' : ''}`;
    const avatar = document.createElement('div');
    avatar.style.cssText = `width:36px;height:36px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff;background:${colorHex};`;
    avatar.textContent = avatarInitial(name);
    const label = document.createElement('span');
    label.style.cssText = 'font-size:13.5px;font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    label.textContent = name;
    wrap.append(avatar, label);
    return wrap;
  }

  const youSide = side(youName, youColorHex, false);
  const centerCol = document.createElement('div');
  centerCol.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;flex:none;';
  const clockTag = document.createElement('span');
  clockTag.className = 'tag';
  clockTag.textContent = '0:00';
  const turnCaption = document.createElement('span');
  turnCaption.style.cssText = 'font-size:12.5px;font-weight:600;color:var(--ink-soft);white-space:nowrap;';
  centerCol.append(clockTag, turnCaption);
  const oppSide = side(opponentName, opponentColorHex, true);
  playerBar.append(youSide, centerCol, oppSide);

  const statsCard = document.createElement('div');
  statsCard.className = 'card';
  statsCard.style.cssText = 'overflow:hidden;';
  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr style="color:var(--muted);text-align:left;">
    <th style="padding:10px 16px;font-weight:600;">${t.player}</th>
    <th style="padding:10px 8px;text-align:center;font-weight:600;">${t.win}</th>
    <th style="padding:10px 8px;text-align:center;font-weight:600;">${t.draw}</th>
    <th style="padding:10px 16px;text-align:center;font-weight:600;">${t.loss}</th>
  </tr>`;
  const tbody = document.createElement('tbody');
  table.append(thead, tbody);
  statsCard.appendChild(table);

  function statsCell(text, align) {
    const td = document.createElement('td');
    td.style.cssText = `padding:8px ${align === 'left' ? '16px' : '8px'};${align === 'center' ? 'text-align:center;' : ''}`;
    td.textContent = text;
    return td;
  }

  function renderStatsRows(stats) {
    tbody.innerHTML = '';
    const youRow = document.createElement('tr');
    youRow.style.cssText = 'border-top:1px solid var(--border, #e6e0d4);';
    youRow.append(statsCell(`${youName} (${t.you})`, 'left'), statsCell(String(stats.wins), 'center'), statsCell(String(stats.draws), 'center'), statsCell(String(stats.losses), 'center'));
    const oppRow = document.createElement('tr');
    oppRow.style.cssText = 'border-top:1px solid var(--border, #e6e0d4);';
    oppRow.append(statsCell(opponentName, 'left'), statsCell('0', 'center'), statsCell('0', 'center'), statsCell('0', 'center'));
    tbody.append(youRow, oppRow);
  }
  renderStatsRows(loadStats(gameType));

  const chatCard = document.createElement('div');
  chatCard.className = 'card';
  chatCard.style.cssText = 'overflow:hidden;display:flex;flex-direction:column;';
  const chatHeader = document.createElement('div');
  chatHeader.style.cssText = 'background:#2B2F3A;color:#fff;padding:10px 16px;font-weight:700;font-size:13px;letter-spacing:.02em;';
  chatHeader.textContent = t.chatTitle;
  const chatLog = document.createElement('div');
  chatLog.style.cssText = 'max-height:180px;min-height:60px;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:8px;font-size:13px;';
  const chatForm = document.createElement('form');
  chatForm.style.cssText = 'display:flex;gap:8px;padding:10px 16px;border-top:1px solid var(--border, #e6e0d4);';
  const chatInput = document.createElement('input');
  chatInput.type = 'text';
  chatInput.maxLength = 200;
  chatInput.placeholder = t.chatPlaceholder;
  chatInput.className = 'pill';
  chatInput.style.cssText = 'flex:1;box-sizing:border-box;padding:8px 12px;font-size:13px;';
  const chatSend = document.createElement('button');
  chatSend.type = 'submit';
  chatSend.className = 'btn-primary';
  chatSend.style.cssText = 'padding:8px 16px;';
  chatSend.textContent = t.send;
  chatForm.append(chatInput, chatSend);
  chatCard.append(chatHeader, chatLog, chatForm);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:14px;left:50%;transform:translate(-50%,-10px);z-index:999;opacity:0;transition:opacity .25s ease,transform .25s ease;pointer-events:none;max-width:min(90vw,420px);';
  const overlayBubble = document.createElement('div');
  overlayBubble.className = 'card';
  overlayBubble.style.cssText = 'padding:10px 16px;display:flex;align-items:baseline;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);';
  const overlayName = document.createElement('span');
  overlayName.style.cssText = 'font-weight:700;font-size:12.5px;flex:none;';
  const overlayText = document.createElement('span');
  overlayText.style.cssText = 'font-size:13px;color:var(--ink-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  overlayBubble.append(overlayName, overlayText);
  overlay.appendChild(overlayBubble);
  document.body.appendChild(overlay);

  let overlayTimer = null;
  function showOverlay(from, text) {
    overlayName.textContent = from ? `${from}:` : '';
    overlayText.textContent = text;
    overlay.style.opacity = '1';
    overlay.style.transform = 'translate(-50%,0)';
    if (overlayTimer) clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.transform = 'translate(-50%,-10px)';
    }, 3600);
  }

  function appendChatLine({ from, text, system }) {
    const line = document.createElement('div');
    if (system) {
      line.style.cssText = 'text-align:center;font-size:12px;color:var(--muted);';
      line.textContent = text;
    } else {
      line.style.cssText = 'display:flex;gap:6px;';
      const nameEl = document.createElement('span');
      nameEl.style.cssText = 'font-weight:700;flex:none;';
      nameEl.textContent = `${from}:`;
      const textEl = document.createElement('span');
      textEl.style.cssText = 'word-break:break-word;';
      textEl.textContent = text;
      line.append(nameEl, textEl);
    }
    chatLog.appendChild(line);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  let onSendChat = null;
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    onSendChat?.(text);
  });

  let timerHandle = null;
  function startTimer() {
    stopTimer();
    const start = Date.now();
    clockTag.textContent = '0:00';
    timerHandle = setInterval(() => {
      clockTag.textContent = formatClock(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  }
  function stopTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
  }

  root.append(playerBar, statsCard, chatCard);

  return {
    setTurnCaption(text) { turnCaption.textContent = text; },
    setColors(youHex, opponentHex) {
      youSide.firstChild.style.background = youHex;
      oppSide.firstChild.style.background = opponentHex;
    },
    startTimer,
    stopTimer,
    addSystemMessage(text) { appendChatLine({ system: true, text }); },
    addChatMessage(from, text) {
      appendChatLine({ from, text });
      showOverlay(from, text);
    },
    onSendChat(fn) { onSendChat = fn; },
    // outcome: 'win' | 'loss' | 'draw'
    recordResult(outcome) {
      const stats = loadStats(gameType);
      if (outcome === 'win') stats.wins += 1;
      else if (outcome === 'loss') stats.losses += 1;
      else stats.draws += 1;
      saveStats(gameType, stats);
      renderStatsRows(stats);
    },
    destroy() {
      stopTimer();
      if (overlayTimer) clearTimeout(overlayTimer);
      overlay.remove();
    },
  };
}
