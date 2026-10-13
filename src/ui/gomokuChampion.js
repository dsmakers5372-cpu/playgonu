import { createRapfiHint, rapfiSupported } from './rapfiHint.js';

const CHAMPION_MOVE_MS = 5000;
const RAPFI_URL = 'https://github.com/dhbloo/rapfi';

export const CHAMPION_STRINGS = {
  en: {
    title: 'Champion AI — RAPFI',
    lead: 'RAPFI won the Freestyle category of Gomocup 2025, the world computer-Gomoku tournament. It is the strongest opponent on this site.',
    points: [
      'Plays Freestyle or Renju, whichever rule you have selected.',
      'You play Black and move first; the champion plays White.',
      'It runs inside your browser — no moves are sent to a server.',
      'After the game, open it in the Records tab to replay it and ask RAPFI for a hint.',
    ],
    loading: 'Loading the engine…',
    ready: 'Ready to play.',
    failed: 'The engine could not load. Pro AI will play instead.',
    play: 'Play',
    cancel: 'Choose another level',
    device: 'On older phones or devices with 4 GB of RAM or less, it may be slow or may not run at all.',
  },
  ko: {
    title: '챔피언 AI — RAPFI',
    lead: 'RAPFI는 세계 컴퓨터 오목 대회 Gomocup 2025 자유룰(Freestyle) 부문 우승 엔진입니다. 이 사이트에서 가장 강한 상대입니다.',
    points: [
      '자유룰과 렌주룰 모두 대국합니다. 선택한 룰로 둡니다.',
      '내가 검정(선공)으로 먼저 두고, 챔피언은 흰돌입니다.',
      '엔진은 내 브라우저 안에서 실행되며, 수가 서버로 전송되지 않습니다.',
      '대국이 끝나면 \'기보\' 탭에서 복기하며 RAPFI 훈수를 받을 수 있습니다.',
    ],
    loading: '엔진을 불러오는 중입니다…',
    ready: '준비 완료! 바로 시작할 수 있습니다.',
    failed: '엔진을 불러오지 못했습니다. 대신 프로 AI와 대국합니다.',
    play: '게임하기',
    cancel: '다른 난이도 고르기',
    device: '오래된 휴대폰이나 RAM 4GB 이하 기기에서는 느리거나 작동하지 않을 수 있습니다.',
  },
  es: {
    title: 'IA Campeona — RAPFI',
    lead: 'RAPFI ganó la categoría Freestyle de la Gomocup 2025, el torneo mundial de programas de Gomoku. Es el rival más fuerte de este sitio.',
    points: [
      'Juega con reglas libres o Renju, la que tengas seleccionada.',
      'Tú juegas con negras y mueves primero; la campeona juega con blancas.',
      'Se ejecuta en tu navegador: ninguna jugada se envía a un servidor.',
      'Al terminar, abre la partida en la pestaña Partidas para repasarla y pedir una pista a RAPFI.',
    ],
    loading: 'Cargando el motor…',
    ready: '¡Listo para jugar!',
    failed: 'No se pudo cargar el motor. Jugará la IA Pro en su lugar.',
    play: 'Jugar',
    cancel: 'Elegir otro nivel',
    device: 'En móviles antiguos o dispositivos con 4 GB de RAM o menos, puede ir lento o no funcionar.',
  },
  ja: {
    title: 'チャンピオンAI — RAPFI',
    lead: 'RAPFIは、世界コンピューター五目並べ大会Gomocup 2025のフリースタイル部門の優勝エンジンです。このサイトで最強の相手です。',
    points: [
      'フリースタイルと連珠の両方に対応。選んだルールで対局します。',
      'あなたが黒で先に打ち、チャンピオンは白です。',
      'エンジンはお使いのブラウザ内で動き、着手がサーバーに送られることはありません。',
      '対局後は「棋譜」タブで振り返りながら、RAPFIのヒントを見られます。',
    ],
    loading: 'エンジンを読み込み中…',
    ready: '準備完了！すぐに始められます。',
    failed: 'エンジンを読み込めませんでした。代わりにプロAIと対局します。',
    play: '対局する',
    cancel: '別のレベルを選ぶ',
    device: '古いスマートフォンやRAM 4GB以下の端末では、動作が遅かったり動かなかったりする場合があります。',
  },
  zh: {
    title: '冠军AI — RAPFI',
    lead: 'RAPFI是世界计算机五子棋大赛Gomocup 2025自由规则（Freestyle）组的冠军引擎，是本站最强的对手。',
    points: [
      '支持自由规则和连珠规则，按你所选的规则对局。',
      '你执黑先行，冠军执白。',
      '引擎在你的浏览器内运行，落子不会发送到服务器。',
      '对局结束后，可在“棋谱”标签中复盘，并向RAPFI请求提示。',
    ],
    loading: '正在加载引擎…',
    ready: '准备就绪，可以开始！',
    failed: '引擎加载失败，将改由职业AI对局。',
    play: '开始对局',
    cancel: '选择其他难度',
    device: '在较旧的手机或内存（RAM）4GB及以下的设备上，可能运行缓慢或无法运行。',
  },
};

