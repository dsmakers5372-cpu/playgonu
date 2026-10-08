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
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startServer } from './serve.mjs';
import { installHarness } from './site-harness.js';
import { runEpisode } from './site-overlay.js';
import { buildSoundtrack } from './sfx.mjs';
import { apiKey, speak, wavToFloat } from './tts.mjs';

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
// Brisk: a slide every ~0.6s; a capture keeps 2.2s so its flip is seen.
const PLY_DUR = { place: 0.45, capture: 2.2, slide: 0.6 };
const readSecs = (t) => (lang === 'ko' ? 1.8 + [...t].length * 0.055 : 1.8 + t.split(/\s+/).length * 0.22);
const firstPly = shorts ? 26 : 0;
const keepExplain = (after) => !shorts || [26, 29, 36, 57].includes(after);
const explainAt = new Map(episode.explain.map((e) => [e.after, e]));
const plan = [];
const plyKind = (i) => (states[i].pendingCapture ? 'capture' : episode.moves[i][0] === null ? 'place' : 'slide');
const plySeg = (i) => {
  const kind = plyKind(i);
  return { type: 'ply', index: i, dur: PLY_DUR[kind], capture: kind === 'capture', from: episode.moves[i][0], to: episode.moves[i][1] };
};
const introCopy = (shorts && episode.shortsIntro ? episode.shortsIntro : episode.intro)[lang];
// The hook: open on the game's best moment with a headline, then rewind
// (behind a title card) to where the story starts.
const hook = !stillsMode && episode.hook;
if (hook) {
  plan.push({ type: 'caption', text: hook.caption[lang], span: 1.8 + hook.plies * 1.6 });
  plan.push({ type: 'hold', dur: 1.0 });
  for (let i = hook.at; i < hook.at + hook.plies; i++) plan.push(plySeg(i));
  plan.push({ type: 'hold', dur: 0.8 });
  plan.push({ type: 'caption', text: null });
  plan.push({ type: 'cut', dur: 3.2, copy: introCopy, state: states[firstPly] });
} else {
  plan.push({ type: 'intro', dur: shorts ? 3.4 : 5, copy: introCopy });
}
// Shorts open mid-game: jump straight to the first kept position.
for (let i = firstPly; i <= episode.moves.length; i++) {
  const ex = explainAt.get(i);
  if (ex && keepExplain(i)) {
    const copy = ex[lang];
    plan.push({ type: 'explain', at: i, ex, copy, dur: Math.min(shorts ? 6.5 : 8, readSecs(`${copy.title} ${copy.body}`)) });
  }
  if (i < episode.moves.length) plan.push(plySeg(i));
  if (i === episode.moves.length) plan.push({ type: 'hold', dur: 1.5, win: true });
}
plan.push({ type: 'outro', dur: 3.5, copy: episode.outro[lang] });
if (stillsMode) for (const seg of plan) if (seg.type === 'ply' || seg.type === 'intro' || seg.type === 'outro' || seg.type === 'hold') seg.dur = 0.12;

// Narration, as in howto-record.mjs: each caption, card and explanation is
// read aloud (OpenAI voice) when .env has a key; segments stretch to fit.
const voiceFiles = {};
if (!stillsMode && !args['no-voice'] && apiKey()) {
  let n = 0;
  for (const seg of plan) {
    let text = null;
    if (seg.type === 'caption' && seg.text) text = seg.text;
    else if (seg.type === 'explain' || seg.type === 'cut' || seg.type === 'intro' || seg.type === 'outro') text = [seg.copy.title, seg.copy.body].filter(Boolean).join('. ').replace(/([.!?])\./g, '$1');
    if (!text) continue;
    const { file, seconds } = await speak(text, lang);
    const id = `v${n++}`;
    voiceFiles[id] = file;
    seg.voice = id;
    if (seg.type === 'explain') { seg.voiceDelay = 0.25; seg.dur = Math.max(seg.dur, seconds + 0.75); }
    else if (seg.type === 'caption') {
      const hold = plan[plan.indexOf(seg) + 1];
      if (hold?.type === 'hold') hold.dur = Math.max(hold.dur, seconds - 1.2);
    } else seg.dur = Math.max(seg.dur, seconds + 0.6);
  }
  console.log(`${name}: narration ${n} lines`);
}
console.log(`${name}: planned ${plan.reduce((s, p) => s + (p.dur || 0), 0).toFixed(1)}s`);
if (args.plan) process.exit(0);

