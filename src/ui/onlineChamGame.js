import { legalMovesFrom, legalPlacements, legalCaptures, BOARD_EDGES, PLAYERS } from '../engine/chamgonu.js';
import { mountOnlineLobby } from './onlineLobby.js';
import { mountMatchPanel } from './onlineMatchPanel.js';
import { THEMES, getStoredTheme, setStoredTheme, renderThemeSwatches, updateThemeSwatches } from './boardThemes.js';
import { el, SVG_NS } from './svg.js';
import { playPlaceSound, playCaptureSound } from './sound.js';

function animate(node, attrs) {
  const anim = document.createElementNS(SVG_NS, 'animate');
  for (const [key, value] of Object.entries(attrs)) anim.setAttribute(key, value);
  node.appendChild(anim);
  return node;
}

const PLAYER_COLOR = {
  [PLAYERS.A]: { fill: '#AC3B2A', stroke: '#7A2A1E' },
  [PLAYERS.B]: { fill: '#2C5F8A', stroke: '#1D4360' },
};
const PLAYER_NAME = { en: { A: 'Red', B: 'Blue' }, ko: { A: '빨강', B: '파랑' } };

const POINT_PIXELS = [
  { x: 40, y: 40 }, { x: 210, y: 40 }, { x: 380, y: 40 },
  { x: 380, y: 210 }, { x: 380, y: 380 }, { x: 210, y: 380 },
  { x: 40, y: 380 }, { x: 40, y: 210 },
  { x: 97, y: 97 }, { x: 210, y: 97 }, { x: 323, y: 97 },
  { x: 323, y: 210 }, { x: 323, y: 323 }, { x: 210, y: 323 },
  { x: 97, y: 323 }, { x: 97, y: 210 },
  { x: 153, y: 153 }, { x: 210, y: 153 }, { x: 267, y: 153 },
  { x: 267, y: 210 }, { x: 267, y: 267 }, { x: 210, y: 267 },
  { x: 153, y: 267 }, { x: 153, y: 210 },
];

const T = {
  en: {
    youAre: (c) => `You are ${PLAYER_NAME.en[c]}`,
    oppLeft: 'Your opponent left the game.',
    waitTurn: (n) => `${n}'s turn`,
    yourTurn: 'Your turn',
    pickCapture: 'Pick a piece to capture',
    spectating: 'Spectating',
    gameStarted: (c) => `The game has started — you are ${PLAYER_NAME.en[c]}. Good luck!`,
    youWin: 'You win! 🎉',
    youLose: 'You lost — good game.',
    phaseBannerTitle: 'First half over!',
    phaseBannerBody: 'All 24 pieces are placed. For the second half, slide one piece per turn to an adjacent point instead of placing.',
    phaseBannerOk: 'Got it',
    resultWinTitle: 'You win! 🎉',
    resultLoseTitle: 'You lost',
    resultDrawTitle: "It's a draw",
    playAgain: 'Play again',
    leave: 'Leave',
    rematchWaiting: 'Waiting for your opponent…',
    rematchAsked: (n) => `${n} wants a rematch — press Play again.`,
    rematchStarted: (c) => `New game — this time you are ${PLAYER_NAME.en[c]}.`,
  },
  ko: {
    youAre: (c) => `당신은 ${PLAYER_NAME.ko[c]}입니다`,
    oppLeft: '상대방이 나갔습니다.',
    waitTurn: (n) => `${n} 차례`,
    yourTurn: '당신 차례',
    pickCapture: '잡을 말을 고르세요',
    spectating: '관전 중',
    gameStarted: (c) => `게임이 시작되었습니다 — 당신은 ${PLAYER_NAME.ko[c]}입니다. 화이팅!`,
    youWin: '승리했습니다! 🎉',
    youLose: '패배했습니다 — 다음엔 이길 거예요.',
    phaseBannerTitle: '전반 끝!',
    phaseBannerBody: '24개 말을 전부 놓았습니다. 후반부터는 놓는 대신 말 하나를 선을 따라 빈 자리로 한 칸씩 옮기세요.',
    phaseBannerOk: '확인',
    resultWinTitle: '승리했습니다! 🎉',
    resultLoseTitle: '패배했습니다',
    resultDrawTitle: '무승부입니다',
    playAgain: '한번더',
    leave: '나가기',
    rematchWaiting: '상대방을 기다리는 중…',
    rematchAsked: (n) => `${n}님이 한 판 더 원해요 — '한번더'를 누르세요.`,
    rematchStarted: (c) => `새 판 시작 — 이번엔 ${PLAYER_NAME.ko[c]}입니다.`,
  },
};

