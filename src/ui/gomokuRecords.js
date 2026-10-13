import { PLAYERS, RULESETS, BOARD_SIZE, toCoords } from '../engine/gomoku.js';
import {
  pointLabel,
  replay,
  encodeRecord,
  decodeRecord,
  toPsq,
  fromPsq,
  loadRecords,
  saveRecord,
  deleteRecord,
} from '../engine/gomokuRecord.js';
import { THEMES, getStoredTheme } from './boardThemes.js';
import { el } from './svg.js';
import { createRapfiHint, rapfiSupported } from './rapfiHint.js';

const RAPFI_URL = 'https://github.com/dhbloo/rapfi';

export const RECORD_STRINGS = {
  en: {
    title: 'Gomoku game records',
    intro: 'Replay your finished games move by move, and ask RAPFI — the Gomocup 2025 champion engine — where it would play at any point.',
    myGames: 'My games',
    empty: 'No saved games yet. Finish a game of Gomoku and it will appear here.',
    openFile: 'Open file',
    sharedTitle: 'Opened record',
    noRecord: 'Pick a game from the list, or open a link or file, to replay it here.',
    move: (n, total) => `Move ${n} / ${total}`,
    startPos: 'Start',
    first: 'First move', prev: 'Back one move', next: 'Forward one move', last: 'Last move',
    numbers: 'Move numbers',
    askHint: 'Ask RAPFI',
    thinking: 'RAPFI is thinking…',
    loadingEngine: 'Loading RAPFI…',
    hintFor: (side) => `At this position (${side} to move) RAPFI would play`,
    hintMeta: (depth, evalText) => `Depth ${depth} · ${evalText}`,
    hintFinished: 'The game is already over at this position.',
    hintUnsupported: "This browser can't run RAPFI (it needs WebAssembly SIMD).",
    hintError: "RAPFI couldn't be loaded. Please try again.",
    evalEven: (v) => `about even (${v})`,
    evalBetter: (side, v) => `slightly better for ${side} (${v})`,
    evalClearly: (side, v) => `clearly better for ${side} (${v})`,
    evalWinning: (side, v) => `winning for ${side} (${v})`,
    copyLink: 'Copy link', copied: 'Link copied',
    saveFile: 'Save file',
    saveToList: 'Save to My games', savedToList: 'Saved to My games',
    remove: 'Delete', confirmRemove: 'Delete this record from this browser?',
    linkInvalid: "That link's record couldn't be read.",
    fileInvalid: "That file isn't a 15×15 Gomoku record.",
    modeAi: 'vs AI', modeLocal: '2 players', modeOnline: 'Online',
    ruleFree: 'Freestyle', ruleRenju: 'Renju',
    moves: (n) => `${n} moves`,
    black: 'Black', white: 'White',
    resultWin: (n) => `${n} won`, resultDraw: 'Draw', resultOpen: 'Unfinished',
    guideTitle: 'Keeping your records',
    guide: [
      'Games you finish on PlayGonu are saved automatically in this browser. No account and no login — nothing to sign up for.',
      'They live only on this device and in this browser. If you clear site data, play in a private window, or switch to another phone or computer, they will not be there.',
      'To keep a game for good, or to move it to another device, use <strong>Copy link</strong> (the whole game is inside the link — send it to anyone, open it anywhere) or <strong>Save file</strong> (a .psq file that other Gomoku programs can open too). <strong>Open file</strong> brings a saved file back.',
      'Use the arrows (or the ← → keys) to step through a game. At any position, <strong>Ask RAPFI</strong> shows the move it would play and the line it expects to follow.',
    ],
    credit: (link) => `Hints are computed in your browser by ${link} (GPL-3.0).`,
  },
  ko: {
    title: '오목 기보 복기',
    intro: '끝난 대국을 한 수씩 되짚어 보고, 어느 시점에서든 2025 고모쿠 대회 우승 엔진 RAPFI에게 어디에 둘지 물어볼 수 있습니다.',
    myGames: '내 대국',
    empty: '저장된 대국이 아직 없습니다. 오목 한 판을 끝내면 여기에 나타납니다.',
    openFile: '파일 열기',
    sharedTitle: '열어 본 기보',
    noRecord: '목록에서 대국을 고르거나, 링크·파일을 열면 여기서 복기할 수 있습니다.',
    move: (n, total) => `${n}수 / ${total}수`,
    startPos: '시작',
    first: '처음으로', prev: '한 수 뒤로', next: '한 수 앞으로', last: '마지막 수',
    numbers: '수순 번호',
    askHint: 'RAPFI 훈수',
    thinking: 'RAPFI가 생각 중…',
    loadingEngine: 'RAPFI 불러오는 중…',
    hintFor: (side) => `이 국면(${side} 차례)에서 RAPFI라면`,
    hintMeta: (depth, evalText) => `수읽기 깊이 ${depth} · ${evalText}`,
    hintFinished: '이 국면은 이미 대국이 끝난 상태입니다.',
    hintUnsupported: '이 브라우저에서는 RAPFI를 실행할 수 없습니다(WebAssembly SIMD 필요).',
    hintError: 'RAPFI를 불러오지 못했습니다. 다시 시도해 주세요.',
    evalEven: (v) => `거의 비슷 (${v})`,
    evalBetter: (side, v) => `${side} 약간 유리 (${v})`,
    evalClearly: (side, v) => `${side} 확실히 유리 (${v})`,
    evalWinning: (side, v) => `${side} 승세 (${v})`,
    copyLink: '링크 복사', copied: '링크를 복사했습니다',
    saveFile: '파일로 저장',
    saveToList: '내 대국에 저장', savedToList: '내 대국에 저장했습니다',
    remove: '삭제', confirmRemove: '이 브라우저에서 이 기보를 삭제할까요?',
    linkInvalid: '링크의 기보를 읽을 수 없습니다.',
    fileInvalid: '15×15 오목 기보 파일이 아닙니다.',
    modeAi: 'AI 대국', modeLocal: '2인 대국', modeOnline: '온라인',
    ruleFree: '자유룰', ruleRenju: '렌주룰',
    moves: (n) => `${n}수`,
    black: '검정', white: '흰돌',
    resultWin: (n) => `${n} 승`, resultDraw: '무승부', resultOpen: '진행 중',
    guideTitle: '기보 보관 안내',
    guide: [
      '플레이고누에서 끝낸 대국은 이 브라우저에 자동 저장됩니다. 회원가입도 로그인도 필요 없습니다.',
      '저장된 기보는 이 기기의 이 브라우저에만 남습니다. 사이트 데이터를 지우거나, 시크릿 창에서 두거나, 다른 폰·컴퓨터로 옮기면 보이지 않습니다.',
      '남기고 싶은 판은 <strong>링크 복사</strong>(대국 전체가 링크 안에 들어 있어 누구에게나 보내고 어디서나 열 수 있습니다)나 <strong>파일로 저장</strong>(다른 오목 프로그램에서도 열 수 있는 .psq 파일)으로 직접 보관하거나 다른 기기로 옮길 수 있습니다. 저장한 파일은 <strong>파일 열기</strong>로 다시 불러옵니다.',
      '화살표(또는 키보드 ← →)로 한 수씩 넘겨 보세요. 어느 국면에서든 <strong>RAPFI 훈수</strong>를 누르면 RAPFI가 둘 자리와 예상 진행을 보여 줍니다.',
    ],
    credit: (link) => `훈수는 브라우저 안에서 ${link}(GPL-3.0)가 계산합니다.`,
  },
  es: {
    title: 'Partidas de Gomoku',
    intro: 'Repasa tus partidas jugada a jugada y pregunta a RAPFI —el motor campeón de Gomocup 2025— dónde jugaría en cualquier posición.',
    myGames: 'Mis partidas',
    empty: 'Aún no hay partidas guardadas. Termina una partida de Gomoku y aparecerá aquí.',
    openFile: 'Abrir archivo',
    sharedTitle: 'Partida abierta',
    noRecord: 'Elige una partida de la lista, o abre un enlace o archivo, para repasarla aquí.',
    move: (n, total) => `Jugada ${n} / ${total}`,
    startPos: 'Inicio',
    first: 'Primera jugada', prev: 'Una jugada atrás', next: 'Una jugada adelante', last: 'Última jugada',
    numbers: 'Números de jugada',
    askHint: 'Preguntar a RAPFI',
    thinking: 'RAPFI está pensando…',
    loadingEngine: 'Cargando RAPFI…',
    hintFor: (side) => `En esta posición (juegan ${side}) RAPFI jugaría`,
    hintMeta: (depth, evalText) => `Profundidad ${depth} · ${evalText}`,
    hintFinished: 'La partida ya terminó en esta posición.',
    hintUnsupported: 'Este navegador no puede ejecutar RAPFI (requiere WebAssembly SIMD).',
    hintError: 'No se pudo cargar RAPFI. Inténtalo de nuevo.',
    evalEven: (v) => `más o menos igualado (${v})`,
    evalBetter: (side, v) => `algo mejor para ${side} (${v})`,
    evalClearly: (side, v) => `claramente mejor para ${side} (${v})`,
    evalWinning: (side, v) => `ganador para ${side} (${v})`,
    copyLink: 'Copiar enlace', copied: 'Enlace copiado',
    saveFile: 'Guardar archivo',
    saveToList: 'Guardar en Mis partidas', savedToList: 'Guardada en Mis partidas',
    remove: 'Eliminar', confirmRemove: '¿Eliminar esta partida de este navegador?',
    linkInvalid: 'No se pudo leer la partida del enlace.',
    fileInvalid: 'Ese archivo no es una partida de Gomoku 15×15.',
    modeAi: 'Contra la IA', modeLocal: '2 jugadores', modeOnline: 'En línea',
    ruleFree: 'Freestyle', ruleRenju: 'Renju',
    moves: (n) => `${n} jugadas`,
    black: 'Negras', white: 'Blancas',
    resultWin: (n) => `Ganan ${n}`, resultDraw: 'Empate', resultOpen: 'Sin terminar',
    guideTitle: 'Cómo se guardan tus partidas',
    guide: [
      'Las partidas que terminas en PlayGonu se guardan automáticamente en este navegador. Sin cuenta ni inicio de sesión.',
      'Solo existen en este dispositivo y en este navegador. Si borras los datos del sitio, juegas en una ventana privada o cambias de teléfono u ordenador, no estarán.',
      'Para conservar una partida o llevarla a otro dispositivo, usa <strong>Copiar enlace</strong> (la partida completa va dentro del enlace: envíalo a quien quieras y ábrelo donde sea) o <strong>Guardar archivo</strong> (un archivo .psq que también abren otros programas de Gomoku). <strong>Abrir archivo</strong> lo recupera.',
      'Usa las flechas (o las teclas ← →) para avanzar jugada a jugada. En cualquier posición, <strong>Preguntar a RAPFI</strong> muestra la jugada que haría y la variante que espera.',
    ],
    credit: (link) => `Las sugerencias las calcula ${link} (GPL-3.0) en tu navegador.`,
  },
  ja: {
    title: '五目並べ 棋譜',
    intro: '終わった対局を一手ずつ振り返り、どの局面でも Gomocup 2025 優勝エンジン RAPFI に「ここならどこに打つか」を聞けます。',
    myGames: '自分の対局',
    empty: '保存された対局はまだありません。五目並べを一局終えるとここに表示されます。',
    openFile: 'ファイルを開く',
    sharedTitle: '開いた棋譜',
    noRecord: 'リストから対局を選ぶか、リンクやファイルを開くと、ここで振り返れます。',
    move: (n, total) => `${n}手目 / ${total}手`,
    startPos: '開始',
    first: '最初へ', prev: '一手戻る', next: '一手進む', last: '最後へ',
    numbers: '手数表示',
    askHint: 'RAPFIに聞く',
    thinking: 'RAPFIが考え中…',
    loadingEngine: 'RAPFIを読み込み中…',
    hintFor: (side) => `この局面（${side}の番）でRAPFIなら`,
    hintMeta: (depth, evalText) => `読みの深さ ${depth} · ${evalText}`,
    hintFinished: 'この局面ではすでに対局が終わっています。',
    hintUnsupported: 'このブラウザではRAPFIを実行できません（WebAssembly SIMDが必要）。',
    hintError: 'RAPFIを読み込めませんでした。もう一度お試しください。',
    evalEven: (v) => `ほぼ互角 (${v})`,
    evalBetter: (side, v) => `${side}がやや有利 (${v})`,
    evalClearly: (side, v) => `${side}が有利 (${v})`,
    evalWinning: (side, v) => `${side}が勝勢 (${v})`,
    copyLink: 'リンクをコピー', copied: 'リンクをコピーしました',
    saveFile: 'ファイルに保存',
    saveToList: '自分の対局に保存', savedToList: '自分の対局に保存しました',
    remove: '削除', confirmRemove: 'このブラウザからこの棋譜を削除しますか？',
    linkInvalid: 'リンクの棋譜を読み取れませんでした。',
    fileInvalid: '15×15の五目並べの棋譜ファイルではありません。',
    modeAi: 'AI対局', modeLocal: '2人対局', modeOnline: 'オンライン',
    ruleFree: 'フリースタイル', ruleRenju: '連珠',
    moves: (n) => `${n}手`,
    black: '黒', white: '白',
    resultWin: (n) => `${n}の勝ち`, resultDraw: '引き分け', resultOpen: '未完了',
    guideTitle: '棋譜の保存について',
    guide: [
      'PlayGonuで終えた対局は、このブラウザに自動で保存されます。アカウント登録もログインも不要です。',
      '保存先はこの端末のこのブラウザだけです。サイトデータを消したり、プライベートウィンドウで遊んだり、別のスマホ・パソコンに移ると表示されません。',
      '残したい対局は、<strong>リンクをコピー</strong>（対局がまるごとリンクに入っているので、誰にでも送れてどこでも開けます）か<strong>ファイルに保存</strong>（ほかの五目並べソフトでも開ける.psqファイル）で自分で保管したり、別の端末に移したりできます。保存したファイルは<strong>ファイルを開く</strong>で読み込めます。',
      '矢印（またはキーボードの ← →）で一手ずつ進められます。どの局面でも<strong>RAPFIに聞く</strong>を押すと、RAPFIが打つ手と予想する進行を表示します。',
    ],
    credit: (link) => `助言はブラウザ内で ${link}（GPL-3.0）が計算します。`,
  },
  zh: {
    title: '五子棋棋谱复盘',
    intro: '逐手回顾已完成的对局，并可在任意局面询问 Gomocup 2025 冠军引擎 RAPFI：如果是它，会下在哪里。',
    myGames: '我的对局',
    empty: '还没有保存的对局。下完一局五子棋后会出现在这里。',
    openFile: '打开文件',
    sharedTitle: '已打开的棋谱',
    noRecord: '从列表中选一局，或打开链接、文件，即可在这里复盘。',
    move: (n, total) => `第 ${n} 手 / 共 ${total} 手`,
    startPos: '开局',
    first: '回到开头', prev: '后退一手', next: '前进一手', last: '最后一手',
    numbers: '显示手数',
    askHint: '问问 RAPFI',
    thinking: 'RAPFI 思考中…',
    loadingEngine: '正在加载 RAPFI…',
    hintFor: (side) => `在这个局面（轮到${side}）RAPFI 会下`,
    hintMeta: (depth, evalText) => `搜索深度 ${depth} · ${evalText}`,
    hintFinished: '这个局面对局已经结束。',
    hintUnsupported: '此浏览器无法运行 RAPFI（需要 WebAssembly SIMD）。',
    hintError: '无法加载 RAPFI，请重试。',
    evalEven: (v) => `大致均势 (${v})`,
    evalBetter: (side, v) => `${side}略占优 (${v})`,
    evalClearly: (side, v) => `${side}明显占优 (${v})`,
    evalWinning: (side, v) => `${side}胜势 (${v})`,
    copyLink: '复制链接', copied: '链接已复制',
    saveFile: '保存为文件',
    saveToList: '保存到我的对局', savedToList: '已保存到我的对局',
    remove: '删除', confirmRemove: '要从此浏览器删除这份棋谱吗？',
    linkInvalid: '无法读取链接中的棋谱。',
    fileInvalid: '该文件不是 15×15 五子棋棋谱。',
    modeAi: '人机对局', modeLocal: '双人对局', modeOnline: '在线',
    ruleFree: '自由规则', ruleRenju: '连珠规则',
    moves: (n) => `${n} 手`,
    black: '黑方', white: '白方',
    resultWin: (n) => `${n}获胜`, resultDraw: '平局', resultOpen: '未结束',
    guideTitle: '棋谱保存说明',
    guide: [
      '在 PlayGonu 下完的对局会自动保存在此浏览器中，无需注册，也无需登录。',
      '棋谱只保存在这台设备的这个浏览器里。清除网站数据、使用无痕窗口，或换到另一部手机/电脑，就看不到了。',
      '想长期保留或转移到其他设备，可以用<strong>复制链接</strong>（整局棋都在链接里，发给谁都行，在哪里都能打开）或<strong>保存为文件</strong>（其他五子棋软件也能打开的 .psq 文件）自己保管。保存的文件可用<strong>打开文件</strong>重新载入。',
      '用箭头（或键盘 ← →）逐手查看。在任意局面点<strong>问问 RAPFI</strong>，会显示它会下的位置和预计的后续变化。',
    ],
    credit: (link) => `提示由 ${link}（GPL-3.0）在你的浏览器中计算。`,
  },
};

