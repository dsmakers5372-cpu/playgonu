// Gomoku boards: while it's your move, a faint "shadow" stone follows the
// mouse over the points you can play, so you see where a click will land.
// Touch screens have no hover, so only a mouse pointer shows it.
import { el } from './svg.js';

// Call once per board render, after the stones and before the click targets.
// `hover` is an object the caller keeps between renders ({ index: null }),
// so the shadow comes back under a still mouse after the board redraws.
// `colors()` gives { fill, stroke } — a black stone should pass a light
// stroke so the shadow still shows on a dark board.
export function mountShadowStone(svg, { r, pointPixel, canPlace, colors, hover }) {
  const shadow = el('circle', { r, 'stroke-width': '1.4', opacity: '.45', 'pointer-events': 'none', visibility: 'hidden' });
  svg.appendChild(shadow);

  function show(index) {
    if (index === null || !canPlace(index)) {
      shadow.setAttribute('visibility', 'hidden');
      return;
    }
    const { x, y } = pointPixel(index);
    const { fill, stroke } = colors();
    shadow.setAttribute('cx', x);
    shadow.setAttribute('cy', y);
    shadow.setAttribute('fill', fill);
    shadow.setAttribute('stroke', stroke);
    shadow.setAttribute('visibility', 'visible');
  }
  show(hover.index);

  return {
    // Hooks one point's click target up to the shadow.
    wire(hit, index) {
      hit.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        hover.index = index;
        show(index);
      });
      hit.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse' || hover.index !== index) return;
        hover.index = null;
        show(null);
      });
    },
  };
}
