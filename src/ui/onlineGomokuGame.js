import { legalPlacements, forbiddenPoints, toIndex, toCoords, BOARD_SIZE, PLAYERS, RULESETS } from '../engine/gomoku.js';
import { mountOnlineLobby } from './onlineLobby.js';
import { mountMatchPanel } from './onlineMatchPanel.js';
import { THEMES, getStoredTheme, setStoredTheme, renderThemeSwatches, updateThemeSwatches } from './boardThemes.js';
import { el, SVG_NS } from './svg.js';
import { playPlaceSound } from './sound.js';

function animate(node, attrs) {
  const anim = document.createElementNS(SVG_NS, 'animate');
  for (const [key, value] of Object.entries(attrs)) anim.setAttribute(key, value);
  node.appendChild(anim);
  return node;
}

const MOVE_EFFECT_MS = 500;

const PLAYER_COLOR = {
  [PLAYERS.A]: { fill: '#242019', stroke: '#000000' },
  [PLAYERS.B]: { fill: '#F8F4E9', stroke: '#3A332C' },
};
const PLAYER_NAME = { en: { A: 'Black', B: 'White' }, ko: { A: '검정', B: '흰돌' } };

const VIEWPORT = 420;
const MARGIN = 14;
const STEP = (VIEWPORT - MARGIN * 2) / (BOARD_SIZE - 1);
const STAR_POINTS = [3, 7, 11].flatMap((row) => [3, 7, 11].map((col) => toIndex(row, col)));

function pointPixel(index) {
  const { row, col } = toCoords(index);
  return { x: MARGIN + col * STEP, y: MARGIN + row * STEP };
}

const T = {
  en: {
    youAre: (c) => `You are ${PLAYER_NAME.en[c]}`,
    oppLeft: 'Your opponent left the game.',
    waitTurn: (n) => `${n}'s turn`,
    yourTurn: 'Your turn',
    spectating: 'Spectating',
    draw: "It's a draw!",
    gameStarted: (c) => `The game has started — you are ${PLAYER_NAME.en[c]}. Good luck!`,
    youWin: 'You win! 🎉',
    youLose: 'You lost — good game.',
    drawMsg: "It's a draw!",
    resultWinTitle: 'You win! 🎉',
    resultLoseTitle: 'You lost',
    resultDrawTitle: "It's a draw",
    playAgain: 'Play again',
    leave: 'Leave',
  },
  ko: {
    youAre: (c) => `당신은 ${PLAYER_NAME.ko[c]}입니다`,
    oppLeft: '상대방이 나갔습니다.',
    waitTurn: (n) => `${n} 차례`,
    yourTurn: '당신 차례',
    spectating: '관전 중',
    draw: '무승부!',
    gameStarted: (c) => `게임이 시작되었습니다 — 당신은 ${PLAYER_NAME.ko[c]}입니다. 화이팅!`,
    youWin: '승리했습니다! 🎉',
    youLose: '패배했습니다 — 다음엔 이길 거예요.',
    drawMsg: '무승부입니다.',
    resultWinTitle: '승리했습니다! 🎉',
    resultLoseTitle: '패배했습니다',
    resultDrawTitle: '무승부입니다',
    playAgain: '한번더',
    leave: '나가기',
  },
};

