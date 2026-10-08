// Runs inside a real PlayGonu game page (2 players, local) during a how-to
// recording (see howto-record.mjs). It plays the episode by CLICKING the
// board like a person would — pick a piece, the site shows where it can go,
// then pick the destination — and at the explain moments pauses with a
// shutter flash, rings/arrows/lines drawn over the board and a speech bubble.
// Returns a promise of caption marks (seconds from the start of the episode).
export function runHowto({ plan, layout, watermark, points, pieceR, fastLabel }) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const portrait = layout === 'portrait';
  const ringR = pieceR + 9;

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
    #pg-annot .ring { animation: pgPulse 1.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    #pg-annot .dash { animation: pgDash 1s linear infinite; }
    #pg-tap circle { animation: pgTap .55s ease-out forwards; transform-box: fill-box; transform-origin: center; }
    @keyframes pgPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
    @keyframes pgDash { to { stroke-dashoffset: -24; } }
    @keyframes pgTap { from { transform: scale(.5); opacity: .75; } to { transform: scale(1.5); opacity: 0; } }
    #pg-fast { position: absolute; left: 50%; top: -18px; transform: translateX(-50%); z-index: 6; background: #2A2420; color: #fff; font: 800 14px "Work Sans", system-ui, sans-serif; letter-spacing: .04em; border-radius: 999px; padding: 6px 14px; opacity: 0; transition: opacity .25s; pointer-events: none; }
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
  const annot = layer('pg-annot');
  const tapLayer = layer('pg-tap');
  const fast = Object.assign(document.createElement('div'), { id: 'pg-fast', textContent: fastLabel });
  frame.appendChild(fast);
  // The board SVG fills the frame's content box, so the overlays copy the
  // frame's padding — exact under the page zoom used for recording.
  const placeLayers = () => {
    const cs = getComputedStyle(frame);
    const padL = parseFloat(cs.paddingLeft);
    const padR = parseFloat(cs.paddingRight);
    for (const svg of [annot, tapLayer]) {
      svg.style.cssText = `left:${padL}px;top:${parseFloat(cs.paddingTop)}px;width:calc(100% - ${padL + padR}px);height:auto;aspect-ratio:1/1;display:block;`;
    }
  };
  placeLayers();

  const ringColor = { gold: '#E9B949', red: '#AC3B2A', blue: '#2C5F8A', dark: '#2A2420' };
  function annotate(ex) {
    let s = '';
    for (const line of ex.lines || []) {
      const [a, c] = [points[line[0]], points[line[line.length - 1]]];
      s += `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="#F3C969" stroke-width="${pieceR + 5}" stroke-linecap="round" opacity=".55"/>`;
    }
    for (const ring of ex.rings || []) {
      for (const i of ring.points) {
        const [x, y] = points[i];
        s += `<g class="ring"><circle cx="${x}" cy="${y}" r="${ringR}" fill="none" stroke="#fff" stroke-width="7" opacity=".9"/><circle cx="${x}" cy="${y}" r="${ringR}" fill="none" stroke="${ringColor[ring.color]}" stroke-width="4"/></g>`;
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

  async function playMove([from, to], dur, isFast) {
    const pick = isFast ? 110 : 520;
    let used = 0;
    if (from !== null) {
      click(from, !isFast);
      await sleep(pick);
      used += pick;
    }
    click(to, !isFast);
    holdBanner();
    const end = performance.now() + Math.max(0, dur * 1000 - used);
    while (performance.now() < end) { holdBanner(); await sleep(50); }
  }

  return (async () => {
    const marks = [];
    const t0 = performance.now();
    for (const seg of plan) {
      const at = (performance.now() - t0) / 1000;
      if (seg.type === 'intro' || seg.type === 'outro') {
        showCard(seg.copy, seg.type === 'outro');
        marks.push({ kind: seg.type, start: at, end: at + seg.dur, title: seg.copy.title, body: seg.copy.body });
        await sleep(seg.dur * 1000 - (seg.type === 'intro' ? 500 : 0));
        if (seg.type === 'intro') { card.style.opacity = '0'; await sleep(500); }
      } else if (seg.type === 'cut') {
        // A new game behind a title card: start over and replay the setup
        // moves quickly, out of sight, then lift the card.
        showCard(seg.copy, false);
        marks.push({ kind: 'cut', start: at, end: at + seg.dur, title: seg.copy.title, body: seg.copy.body });
        await sleep(600);
        document.querySelector('[data-new-game]').click();
        await sleep(200);
        for (const m of seg.replay) {
          if (m[0] !== null) { click(m[0], false); await sleep(40); }
          click(m[1], false);
          await sleep(60);
          await closePhaseBanner(50);
        }
        const left = seg.dur * 1000 - (performance.now() - t0 - at * 1000) - 500;
        await sleep(Math.max(0, left));
        card.style.opacity = '0';
        await sleep(500);
      } else if (seg.type === 'ply') {
        fast.style.opacity = seg.fast ? '1' : '0';
        await playMove(seg.move, seg.dur, seg.fast);
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
        await sleep(250);
        showBubble(seg.copy, seg.ex.tagTone === 'alert');
        marks.push({ kind: 'explain', start: at, end: at + seg.dur, title: seg.copy.title, body: seg.copy.body });
        await sleep(Math.max(0, seg.dur * 1000 - 600));
        hideBubble();
        annot.innerHTML = '';
        await sleep(350);
      } else if (seg.type === 'hold') {
        fast.style.opacity = '0';
        if (bannerHeld) winBanner().style.visibility = '';
        await sleep(seg.dur * 1000);
      }
    }
    return { marks, ended: !!winBanner() };
  })();
}