export function mountOnlineChamGame(root, { lang = 'en', onMatchStart } = {}) {
  const t = T[lang] || T.en;
  root.innerHTML = `
    <div data-lobby-root></div>
    <div data-game-root style="display:none;">
      <div class="toolbar" style="border-radius:8px;">
        <div class="toolbar__inner" style="padding:14px 20px;">
          <div class="turn-indicator">
            <span class="turn-dot" data-turn-dot></span>
            <span data-turn-label></span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span class="tag" data-you-label></span>
            <div style="display:flex;align-items:center;gap:8px;"><div data-theme-row style="display:flex;gap:8px;"></div></div>
          </div>
        </div>
      </div>
      <div class="board-frame" data-board-frame style="margin-top:20px;">
        <svg data-board-svg viewBox="0 0 420 420" width="420" height="420"></svg>
      </div>
      <div data-match-panel></div>
    </div>
    <div class="win-banner" data-phase-banner>
      <div class="win-banner__card">
        <div class="serif" style="font-size:22px;font-weight:700;">${t.phaseBannerTitle}</div>
        <p style="margin:0;font-size:14.5px;line-height:1.55;color:var(--ink-soft);">${t.phaseBannerBody}</p>
        <button class="btn-primary" data-phase-banner-ok>${t.phaseBannerOk}</button>
      </div>
    </div>
    <div class="win-banner" data-result-banner>
      <div class="win-banner__card">
        <div class="serif" style="font-size:22px;font-weight:700;" data-result-title></div>
        <button class="btn-primary" data-result-play-again>${t.playAgain}</button>
        <button class="btn" data-result-leave>${t.leave}</button>
      </div>
    </div>
  `;

  const lobbyRoot = root.querySelector('[data-lobby-root]');
  const gameRoot = root.querySelector('[data-game-root]');
  const svg = root.querySelector('[data-board-svg]');
  const boardFrame = root.querySelector('[data-board-frame]');
  const turnDot = root.querySelector('[data-turn-dot]');
  const turnLabel = root.querySelector('[data-turn-label]');
  const youLabel = root.querySelector('[data-you-label]');
  const swatchRow = root.querySelector('[data-theme-row]');
  const matchPanelRoot = root.querySelector('[data-match-panel]');
  const phaseBanner = root.querySelector('[data-phase-banner]');
  const phaseBannerOk = root.querySelector('[data-phase-banner-ok]');
  if (phaseBannerOk) phaseBannerOk.addEventListener('click', () => phaseBanner?.classList.remove('is-visible'));
  const resultBanner = root.querySelector('[data-result-banner]');
  const resultTitle = root.querySelector('[data-result-title]');
  const resultPlayAgain = root.querySelector('[data-result-play-again]');
  const resultLeave = root.querySelector('[data-result-leave]');
  if (resultPlayAgain) {
    resultPlayAgain.addEventListener('click', () => {
      // Same room, same opponent: the server restarts the game once both
      // players have asked (immediately against a bot).
      if (roomClient && role === 'player' && !opponentGone && roomClient.sendRematch()) {
        if (!wasVsBot) {
          resultPlayAgain.disabled = true;
          if (resultTitle) resultTitle.textContent = t.rematchWaiting;
        }
        return;
      }
      // Opponent gone (or connection lost): fall back to a fresh match.
      const url = new URL(location.href);
      url.searchParams.delete('room');
      url.searchParams.set('game', 'cham');
      // A bot match can jump straight back into a fresh bot challenge
      // instead of dropping the player back at the lobby screen — there's
      // no real opponent to lose by skipping it.
      if (wasVsBot) url.searchParams.set('autoBot', '1');
      // Assigning an unchanged href is a no-op in some browsers (no history
      // entry changes, so no reload happens) — force a real reload whenever
      // the URL wouldn't actually change.
      if (url.href === location.href) location.reload();
      else location.href = url.href;
    });
  }
  if (resultLeave) resultLeave.addEventListener('click', () => { location.href = 'index.html'; });

  let roomClient = null;
  let myColor = null;
  let role = 'player';
  let game = null;
  let selected = null;
  let mounted = false;
  let panel = null;
  let resultRecorded = false;
  let wasVsBot = false;
  let opponentGone = false;

  // Spectators have no color of their own, so the label names both sides.
  function showPlayers(players) {
    if (!players) return;
    const byColor = Object.fromEntries(players.map((p) => [p.color, p.name]));
    youLabel.textContent = `${PLAYER_NAME[lang].A} ${byColor.A ?? ""} · ${PLAYER_NAME[lang].B} ${byColor.B ?? ""}`;
  }
  // Visual feedback for an opponent's (or my own) action arriving via the
  // server's 'state' broadcast — the message only carries the resulting
  // state, not what changed, so diffing against the previous pieces array
  // is how a slide/capture gets reconstructed into something animatable.
  let moveEffectIndex = null; // point a piece just slid/placed onto
  let moveEffectTimer = null;
  let captureEffectIndex = null; // point a piece was just captured from
  let captureEffectPlayer = null;
  let captureEffectTimer = null;
  const MOVE_EFFECT_MS = 650;
  const CAPTURE_EFFECT_MS = 1300;

  function flashMove(index) {
    moveEffectIndex = index;
    clearTimeout(moveEffectTimer);
    moveEffectTimer = setTimeout(() => { moveEffectIndex = null; renderBoard(); }, MOVE_EFFECT_MS);
  }

  function flashCapture(index, player) {
    captureEffectIndex = index;
    captureEffectPlayer = player;
    clearTimeout(captureEffectTimer);
    captureEffectTimer = setTimeout(() => { captureEffectIndex = null; captureEffectPlayer = null; renderBoard(); }, CAPTURE_EFFECT_MS);
  }

  // Compares the pieces array just before and after a 'state' broadcast and
  // triggers the matching visual: a piece vacating one point and filling
  // another is a slide (or the opening placement, same shape); a point
  // vacating with nothing newly filled is a capture.
  function detectAndFlash(prevPieces, nextPieces) {
    if (!prevPieces) return;
    let vacated = -1;
    let filled = -1;
    for (let i = 0; i < nextPieces.length; i++) {
      if (prevPieces[i] !== null && nextPieces[i] === null) vacated = i;
      else if (prevPieces[i] === null && nextPieces[i] !== null) filled = i;
    }
    if (filled !== -1) flashMove(filled);
    else if (vacated !== -1) flashCapture(vacated, prevPieces[vacated]);
  }

  function isMyTurn() {
    return role === 'player' && game && game.turn === myColor && !game.winner;
  }

  function currentTargets() {
    if (!game || game.winner) return [];
    if (game.pendingCapture) return legalCaptures(game);
    if (game.phase === 'placing') return legalPlacements(game);
    if (selected !== null) return legalMovesFrom(game, selected);
    return [];
  }

  function renderBoard() {
    svg.innerHTML = '';
    const theme = THEMES[boardFrame.dataset.theme || 'wood'];
    const lineGroup = el('g', { stroke: theme.line, 'stroke-width': '3', fill: 'none' });
    for (const [a, b] of BOARD_EDGES) {
      const from = POINT_PIXELS[a];
      const to = POINT_PIXELS[b];
      lineGroup.appendChild(el('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y }));
    }
    svg.appendChild(lineGroup);

    const targets = isMyTurn() ? currentTargets() : [];
    for (const target of targets) {
      if (game.pieces[target] !== null) continue;
      const { x, y } = POINT_PIXELS[target];
      svg.appendChild(el('circle', { cx: x, cy: y, r: 11, fill: '#F6F1E6', opacity: '.9' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: 7, fill: '#2F6E6A' }));
    }

    if (selected !== null) {
      const { x, y } = POINT_PIXELS[selected];
      svg.appendChild(el('circle', { cx: x, cy: y, r: 20, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '5', opacity: '.9' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: 18, fill: 'none', stroke: '#2F6E6A', 'stroke-width': '3' }));
    }

    game.pieces.forEach((player, index) => {
      if (!player) return;
      const { x, y } = POINT_PIXELS[index];
      if (player === PLAYERS.B) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: 15, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '2', opacity: '.85' }));
      }
      const colors = PLAYER_COLOR[player];
      const piece = el('circle', { cx: x, cy: y, r: 13, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '2' });
      if (index === moveEffectIndex) animate(piece, { attributeName: 'r', values: '13;18;13', dur: `${MOVE_EFFECT_MS}ms`, fill: 'freeze' });
      svg.appendChild(piece);
      if (index === game.lastMove) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: 4, fill: '#F6F1E6' }));
      }
      if (index === moveEffectIndex) {
        const ring = el('circle', { cx: x, cy: y, r: 13, fill: 'none', stroke: colors.fill, 'stroke-width': '3' });
        animate(ring, { attributeName: 'r', from: '13', to: '24', dur: `${MOVE_EFFECT_MS}ms`, fill: 'freeze' });
        animate(ring, { attributeName: 'opacity', from: '.9', to: '0', dur: `${MOVE_EFFECT_MS}ms`, fill: 'freeze' });
        svg.appendChild(ring);
      }
    });

    // A piece that was just captured fades out in place while an expanding
    // ring sweeps outward from it, instead of just vanishing the instant the
    // state updates — same slow, deliberate effect as the local/AI board.
    if (captureEffectIndex !== null && captureEffectPlayer) {
      const { x, y } = POINT_PIXELS[captureEffectIndex];
      const colors = PLAYER_COLOR[captureEffectPlayer];
      const ghost = el('circle', { cx: x, cy: y, r: 13, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '2' });
      animate(ghost, { attributeName: 'opacity', from: '1', to: '0', dur: '1.1s', fill: 'freeze' });
      svg.appendChild(ghost);
      const ring = el('circle', { cx: x, cy: y, r: 10, fill: 'none', stroke: colors.fill, 'stroke-width': '3' });
      animate(ring, { attributeName: 'r', from: '10', to: '28', dur: '1.2s', fill: 'freeze' });
      animate(ring, { attributeName: 'opacity', from: '.9', to: '0', dur: '1.2s', fill: 'freeze' });
      svg.appendChild(ring);
    }

    for (const target of targets) {
      if (game.pieces[target] === null) continue;
      const { x, y } = POINT_PIXELS[target];
      svg.appendChild(el('circle', { cx: x, cy: y, r: 19, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '4', opacity: '.95' }));
      svg.appendChild(el('circle', { cx: x, cy: y, r: 17, fill: 'none', stroke: '#AC3B2A', 'stroke-width': '3' }));
    }

    POINT_PIXELS.forEach((_, index) => {
      const { x, y } = POINT_PIXELS[index];
      const hit = el('circle', { cx: x, cy: y, r: 16, fill: 'transparent', class: 'board-point' });
      hit.addEventListener('click', () => handlePointClick(index));
      svg.appendChild(hit);
    });
  }

  function renderToolbar() {
    if (!game) return;
    const theme = PLAYER_COLOR[game.turn];
    turnDot.style.background = game.winner ? '#6B5F53' : theme.fill;
    if (role === 'spectator') {
      turnLabel.textContent = t.spectating;
    } else if (game.winner) {
      turnLabel.textContent = `${PLAYER_NAME[lang][game.winner]} ${lang === 'ko' ? '승리!' : 'wins!'}`;
    } else if (game.pendingCapture) {
      turnLabel.textContent = isMyTurn() ? t.pickCapture : t.waitTurn(PLAYER_NAME[lang][game.turn]);
    } else {
      turnLabel.textContent = isMyTurn() ? t.yourTurn : t.waitTurn(PLAYER_NAME[lang][game.turn]);
    }
    if (role === 'player') youLabel.textContent = t.youAre(myColor);
    if (panel) panel.setTurnCaption(turnLabel.textContent);
  }

  function handlePointClick(index) {
    if (!isMyTurn()) return;
    if (game.pendingCapture) {
      if (legalCaptures(game).includes(index)) { roomClient.sendMove(null, index); selected = null; }
      return;
    }
    if (game.phase === 'placing') {
      if (legalPlacements(game).includes(index)) roomClient.sendMove(null, index);
      return;
    }
    const piece = game.pieces[index];
    if (selected === null) {
      if (piece === myColor) { selected = index; renderBoard(); }
      return;
    }
    if (index === selected) { selected = null; renderBoard(); return; }
    if (legalMovesFrom(game, selected).includes(index)) { roomClient.sendMove(selected, index); selected = null; return; }
    selected = piece === myColor ? index : null;
    renderBoard();
  }

  function applyTheme(key) {
    const theme = THEMES[key];
    boardFrame.style.background = theme.fill;
    boardFrame.style.borderColor = theme.border;
    boardFrame.dataset.theme = key;
    updateThemeSwatches(swatchRow, key);
    if (game) renderBoard();
  }

  mountOnlineLobby(lobbyRoot, {
    lang,
    gameType: 'cham',
    onMatched(info) {
      roomClient = info.roomClient;
      myColor = info.color;
      role = info.role;
      mounted = true;
      resultRecorded = false;
      wasVsBot = !!info.vsBot;
      phaseBanner?.classList.remove('is-visible');
      resultBanner?.classList.remove('is-visible');
      lobbyRoot.style.display = 'none';
      gameRoot.style.display = 'block';
      renderThemeSwatches(swatchRow, { current: getStoredTheme(), onSelect: (key) => { setStoredTheme(key); applyTheme(key); } });
      applyTheme(getStoredTheme());
      if (role === 'player') {
        const opponentColor = myColor === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
        panel = mountMatchPanel(matchPanelRoot, {
          lang,
          gameType: 'cham',
          youName: info.name,
          opponentName: info.opponentName || (lang === 'ko' ? '상대' : 'Opponent'),
          youColorHex: PLAYER_COLOR[myColor].fill,
          opponentColorHex: PLAYER_COLOR[opponentColor].fill,
        });
        panel.onSendChat((text) => roomClient.sendChat(text));
        panel.addSystemMessage(t.gameStarted(myColor));
        panel.startTimer();
      }
      if (role === 'spectator') showPlayers(info.players);
      onMatchStart?.();
    },
    onState(engineState, status) {
      const prevPieces = game ? game.pieces : null;
      const prevCount = game ? game.pieces.filter(Boolean).length : 0;
      const wasWinner = game ? game.winner : null;
      const prevPhase = game ? game.phase : null;
      game = engineState;
      selected = null;
      if (!mounted) return;
      const newCount = game.pieces.filter(Boolean).length;
      if (newCount > prevCount) playPlaceSound();
      else if (newCount < prevCount) playCaptureSound();
      detectAndFlash(prevPieces, game.pieces);
      renderBoard();
      renderToolbar();
      if (prevPhase === 'placing' && game.phase === 'moving') phaseBanner?.classList.add('is-visible');
      if (role === 'player' && !resultRecorded && !wasWinner && game.winner) {
        resultRecorded = true;
        panel?.stopTimer();
        const won = game.winner === myColor;
        panel?.recordResult(won ? 'win' : 'loss');
        panel?.addSystemMessage(won ? t.youWin : t.youLose);
        if (resultTitle) resultTitle.textContent = won ? t.resultWinTitle : t.resultLoseTitle;
        resultBanner?.classList.add('is-visible');
      }
    },
    onChat(msg) {
      panel?.addChatMessage(msg.from, msg.text);
    },
    onRematchRequested(msg) {
      panel?.addSystemMessage(t.rematchAsked(msg.name));
    },
    onRematchStart(msg) {
      showPlayers(msg.players);
      if (msg.color) myColor = msg.color;
      game = msg.engineState;
      resultRecorded = false;
      selected = null;
      moveEffectIndex = null;
      captureEffectIndex = null;
      captureEffectPlayer = null;
      phaseBanner?.classList.remove('is-visible');
      resultBanner?.classList.remove('is-visible');
      if (resultPlayAgain) resultPlayAgain.disabled = false;
      if (panel) {
        const opponentColor = myColor === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
        panel.setColors(PLAYER_COLOR[myColor].fill, PLAYER_COLOR[opponentColor].fill);
        panel.addSystemMessage(t.rematchStarted(myColor));
        panel.startTimer();
      }
      renderBoard();
      renderToolbar();
    },
    onOpponentLeft() {
      opponentGone = true;
      if (resultPlayAgain) resultPlayAgain.disabled = false;
      if (turnLabel) turnLabel.textContent = t.oppLeft;
      if (panel) {
        panel.stopTimer();
        panel.addSystemMessage(t.oppLeft);
      }
    },
  });
}
