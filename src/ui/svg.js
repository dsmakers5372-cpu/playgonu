export const SVG_NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

// Board effects (a captured piece fading out, a ring sweeping outward) used
// SMIL <animate>, whose clock starts when the <svg> first appeared — so an
// effect added to a board that had been open for a while counted as already
// finished and jumped to its end state (a captured piece simply vanished).
// They run on the Web Animations API instead: animate() records the effect
// with the moment it began, and startAnimations() plays it from that moment,
// so a re-render mid-effect picks it up where it was instead of restarting.
// attrs follow the old SMIL shape: { attributeName: 'opacity' | 'r', from,
// to | values: 'a;b;c', dur: '650ms' | '1.6s', fill: 'freeze' }.
const pending = [];

export function animate(node, attrs, startedAt = performance.now()) {
  const values = attrs.values ? attrs.values.split(';') : [attrs.from, attrs.to];
  const dur = attrs.dur.endsWith('ms') ? parseFloat(attrs.dur) : parseFloat(attrs.dur) * 1000;
  let keyframes;
  if (attrs.attributeName === 'r') {
    // Radius isn't animatable as a CSS property everywhere, so scale instead.
    const base = Number(node.getAttribute('r'));
    node.style.transformBox = 'fill-box';
    node.style.transformOrigin = 'center';
    node.style.vectorEffect = 'non-scaling-stroke';
    keyframes = values.map((v) => ({ transform: `scale(${Number(v) / base})` }));
  } else {
    keyframes = values.map((v) => ({ [attrs.attributeName]: v }));
  }
  pending.push({ node, keyframes, dur, delay: 0, startedAt });
  return node;
}

// Same timing model with raw Web Animations keyframes, for multi-step
// effects; `delay` is measured from the effect's start.
export function animateKeyframes(node, keyframes, { duration, delay = 0 }, startedAt = performance.now()) {
  node.style.transformBox = 'fill-box';
  node.style.transformOrigin = 'center';
  pending.push({ node, keyframes, dur: duration, delay, startedAt });
  return node;
}

export function startAnimations(svg) {
  const now = performance.now();
  for (let i = pending.length - 1; i >= 0; i--) {
    const { node, keyframes, dur, delay, startedAt } = pending[i];
    if (!node.isConnected) {
      if (!svg.contains(node)) pending.splice(i, 1);
      continue;
    }
    if (!svg.contains(node)) continue;
    const anim = node.animate(keyframes, { duration: dur, delay, fill: 'both' });
    anim.currentTime = Math.min(now - startedAt, delay + dur);
    pending.splice(i, 1);
  }
}

// A capture during placement turns the point into a dead "peg" (×). The
// captured piece flips like a coin to a silver back, a few silver glints
// burst out, and the silver disc fades to reveal the × drawn beneath it.
export function pegFlipEffect(x, y, colors, startedAt) {
  const g = el('g', {});
  const front = el('circle', { cx: x, cy: y, r: 13, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '2' });
  animateKeyframes(front, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 280 }, startedAt);
  const back = el('circle', { cx: x, cy: y, r: 13, fill: '#E6E9ED', stroke: '#8E98A3', 'stroke-width': '2' });
  const shine = el('ellipse', { cx: x - 4, cy: y - 5, rx: 5, ry: 3, fill: '#FFFFFF', opacity: '.85' });
  for (const node of [back, shine]) {
    animateKeyframes(node, [
      { transform: 'scaleX(0)', opacity: 1 },
      { transform: 'scaleX(1)', opacity: 1, offset: 0.25 },
      { transform: 'scaleX(1)', opacity: 1, offset: 0.62 },
      { transform: 'scaleX(1) scale(0.85)', opacity: 0 },
    ], { duration: 1100, delay: 280 }, startedAt);
  }
  g.append(front, back, shine);
  for (let k = 0; k < 6; k++) {
    const angle = (Math.PI * 2 * k) / 6 + 0.35;
    const dx = Math.cos(angle) * 34;
    const dy = Math.sin(angle) * 34;
    const s = 7.5;
    const glint = el('path', {
      d: `M${x} ${y - s}L${x + s * 0.3} ${y - s * 0.3}L${x + s} ${y}L${x + s * 0.3} ${y + s * 0.3}L${x} ${y + s}L${x - s * 0.3} ${y + s * 0.3}L${x - s} ${y}L${x - s * 0.3} ${y - s * 0.3}Z`,
      fill: k % 2 ? '#FFFFFF' : '#C9D1DA',
      stroke: '#8E98A3',
      'stroke-width': '1.2',
    });
    animateKeyframes(glint, [
      { transform: 'translate(0,0) scale(0)', opacity: 0 },
      { transform: `translate(${dx * 0.6}px,${dy * 0.6}px) scale(1.2)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px,${dy}px) scale(0.4)`, opacity: 0 },
    ], { duration: 850, delay: 400 + k * 40 }, startedAt);
    g.appendChild(glint);
  }
  return g;
}
