import {createLiquidGlass} from './liquid-glass.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const cards = [...document.querySelectorAll('.portal-card')];
const lenses = [];
const probe = document.createElement('canvas').getContext('2d');

// The text stays on a separate layer above the refracted backdrop.
if (probe && typeof probe.roundRect === 'function' && typeof ResizeObserver === 'function') {
  for (const card of cards) {
    const surface = card.querySelector('.glass-surface');
    try {
      const radius = parseFloat(getComputedStyle(card).borderRadius);
      const lens = createLiquidGlass(surface, {
        borderRadius: radius,
        scale: finePointer.matches ? -52 : -28,
        border: .14,
        aberration: [0, 1.5, 3],
        blur: 7,
        displaceBlur: 1.25,
        saturation: 1.06,
        fallbackFilter: 'blur(13px) saturate(1.12)'
      });
      lens.filterElement.setAttribute('aria-hidden', 'true');
      lens.filterElement.setAttribute('focusable', 'false');
      lenses.push(lens);
      card.dataset.glass = lens.isActive ? 'refraction' : 'frosted';
    } catch (_) {
      surface.style.removeProperty('backdrop-filter');
      surface.style.removeProperty('-webkit-backdrop-filter');
      card.dataset.glass = 'frosted';
    }
  }
}

function syncTilt() {
  const enabled = !reduced.matches && finePointer.matches;
  for (const card of cards) {
    if (!enabled && card.vanillaTilt) {
      card.vanillaTilt.destroy();
      card.querySelector('.js-tilt-glare')?.remove();
    }
    if (enabled && !card.vanillaTilt && window.VanillaTilt) {
      window.VanillaTilt.init(card, {
        max: 3, perspective: 1100, speed: 650, scale: 1.012,
        glare: true, 'max-glare': .13, gyroscope: false
      });
    }
  }
}

let revealed = false;
function reveal() {
  if (revealed || reduced.matches) return;
  revealed = true;
  for (const [index, card] of cards.entries()) {
    const item = card.parentElement;
    if (typeof item.animate !== 'function') continue;
    item.animate([
      {opacity: 0, transform: 'translateY(18px)'},
      {opacity: 1, transform: 'translateY(0)'}
    ], {duration: 700, delay: index * 65, easing: 'cubic-bezier(.22,.8,.3,1)', fill: 'backwards'});
  }
}

syncTilt();
reduced.addEventListener('change', syncTilt);
finePointer.addEventListener('change', syncTilt);
document.addEventListener('portal:entered', reveal);
if (!document.getElementById('welcome').open) reveal();

window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  for (const lens of lenses) lens.destroy();
  for (const card of cards) if (card.vanillaTilt) card.vanillaTilt.destroy();
});
