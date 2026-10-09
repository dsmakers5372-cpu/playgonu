// "Other Gonu" nav dropdown — a native <select> (same pattern as the
// language switcher: simple, touch-friendly, no custom hover/click-outside
// logic needed). Cham-gonu stays its own top-level tab since it's the main
// game; everything else funnels through here now that there are too many
// variants to list as flat tabs.
import { mountAccountLink } from './accountLink.js';

const VARIANTS = [
  { href: 'jul.html', en: 'Jul-gonu', ko: '줄고누', es: 'Jul-gonu', ja: 'チュルゴヌ', zh: '线高努' },
  { href: 'daseotjul.html', en: 'Daseotjul-gonu', ko: '다섯줄고누', es: 'Daseotjul-gonu', ja: 'タソッチュルゴヌ', zh: '五线高努' },
  { href: 'palpal.html', en: 'Palpal-gonu', ko: '팔팔고누', es: 'Palpal-gonu', ja: 'パルパルゴヌ', zh: '八八高努' },
  { href: 'bakwi.html', en: 'Bakwi-gonu', ko: '바퀴고누', es: 'Bakwi-gonu', ja: 'パクィゴヌ', zh: '轮子高努' },
];

const MENU_LABEL = { en: 'Other Gonu', ko: '다른 고누', es: 'Otros Gonu', ja: 'ほかのコヌ', zh: '其他高努' };

export function mountVariantMenu(container, { lang: requestedLang = 'en', currentPage } = {}) {
  const lang = MENU_LABEL[requestedLang] ? requestedLang : 'en';
  const select = document.createElement('select');
  select.className = 'pill variant-tab';
  select.style.cursor = 'pointer';
  select.setAttribute('aria-label', MENU_LABEL[lang]);

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = `${MENU_LABEL[lang]} ▾`;
  select.appendChild(placeholder);

  let onCurrentVariant = false;
  for (const variant of VARIANTS) {
    const opt = document.createElement('option');
    opt.value = variant.href;
    opt.textContent = variant[lang];
    if (variant.href === currentPage) {
      opt.selected = true;
      onCurrentVariant = true;
    }
    select.appendChild(opt);
  }
  if (!onCurrentVariant) placeholder.selected = true;

  // Game pages sit one level above the blog, so from a blog post the
  // relative link has to step up out of /blog/ first.
  const base = /\/blog\//.test(location.pathname) ? '../' : '';
  select.addEventListener('change', () => {
    if (select.value) location.href = base + select.value;
  });

  container.appendChild(select);
  // Every page's header loads this menu, so it also brings the sign-in links.
  mountAccountLink(container.closest('nav'), lang);
}
