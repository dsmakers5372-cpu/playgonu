// Every language the picker shows. `status: 'ready'` ones have real
// translated pages; `status: 'soon'` ones render in the picker (so the
// reach is visible) but are disabled until actual translated content
// exists — shipping machine-translated rules text would hurt more than it
// helps for an SEO-first site.
export const LANGUAGES = [
  { code: 'en', label: 'English', status: 'ready', path: '/' },
  { code: 'ja', label: '日本語', status: 'soon' },
  { code: 'zh-Hans', label: '简体中文', status: 'soon' },
  { code: 'zh-Hant', label: '繁體中文', status: 'soon' },
  { code: 'ko', label: '한국어', status: 'ready', path: '/ko/' },
  { code: 'vi', label: 'Tiếng Việt', status: 'soon' },
  { code: 'ru', label: 'Русский', status: 'soon' },
  { code: 'id', label: 'Bahasa Indonesia', status: 'soon' },
  { code: 'th', label: 'ภาษาไทย', status: 'soon' },
  { code: 'pt-BR', label: 'Português (Brasil)', status: 'soon' },
  { code: 'pl', label: 'Polski', status: 'soon' },
  { code: 'cs', label: 'Čeština', status: 'soon' },
  { code: 'hu', label: 'Magyar', status: 'soon' },
  { code: 'et', label: 'Eesti', status: 'soon' },
  { code: 'de', label: 'Deutsch', status: 'soon' },
  { code: 'es', label: 'Español', status: 'soon' },
  { code: 'fr', label: 'Français', status: 'soon' },
  { code: 'it', label: 'Italiano', status: 'soon' },
];

// ISO country → default language, for the Cloudflare Function that redirects
// a first-time visitor based on request.cf.country. Anything not listed
// falls back to English. Keep in sync with which languages are 'ready'.
export const COUNTRY_DEFAULT_LANG = {
  KR: 'ko',
};