// ---- browser ----------------------------------------------------------------
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const [W, H, ZOOM] = portrait ? [1080, 1920, 2] : [1920, 1080, 1.5];
const server = await startServer(0);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 0, args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] }); // the whole episode runs inside one evaluate, longer than the 180s default
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const startState = states[hook ? hook.at : firstPly];
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

// Recorded with Chrome's screencast directly, keeping each frame's own
// timestamp. (Puppeteer's page.screencast rounds every frame to a whole
// 1/30s, so frames arriving faster than that each got stretched and the video
// ran up to ~1.6x slower than real time — captions drifted off the picture.)
const framesDir = path.join(outDir, `${name}-frames`);
const frames = [];
let cdp = null;
if (!stillsMode) {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  cdp = await page.createCDPSession();
  cdp.on('Page.screencastFrame', (e) => {
    const file = `${String(frames.length).padStart(6, '0')}.jpg`;
    fs.writeFileSync(path.join(framesDir, file), Buffer.from(e.data, 'base64'));
    frames.push({ file, ts: e.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await new Promise((r) => setTimeout(r, 500));
}
const episodeStart = Date.now() / 1000;
const { marks, events } = await page.evaluate(`(${runEpisode.toString()})(${JSON.stringify({ states, plan, layout: portrait ? 'portrait' : 'landscape', watermark: 'playgonu.com' })})`);
const episodeEnd = Date.now() / 1000;
if (cdp) await cdp.send('Page.stopScreencast');
await browser.close();
server.close();

if (stillsMode) {
  console.log(`stills → ${stillsDir}`);
} else {
  const mp4 = path.join(outDir, `${name}.mp4`);
  // Video time 0 = episode start, so caption times line up exactly: the frame
  // on screen at that moment opens the video, each frame lasts until the next
  // one arrived, and the last one holds until the episode ended.
  const firstIdx = Math.max(0, frames.findIndex((fr) => fr.ts > episodeStart) - 1);
  const kept = frames.slice(firstIdx);
  if (kept.length) kept[0] = { ...kept[0], ts: episodeStart };
  // Exactly 30 frames per second of real time: output frame k shows the
  // newest captured frame at or before k/30 s.
  const total = Math.round((episodeEnd - episodeStart) * 30);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-vf', `scale=${W}:${H}`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r) => ff.on('close', (code) => r({ status: code })));
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
  const ffResult = await done;
  if (ffResult.status !== 0) throw new Error('ffmpeg failed');
  fs.rmSync(framesDir, { recursive: true, force: true });
  console.log(`frames: ${kept.length} over ${(episodeEnd - episodeStart).toFixed(1)}s`);
  // Soundtrack: synthesised effects (sfx.mjs) plus narration when recorded.
  const wav = path.join(outDir, `${name}.wav`);
  const voices = Object.fromEntries(Object.entries(voiceFiles).map(([id, file]) => [id, wavToFloat(fs.readFileSync(file), 48000)]));
  buildSoundtrack(events, episodeEnd - episodeStart, wav, voices);
  const withSound = path.join(outDir, `${name}.sound.mp4`);
  const mux = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp4, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', withSound], { stdio: 'inherit' });
  if (mux.status !== 0) throw new Error('ffmpeg mux failed');
  fs.renameSync(withSound, mp4);
  fs.unlinkSync(wav);
  const ts = (sec, sep) => {
    const ms = Math.max(0, Math.round(sec * 1000));
    return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`;
  };
  fs.writeFileSync(path.join(outDir, `${name}.srt`), marks.map((m, i) => `${i + 1}\n${ts(m.start, ',')} --> ${ts(m.end, ',')}\n${m.title}\n${m.body}\n`).join('\n'));
  fs.writeFileSync(path.join(outDir, `${name}-narration.txt`), marks.map((m) => `[${ts(m.start, '.').slice(3, 8)} – ${ts(m.end, '.').slice(3, 8)}] ${m.title}\n${m.body}\n`).join('\n'));
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'compact', mp4], { encoding: 'utf8' });
  console.log(`video → ${mp4}\n${probe.stdout.trim()}`);
}