const VIEWPORT = 420;
const MARGIN = 26;
const STEP = (VIEWPORT - MARGIN * 2) / (BOARD_SIZE - 1);
const STAR_POINTS = [3, 7, 11].flatMap((row) => [3, 7, 11].map((col) => row * BOARD_SIZE + col));
const COLUMN_LETTERS = 'ABCDEFGHIJKLMNO';
const PLAYER_COLOR = {
  [PLAYERS.A]: { fill: '#242019', stroke: '#000000', text: '#F6F1E6' },
  [PLAYERS.B]: { fill: '#F8F4E9', stroke: '#3A332C', text: '#3A332C' },
};
const PV_SHOWN = 6;

const pointPixel = (index) => {
  const { row, col } = toCoords(index);
  return { x: MARGIN + col * STEP, y: MARGIN + row * STEP };
};

function evalBand(evalRaw) {
  if (/m/i.test(evalRaw)) return { sign: evalRaw.startsWith('-') ? -1 : 1, level: 3 };
  const v = Number(evalRaw);
  if (!Number.isFinite(v)) return { sign: 0, level: 0 };
  const a = Math.abs(v);
  return { sign: v < 0 ? -1 : 1, level: a < 150 ? 0 : a < 600 ? 1 : a < 2000 ? 2 : 3 };
}

