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
  pending.push({ node, keyframes, dur, startedAt });
  return node;
}

export function startAnimations(svg) {
  const now = performance.now();
  for (let i = pending.length - 1; i >= 0; i--) {
    const { node, keyframes, dur, startedAt } = pending[i];
    if (!node.isConnected) {
      if (!svg.contains(node)) pending.splice(i, 1);
      continue;
    }
    if (!svg.contains(node)) continue;
    const anim = node.animate(keyframes, { duration: dur, fill: 'forwards' });
    anim.currentTime = Math.min(now - startedAt, dur);
    pending.splice(i, 1);
  }
}
