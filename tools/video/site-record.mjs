// Records an episode on the REAL PlayGonu online-battle page: the page is
// loaded from this repo, a stand-in game server (site-harness.js) plays the
// recorded game into the site's own UI, and site-overlay.js adds the
// pause-and-explain moments. Chrome's screencast captures it in real time.
//
//   node site-record.mjs --episode cham-running-mill --lang ko [--format portrait --cut shorts] [--stills]
//
// Outputs in out/: <name>.mp4, <name>.srt (YouTube captions), <name>-narration.txt
// (voice-over script with timestamps); with --stills, PNGs of each explain moment.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startServer } from './serve.mjs';
import { installHarness } from './site-harness.js';
import { runEpisode } from './site-overlay.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = {};
process.argv.slice(2).forEach((a, i, all) => {
  if (a.startsWith('--')) args[a.slice(2)] = all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true;
});
const episodeName = args.episode || 'cham-running-mill';
const lang = args.lang === 'en' ? 'en' : 'ko';
const portrait = args.format === 'portrait';
const shorts = args.cut === 'shorts';
const stillsMode = !!args.stills;
const name = `${episodeName}-${shorts ? 'shorts' : 'long'}-${lang}`;
const outDir = path.join(HERE, 'out');
fs.mkdirSync(outDir, { recursive: true });

const episode = (await import(pathToFileURL(path.join(HERE, 'episodes', `${episodeName}.js`)).href)).default;
const engine = await import(pathToFileURL(path.join(HERE, '..', '..', 'src', 'engine', `${episode.game === 'gomoku' ? 'gomoku' : 'chamgonu'}.js`)).href);
const states = [engine.createInitialState()];
for (const [from, to] of episode.moves) states.push(engine.move(states[states.length - 1], from, to));

// ---- plan (seconds) --------------------------------------------------------
const PLY_DUR = { place: 0.9, capture: 1.9, slide: 1.1 }; // capture leaves time for the site's 1.6s fade-out
const readSecs = (t) => (lang === 'ko' ? 3.4 + [...t].length * 0.072 : 3.4 + t.split(/\s+/).length * 0.3);
const firstPly = shorts ? 26 : 0;
const keepExplain = (after) => !shorts || [26, 29, 36, 57].includes(after);
const explainAt = new Map(episode.explain.map((e) => [e.after, e]));
const plan = [];
const introCopy = (shorts && episode.shortsIntro ? episode.shortsIntro : episode.intro)[lang];
plan.push({ type: 'intro', dur: shorts ? 3.4 : 5, copy: introCopy });
// Shorts open mid-game: jump straight to the first kept position.
for (let i = firstPly; i <= episode.moves.length; i++) {
  const ex = explainAt.get(i);
  if (ex && keepExplain(i)) {
    const copy = ex[lang];
    plan.push({ type: 'explain', at: i, ex, copy, dur: Math.min(shorts ? 8.5 : 13, readSecs(`${copy.title} ${copy.body}`)) });
  }
  if (i < episode.moves.length) {
    const kind = states[i].pendingCapture ? 'capture' : episode.moves[i][0] === null ? 'place' : 'slide';
    const speed = shorts && !(i >= 29 && i < 36) ? 0.6 : 1;
    plan.push({ type: 'ply', index: i, dur: PLY_DUR[kind] * speed });
  }
  if (i === episode.moves.length) plan.push({ type: 'hold', dur: 1.5 });
}
plan.push({ type: 'outro', dur: shorts ? 4 : 5.5, copy: episode.outro[lang] });
if (stillsMode) for (const seg of plan) if (seg.type === 'ply' || seg.type === 'intro' || seg.type === 'outro' || seg.type === 'hold') seg.dur = 0.12;

// ---- browser ----------------------------------------------------------------
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const [W, H, ZOOM] = portrait ? [1080, 1920, 2] : [1920, 1080, 1.5];
const server = await startServer(0);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 0, args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] }); // the whole episode runs inside one evaluate, longer than the 180s default
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const startState = states[firstPly];
const harness = {
  storage: {
    'playgonu:name': episode.names.me,
    'playgonu:boardTheme': 'hanji',
    'playgonu:muted': '1',
    [`playgonu:stats:${episode.game}`]: JSON.stringify(episode.names.myStats),
  },
  me: episode.names.me,
  opponent: episode.names.opponent,
  myColor: episode.names.myColor,
  gameType: episode.game,
};
await page.evaluateOnNewDocument(`window.__initialState = ${JSON.stringify(startState)}; (${installHarness.toString()})(${JSON.stringify(harness)});`);
const pagePath = `${lang === 'ko' ? '/ko' : ''}/online.html?game=${episode.game}&room=PG${episodeName.length}${firstPly}`;
await page.goto(`http://127.0.0.1:${server.address().port}${pagePath}`, { waitUntil: 'networkidle0' });
await page.evaluate((z) => { document.documentElement.style.zoom = String(z); }, ZOOM);
await page.evaluate(() => [...document.querySelectorAll('[data-lobby-root] button')].find((b) => ['참가', 'Join'].includes(b.textContent.trim())).click());
await page.waitForFunction(() => document.querySelector('[data-game-root]')?.style.display === 'block');
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 600));

const stillsDir = path.join(outDir, `${name}-stills`);
if (stillsMode) {
  fs.mkdirSync(stillsDir, { recursive: true });
  let n = 0;
  await page.exposeFunction('__snap', async (label) => {
    n++;
    await page.screenshot({ path: path.join(stillsDir, `${String(n).padStart(2, '0')}-${label}.png`) });
  });
}

const webm = path.join(outDir, `${name}.webm`);
const recorder = stillsMode ? null : await page.screencast({ path: webm });
const marks = await page.evaluate(`(${runEpisode.toString()})(${JSON.stringify({ states, plan, layout: portrait ? 'portrait' : 'landscape', watermark: 'playgonu.com' })})`);
if (recorder) await recorder.stop();
await browser.close();
server.close();

if (stillsMode) {
  console.log(`stills → ${stillsDir}`);
} else {
  const mp4 = path.join(outDir, `${name}.mp4`);
  const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  if (ff.status !== 0) throw new Error('ffmpeg failed');
  fs.unlinkSync(webm);
  const ts = (sec, sep) => {
    const ms = Math.max(0, Math.round(sec * 1000));
    return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`;
  };
  fs.writeFileSync(path.join(outDir, `${name}.srt`), marks.map((m, i) => `${i + 1}\n${ts(m.start, ',')} --> ${ts(m.end, ',')}\n${m.title}\n${m.body}\n`).join('\n'));
  fs.writeFileSync(path.join(outDir, `${name}-narration.txt`), marks.map((m) => `[${ts(m.start, '.').slice(3, 8)} – ${ts(m.end, '.').slice(3, 8)}] ${m.title}\n${m.body}\n`).join('\n'));
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'compact', mp4], { encoding: 'utf8' });
  console.log(`video → ${mp4}\n${probe.stdout.trim()}`);
}
