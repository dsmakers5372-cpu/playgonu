// Runs inside a real PlayGonu game page (2 players, local) during a how-to
// recording (see howto-record.mjs). It plays the episode by CLICKING the
// board like a person would — pick a piece, the site shows where it can go,
// then pick the destination — and at the explain moments pauses with a
// shutter flash, rings/arrows/lines drawn over the board and a speech bubble.
// Returns a promise of caption marks (seconds from the start of the episode).
// `doubleTap`: the page wants two taps per placement (Gomoku: preview, then
// confirm), so every placement is tapped twice.
// `explainZoom`: during an explanation, zoom the board (about this much) onto
// the stones being talked about — for big boards like Gomoku's 15×15.
// `lineOpacity`: the glowing band drawn along a highlighted line — lighter on
// boards with dark stones so their colour still shows.
// `tight`: a crowded board (Gomoku) — slimmer rings that don't cover the
// neighbouring stones, and line bands blended so dark stones stay dark.
export function runHowto({ plan, layout, watermark, points, pieceR, fastLabel, doubleTap = false, explainZoom = 0, lineOpacity = 0.55, tight = false }) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const portrait = layout === 'portrait';
  const ringR = pieceR + (tight ? 4 : 9);
  const ringW = tight ? [3.5, 2.5] : [7, 4];

  const style = document.createElement('style');
  style.textContent = `
    #pg-flash { position: fixed; inset: 0; background: #fff; opacity: 0; pointer-events: none; z-index: 60; }
    #pg-card { position: fixed; inset: 0; z-index: 55; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; text-align: center; padding: 0 ${portrait ? 28 : 120}px; background: rgba(246,241,230,.97); opacity: 0; transition: opacity .5s; pointer-events: none; }
    #pg-card .k { font-family: "Noto Serif KR", Georgia, serif; font-weight: 700; color: #AC3B2A; font-size: ${portrait ? 22 : 26}px; }
    #pg-card .t { font-family: "Noto Serif KR", Georgia, serif; font-weight: 700; color: #2A2420; font-size: ${portrait ? 40 : 54}px; line-height: 1.25; word-break: keep-all; }
    #pg-card .b { color: #5B524A; font-size: ${portrait ? 19 : 22}px; line-height: 1.6; max-width: 880px; word-break: keep-all; white-space: pre-line; }
    #pg-card .u { margin-top: 8px; font-weight: 800; color: #fff; background: #AC3B2A; border-radius: 12px; padding: 10px 26px; font-size: ${portrait ? 20 : 24}px; }
    #pg-bubble { position: fixed; z-index: 50; background: #fff; border: 2px solid #2A2420; border-radius: 18px; box-shadow: 5px 5px 0 #2A2420; padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 9px; opacity: 0; transform: translateY(10px); transition: opacity .35s, transform .35s; pointer-events: none; word-break: keep-all;
      ${portrait ? 'left: 14px; right: 14px; top: 14px;' : 'right: 40px; width: 420px; top: 110px;'} }
    #pg-bubble .tag { align-self: flex-start; font-size: 13px; font-weight: 800; color: #fff; background: #2F6E6A; border-radius: 999px; padding: 4px 12px; }
    #pg-bubble .tag.alert { background: #AC3B2A; }
    #pg-bubble .title { font-size: ${portrait ? 23 : 24}px; font-weight: 800; line-height: 1.3; color: #2A2420; }
    #pg-bubble .body { font-size: ${portrait ? 16 : 16.5}px; line-height: 1.65; color: #5B524A; white-space: pre-line; }
    .pg-layer { position: absolute; pointer-events: none; z-index: 5; overflow: visible; }
    #pg-annot .ring { animation: pgPulse 1.1s ease-in-out infinite, pgGlow 1.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    #pg-annot .spark { animation: pgSpin 2.4s linear infinite, pgTwinkle 1.2s ease-in-out infinite; transform-box: view-box; }
    @keyframes pgGlow { 0%, 100% { filter: drop-shadow(0 0 1px #F3C969); } 50% { filter: drop-shadow(0 0 7px #F3C969) drop-shadow(0 0 3px #fff); } }
    @keyframes pgSpin { to { transform: rotate(360deg); } }
    @keyframes pgTwinkle { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
    #pg-annot .dash { animation: pgDash 1s linear infinite; }
    #pg-tap circle { animation: pgTap .55s ease-out forwards; transform-box: fill-box; transform-origin: center; }
    @keyframes pgPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
    @keyframes pgDash { to { stroke-dashoffset: -24; } }
    @keyframes pgTap { from { transform: scale(.5); opacity: .75; } to { transform: scale(1.5); opacity: 0; } }
    #pg-fast { position: absolute; left: 50%; top: -18px; transform: translateX(-50%); z-index: 6; background: #2A2420; color: #fff; font: 800 14px "Work Sans", system-ui, sans-serif; letter-spacing: .04em; border-radius: 999px; padding: 6px 14px; opacity: 0; transition: opacity .25s; pointer-events: none; }
    #pg-hook { position: absolute; left: 50%; top: 9%; z-index: 7; transform: translate(-50%, 0) scale(.6); opacity: 0; transition: opacity .2s, transform .35s cubic-bezier(.2,1.6,.4,1); background: #2A2420; color: #fff; font: 800 ${portrait ? 30 : 30}px "Noto Serif KR", Georgia, serif; padding: 12px 22px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,.25); white-space: nowrap; pointer-events: none; }
    #pg-hook.on { opacity: 1; transform: translate(-50%, 0) scale(1); }
    #pg-hook em { font-style: normal; color: #F3C969; }
    #pg-watermark { position: fixed; right: 14px; bottom: ${portrait ? 150 : 10}px; z-index: 70; font: 600 ${portrait ? 13 : 12}px "Work Sans", system-ui, sans-serif; color: rgba(42,36,32,.6); letter-spacing: .02em; pointer-events: none; background: rgba(246,241,230,.92); border-radius: 6px; padding: 2px 7px; }
  `;
  document.head.appendChild(style);

  const flash = Object.assign(document.createElement('div'), { id: 'pg-flash' });
  const card = Object.assign(document.createElement('div'), { id: 'pg-card' });
  const bubble = Object.assign(document.createElement('div'), { id: 'pg-bubble' });
  const mark = Object.assign(document.createElement('div'), { id: 'pg-watermark', textContent: watermark });
  document.body.append(flash, card, bubble, mark);

  const boardSvg = document.querySelector('[data-board-svg]');
  const frame = boardSvg.parentElement;
  if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
  const layer = (id) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = id;
    svg.classList.add('pg-layer');
    svg.setAttribute('viewBox', '0 0 420 420');
    frame.appendChild(svg);
    return svg;
  };
  // Line bands go on their own layer, multiplied onto the board: gold over
  // empty wood, but a black stone stays black under it.
  const band = layer('pg-band');
  band.style.mixBlendMode = 'multiply';
  const annot = layer('pg-annot');
  const tapLayer = layer('pg-tap');
  const fast = Object.assign(document.createElement('div'), { id: 'pg-fast', textContent: fastLabel });
  frame.appendChild(fast);
  const hook = Object.assign(document.createElement('div'), { id: 'pg-hook' });
  frame.appendChild(hook);

  // Sound cues for the soundtrack (added after recording), in seconds from
  // the start of the episode.
  const events = [];
  let t0 = performance.now();
  const ev = (kind) => events.push({ kind, t: (performance.now() - t0) / 1000 });

  // A capture zooms the board in on that point for a moment.
  function zoomAt(i) {
    const cs = getComputedStyle(frame);
    const padL = parseFloat(cs.paddingLeft);
    const padT = parseFloat(cs.paddingTop);
    const inner = frame.clientWidth - padL - parseFloat(cs.paddingRight);
    const [x, y] = points[i];
    frame.style.transformOrigin = `${padL + (x / 420) * inner}px ${padT + (y / 420) * inner}px`;
    frame.style.transition = 'transform .35s ease-out';
    frame.style.transform = 'scale(1.16)';
    setTimeout(() => { frame.style.transform = 'scale(1)'; }, 1400);
  }
  // The board SVG fills the frame's content box, so the overlays copy the
  // frame's padding — exact under the page zoom used for recording.
  const placeLayers = () => {
    const cs = getComputedStyle(frame);
    const padL = parseFloat(cs.paddingLeft);
    const padR = parseFloat(cs.paddingRight);
    for (const svg of [band, annot, tapLayer]) {
      svg.style.cssText = `left:${padL}px;top:${parseFloat(cs.paddingTop)}px;width:calc(100% - ${padL + padR}px);height:auto;aspect-ratio:1/1;display:block;`;
    }
  };
  placeLayers();

  // Explanation close-up: slide and enlarge the board so the stones being
  // talked about sit in the middle of the board's frame, like a zoomed shot.
  function zoomOnto(ex) {
    const pts = [
      ...(ex.focus || []),
      ...(ex.rings || []).flatMap((r) => r.points),
      ...(ex.lines || []).flatMap((l) => [l[0], l[l.length - 1]]),
      ...(ex.arrows || []).flatMap((a) => [a.from, a.to]),
    ].map((i) => points[i]);
    if (!pts.length) return false;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 4 * pieceR + 40;
    const z = Math.max(1, Math.min(explainZoom, 380 / span));
    const cs = getComputedStyle(frame);
    const padL = parseFloat(cs.paddingLeft);
    const padT = parseFloat(cs.paddingTop);
    const inner = frame.clientWidth - padL - parseFloat(cs.paddingRight);
    const px = padL + (cx / 420) * inner;
    const py = padT + (cy / 420) * inner;
    frame.style.transformOrigin = '0 0';
    frame.style.transition = 'transform .45s ease-out';
    frame.style.transform = `translate(${frame.clientWidth / 2 - z * px}px, ${frame.clientHeight / 2 - z * py}px) scale(${z})`;
    return true;
  }

  const ringColor = { gold: '#E9B949', red: '#AC3B2A', blue: '#2C5F8A', dark: '#2A2420' };
  function annotate(ex) {
    let s = '';
    let b = '';
    for (const line of ex.lines || []) {
      const [a, c] = [points[line[0]], points[line[line.length - 1]]];
      if (tight) {
        // A gold capsule drawn around the stones — outline only, so the stones
        // inside keep their colour.
        const len = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
        const nx = -(c[1] - a[1]) / len;
        const ny = (c[0] - a[0]) / len;
        const rr = pieceR + 3.5;
        const d = `M${a[0] + nx * rr} ${a[1] + ny * rr}L${c[0] + nx * rr} ${c[1] + ny * rr}A${rr} ${rr} 0 0 1 ${c[0] - nx * rr} ${c[1] - ny * rr}L${a[0] - nx * rr} ${a[1] - ny * rr}A${rr} ${rr} 0 0 1 ${a[0] + nx * rr} ${a[1] + ny * rr}Z`;
        s += `<path class="dash" d="${d}" fill="none" stroke="#E9B949" stroke-width="3" stroke-dasharray="10 5"/>`;
      } else {
        s += `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="#F3C969" stroke-width="${pieceR + 5}" stroke-linecap="round" opacity="${lineOpacity}"/>`;
      }
    }
    for (const ring of ex.rings || []) {
      for (const i of ring.points) {
        const [x, y] = points[i];
        s += `<g class="ring"><circle cx="${x}" cy="${y}" r="${ringR}" fill="none" stroke="#fff" stroke-width="${ringW[0]}" opacity=".9"/><circle cx="${x}" cy="${y}" r="${ringR}" fill="none" stroke="${ringColor[ring.color]}" stroke-width="${ringW[1]}"/></g>`;
        // Two little sparkles circling the stone, so it twinkles.
        const sp = (a) => {
          const sx = x + Math.cos(a) * (ringR + 5);
          const sy = y + Math.sin(a) * (ringR + 5);
          const k = Math.max(3, pieceR * 0.35);
          return `<path d="M${sx} ${sy - k}L${sx + k * 0.3} ${sy - k * 0.3}L${sx + k} ${sy}L${sx + k * 0.3} ${sy + k * 0.3}L${sx} ${sy + k}L${sx - k * 0.3} ${sy + k * 0.3}L${sx - k} ${sy}L${sx - k * 0.3} ${sy - k * 0.3}Z" fill="#FFF6D8" stroke="#E9B949" stroke-width="1"/>`;
        };
        s += `<g class="spark" style="transform-origin:${x}px ${y}px">${sp(-0.8)}${sp(2.35)}</g>`;
      }
    }
    for (const arrow of ex.arrows || []) {
      const [x1, y1] = points[arrow.from];
      const [x2, y2] = points[arrow.to];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const ux = (x2 - x1) / len;
      const uy = (y2 - y1) / len;
      const gap = pieceR + 5;
      const sx = x1 + ux * gap;
      const sy = y1 + uy * gap;
      const ex2 = x2 - ux * gap;
      const ey2 = y2 - uy * gap;
      const d = `M${sx} ${sy}L${ex2} ${ey2}`;
      s += `<path d="${d}" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".9"/>`;
      s += `<path class="dash" d="${d}" fill="none" stroke="#E9B949" stroke-width="5" stroke-linecap="round" stroke-dasharray="12 12"/>`;
      const hx = ex2;
      const hy = ey2;
      const px = -uy;
      const py = ux;
      s += `<path d="M${hx - ux * 11 + px * 9} ${hy - uy * 11 + py * 9}L${hx} ${hy}L${hx - ux * 11 - px * 9} ${hy - uy * 11 - py * 9}" fill="none" stroke="#E9B949" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    annot.innerHTML = s;
    band.innerHTML = b;
  }

  function tap(i) {
    const [x, y] = points[i];
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x);
    c.setAttribute('cy', y);
    c.setAttribute('r', ringR);
    c.setAttribute('fill', 'rgba(42,36,32,.18)');
    c.setAttribute('stroke', 'rgba(42,36,32,.55)');
    c.setAttribute('stroke-width', '3');
    tapLayer.appendChild(c);
    setTimeout(() => c.remove(), 700);
  }

  // The site rebuilds the board on every click, so look the point up fresh.
  function click(i, show = true) {
    if (show) tap(i);
    const hit = document.querySelectorAll('[data-board-svg] .board-point')[i];
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  function showCard(copy, withUrl) {
    card.innerHTML = '';
    const k = Object.assign(document.createElement('div'), { className: 'k', textContent: 'PlayGonu' });
    const t = Object.assign(document.createElement('div'), { className: 't', textContent: copy.title });
    const b = Object.assign(document.createElement('div'), { className: 'b', textContent: copy.body });
    card.append(k, t, b);
    if (withUrl) card.append(Object.assign(document.createElement('div'), { className: 'u', textContent: 'playgonu.com' }));
    card.style.opacity = '1';
  }

  function showBubble(copy, alert) {
    bubble.innerHTML = '';
    const tag = Object.assign(document.createElement('span'), { className: `tag${alert ? ' alert' : ''}`, textContent: copy.tag });
    const t = Object.assign(document.createElement('div'), { className: 'title', textContent: copy.title });
    const b = Object.assign(document.createElement('div'), { className: 'body', textContent: copy.body });
    bubble.append(tag, t, b);
    bubble.style.opacity = '1';
    bubble.style.transform = 'none';
  }
  const hideBubble = () => { bubble.style.opacity = '0'; bubble.style.transform = 'translateY(10px)'; };
  const winBanner = () => document.querySelector('[data-win-banner].is-visible');
  // The site pops its win banner the instant the game ends; keep it out of
  // the way until the closing beat so the final capture and explanation are
  // seen, then show it.
  let bannerHeld = false;
  const holdBanner = () => {
    const b = winBanner();
    if (b) { b.style.visibility = 'hidden'; bannerHeld = true; }
  };

  // Cham-gonu's own "first half over" popup: let it be read, then press OK.
  async function closePhaseBanner(wait) {
    const banner = document.querySelector('[data-phase-banner].is-visible');
    if (!banner) return 0;
    await sleep(wait);
    banner.querySelector('[data-phase-banner-ok]')?.click();
    await sleep(300);
    return wait + 300;
  }

  async function playMove([from, to], dur, isFast, isCapture) {
    const pick = isFast ? 90 : 280;
    let used = 0;
    if (from !== null) {
      click(from, !isFast);
      if (!isFast) ev('tap');
      await sleep(pick);
      used += pick;
    }
    click(to, !isFast);
    if (doubleTap && from === null) {
      await sleep(isFast ? 60 : 160); // the site's preview stone shows for a moment
      used += isFast ? 60 : 160;
      click(to, false);
    }
    ev(isCapture && from === null ? 'capture' : 'place');
    if (isCapture) {
      if (from !== null) setTimeout(() => ev('capture'), 120);
      zoomAt(to);
    }
    holdBanner();
    const end = performance.now() + Math.max(0, dur * 1000 - used);
    while (performance.now() < end) { holdBanner(); await sleep(50); }
  }

  return (async () => {
    const marks = [];
    t0 = performance.now();
    for (const seg of plan) {
      const at = (performance.now() - t0) / 1000;
      // Narration (when recorded with a voice): the line starts with its segment.
      if (seg.voice) events.push({ kind: 'voice', id: seg.voice, t: at + (seg.voiceDelay || 0) });
      if (seg.type === 'intro' || seg.type === 'outro') {
        showCard(seg.copy, seg.type === 'outro');
        if (seg.type === 'outro') ev('whoosh');
        marks.push({ kind: seg.type, start: at, end: at + seg.dur, title: seg.copy.title, body: seg.copy.body });
        await sleep(seg.dur * 1000 - (seg.type === 'intro' ? 500 : 0));
        if (seg.type === 'intro') { card.style.opacity = '0'; await sleep(500); }
      } else if (seg.type === 'caption') {
        if (seg.text) {
          hook.innerHTML = seg.text;
          hook.classList.add('on');
          ev('pop');
          marks.push({ kind: 'caption', start: at, end: at + (seg.span || 3), title: hook.textContent, body: '' });
        } else {
          hook.classList.remove('on');
        }
      } else if (seg.type === 'cut') {
        // A new game behind a title card: start over and replay the setup
        // moves quickly, out of sight, then lift the card.
        showCard(seg.copy, false);
        ev('whoosh');
        marks.push({ kind: 'cut', start: at, end: at + seg.dur, title: seg.copy.title, body: seg.copy.body });
        await sleep(Math.min(600, seg.dur * 300));
        document.querySelector('[data-new-game]').click();
        await sleep(200);
        for (const m of seg.replay) {
          if (m[0] !== null) { click(m[0], false); await sleep(40); }
          click(m[1], false);
          if (doubleTap && m[0] === null) { await sleep(20); click(m[1], false); }
          await sleep(60);
          await closePhaseBanner(50);
        }
        const left = seg.dur * 1000 - (performance.now() - t0 - at * 1000) - 500;
        await sleep(Math.max(0, left));
        card.style.opacity = '0';
        await sleep(500);
      } else if (seg.type === 'ply') {
        fast.style.opacity = seg.fast ? '1' : '0';
        await playMove(seg.move, seg.dur, seg.fast, seg.capture);
        await closePhaseBanner(seg.fast ? 200 : portrait ? 1500 : 2600);
      } else if (seg.type === 'explain') {
        fast.style.opacity = '0';
        flash.style.transition = 'none';
        flash.style.opacity = '.8';
        flash.getBoundingClientRect();
        flash.style.transition = 'opacity .3s ease-out';
        flash.style.opacity = '0';
        placeLayers();
        annotate(seg.ex);
        const zoomed = explainZoom ? zoomOnto(seg.ex) : false;
        await sleep(250);
        showBubble(seg.copy, seg.ex.tagTone === 'alert');
        ev('pop');
        marks.push({ kind: 'explain', start: at, end: at + seg.dur, title: seg.copy.title, body: seg.copy.body });
        // `poke`: tap a point the rules forbid, so the site's own warning shows.
        let poked = 0;
        if (seg.ex.poke !== undefined) {
          await sleep(900);
          click(seg.ex.poke);
          ev('tap');
          // The site's warning sits in the toolbar, under the zoomed board — so
          // also shake a big red × on the point itself.
          const [x, y] = points[seg.ex.poke];
          const k = pieceR * 0.9;
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.innerHTML = `<circle cx="${x}" cy="${y}" r="${pieceR + 3}" fill="rgba(172,59,42,.18)"/><path d="M${x - k} ${y - k}L${x + k} ${y + k}M${x + k} ${y - k}L${x - k} ${y + k}" stroke="#AC3B2A" stroke-width="${Math.max(3, pieceR * 0.35)}" stroke-linecap="round"/>`;
          annot.appendChild(g);
          g.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 420, iterations: 2 });
          poked = 900;
        }
        await sleep(Math.max(0, seg.dur * 1000 - 600 - poked));
        hideBubble();
        if (zoomed) { frame.style.transform = 'none'; await sleep(200); }
        annot.innerHTML = '';
        band.innerHTML = '';
        await sleep(350);
      } else if (seg.type === 'countdown') {
        // Puzzle pause: a big 3 · 2 · 1 over the board, a tick each second.
        const n = Object.assign(document.createElement('div'), { id: 'pg-count' });
        n.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:8;font:800 120px "Work Sans",system-ui,sans-serif;color:#AC3B2A;text-shadow:0 4px 18px rgba(246,241,230,.95),0 0 3px #fff;pointer-events:none;';
        frame.appendChild(n);
        for (let k = seg.from || 3; k >= 1; k--) {
          n.textContent = String(k);
          n.animate([{ transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 250, fill: 'forwards' });
          ev('tap');
          await sleep(1000);
        }
        n.remove();
      } else if (seg.type === 'hold') {
        fast.style.opacity = '0';
        if (seg.showBanner && bannerHeld && winBanner()) {
          winBanner().style.visibility = '';
          ev('win');
        }
        await sleep(seg.dur * 1000);
      }
    }
    return { marks, events, ended: !!winBanner() };
  })();
}

// Before recording: play the moves leading up to the hook, off camera.
export function prepareBoard(moves, doubleTap = false) {
  const click = (i) => document.querySelectorAll('[data-board-svg] .board-point')[i].dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return (async () => {
    for (const [from, to] of moves) {
      if (from !== null) { click(from); await new Promise((r) => setTimeout(r, 30)); }
      click(to);
      if (doubleTap && from === null) { await new Promise((r) => setTimeout(r, 20)); click(to); }
      await new Promise((r) => setTimeout(r, 50));
      const phase = document.querySelector('[data-phase-banner].is-visible [data-phase-banner-ok]');
      if (phase) phase.click();
    }
    await new Promise((r) => setTimeout(r, 3200)); // let capture effects finish
  })();
}
