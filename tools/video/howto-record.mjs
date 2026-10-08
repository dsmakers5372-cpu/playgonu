// Records a "how to play" episode on a REAL PlayGonu game page in 2-player
// local mode: howto-overlay.js clicks the moves on the site's own board and
// adds the explain moments. Chrome's screencast frames are kept with their
// real timestamps and encoded at exactly 30fps, so captions line up.
//
//   node howto-record.mjs --episode howto-jul --lang ko [--format portrait] [--plan]
//
// Outputs in out/: <episode>-<landscape|portrait>-<lang>.mp4, .srt, -narration.txt
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startServer } from './serve.mjs';
import { runHowto } from './howto-overlay.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = {};
process.argv.slice(2).forEach((a, i, all) => {
  if (a.startsWith('--')) args[a.slice(2)] = all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true;
});
const episodeName = args.episode || 'howto-jul';
const lang = args.lang === 'en' ? 'en' : 'ko';
const portrait = args.format === 'portrait';
const name = `${episodeName}-${portrait ? 'portrait' : 'landscape'}-${lang}`;
const outDir = path.join(HERE, 'out');
fs.mkdirSync(outDir, { recursive: true });

const episode = (await import(pathToFileURL(path.join(HERE, 'episodes', `${episodeName}.js`)).href)).default;
const engine = await import(pathToFileURL(path.join(HERE, '..', '..', 'src', 'engine', `${episode.engine}.js`)).href);

// ---- board geometry (the 420×420 viewBox every game page uses) --------------
const CHAM_POINTS = [
  [40, 40], [210, 40], [380, 40], [380, 210], [380, 380], [210, 380], [40, 380], [40, 210],
  [97, 97], [210, 97], [323, 97], [323, 210], [323, 323], [210, 323], [97, 323], [97, 210],
  [153, 153], [210, 153], [267, 153], [267, 210], [267, 267], [210, 267], [153, 267], [153, 210],
];
const points = episode.board.kind === 'cham'
  ? CHAM_POINTS
  : Array.from({ length: episode.board.rows * episode.board.cols }, (_, i) => {
    const step = (420 - episode.board.margin * 2) / (episode.board.cols - 1);
    return [episode.board.margin + (i % episode.board.cols) * step, episode.board.margin + Math.floor(i / episode.board.cols) * step];
  });

// ---- plan (seconds) ----------------------------------------------------------
// Every scene is checked against the engine first, so a typo in a move list
// fails here instead of halfway through a recording.
const PLY = { move: 1.25, place: 0.9, capture: 3.0, fast: 0.32 };
const readSecs = (t) => (lang === 'ko' ? 3.2 + [...t].length * 0.07 : 3.2 + t.split(/\s+/).length * 0.29);
const cap = portrait ? (episode.portraitExplainCap ?? 9) : 12;
const plan = [];
plan.push({ type: 'intro', dur: portrait ? 3.6 : 4.2, copy: episode.intro[lang] });
episode.scenes.forEach((scene, si) => {
  const states = [engine.createInitialState()];
  for (const [from, to] of scene.moves) states.push(engine.move(states[states.length - 1], from, to));
  const from = scene.from ?? 0;
  const to = scene.to ?? scene.moves.length;
  if (from > 0 || si > 0) plan.push({ type: 'cut', dur: portrait ? 3.6 : 4.2, copy: scene.cut[lang], replay: scene.moves.slice(0, from) });
  const isFast = (i) => (scene.fast || []).some(([a, b]) => i >= a && i < b) || (portrait && (scene.fastPortrait || []).some(([a, b]) => i >= a && i < b));
  for (let i = from; i <= to; i++) {
    for (const ex of episode.explain.filter((e) => (e.scene ?? 0) === si && e.after === i)) {
      if (portrait && ex.portrait === false) continue;
      const copy = ex[lang];
      plan.push({ type: 'explain', ex, copy, dur: Math.min(cap, readSecs(`${copy.title} ${copy.body}`)) });
    }
    if (i < to) {
      const before = states[i];
      const after = states[i + 1];
      const captured = before.pendingCapture || (after.lastCapture && after.lastCapture.length > 0);
      let kind = captured ? 'capture' : scene.moves[i][0] === null ? 'place' : 'move';
      if (kind !== 'capture' && isFast(i)) kind = 'fast';
      plan.push({ type: 'ply', move: scene.moves[i], dur: PLY[kind] * (portrait && kind === 'move' ? episode.portraitMoveScale ?? 1 : 1), fast: kind === 'fast' });
    }
  }
  if (si === episode.scenes.length - 1) plan.push({ type: 'hold', dur: 2.2 });
});
plan.push({ type: 'outro', dur: 4.5, copy: episode.outro[lang] });
const planned = plan.reduce((s, p) => s + p.dur, 0);
console.log(`${name}: planned ${planned.toFixed(1)}s`);
if (args.plan) process.exit(0);

