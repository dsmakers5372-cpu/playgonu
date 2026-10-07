// "Other Gonu" nav dropdown — a native <select> (same pattern as the
// language switcher: simple, touch-friendly, no custom hover/click-outside
// logic needed). Cham-gonu stays its own top-level tab since it's the main
// game; everything else funnels through here now that there are too many
// variants to list as flat tabs.
const VARIANTS = [
  { href: 'jul.html', en: 'Jul-gonu', ko: '줄고누' },
  { href: 'daseotjul.html', en: 'Daseotjul-gonu', ko: '다섯줄고누' },
  { href: 'palpal.html', en: 'Palpal-gonu', ko: '팔팔고누' },
  { href: 'bakwi.html', en: 'Bakwi-gonu', ko: '바퀴고누' },
];

export function mountVariantMenu(container, { lang = 'en', currentPage } = {}) {
  const select = document.createElement('select');
  select.className = 'pill variant-tab';
  select.style.cursor = 'pointer';
  select.setAttribute('aria-label', lang === 'ko' ? '다른 고누' : 'Other Gonu');

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = lang === 'ko' ? '다른 고누 ▾' : 'Other Gonu ▾';
  select.appendChild(placeholder);

  let onCurrentVariant = false;
  for (const variant of VARIANTS) {
    const opt = document.createElement('option');
    opt.value = variant.href;
    opt.textContent = lang === 'ko' ? variant.ko : variant.en;
    if (variant.href === currentPage) {
      opt.selected = true;
      onCurrentVariant = true;
    }
    select.appendChild(opt);
  }
  if (!onCurrentVariant) placeholder.selected = true;

  select.addEventListener('change', () => {
    if (select.value) location.href = select.value;
  });

  container.appendChild(select);
}
