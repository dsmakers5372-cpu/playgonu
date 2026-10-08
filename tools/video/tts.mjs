// AI narration for the videos (OpenAI text-to-speech). The key is read only
// from tools/video/.env (OPENAI_API_KEY=…, git-ignored) and is never logged.
// Each line is cached by its text + voice settings in .tts-cache/, so
// re-recording a video doesn't pay for the same sentence twice.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, '.tts-cache');
const MODEL = 'gpt-4o-mini-tts';
const VOICE = 'coral';
const INSTRUCTIONS = {
  ko: '밝고 친근한 한국어 유튜버 말투. 또렷하게, 살짝 빠르게, 신나는 느낌으로. 문장 끝을 늘이지 말 것.',
  en: 'Bright, friendly YouTuber tone. Clear, a little fast, upbeat. Do not drag out sentence endings.',
};

export function apiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try {
    const m = fs.readFileSync(path.join(HERE, '.env'), 'utf8').match(/^\s*OPENAI_API_KEY\s*=\s*["']?([^"'\r\n]+)/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

// Text for speaking: drop markup and symbols a voice would read oddly.
export const speakable = (text, language) => String(text || '').replace(/<[^>]+>/g, '').replace(/[·•]/g, ',').replace(/×/g, language === 'ko' ? '엑스' : 'x').replace(/\s+/g, ' ').trim();

// Returns { file, seconds } for a WAV of the line (24 kHz mono 16-bit).
export async function speak(text, language) {
  const input = speakable(text, language);
  const key = apiKey();
  if (!key) throw new Error('OPENAI_API_KEY missing (tools/video/.env)');
  fs.mkdirSync(CACHE, { recursive: true });
  const id = crypto.createHash('sha256').update(JSON.stringify([MODEL, VOICE, INSTRUCTIONS[language], input])).digest('hex').slice(0, 20);
  const file = path.join(CACHE, `${id}.wav`);
  if (!fs.existsSync(file)) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, voice: VOICE, input, instructions: INSTRUCTIONS[language], response_format: 'wav' }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300).replace(/sk-[\w-]+/g, 'sk-…');
      throw new Error(`TTS request failed (${res.status}): ${detail}`);
    }
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return { file, seconds: wavSeconds(fs.readFileSync(file)) };
}

// ---- WAV helpers -----------------------------------------------------------------
function wavInfo(buf) {
  let off = 12;
  let fmt = null;
  while (off + 8 <= buf.length) {
    const tag = buf.toString('ascii', off, off + 4);
    let size = buf.readUInt32LE(off + 4);
    if (tag === 'fmt ') fmt = { channels: buf.readUInt16LE(off + 10), rate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    if (tag === 'data') {
      // Streamed WAVs may carry a placeholder size; use what's actually there.
      if (size === 0 || size === 0xffffffff || off + 8 + size > buf.length) size = buf.length - off - 8;
      return { ...fmt, dataStart: off + 8, dataSize: size };
    }
    off += 8 + size + (size % 2);
  }
  throw new Error('not a WAV file');
}

export function wavSeconds(buf) {
  const w = wavInfo(buf);
  return w.dataSize / (w.rate * w.channels * (w.bits / 8));
}

// Decodes to mono Float32 at `rate` (linear resampling — fine for speech).
export function wavToFloat(buf, rate) {
  const w = wavInfo(buf);
  const frames = Math.floor(w.dataSize / (w.channels * 2));
  const src = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let v = 0;
    for (let c = 0; c < w.channels; c++) v += buf.readInt16LE(w.dataStart + (i * w.channels + c) * 2);
    src[i] = v / w.channels / 32768;
  }
  const ratio = w.rate / rate;
  const out = new Float32Array(Math.floor(frames / ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio;
    const j = Math.floor(x);
    out[i] = src[j] + ((src[j + 1] ?? src[j]) - src[j]) * (x - j);
  }
  return out;
}
