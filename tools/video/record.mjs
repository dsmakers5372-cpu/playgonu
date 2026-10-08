// Renders an episode to video by stepping player.html's deterministic
// timeline frame by frame in headless Chrome and piping the frames to
// ffmpeg. Also writes YouTube subtitles (.srt), a narration script with
// timestamps for recording a voice-over, and PNG stills of every explain
// moment (used as the strategy guide's screenshots).
//
//   node record.mjs --episode cham-running-mill --lang ko [--format portrait] [--cut shorts] [--stills-only]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startServer } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
const episode = args.episode || 'cham-running-mill';
const lang = args.lang || 'ko';
const portrait = args.format === 'portrait';
const cut = args.cut || 'full';
const name = `${episode}-${cut === 'shorts' ? 'shorts' : 'long'}-${lang}`;
const outDir = path.join(HERE, 'out');
fs.mkdirSync(outDir, { recursive: true });

const CHROME = args.chrome || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));
const [W, H] = portrait ? [1080, 1920] : [1920, 1080];

const server = await startServer(0);
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const url = `http://127.0.0.1:${port}/tools/video/player.html?episode=${episode}&lang=${lang}&cut=${cut}${portrait ? '&format=portrait' : ''}`;
await page.goto(url, { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__ready === true', { timeout: 30000 });
const timeline = await page.evaluate(() => window.__timeline);
const fps = Number(args.fps || timeline.fps);
const frames = Math.ceil(timeline.duration * fps);
console.log(`${name}: ${timeline.duration.toFixed(1)}s, ${frames} frames at ${fps}fps`);

// Stills: one screenshot per explain moment, after the bubble has settled.
const stillsDir = path.join(outDir, `${name}-stills`);
fs.mkdirSync(stillsDir, { recursive: true });
let n = 0;
for (const e of timeline.explains.filter((x) => x.kind === 'explain')) {
  n++;
  await page.evaluate((t) => window.__renderAt(t), Math.min(e.start + 1.6, e.end - 0.1));
  await page.screenshot({ path: path.join(stillsDir, `${String(n).padStart(2, '0')}-after-${e.after}.png`) });
}
console.log(`stills: ${n} → ${stillsDir}`);

// Subtitles + narration script share the explain timings.
const ts = (sec, sep) => {
  const ms = Math.round(sec * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor(ms / 60000) % 60).padStart(2, '0');
  const s = String(Math.floor(ms / 1000) % 60).padStart(2, '0');
  return `${h}:${m}:${s}${sep}${String(ms % 1000).padStart(3, '0')}`;
};
const srt = timeline.explains.map((e, i) => `${i + 1}\n${ts(e.start, ',')} --> ${ts(e.end, ',')}\n${e.title}\n${e.body}\n`).join('\n');
fs.writeFileSync(path.join(outDir, `${name}.srt`), srt);
const script = timeline.explains.map((e) => `[${ts(e.start, '.').slice(3, 8)} – ${ts(e.end, '.').slice(3, 8)}] ${e.title}\n${e.body}\n`).join('\n');
fs.writeFileSync(path.join(outDir, `${name}-narration.txt`), script);

if (!args['stills-only']) {
  const mp4 = path.join(outDir, `${name}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const started = Date.now();
  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.__renderAt(t), f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92, optimizeForSpeed: true });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 300 === 0) console.log(`  frame ${f}/${frames} (${Math.round((Date.now() - started) / 1000)}s)`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (code) => (code === 0 ? r() : j(new Error(`ffmpeg exited ${code}`)))));
  console.log(`video → ${mp4}`);
}

await browser.close();
server.close();