// ---- browser -------------------------------------------------------------------
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const [W, H, ZOOM] = portrait ? [1080, 1920, 2] : [1920, 1080, 1.5];
const server = await startServer(0);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 0, args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('playgonu:boardTheme', 'hanji');
    localStorage.setItem('playgonu:muted', '1');
  } catch {}
});
await page.goto(`http://127.0.0.1:${server.address().port}${lang === 'ko' ? '/ko' : ''}/${episode.page}`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate((z) => {
  document.documentElement.style.zoom = String(z);
  const select = document.querySelector('[data-opponent-mode]');
  select.value = 'local';
  select.dispatchEvent(new Event('change'));
  document.querySelector('[data-mode-local]')?.click(); // Cham-gonu asks "local or online?" first
  document.querySelector('[data-new-game]').click();
  document.querySelector('[data-board-frame]').scrollIntoView({ block: 'center' });
}, ZOOM);
await new Promise((r) => setTimeout(r, 800));

// ---- recorder ------------------------------------------------------------------
const framesDir = path.join(outDir, `${name}-frames`);
const frames = [];
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
const cdp = await page.createCDPSession();
cdp.on('Page.screencastFrame', (e) => {
  const file = `${String(frames.length).padStart(6, '0')}.jpg`;
  fs.writeFileSync(path.join(framesDir, file), Buffer.from(e.data, 'base64'));
  frames.push({ file, ts: e.metadata.timestamp });
  cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
await new Promise((r) => setTimeout(r, 500));
const episodeStart = Date.now() / 1000;
const result = await page.evaluate(`(${runHowto.toString()})(${JSON.stringify({ plan, layout: portrait ? 'portrait' : 'landscape', watermark: 'playgonu.com', points, pieceR: episode.pieceR, fastLabel: lang === 'ko' ? '▶▶ 빠르게' : '▶▶ FAST' })})`);
const episodeEnd = Date.now() / 1000;
await cdp.send('Page.stopScreencast');
await browser.close();
server.close();
if (!result.ended) console.warn('WARNING: the game did not end with a win on the page — check the move list.');

const mp4 = path.join(outDir, `${name}.mp4`);
const firstIdx = Math.max(0, frames.findIndex((fr) => fr.ts > episodeStart) - 1);
const kept = frames.slice(firstIdx);
if (kept.length) kept[0] = { ...kept[0], ts: episodeStart };
const total = Math.round((episodeEnd - episodeStart) * 30);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=${W}:${H}`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((r) => ff.on('close', (code) => r(code)));
let src = 0;
let buf = null;
let bufIdx = -1;
for (let k = 0; k < total; k++) {
  const t = episodeStart + k / 30;
  while (src + 1 < kept.length && kept[src + 1].ts <= t) src++;
  if (src !== bufIdx) { buf = fs.readFileSync(path.join(framesDir, kept[src].file)); bufIdx = src; }
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
}
ff.stdin.end();
if ((await done) !== 0) throw new Error('ffmpeg failed');
fs.rmSync(framesDir, { recursive: true, force: true });

const ts = (sec, sep) => {
  const ms = Math.max(0, Math.round(sec * 1000));
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`;
};
const { marks } = result;
fs.writeFileSync(path.join(outDir, `${name}.srt`), marks.map((m, i) => `${i + 1}\n${ts(m.start, ',')} --> ${ts(m.end, ',')}\n${m.title}\n${m.body}\n`).join('\n'));
fs.writeFileSync(path.join(outDir, `${name}-narration.txt`), marks.map((m) => `[${ts(m.start, '.').slice(3, 8)} – ${ts(m.end, '.').slice(3, 8)}] ${m.title}\n${m.body}\n`).join('\n'));
const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' });
console.log(`video → ${mp4} (${Number(probe.stdout).toFixed(1)}s, episode ${(episodeEnd - episodeStart).toFixed(1)}s, ended=${result.ended})`);