export function mountOnlineGomokuGame(root, { lang = 'en', ruleset = RULESETS.FREESTYLE, onMatchStart } = {}) {
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
  const resultBanner = root.querySelector('[data-result-banner]');
  const resultTitle = root.querySelector('[data-result-title]');
  const resultPlayAgain = root.querySelector('[data-result-play-again]');
  const resultLeave = root.querySelector('[data-result-leave]');
  if (resultPlayAgain) {
    resultPlayAgain.addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.delete('room');
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
  let mounted = false;
  let panel = null;
  let resultRecorded = false;
  let wasVsBot = false;
  let pulseIndex = null; // the last-placed stone, briefly highlighted
  let pulseTimer = null;

  function isMyTurn() {
    return role === 'player' && game && game.turn === myColor && !game.winner;
  }

  function renderBoard() {
    svg.innerHTML = '';
    const theme = THEMES[boardFrame.dataset.theme || 'wood'];
    const lineGroup = el('g', { stroke: theme.line, 'stroke-width': '1.4', fill: 'none' });
    for (let i = 0; i < BOARD_SIZE; i++) {
      const y = MARGIN + i * STEP;
      lineGroup.appendChild(el('line', { x1: MARGIN, y1: y, x2: VIEWPORT - MARGIN, y2: y }));
      const x = MARGIN + i * STEP;
      lineGroup.appendChild(el('line', { x1: x, y1: MARGIN, x2: x, y2: VIEWPORT - MARGIN }));
    }
    svg.appendChild(lineGroup);

    for (const idx of STAR_POINTS) {
      const { x, y } = pointPixel(idx);
      svg.appendChild(el('circle', { cx: x, cy: y, r: 3, fill: theme.line }));
    }

    if (game.winLine && game.winLine.length >= 2) {
      const from = pointPixel(game.winLine[0]);
      const to = pointPixel(game.winLine[game.winLine.length - 1]);
      svg.appendChild(el('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: '#D9A441', 'stroke-width': '5', 'stroke-linecap': 'round', opacity: '.8' }));
    }

    if (isMyTurn() && game.ruleset === RULESETS.RENJU) {
      for (const idx of forbiddenPoints(game)) {
        const { x, y } = pointPixel(idx);
        const r = STEP * 0.26;
        const strokeAttrs = { stroke: '#AC3B2A', 'stroke-width': '2.2', 'stroke-linecap': 'round' };
        svg.appendChild(el('line', { x1: x - r, y1: y - r, x2: x + r, y2: y + r, ...strokeAttrs }));
        svg.appendChild(el('line', { x1: x - r, y1: y + r, x2: x + r, y2: y - r, ...strokeAttrs }));
      }
    }

    const winSet = new Set(game.winLine || []);
    game.cells.forEach((player, index) => {
      if (!player) return;
      const { x, y } = pointPixel(index);
      const colors = PLAYER_COLOR[player];
      if (winSet.has(index)) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.46, fill: 'none', stroke: '#D9A441', 'stroke-width': '2.5' }));
      }
      if (player === PLAYERS.A) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.4, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '1.4', opacity: '.8' }));
      }
      const piece = el('circle', { cx: x, cy: y, r: STEP * 0.38, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '1.4' });
      if (index === pulseIndex) animate(piece, { attributeName: 'r', values: `${STEP * 0.38};${STEP * 0.52};${STEP * 0.38}`, dur: `${MOVE_EFFECT_MS}ms`, fill: 'freeze' });
      svg.appendChild(piece);
      if (index === game.lastMove) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.12, fill: player === PLAYERS.B ? '#3A332C' : '#F6F1E6' }));
      }
      if (index === pulseIndex) {
        const ring = el('circle', { cx: x, cy: y, r: STEP * 0.38, fill: 'none', stroke: colors.fill, 'stroke-width': '2.5' });
        animate(ring, { attributeName: 'r', from: String(STEP * 0.38), to: String(STEP * 0.75), dur: `${MOVE_EFFECT_MS}ms`, fill: 'freeze' });
        animate(ring, { attributeName: 'opacity', from: '.9', to: '0', dur: `${MOVE_EFFECT_MS}ms`, fill: 'freeze' });
        svg.appendChild(ring);
      }
    });

    const legal = isMyTurn() ? new Set(legalPlacements(game)) : null;
    game.cells.forEach((_, index) => {
      const { x, y } = pointPixel(index);
      const hit = el('circle', { cx: x, cy: y, r: STEP * 0.46, fill: 'transparent', class: 'board-point' });
      hit.addEventListener('click', () => handlePointClick(index, legal));
      svg.appendChild(hit);
    });
  }

  function renderToolbar() {
    if (!game) return;
    const theme = PLAYER_COLOR[game.turn];
    turnDot.style.background = game.winner === 'draw' ? '#6B5F53' : theme.fill;
    if (role === 'spectator') {
      turnLabel.textContent = t.spectating;
    } else if (game.winner === 'draw') {
      turnLabel.textContent = t.draw;
    } else if (game.winner) {
      turnLabel.textContent = `${PLAYER_NAME[lang][game.winner]} ${lang === 'ko' ? '승리!' : 'wins!'}`;
    } else {
      turnLabel.textContent = isMyTurn() ? t.yourTurn : t.waitTurn(PLAYER_NAME[lang][game.turn]);
    }
    if (role === 'player') youLabel.textContent = t.youAre(myColor);
    if (panel) panel.setTurnCaption(turnLabel.textContent);
  }

  function handlePointClick(index, legalSet) {
    if (!isMyTurn()) return;
    if (game.cells[index] !== null) return;
    if (legalSet && !legalSet.has(index)) return;
    roomClient.sendMove(null, index);
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
    gameType: 'gomoku',
    ruleset,
    onMatched(info) {
      roomClient = info.roomClient;
      myColor = info.color;
      role = info.role;
      mounted = true;
      resultRecorded = false;
      wasVsBot = !!info.vsBot;
      resultBanner?.classList.remove('is-visible');
      lobbyRoot.style.display = 'none';
      gameRoot.style.display = 'block';
      renderThemeSwatches(swatchRow, { current: getStoredTheme(), onSelect: (key) => { setStoredTheme(key); applyTheme(key); } });
      applyTheme(getStoredTheme());
      if (role === 'player') {
        const opponentColor = myColor === PLAYERS.A ? PLAYERS.B : PLAYERS.A;
        panel = mountMatchPanel(matchPanelRoot, {
          lang,
          gameType: 'gomoku',
          youName: info.name,
          opponentName: info.opponentName || (lang === 'ko' ? '상대' : 'Opponent'),
          youColorHex: PLAYER_COLOR[myColor].fill,
          opponentColorHex: PLAYER_COLOR[opponentColor].fill,
        });
        panel.onSendChat((text) => roomClient.sendChat(text));
        panel.addSystemMessage(t.gameStarted(myColor));
        panel.startTimer();
      }
      onMatchStart?.();
    },
    onState(engineState) {
      const prevCount = game ? game.cells.filter(Boolean).length : 0;
      const wasWinner = game ? game.winner : null;
      const prevLastMove = game ? game.lastMove : null;
      game = engineState;
      if (!mounted) return;
      const newCount = game.cells.filter(Boolean).length;
      if (newCount > prevCount) playPlaceSound();
      if (game.lastMove !== null && game.lastMove !== prevLastMove) {
        pulseIndex = game.lastMove;
        clearTimeout(pulseTimer);
        pulseTimer = setTimeout(() => { pulseIndex = null; renderBoard(); }, MOVE_EFFECT_MS);
      }
      renderBoard();
      renderToolbar();
      if (role === 'player' && !resultRecorded && !wasWinner && game.winner) {
        resultRecorded = true;
        panel?.stopTimer();
        let outcome, sysMsg, title;
        if (game.winner === 'draw') { outcome = 'draw'; sysMsg = t.drawMsg; title = t.resultDrawTitle; }
        else if (game.winner === myColor) { outcome = 'win'; sysMsg = t.youWin; title = t.resultWinTitle; }
        else { outcome = 'loss'; sysMsg = t.youLose; title = t.resultLoseTitle; }
        panel?.recordResult(outcome);
        panel?.addSystemMessage(sysMsg);
        if (resultTitle) resultTitle.textContent = title;
        resultBanner?.classList.add('is-visible');
      }
    },
    onChat(msg) {
      panel?.addChatMessage(msg.from, msg.text);
    },
    onOpponentLeft() {
      if (turnLabel) turnLabel.textContent = t.oppLeft;
      if (panel) {
        panel.stopTimer();
        panel.addSystemMessage(t.oppLeft);
      }
    },
  });
}