export function championSupported() {
  return rapfiSupported();
}

// The champion opponent: RAPFI running in a Web Worker. The engine starts
// loading as soon as the intro panel opens, so by the time the player has read
// it and made the first move as Black it is usually ready; if not, the
// champion's reply simply waits for the load to finish.
export function createChampion({ lang }) {
  const t = CHAMPION_STRINGS[lang] || CHAMPION_STRINGS.en;
  const engine = createRapfiHint({ searchMs: CHAMPION_MOVE_MS });
  const loads = new Map();
  const results = new Map();
  let handlers = null;
  let introRule = 'freestyle';

  function load(ruleset) {
    const rule = ruleset === 'renju' ? 'renju' : 'freestyle';
    if (!loads.has(rule)) {
      loads.set(rule, engine.preload(rule).then((ok) => {
        results.set(rule, ok);
        if (!ok) loads.delete(rule);
        return ok;
      }));
    }
    return loads.get(rule);
  }

  const overlay = document.createElement('div');
  overlay.className = 'win-banner';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const card = document.createElement('div');
  card.className = 'win-banner__card';
  Object.assign(card.style, {
    width: 'min(480px, calc(100vw - 32px))',
    maxWidth: '480px',
    boxSizing: 'border-box',
    padding: '28px 32px',
    textAlign: 'left',
    gap: '14px',
    maxHeight: '90vh',
    overflowY: 'auto',
  });
  const title = document.createElement('h2');
  title.className = 'serif';
  Object.assign(title.style, { margin: '0', fontSize: '22px' });
  title.textContent = t.title;
  const lead = document.createElement('p');
  Object.assign(lead.style, { margin: '0', fontSize: '14.5px', lineHeight: '1.6', color: 'var(--ink-soft)' });
  lead.textContent = t.lead;
  const list = document.createElement('ul');
  Object.assign(list.style, { margin: '0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', lineHeight: '1.55', color: 'var(--ink-soft)' });
  for (const point of t.points) {
    const li = document.createElement('li');
    li.textContent = point;
    list.appendChild(li);
  }
  const device = document.createElement('div');
  Object.assign(device.style, { fontSize: '13px', lineHeight: '1.5', color: 'var(--muted)' });
  device.textContent = t.device;
  const status = document.createElement('div');
  status.setAttribute('aria-live', 'polite');
  Object.assign(status.style, { fontSize: '13.5px', fontWeight: '600', color: 'var(--muted)' });
  const credit = document.createElement('div');
  Object.assign(credit.style, { fontSize: '12px', color: 'var(--muted)' });
  const creditLink = document.createElement('a');
  creditLink.href = RAPFI_URL;
  creditLink.target = '_blank';
  creditLink.rel = 'noopener';
  creditLink.textContent = 'RAPFI';
  credit.append(creditLink, ' by dhbloo · GPL-3.0');
  const buttons = document.createElement('div');
  Object.assign(buttons.style, { display: 'flex', gap: '10px', flexWrap: 'wrap' });
  const playBtn = document.createElement('button');
  playBtn.className = 'btn-primary';
  playBtn.textContent = t.play;
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = t.cancel;
  buttons.append(playBtn, cancelBtn);
  card.append(title, lead, list, device, status, credit, buttons);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  function renderStatus() {
    const result = results.get(introRule);
    status.textContent = result === true ? t.ready : result === false ? t.failed : t.loading;
  }

  function close() {
    overlay.classList.remove('is-visible');
    document.removeEventListener('keydown', onKey);
  }

  function cancel() {
    close();
    if (handlers) handlers.onCancel();
  }

  function onKey(e) {
    if (e.key === 'Escape') cancel();
  }

  playBtn.addEventListener('click', () => {
    close();
    if (handlers) handlers.onPlay();
  });
  cancelBtn.addEventListener('click', cancel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cancel(); });

  function openIntro(next, ruleset) {
    handlers = next;
    introRule = ruleset === 'renju' ? 'renju' : 'freestyle';
    results.delete(introRule);
    renderStatus();
    overlay.classList.add('is-visible');
    document.addEventListener('keydown', onKey);
    load(introRule).then(renderStatus);
    playBtn.focus();
  }

  // Resolves with the board index of the champion's move. Rejects when the
  // engine is unavailable or the request was superseded by a newer one.
  async function chooseMove(moves, ruleset) {
    const ok = await load(ruleset);
    if (!ok) throw new Error('unavailable');
    const result = await engine.ask(moves, ruleset);
    return result.index;
  }

  return { openIntro, chooseMove, warmUp: (ruleset) => { load(ruleset); } };
}
