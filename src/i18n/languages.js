// The languages the picker offers — only ones with real translated pages.
// Each has its own folder (/ko/, /es/, …) except English at the root.
// Which country lands on which language by default lives in src/worker.js.
export const LANGUAGES = [
  { code: 'en', label: 'English', status: 'ready', path: '/' },
  { code: 'ko', label: '한국어', status: 'ready', path: '/ko/' },
  { code: 'es', label: 'Español', status: 'ready', path: '/es/' },
  { code: 'ja', label: '日本語', status: 'ready', path: '/ja/' },
  { code: 'zh', label: '简体中文', status: 'ready', path: '/zh/' },
];
