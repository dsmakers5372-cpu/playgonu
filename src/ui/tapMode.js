// How a touch places a Gomoku stone on phones and tablets:
//   'safe' (default) — the first tap previews a faint stone, tapping that
//                      same point again places it (no mis-taps on a dense board);
//   'fast'           — a tap places the stone at once.
// A mouse always places with one click (it gets a hover shadow instead).
// The choice is remembered on this device.
const KEY = 'playgonu:tapMode';

const LABELS = {
  en: { label: 'Tap', safe: 'Safe (tap twice)', fast: 'Fast (tap once)' },
  ko: { label: '터치', safe: '안전 모드 (두 번 탭)', fast: '빠른 모드 (한 번 탭)' },
  es: { label: 'Toque', safe: 'Seguro (dos toques)', fast: 'Rápido (un toque)' },
  ja: { label: 'タップ', safe: '安全モード（2回タップ）', fast: '高速モード（1回タップ）' },
  zh: { label: '触控', safe: '安全模式（点两次）', fast: '快速模式（点一次）' },
};

// Set from the picker, so the choice still works on this page when storage
// is unavailable (private browsing).
let modeOverride = null;

function storedTapMode() {
  try {
    return localStorage.getItem(KEY) === 'fast' ? 'fast' : 'safe';
  } catch {
    return 'safe';
  }
}

export const currentTapMode = () => modeOverride || storedTapMode();

// Phones and tablets: the main pointer is a finger. (A touchscreen laptop's
// main pointer is still its mouse/trackpad, so it doesn't get the picker.)
const isTouchDevice = () => !!window.matchMedia && matchMedia('(pointer: coarse)').matches;

// Adds the mode picker to the board's option row, on touch devices only.
export function mountTapModeSelect(row, lang = 'en') {
  if (!row || !isTouchDevice() || row.querySelector('[data-tap-mode]')) return;
  const t = LABELS[lang] || LABELS.en;
  const select = document.createElement('select');
  select.className = 'pill';
  select.dataset.tapMode = '';
  select.setAttribute('aria-label', t.label);
  select.style.cssText = 'font-size:13px;padding:5px 10px;';
  for (const mode of ['safe', 'fast']) {
    const opt = document.createElement('option');
    opt.value = mode;
    opt.textContent = t[mode];
    select.appendChild(opt);
  }
  select.value = currentTapMode();
  select.addEventListener('change', () => {
    try { localStorage.setItem(KEY, select.value); } catch { /* private mode: applies to this page only */ }
    modeOverride = select.value;
  });
  row.style.flexWrap = 'wrap';
  row.appendChild(select);
}
