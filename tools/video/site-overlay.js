// Runs inside the real PlayGonu page during recording (see site-record.mjs).
// Feeds the recorded game into the page's own online-battle UI move by move,
// and at the episode's explain moments pauses the game with a shutter
// flash, rings/arrows drawn over the real board, and a speech bubble.
// Returns a promise that resolves when the episode has finished playing.
export function runEpisode({ states, plan, layout, watermark, ui }) {
  const POINTS = [
    [40, 40], [210, 40], [380, 40], [380, 210], [380, 380], [210, 380], [40, 380], [40, 210],
    [97, 97], [210, 97], [323, 97], [323, 210], [323, 323], [210, 323], [97, 323], [97, 210],
    [153, 153], [210, 153], [267, 153], [267, 210], [267, 267], [210, 267], [153, 267], [153, 210],
  ];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const portrait = layout === 'portrait';

  const style = document.createElement('style');
  style.textContent = `
    #pg-flash { position: fixed; inset: 0; background: #fff; opacity: 0; pointer-events: none; z-index: 60; transition: opacity .25s ease-out; }
    #pg-card { position: fixed; inset: 0; z-index: 55; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; text-align: center; padding: 0 ${portrait ? 28 : 120}px; background: rgba(246,241,230,.95); opacity: 0; transition: opacity .5s; pointer-events: none; }
    #pg-card .k { font-family: "Noto Serif KR", Georgia, serif; font-weight: 700; color: #AC3B2A; font-size: ${portrait ? 22 : 26}px; }
    #pg-card .t { font-family: "Noto Serif KR", Georgia, serif; font-weight: 700; color: #2A2420; font-size: ${portrait ? 40 : 54}px; line-height: 1.25; word-break: keep-all; }
    #pg-card .b { color: #5B524A; font-size: ${portrait ? 19 : 22}px; line-height: 1.6; max-width: 880px; word-break: keep-all; }
    #pg-card .u { margin-top: 8px; font-weight: 800; color: #fff; background: #AC3B2A; border-radius: 12px; padding: 10px 26px; font-size: ${portrait ? 20 : 24}px; }
    #pg-bubble { position: fixed; z-index: 50; background: #fff; border: 2px solid #2A2420; border-radius: 18px; box-shadow: 5px 5px 0 #2A2420; padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 9px; opacity: 0; transform: translateY(10px); transition: opacity .35s, transform .35s; pointer-events: none; word-break: keep-all;
      ${portrait ? 'left: 14px; right: 14px; top: 14px;' : 'right: 26px; width: 300px; top: 150px;'} }
    #pg-bubble .tag { align-self: flex-start; font-size: 13px; font-weight: 800; color: #fff; background: #2F6E6A; border-radius: 999px; padding: 4px 12px; }
    #pg-bubble .tag.alert { background: #AC3B2A; }
    #pg-bubble .title { font-size: ${portrait ? 23 : 24}px; font-weight: 800; line-height: 1.3; color: #2A2420; }
    #pg-bubble .body { font-size: ${portrait ? 16 : 16.5}px; line-height: 1.65; color: #5B524A; }
    #pg-annot { position: absolute; pointer-events: none; z-index: 5; overflow: visible; }
    #pg-annot .ring { animation: pgPulse 1.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    #pg-annot .dash { animation: pgDash 1s linear infinite; }
    @keyframes pgPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
    @keyframes pgDash { to { stroke-dashoffset: -24; } }
    #pg-watermark { position: fixed; right: 14px; bottom: ${portrait ? 150 : 10}px; z-index: 70; font: 600 ${portrait ? 13 : 12}px "Work Sans", system-ui, sans-serif; color: rgba(42,36,32,.55); letter-spacing: .02em; pointer-events: none; }
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
  const annot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  annot.id = 'pg-annot';
  annot.setAttribute('viewBox', '0 0 420 420');
  frame.appendChild(annot);
  // The board SVG fills the frame's content box (`.board-frame svg { width:
  // 100% }`), so the overlay copies the frame's padding instead of measuring
  // pixels — that stays exact under the page zoom used for recording.
  const placeAnnot = () => {
    const cs = getComputedStyle(frame);
    const padL = parseFloat(cs.paddingLeft);
    const padR = parseFloat(cs.paddingRight);
    annot.style.cssText = `position:absolute;left:${padL}px;top:${parseFloat(cs.paddingTop)}px;width:calc(100% - ${padL + padR}px);height:auto;aspect-ratio:1/1;display:block;`;
  };

  function annotate(ex) {
    placeAnnot();
    const ringColor = { gold: '#E9B949', red: '#AC3B2A', blue: '#2C5F8A' };
    let s = '';
    for (const mill of ex.mills || []) {
      const [a, , c] = mill.map((i) => POINTS[i]);
      s += `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="#F3C969" stroke-width="18" stroke-linecap="round" opacity=".55"/>`;
    }
    for (const ring of ex.rings || []) {
      for (const i of ring.points) {
        const [x, y] = POINTS[i];
        s += `<g class="ring"><circle cx="${x}" cy="${y}" r="24" fill="none" stroke="#fff" stroke-width="7" opacity=".9"/><circle cx="${x}" cy="${y}" r="24" fill="none" stroke="${ringColor[ring.color]}" stroke-width="4"/></g>`;
      }
    }
    for (const arrow of ex.arrows || []) {
      const [x1, y1] = POINTS[arrow.from];
      const [x2, y2] = POINTS[arrow.to];
      const d = `M${x1 + 17} ${y1}Q${(x1 + x2) / 2 + 46} ${(y1 + y2) / 2} ${x2 + 17} ${y2}`;
      s += `<path d="${d}" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".9"/>`;
      s += `<path class="dash" d="${d}" fill="none" stroke="#E9B949" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="12 12"/>`;
      for (const [hx, hy, dir] of [[x1 + 17, y1, -1], [x2 + 17, y2, 1]]) {
        s += `<path d="M${hx - 8} ${hy + 9 * dir}L${hx} ${hy}L${hx + 8} ${hy + 9 * dir}" fill="none" stroke="#E9B949" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
    }
    annot.innerHTML = s;
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
      } else if (seg.type === 'ply') {
        const next = states[seg.index + 1];
        window.__feedState(next, next.winner ? 'finished' : 'playing');
        await sleep(seg.dur * 1000);
        // The site's own "first half over" popup appears here; let it be read,
        // then press OK like a player would.
        const phaseBanner = document.querySelector('[data-phase-banner].is-visible');
        if (phaseBanner) {
          await sleep(window.__snap ? 200 : 2600);
          phaseBanner.querySelector('[data-phase-banner-ok]')?.click();
          await sleep(400);
        }
      } else if (seg.type === 'explain') {
        // The result banner covers the board at the end; hide it while we explain.
        const banner = document.querySelector('[data-result-banner].is-visible');
        if (banner) banner.style.visibility = 'hidden';
        flash.style.transition = 'none';
        flash.style.opacity = '.8';
        flash.getBoundingClientRect();
        flash.style.transition = 'opacity .3s ease-out';
        flash.style.opacity = '0';
        annotate(seg.ex);
        await sleep(250);
        showBubble(seg.copy, seg.ex.tagTone === 'alert');
        marks.push({ kind: 'explain', after: seg.at, start: at, end: at + seg.dur, title: seg.copy.title, body: seg.copy.body });
        if (window.__snap) {
          // Guide screenshots carry their caption in the page text, so the
          // bubble is left out of the still (annotations stay).
          await sleep(700);
          bubble.style.visibility = 'hidden';
          await window.__snap(`after-${seg.at}`);
          bubble.style.visibility = '';
        }
        await sleep(Math.max(0, seg.dur * 1000 - 600 - (window.__snap ? 700 : 0)));
        hideBubble();
        annot.innerHTML = '';
        await sleep(350);
        if (banner) banner.style.visibility = '';
      } else if (seg.type === 'hold') {
        await sleep(seg.dur * 1000);
      }
    }
    return marks;
  })();
}
