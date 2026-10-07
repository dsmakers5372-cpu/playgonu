import { legalMovesFrom, legalPlacements, legalCaptures, BOARD_EDGES, PLAYERS } from '../engine/chamgonu.js';
import { mountOnlineLobby } from './onlineLobby.js';
import { mountMatchPanel } from './onlineMatchPanel.js';
import { THEMES, getStoredTheme, setStoredTheme, renderThemeSwatches, updateThemeSwatches } from './boardThemes.js';
import { el } from './svg.js';
import { playPlaceSound, playCaptureSound } from './sound.js';

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
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="tag" data-you-label></span>
            <div data-theme-row style="display:flex;gap:8px;"></div>
          </div>
        </div>
      </div>
      <div class="board-frame" data-board-frame style="margin-top:20px;">
        <svg data-board-svg viewBox="0 0 420 420" width="420" height="420"></svg>
      </div>
      <div data-match-panel></div>
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

  let roomClient = null;
  let myColor = null;
  let role = 'player';
  let game = null;
  let selected = null;
  let mounted = false;
  let panel = null;
  let resultRecorded = false;

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
      svg.appendChild(el('circle', { cx: x, cy: y, r: 13, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '2' }));
    });

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
      onMatchStart?.();
    },
    onState(engineState, status) {
      const prevCount = game ? game.pieces.filter(Boolean).length : 0;
      const wasWinner = game ? game.winner : null;
      game = engineState;
      selected = null;
      if (!mounted) return;
      const newCount = game.pieces.filter(Boolean).length;
      if (newCount > prevCount) playPlaceSound();
      else if (newCount < prevCount) playCaptureSound();
      renderBoard();
      renderToolbar();
      if (panel && !resultRecorded && !wasWinner && game.winner) {
        resultRecorded = true;
        panel.stopTimer();
        if (game.winner === myColor) {
          panel.recordResult('win');
          panel.addSystemMessage(t.youWin);
        } else {
          panel.recordResult('loss');
          panel.addSystemMessage(t.youLose);
        }
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
