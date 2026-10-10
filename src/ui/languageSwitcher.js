import { LANGUAGES } from '../i18n/languages.js';

export function mountLanguageSwitcher(container, { currentLang, currentPage }) {
  const select = document.createElement('select');
  select.className = 'pill';
  select.setAttribute('aria-label', 'Language');

  for (const lang of LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = lang.status === 'soon' ? `${lang.label} — soon` : lang.label;
    opt.disabled = lang.status !== 'ready';
    if (lang.code === currentLang) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener('change', () => {
    const lang = LANGUAGES.find((l) => l.code === select.value);
    if (!lang || lang.status !== 'ready') return;
    try {
      localStorage.setItem('playgonu:lang', lang.code);
    } catch {
      /* private browsing or storage disabled: redirect still works */
    }
    // A manual pick always wins over the Cloudflare Function's IP-country
    // guess (functions/_middleware.js skips its redirect once this is set).
    document.cookie = `pg_lang=${lang.code}; path=/; max-age=31536000; samesite=lax`;
    window.location.href = lang.code === 'en' ? `/${currentPage}` : `/${lang.code}/${currentPage}`;
  });

  container.appendChild(select);
}

// Imported by every game page: open the folded article sections while printing so the
// text is on paper, then put them back as they were.
const printOpened = [];
window.addEventListener('beforeprint', () => {
  document.querySelectorAll('.game-article details:not([open])').forEach((d) => { d.open = true; printOpened.push(d); });
});
window.addEventListener('afterprint', () => {
  printOpened.splice(0).forEach((d) => { d.open = false; });
});
