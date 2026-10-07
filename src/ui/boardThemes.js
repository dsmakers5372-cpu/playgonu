export const THEMES = {
  wood: { label: 'Wood', fill: '#C99A5B', border: '#8B6239', line: '#3A2E1F' },
  ink: { label: 'Ink', fill: '#3A3630', border: '#1E1B17', line: '#E7DEC9' },
  celadon: { label: 'Celadon', fill: '#B9CDB7', border: '#5C7A68', line: '#2A2420' },
  hanji: { label: 'Hanji', fill: '#F3ECDA', border: '#D8CBB0', line: '#2A2420' },
};

const THEME_STORAGE_KEY = 'playgonu:boardTheme';

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES[stored] ? stored : 'wood';
  } catch {
    return 'wood';
  }
}

export function setStoredTheme(key) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, key);
  } catch {
    /* private browsing or storage disabled: theme just won't persist */
  }
}

export function renderThemeSwatches(container, { current, onSelect }) {
  container.innerHTML = '';
  for (const [key, theme] of Object.entries(THEMES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-swatch';
    btn.style.background = theme.fill;
    btn.dataset.theme = key;
    btn.title = theme.label;
    btn.setAttribute('aria-label', `${theme.label} board`);
    btn.setAttribute('aria-pressed', String(key === current));
    btn.addEventListener('click', () => onSelect(key));
    container.appendChild(btn);
  }
}

export function updateThemeSwatches(container, current) {
  for (const btn of container.querySelectorAll('button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.theme === current));
  }
}
