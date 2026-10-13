importScripts('rapfi-single-simd128.js');
const RENJU_WEIGHTS = ['mix9svqrenju_bs15_black.bin.lz4', 'mix9svqrenju_bs15_white.bin.lz4'];
let currentId = 0;
let infoLines = [];
let engine = null;
let renjuLoaded = null;
let chain = Promise.resolve();

// Renju weights are not part of the preloaded package: fetch them once, on
// demand, and write them where the engine's config looks for weight files.
function ensureRenjuWeights() {
  if (!renjuLoaded) {
    renjuLoaded = Promise.all(RENJU_WEIGHTS.map(async (name) => {
      const res = await fetch(new URL(`renju/${name}`, self.location.href));
      if (!res.ok) throw new Error(`${res.status}: ${name}`);
      return [name, new Uint8Array(await res.arrayBuffer())];
    })).then((files) => {
      for (const [name, data] of files) engine.FS_createDataFile('/', name, data, true, true, true);
    }).catch((err) => { renjuLoaded = null; throw err; });
  }
  return renjuLoaded;
}

async function handle(d) {
  try {
    if (d.rule === 4) await ensureRenjuWeights();
  } catch (err) {
    postMessage({ t: 'fail', id: d.id, message: String((err && err.message) || err) });
    return;
  }
  engine.sendCommand(`INFO rule ${d.rule}`);
  if (d.t === 'prepare') {
    postMessage({ t: 'prepared', id: d.id });
    return;
  }
  currentId = d.id;
  infoLines = [];
  engine.sendCommand(`INFO timeout_turn ${d.ms}`);
  engine.sendCommand(d.board);
}

Rapfi({
  onReceiveStdout: (line) => {
    if (/^\d+,\d+$/.test(line)) {
      postMessage({ t: 'move', id: currentId, move: line, info: infoLines.slice(-80) });
      infoLines = [];
    } else if (line.includes('Eval')) {
      infoLines.push(line);
    }
  },
  onReceiveStderr: () => {},
}).then((m) => {
  engine = m;
  m.sendCommand('START 15');
  m.sendCommand('INFO max_memory 0');
  onmessage = (e) => {
    const d = e.data;
    if (d.t !== 'ask' && d.t !== 'prepare') return;
    chain = chain.then(() => handle(d));
  };
  postMessage({ t: 'ready' });
}).catch((err) => postMessage({ t: 'error', message: String((err && err.message) || err) }));
