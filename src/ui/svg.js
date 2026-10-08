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

// A captured piece doesn't just vanish: it pops up (so the eye goes to it),
// flips over like a coin to a silver back, holds there while silver glints
// burst out, then the silver disc fades away — revealing the × (dead point)
// drawn beneath it during placement, or an empty point later on. About 2.7s
// in all, slow on purpose so a capture is impossible to miss.
export const CAPTURE_FLIP_MS = 2700;

export function captureFlipEffect(x, y, colors, startedAt) {
  const g = el('g', {});
  const front = el('circle', { cx: x, cy: y, r: 13, fill: colors.fill, stroke: colors.stroke, 'stroke-width': '2' });
  animateKeyframes(front, [
    { transform: 'scale(1) scaleX(1)' },
    { transform: 'scale(1.25) scaleX(1)', offset: 0.3 },
    { transform: 'scale(1.25) scaleX(1)', offset: 0.6 },
    { transform: 'scale(1.25) scaleX(0)' },
  ], { duration: 1000 }, startedAt);
  const silver = el('g', {});
  silver.append(
    el('circle', { cx: x, cy: y, r: 13, fill: '#E6E9ED', stroke: '#8E98A3', 'stroke-width': '2' }),
    el('ellipse', { cx: x - 4, cy: y - 5, rx: 5, ry: 3, fill: '#FFFFFF', opacity: '.85' }),
  );
  animateKeyframes(silver, [
    { transform: 'scale(1.25) scaleX(0)', opacity: 1 },
    { transform: 'scale(1.25) scaleX(1)', opacity: 1, offset: 0.24 },
    { transform: 'scale(1.25) scaleX(1)', opacity: 1, offset: 0.65 },
    { transform: 'scale(0.8) scaleX(1)', opacity: 0 },
  ], { duration: 1700, delay: 1000 }, startedAt);
  g.append(front, silver);
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
    ], { duration: 950, delay: 1250 + k * 60 }, startedAt);
    g.appendChild(glint);
  }
  return g;
}
