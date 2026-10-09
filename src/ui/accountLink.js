// "Sign in / Sign up" in the site header on every page (mounted by the
// header's variant menu, which every page loads). Signed in, it becomes a
// link to "my account" showing the player's ID.
import { fetchMe, accountUrl } from './accountClient.js';

const LABELS = {
  en: { signIn: 'Sign in', signUp: 'Sign up', mine: 'My account' },
  ko: { signIn: '로그인', signUp: '회원가입', mine: '내 계정' },
  es: { signIn: 'Entrar', signUp: 'Registrarse', mine: 'Mi cuenta' },
  ja: { signIn: 'ログイン', signUp: '新規登録', mine: 'マイアカウント' },
  zh: { signIn: '登录', signUp: '注册', mine: '我的账号' },
};

function link(href, text, primary) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  a.style.cssText = `font-size:13px;font-weight:700;padding:6px 13px;border-radius:999px;white-space:nowrap;text-decoration:none;${primary
    ? 'background:var(--red);color:#fff;border:1.5px solid var(--red);'
    : 'color:var(--ink);border:1.5px solid var(--card-border);'}`;
  return a;
}

export function mountAccountLink(nav, requestedLang = 'en') {
  if (!nav || nav.querySelector('[data-account-link]')) return;
  const lang = LABELS[requestedLang] ? requestedLang : 'en';
  const t = LABELS[lang];
  const wrap = document.createElement('span');
  wrap.dataset.accountLink = '';
  wrap.style.cssText = 'display:inline-flex;gap:6px;align-items:center;margin-left:auto;';
  wrap.append(link(accountUrl(lang), t.signIn, false), link(`${accountUrl(lang)}&signup=1`, t.signUp, true));
  nav.appendChild(wrap);

  fetchMe().then((me) => {
    if (!me) return;
    const mine = link(accountUrl(lang), me.username, false);
    mine.title = t.mine;
    mine.style.maxWidth = '140px';
    mine.style.overflow = 'hidden';
    mine.style.textOverflow = 'ellipsis';
    wrap.replaceChildren(mine);
  });
}
