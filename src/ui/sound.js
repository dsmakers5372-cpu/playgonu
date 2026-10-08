// A tiny synthesized "stone/piece down" click — no audio file to ship or
// load, just a short Web Audio blip. Safe to call liberally: it lazily
// creates (and resumes) a single shared AudioContext, and silently no-ops
// wherever Web Audio isn't available.
let audioCtx = null;

const MUTE_KEY = 'playgonu:muted';
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* storage blocked: default to sound on */ }

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = !!value;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* preference just won't persist */ }
}

function getContext() {
  if (muted) return null;
  if (audioCtx) return audioCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioCtx = new Ctor();
  } catch {
    audioCtx = null;
  }
  return audioCtx;
}

export function playPlaceSound() {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(560, now);
  osc.frequency.exponentialRampToValueAtTime(190, now + 0.09);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.14);
}

// A quick downward "swish" for a piece being captured/swept off the board —
// deliberately a different shape (sawtooth, sweeping down) from the placement
// click so the two read as distinct events by ear, not just by eye.
export function playCaptureSound() {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.16);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.13, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.21);
}

const ICON_PATH_SPEAKER = '<path d="M11 5 6 9H3v6h3l5 4z"/>';
const ICON_ON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATH_SPEAKER}<path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>`;
const ICON_OFF = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATH_SPEAKER}<path d="m16 9 6 6"/><path d="m22 9-6 6"/></svg>`;

// Every page that can make a sound imports this module, so the toggle mounts
// itself into the header nav here — no per-page wiring, and pages without
// game audio (how-to, blog) simply never get the button.
function mountSoundToggle() {
  const nav = document.querySelector('.site-header nav');
  if (!nav || nav.querySelector('[data-sound-toggle]')) return;
  const ko = document.documentElement.lang === 'ko';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pill';
  btn.dataset.soundToggle = '';
  btn.style.cssText = 'cursor:pointer;padding:7px 11px;';
  const render = () => {
    btn.innerHTML = muted ? ICON_OFF : ICON_ON;
    const label = muted ? (ko ? '소리 켜기' : 'Turn sound on') : (ko ? '소리 끄기' : 'Turn sound off');
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.setAttribute('aria-pressed', String(muted));
  };
  btn.addEventListener('click', () => {
    setMuted(!muted);
    render();
    if (!muted) playPlaceSound();
  });
  render();
  const langSwitcher = nav.querySelector('[data-lang-switcher]');
  if (langSwitcher) nav.insertBefore(btn, langSwitcher);
  else nav.appendChild(btn);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountSoundToggle);
  else mountSoundToggle();
}