export function mountGomokuRecords(root, { lang: requestedLang = 'en' } = {}) {
  const lang = RECORD_STRINGS[requestedLang] ? requestedLang : 'en';
  const S = RECORD_STRINGS[lang];
  const sideName = (p) => (p === PLAYERS.A ? S.black : S.white);

  const listEl = root.querySelector('[data-records-list]');
  const viewerEl = root.querySelector('[data-records-viewer]');
  const guideEl = root.querySelector('[data-records-guide]');
  const fileInput = root.querySelector('[data-records-file]');
  const openFileBtn = root.querySelector('[data-records-open-file]');
  const flashEl = root.querySelector('[data-records-flash]');

  const hintEngine = createRapfiHint();
  let current = null; // { moves, ruleset, id?, source: 'mine' | 'shared', saved? }
  let step = 0;
  let hint = null; // { step, index, depth, eval, pv } | { step, message } | { step, busy }
  let showNumbers = true;
  let flashTimer = null;

  const flash = (message) => {
    flashEl.textContent = message;
    flashEl.style.opacity = '1';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashEl.style.opacity = '0'; }, 2600);
  };

  guideEl.innerHTML = `<div class="serif" style="font-size:18px;font-weight:700;">${S.guideTitle}</div><ul>${S.guide.map((g) => `<li>${g}</li>`).join('')}</ul><p style="margin:0;font-size:12.5px;color:var(--muted);">${S.credit(`<a href="${RAPFI_URL}" rel="noopener" target="_blank" style="text-decoration:underline;">RAPFI</a>`)}</p>`;
  openFileBtn.textContent = S.openFile;

  function recordSummary(r) {
    const { states } = replay(r.moves, r.ruleset);
    const winner = states[states.length - 1].winner;
    const result = winner === 'draw' ? S.resultDraw : winner ? S.resultWin(sideName(winner)) : S.resultOpen;
    const mode = r.mode === 'ai' ? S.modeAi : r.mode === 'online' ? S.modeOnline : r.mode === 'local' ? S.modeLocal : '';
    const rule = r.ruleset === RULESETS.RENJU ? S.ruleRenju : S.ruleFree;
    return [r.t ? new Date(r.t).toLocaleDateString(lang) : '', mode, rule, S.moves(r.moves.length), result].filter(Boolean).join(' · ');
  }

  function renderList() {
    const records = loadRecords();
    listEl.innerHTML = '';
    const heading = document.createElement('div');
    heading.className = 'serif';
    heading.style.cssText = 'font-size:18px;font-weight:700;';
    heading.textContent = S.myGames;
    listEl.appendChild(heading);
    if (records.length === 0) {
      const p = document.createElement('p');
      p.style.cssText = 'margin:0;font-size:14px;line-height:1.55;color:var(--muted);';
      p.textContent = S.empty;
      listEl.appendChild(p);
      return;
    }
    for (const r of records) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;';
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'btn';
      open.style.cssText = 'flex:1;text-align:left;font-weight:500;font-size:13px;padding:8px 12px;';
      if (current && current.id === r.id) open.style.background = 'var(--paper)';
      open.textContent = recordSummary(r);
      open.addEventListener('click', () => openRecord({ ...r, source: 'mine' }));
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn';
      del.style.cssText = 'font-size:12px;padding:8px 10px;';
      del.textContent = S.remove;
      del.addEventListener('click', () => {
        if (!window.confirm(S.confirmRemove)) return;
        deleteRecord(r.id);
        if (current && current.id === r.id) { current = null; step = 0; hint = null; }
        renderList();
        renderViewer();
      });
      row.append(open, del);
      listEl.appendChild(row);
    }
  }

  function openRecord(record, startAtEnd = true) {
    current = record;
    step = startAtEnd ? record.moves.length : 0;
    hint = null;
    renderList();
    renderViewer();
  }

  function drawBoard(svg, theme, states) {
    const state = states[step];
    svg.innerHTML = '';
    const lines = el('g', { stroke: theme.line, 'stroke-width': '1.4', fill: 'none' });
    for (let i = 0; i < BOARD_SIZE; i++) {
      const p = MARGIN + i * STEP;
      lines.appendChild(el('line', { x1: MARGIN, y1: p, x2: VIEWPORT - MARGIN, y2: p }));
      lines.appendChild(el('line', { x1: p, y1: MARGIN, x2: p, y2: VIEWPORT - MARGIN }));
    }
    svg.appendChild(lines);
    for (const idx of STAR_POINTS) {
      const { x, y } = pointPixel(idx);
      svg.appendChild(el('circle', { cx: x, cy: y, r: 3, fill: theme.line }));
    }
    for (let i = 0; i < BOARD_SIZE; i++) {
      const p = MARGIN + i * STEP;
      const letter = el('text', { x: p, y: VIEWPORT - 7, 'text-anchor': 'middle', 'font-size': '10', fill: theme.line, opacity: '.75' });
      letter.textContent = COLUMN_LETTERS[i];
      svg.appendChild(letter);
      const num = el('text', { x: 9, y: p + 3.5, 'text-anchor': 'middle', 'font-size': '10', fill: theme.line, opacity: '.75' });
      num.textContent = String(BOARD_SIZE - i);
      svg.appendChild(num);
    }

    if (state.winLine.length >= 2) {
      const a = pointPixel(state.winLine[0]);
      const b = pointPixel(state.winLine[state.winLine.length - 1]);
      svg.appendChild(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#D9A441', 'stroke-width': '5', 'stroke-linecap': 'round', opacity: '.8' }));
    }

    const order = new Map(current.moves.slice(0, step).map((idx, k) => [idx, k + 1]));
    state.cells.forEach((player, index) => {
      if (!player) return;
      const { x, y } = pointPixel(index);
      const colors = PLAYER_COLOR[player];
      if (player === PLAYERS.A) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.4, fill: 'none', stroke: '#F6F1E6', 'stroke-width': '1.4', opacity: '.8' }));
      }
      svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.38, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '1.4' }));
      const isLast = index === state.lastMove;
      if (showNumbers) {
        const t = el('text', { x, y: y + 3.4, 'text-anchor': 'middle', 'font-size': order.get(index) > 99 ? '8' : '10', 'font-weight': isLast ? '700' : '500', fill: isLast ? '#D9A441' : colors.text });
        t.textContent = String(order.get(index));
        svg.appendChild(t);
      } else if (isLast) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.12, fill: player === PLAYERS.B ? '#3A332C' : '#F6F1E6' }));
      }
      if (isLast) {
        svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.46, fill: 'none', stroke: '#D9A441', 'stroke-width': '2' }));
      }
    });

    if (hint && hint.step === step && hint.pv) {
      hint.pv.slice(0, PV_SHOWN).forEach((idx, k) => {
        if (state.cells[idx]) return;
        const { x, y } = pointPixel(idx);
        const colors = PLAYER_COLOR[(step + k) % 2 === 0 ? PLAYERS.A : PLAYERS.B];
        if (k === 0) {
          // Red square corners around the suggested point.
          const h = STEP * 0.5;
          const a = STEP * 0.22;
          const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => `M${x + sx * h},${y + sy * (h - a)} L${x + sx * h},${y + sy * h} L${x + sx * (h - a)},${y + sy * h}`).join(' ');
          svg.appendChild(el('path', { d: corners, fill: 'none', stroke: '#C0392B', 'stroke-width': '2.6', 'stroke-linecap': 'square', 'stroke-linejoin': 'miter' }));
        }
        svg.appendChild(el('circle', { cx: x, cy: y, r: STEP * 0.36, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '1.2', opacity: k === 0 ? '.62' : '.34' }));
        const t = el('text', { x, y: y + 3.4, 'text-anchor': 'middle', 'font-size': '10', 'font-weight': '700', fill: colors.text });
        t.textContent = String(k + 1);
        svg.appendChild(t);
      });
    }
  }

  function hintText(states) {
    const state = states[step];
    if (!hint || hint.step !== step) return '';
    if (hint.busy) return hint.busy;
    if (hint.message) return hint.message;
    const toMove = state.turn;
    const { sign, level } = evalBand(hint.eval ?? '0');
    const stronger = sign >= 0 ? toMove : (toMove === PLAYERS.A ? PLAYERS.B : PLAYERS.A);
    const v = hint.eval !== undefined ? (/^[+-]/.test(hint.eval) ? hint.eval : `+${hint.eval}`) : '';
    const evalText = hint.eval === undefined ? '' : level === 0 ? S.evalEven(v) : level === 1 ? S.evalBetter(sideName(stronger), v) : level === 2 ? S.evalClearly(sideName(stronger), v) : S.evalWinning(sideName(stronger), v);
    const line = hint.pv ? hint.pv.slice(0, PV_SHOWN).map(pointLabel).join(' → ') : pointLabel(hint.index);
    const meta = hint.depth !== undefined ? `<div style="font-size:12.5px;color:var(--muted);">${S.hintMeta(hint.depth, evalText)}</div>` : '';
    return `<div style="font-size:13px;color:var(--muted);">${S.hintFor(sideName(toMove))}</div><div class="serif" style="font-size:22px;font-weight:700;color:var(--teal);">${pointLabel(hint.index)}</div><div style="font-size:13px;">${line}</div>${meta}`;
  }

  async function askHint() {
    const states = replay(current.moves, current.ruleset).states;
    const at = step;
    const state = states[at];
    if (state.winner) { hint = { step: at, message: S.hintFinished }; renderViewer(); return; }
    if (!rapfiSupported()) { hint = { step: at, message: S.hintUnsupported }; renderViewer(); return; }
    hint = { step: at, busy: hintEngine.isStarted() ? S.thinking : S.loadingEngine };
    renderViewer();
    try {
      const answer = await hintEngine.ask(current.moves.slice(0, at), current.ruleset);
      if (step !== at || !hint || hint.step !== at) return;
      hint = { step: at, ...answer };
    } catch (err) {
      if (err && err.message === 'superseded') return;
      if (step !== at) return;
      hint = { step: at, message: S.hintError };
    }
    renderViewer();
  }

  function goTo(n) {
    if (!current) return;
    const next = Math.max(0, Math.min(current.moves.length, n));
    if (next === step) return;
    step = next;
    hint = null;
    renderViewer();
  }

  function recordLink() {
    const base = `${location.origin}${location.pathname}`;
    return `${base}#r=${encodeRecord(current)}`;
  }

  async function copyLink() {
    const url = recordLink();
    try {
      await navigator.clipboard.writeText(url);
      flash(S.copied);
    } catch {
      window.prompt(S.copyLink, url);
    }
  }

  function saveFile() {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const name = `playgonu-omok${current.ruleset === RULESETS.RENJU ? '-renju' : ''}-${stamp}.psq`;
    const url = URL.createObjectURL(new Blob([toPsq(current)], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function saveToList() {
    const id = current.id || Date.now();
    const rec = { id, t: Date.now(), ruleset: current.ruleset, moves: current.moves, mode: current.mode || null };
    if (saveRecord(rec)) {
      current = { ...rec, source: 'mine' };
      flash(S.savedToList);
      renderList();
      renderViewer();
    }
  }

  function button(label, onClick, { primary = false, disabled = false, title = '' } = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = primary ? 'btn-primary' : 'btn';
    b.style.cssText = 'padding:8px 14px;font-size:13px;';
    b.textContent = label;
    if (title) { b.title = title; b.setAttribute('aria-label', title); }
    b.disabled = disabled;
    b.addEventListener('click', onClick);
    return b;
  }

  function renderViewer() {
    viewerEl.innerHTML = '';
    if (!current) {
      const p = document.createElement('p');
      p.style.cssText = 'margin:0;font-size:14.5px;line-height:1.6;color:var(--muted);text-align:center;padding:40px 12px;';
      p.textContent = S.noRecord;
      viewerEl.appendChild(p);
      return;
    }
    const { states } = replay(current.moves, current.ruleset);
    const total = current.moves.length;
    const themeKey = getStoredTheme();
    const theme = THEMES[themeKey];

    const title = document.createElement('div');
    title.style.cssText = 'font-size:13px;color:var(--muted);text-align:center;';
    title.textContent = recordSummary(current);
    viewerEl.appendChild(title);

    const frame = document.createElement('div');
    frame.className = 'board-frame';
    frame.style.background = theme.fill;
    frame.style.borderColor = theme.border;
    const svg = el('svg', { viewBox: `0 0 ${VIEWPORT} ${VIEWPORT}`, width: String(VIEWPORT), height: String(VIEWPORT) });
    frame.appendChild(svg);
    viewerEl.appendChild(frame);
    drawBoard(svg, theme, states);

    const nav = document.createElement('div');
    nav.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;';
    const label = document.createElement('span');
    label.className = 'serif';
    label.style.cssText = 'min-width:120px;text-align:center;font-weight:700;font-size:15px;';
    label.textContent = step === 0 ? S.startPos : S.move(step, total);
    nav.append(
      button('⏮', () => goTo(0), { disabled: step === 0, title: S.first }),
      button('◀', () => goTo(step - 1), { disabled: step === 0, title: S.prev }),
      label,
      button('▶', () => goTo(step + 1), { disabled: step === total, title: S.next }),
      button('⏭', () => goTo(total), { disabled: step === total, title: S.last }),
    );
    viewerEl.appendChild(nav);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = String(total);
    slider.value = String(step);
    slider.style.cssText = 'width:100%;max-width:420px;';
    slider.setAttribute('aria-label', S.move(step, total));
    slider.addEventListener('input', () => goTo(Number(slider.value)));
    viewerEl.appendChild(slider);

    const numbersLabel = document.createElement('label');
    numbersLabel.style.cssText = 'font-size:13px;color:var(--muted);display:flex;gap:6px;align-items:center;cursor:pointer;';
    const numbersBox = document.createElement('input');
    numbersBox.type = 'checkbox';
    numbersBox.checked = showNumbers;
    numbersBox.addEventListener('change', () => { showNumbers = numbersBox.checked; renderViewer(); });
    numbersLabel.append(numbersBox, document.createTextNode(S.numbers));
    viewerEl.appendChild(numbersLabel);

    const busy = hint && hint.step === step && hint.busy;
    const hintBox = document.createElement('div');
    hintBox.style.cssText = 'width:100%;max-width:420px;display:flex;flex-direction:column;gap:6px;align-items:center;text-align:center;min-height:20px;';
    const hintButton = button(S.askHint, askHint, { primary: true, disabled: Boolean(busy) });
    const hintInfo = document.createElement('div');
    hintInfo.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:center;font-size:13.5px;';
    hintInfo.innerHTML = hintText(states);
    hintBox.append(hintButton, hintInfo);
    viewerEl.appendChild(hintBox);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;';
    actions.append(button(S.copyLink, copyLink), button(S.saveFile, saveFile));
    if (current.source !== 'mine') actions.append(button(S.saveToList, saveToList));
    viewerEl.appendChild(actions);
  }

  function loadFromHash() {
    const m = /^#r=([A-Za-z0-9_-]+)$/.exec(location.hash);
    if (!m) return false;
    const rec = decodeRecord(m[1]);
    if (!rec) { flash(S.linkInvalid); return false; }
    const same = loadRecords().find((r) => r.ruleset === rec.ruleset && r.moves.join() === rec.moves.join());
    openRecord(same ? { ...same, source: 'mine' } : { ...rec, source: 'shared' });
    return true;
  }

  openFileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const ruleset = /renju/i.test(file.name) ? RULESETS.RENJU : RULESETS.FREESTYLE;
    const rec = file.size < 200000 ? fromPsq(await file.text(), ruleset) : null;
    if (!rec) { flash(S.fileInvalid); return; }
    openRecord({ ...rec, source: 'shared' });
  });
  window.addEventListener('hashchange', loadFromHash);
  document.addEventListener('keydown', (e) => {
    if (!current || e.target instanceof HTMLInputElement && e.target.type !== 'range' || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft') { goTo(step - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { goTo(step + 1); e.preventDefault(); }
    else if (e.key === 'Home') { goTo(0); e.preventDefault(); }
    else if (e.key === 'End') { goTo(current.moves.length); e.preventDefault(); }
  });

  renderList();
  if (!loadFromHash()) {
    const mine = loadRecords();
    if (mine.length) openRecord({ ...mine[0], source: 'mine' });
    else renderViewer();
  }
}
