// Synthesised sound effects for the videos — no samples, so nothing to
// license. buildSoundtrack() lays the cues recorded during an episode
// (tap, place, capture, pop, whoosh, win) on a silent track and writes a WAV.
import fs from 'node:fs';

const RATE = 48000;

// Small deterministic noise source so every render sounds the same.
function noiseGen(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return (s / 0xffffffff) * 2 - 1; };
}

function render(seconds, fn) {
  const n = Math.round(seconds * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / RATE, i);
  return out;
}

const env = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));

// One-pole low-pass on a buffer, for softening noise.
function lowpass(buf, cutoff) {
  const a = Math.exp(-2 * Math.PI * cutoff / RATE);
  let y = 0;
  for (let i = 0; i < buf.length; i++) { y = (1 - a) * buf[i] + a * y; buf[i] = y; }
  return buf;
}

const SOUNDS = {
  // Picking up a piece: a light wooden tick.
  tap() {
    const nz = noiseGen(7);
    return lowpass(render(0.06, (t) => (Math.sin(2 * Math.PI * 1500 * t) * 0.5 + nz() * 0.5) * env(t, 0.001, 0.012) * 0.35), 5000);
  },
  // Setting it down: a round "tok" on a wooden board.
  place() {
    const nz = noiseGen(11);
    const body = render(0.16, (t) => (Math.sin(2 * Math.PI * 520 * t) * 0.7 + Math.sin(2 * Math.PI * 1040 * t) * 0.25) * env(t, 0.001, 0.035) * 0.55);
    const click = lowpass(render(0.16, (t) => nz() * env(t, 0.0005, 0.006) * 0.4), 3500);
    return body.map((v, i) => v + click[i]);
  },
  // A capture: a soft swish, then a silver shimmer as the piece flips.
  capture() {
    const nz = noiseGen(23);
    let y = 0;
    const swish = render(0.5, (t) => {
      const cutoff = 2600 - 2000 * Math.min(1, t / 0.4); // falling filter = "swoosh"
      const a = Math.exp(-2 * Math.PI * cutoff / RATE);
      y = (1 - a) * nz() + a * y;
      return y * Math.sin(Math.PI * Math.min(1, t / 0.45)) * 0.9;
    });
    const shimmer = render(1.1, (t) => {
      const s = t - 0.28;
      if (s < 0) return 0;
      return [2093, 2637, 3136, 4186].reduce((acc, f, k) => acc + Math.sin(2 * Math.PI * f * s + k) * env(s - k * 0.07, 0.004, 0.18) * (s >= k * 0.07 ? 1 : 0), 0) * 0.09;
    });
    return shimmer.map((v, i) => v + (swish[i] || 0));
  },
  // A speech bubble popping in.
  pop() {
    return render(0.12, (t) => Math.sin(2 * Math.PI * (380 + 2600 * t) * t) * env(t, 0.003, 0.03) * 0.3);
  },
  // Scene change.
  whoosh() {
    const nz = noiseGen(5);
    let y = 0;
    return render(0.55, (t) => {
      const cutoff = 300 + 2200 * Math.sin(Math.PI * Math.min(1, t / 0.55));
      const a = Math.exp(-2 * Math.PI * cutoff / RATE);
      y = (1 - a) * nz() + a * y;
      return y * Math.sin(Math.PI * Math.min(1, t / 0.55)) * 0.55;
    });
  },
  // The win: a short rising chime (C–E–G–C).
  win() {
    return render(1.4, (t) => [523.25, 659.25, 783.99, 1046.5].reduce((acc, f, k) => {
      const s = t - k * 0.11;
      return s < 0 ? acc : acc + (Math.sin(2 * Math.PI * f * s) + 0.3 * Math.sin(4 * Math.PI * f * s)) * env(s, 0.005, 0.35) * 0.16;
    }, 0));
  },
};

const cache = {};
const sound = (kind) => (cache[kind] ||= SOUNDS[kind]());

export function buildSoundtrack(events, seconds, file) {
  const n = Math.round(seconds * RATE);
  const mix = new Float32Array(n);
  for (const { kind, t } of events) {
    if (!SOUNDS[kind]) continue;
    const s = sound(kind);
    const start = Math.round(t * RATE);
    for (let i = 0; i < s.length && start + i < n; i++) mix[start + i] += s[i];
  }
  let peak = 0;
  for (const v of mix) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0.89 ? 0.89 / peak : 1;
  const pcm = Buffer.alloc(44 + n * 2);
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + n * 2, 4); pcm.write('WAVE', 8);
  pcm.write('fmt ', 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(RATE, 24); pcm.writeUInt32LE(RATE * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
  pcm.write('data', 36); pcm.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(mix[i] * gain * 32767))), 44 + i * 2);
  fs.writeFileSync(file, pcm);
}
