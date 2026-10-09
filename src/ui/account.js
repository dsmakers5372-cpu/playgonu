// The /account/ page: sign in, sign up (an ID and a password — no email), and
// "my account" (saved online record, password, sign out, delete). Language
// comes from ?lang=, then the site's saved language choice, then the browser.
import { fetchMe, accountPost, readLocalStats } from './accountClient.js';

const STRINGS = {
  en: {
    pageTitle: 'Account — PlayGonu',
    why: 'An account is optional — you can always play without one. Signed in, your online wins, draws and losses are saved and follow you to any device.',
    signinTitle: 'Sign in', signupTitle: 'Create an account',
    username: 'ID', usernameHint: '2–20 letters, numbers or “_” — shown in online games', password: 'Password', passwordHint: '8 characters or more',
    password2: 'Password again', newPassword: 'New password', newPassword2: 'New password again', currentPassword: 'Current password',
    signinBtn: 'Sign in', signupBtn: 'Create account', saveBtn: 'Save',
    toSignup: 'Create an account', toSignin: 'I already have an account',
    noRecovery: 'There’s no email, so a forgotten password can’t be recovered — keep it somewhere safe.',
    forgotNote: 'Forgot your password? Without an email it can’t be reset — you can make a new ID.',
    consentBody: 'Signing up saves your ID, your password (hashed — never readable) and your online results, until you delete the account.',
    privacy: 'Privacy policy',
    welcome: 'Welcome to PlayGonu!',
    profileTitle: 'My account', signedInAs: 'Signed in as',
    recordTitle: 'Online record', games: { cham: 'Cham-gonu', gomoku: 'Gomoku' }, win: 'W', draw: 'D', loss: 'L',
    recordNote: 'Games against online opponents are added automatically while you’re signed in.',
    importBody: (n) => `This browser recorded ${n} online game${n === 1 ? '' : 's'} before you signed up. Add them to your account? (one time only)`,
    importBtn: 'Add to my account', imported: 'Added to your record.',
    changePassword: 'Change password', passwordChanged: 'Password changed. Other devices have been signed out.',
    signOut: 'Sign out', deleteTitle: 'Delete account',
    deleteBody: 'This permanently deletes your account and your saved record. It can’t be undone. Enter your password to confirm.',
    deleteBtn: 'Delete my account', deleted: 'Your account has been deleted.',
    playOnline: 'Play online →',
    errors: {
      'bad-username': 'ID: 2–20 letters, numbers or “_” (no spaces).', 'bad-password': 'Password must be 8–128 characters.',
      mismatch: 'The two passwords don’t match.', taken: 'That ID is already taken. Try another one.',
      'too-many': 'Too many tries. Please wait a while and try again.', 'bad-login': 'Wrong ID or password.',
      'bad-current': 'The password is not correct.', 'signed-out': 'You’ve been signed out. Please sign in again.',
      'already-imported': 'This device’s record was already added.', 'not-configured': 'Accounts aren’t available right now.', network: 'Couldn’t reach the server. Please try again.',
    },
  },
  ko: {
    pageTitle: '계정 — 플레이고누',
    why: '계정은 선택이에요 — 가입하지 않아도 언제든 플레이할 수 있어요. 로그인하면 온라인 대전 승·무·패가 저장되고 어느 기기에서든 이어져요.',
    signinTitle: '로그인', signupTitle: '회원가입',
    username: '아이디', usernameHint: '2~20자 글자·숫자·“_” — 온라인 대전에서 보여요', password: '비밀번호', passwordHint: '8자 이상',
    password2: '비밀번호 확인', newPassword: '새 비밀번호', newPassword2: '새 비밀번호 확인', currentPassword: '지금 비밀번호',
    signinBtn: '로그인', signupBtn: '가입하기', saveBtn: '저장',
    toSignup: '회원가입', toSignin: '이미 계정이 있어요',
    noRecovery: '이메일을 받지 않아서 비밀번호를 잊으면 찾을 수 없어요. 잘 기억해 두세요.',
    forgotNote: '비밀번호를 잊으셨나요? 이메일이 없어 찾을 수 없어요 — 새 아이디로 가입해 주세요.',
    consentBody: '가입하면 아이디, 비밀번호(복원할 수 없게 암호화), 온라인 전적이 저장되고, 탈퇴하면 바로 지워져요.',
    privacy: '개인정보처리방침',
    welcome: '가입 완료 — 플레이고누에 오신 걸 환영해요!',
    profileTitle: '내 계정', signedInAs: '로그인 아이디',
    recordTitle: '온라인 전적', games: { cham: '참고누', gomoku: '오목' }, win: '승', draw: '무', loss: '패',
    recordNote: '로그인한 상태로 둔 온라인 대전은 자동으로 기록돼요.',
    importBody: (n) => `가입 전에 이 브라우저에 기록된 온라인 대전 ${n}판이 있어요. 내 계정 전적에 더할까요? (한 번만 가능)`,
    importBtn: '내 전적에 더하기', imported: '전적에 더했어요.',
    changePassword: '비밀번호 바꾸기', passwordChanged: '비밀번호를 바꿨어요. 다른 기기는 로그아웃됐어요.',
    signOut: '로그아웃', deleteTitle: '회원 탈퇴',
    deleteBody: '계정과 저장된 전적이 모두 지워지고 되돌릴 수 없어요. 확인을 위해 비밀번호를 입력해 주세요.',
    deleteBtn: '탈퇴하기', deleted: '탈퇴가 완료됐어요. 그동안 고마웠어요.',
    playOnline: '온라인 대전 하러 가기 →',
    errors: {
      'bad-username': '아이디는 2~20자 글자·숫자·“_”만 쓸 수 있어요(띄어쓰기 없이).', 'bad-password': '비밀번호는 8~128자로 정해 주세요.',
      mismatch: '비밀번호 두 개가 서로 달라요.', taken: '이미 있는 아이디예요. 다른 아이디를 써 주세요.',
      'too-many': '시도가 너무 많아요. 잠시 뒤에 다시 해주세요.', 'bad-login': '아이디 또는 비밀번호가 맞지 않아요.',
      'bad-current': '비밀번호가 맞지 않아요.', 'signed-out': '로그아웃됐어요. 다시 로그인해 주세요.',
      'already-imported': '이 기기 전적은 이미 더했어요.', 'not-configured': '지금은 계정 기능을 쓸 수 없어요.', network: '서버에 연결하지 못했어요. 다시 해주세요.',
    },
  },
  es: {
    pageTitle: 'Cuenta — PlayGonu',
    why: 'La cuenta es opcional: siempre puedes jugar sin ella. Con sesión iniciada, tus victorias, empates y derrotas en línea se guardan en cualquier dispositivo.',
    signinTitle: 'Iniciar sesión', signupTitle: 'Crear una cuenta',
    username: 'Usuario', usernameHint: '2–20 letras, números o “_” — se ve en las partidas en línea', password: 'Contraseña', passwordHint: '8 caracteres o más',
    password2: 'Repite la contraseña', newPassword: 'Nueva contraseña', newPassword2: 'Repite la nueva contraseña', currentPassword: 'Contraseña actual',
    signinBtn: 'Entrar', signupBtn: 'Crear cuenta', saveBtn: 'Guardar',
    toSignup: 'Crear una cuenta', toSignin: 'Ya tengo cuenta',
    noRecovery: 'No pedimos correo, así que una contraseña olvidada no se puede recuperar. Guárdala bien.',
    forgotNote: '¿Olvidaste tu contraseña? Sin correo no se puede restablecer: crea un usuario nuevo.',
    consentBody: 'Al registrarte guardamos tu usuario, tu contraseña (cifrada, nunca legible) y tus resultados en línea, hasta que borres la cuenta.',
    privacy: 'Política de privacidad',
    welcome: '¡Cuenta creada! Bienvenido a PlayGonu.',
    profileTitle: 'Mi cuenta', signedInAs: 'Sesión iniciada como',
    recordTitle: 'Historial en línea', games: { cham: 'Cham-gonu', gomoku: 'Gomoku' }, win: 'G', draw: 'E', loss: 'P',
    recordNote: 'Las partidas en línea se añaden solas mientras tienes la sesión iniciada.',
    importBody: (n) => `Este navegador registró ${n} partida(s) en línea antes de que te registraras. ¿Añadirlas a tu cuenta? (solo una vez)`,
    importBtn: 'Añadir a mi cuenta', imported: 'Añadidas a tu historial.',
    changePassword: 'Cambiar contraseña', passwordChanged: 'Contraseña cambiada. Se cerró la sesión en otros dispositivos.',
    signOut: 'Cerrar sesión', deleteTitle: 'Eliminar cuenta',
    deleteBody: 'Se borrarán para siempre tu cuenta y tu historial. No se puede deshacer. Escribe tu contraseña para confirmar.',
    deleteBtn: 'Eliminar mi cuenta', deleted: 'Tu cuenta ha sido eliminada.',
    playOnline: 'Jugar en línea →',
    errors: {
      'bad-username': 'Usuario: 2–20 letras, números o “_” (sin espacios).', 'bad-password': 'La contraseña debe tener 8–128 caracteres.',
      mismatch: 'Las dos contraseñas no coinciden.', taken: 'Ese usuario ya existe. Prueba con otro.',
      'too-many': 'Demasiados intentos. Espera un poco.', 'bad-login': 'Usuario o contraseña incorrectos.',
      'bad-current': 'La contraseña no es correcta.', 'signed-out': 'Se cerró tu sesión. Vuelve a entrar.',
      'already-imported': 'El historial de este dispositivo ya se añadió.', 'not-configured': 'Las cuentas no están disponibles ahora.', network: 'No se pudo conectar. Inténtalo de nuevo.',
    },
  },
  ja: {
    pageTitle: 'アカウント — PlayGonu',
    why: 'アカウントは任意です。登録しなくてもいつでも遊べます。ログインすると、オンライン対局の勝敗が保存され、どの端末でも引き継がれます。',
    signinTitle: 'ログイン', signupTitle: 'アカウント作成',
    username: 'ID', usernameHint: '2〜20文字の文字・数字・「_」 — オンライン対局で表示されます', password: 'パスワード', passwordHint: '8文字以上',
    password2: 'パスワード（確認）', newPassword: '新しいパスワード', newPassword2: '新しいパスワード（確認）', currentPassword: '現在のパスワード',
    signinBtn: 'ログイン', signupBtn: '登録する', saveBtn: '保存',
    toSignup: 'アカウント作成', toSignin: 'アカウントを持っています',
    noRecovery: 'メールアドレスを登録しないため、パスワードを忘れると復元できません。大切に保管してください。',
    forgotNote: 'パスワードを忘れた場合は再設定できません。新しいIDで登録してください。',
    consentBody: '登録すると、ID・パスワード（復元できない形で暗号化）・オンライン戦績が保存され、退会するとすぐに削除されます。',
    privacy: 'プライバシーポリシー',
    welcome: '登録完了 — PlayGonu へようこそ！',
    profileTitle: 'マイアカウント', signedInAs: 'ログイン中のID',
    recordTitle: 'オンライン戦績', games: { cham: 'チャムゴヌ', gomoku: '五目並べ' }, win: '勝', draw: '分', loss: '敗',
    recordNote: 'ログイン中のオンライン対局は自動で記録されます。',
    importBody: (n) => `登録前にこのブラウザに記録されたオンライン対局が${n}局あります。アカウントの戦績に加えますか？（1回のみ）`,
    importBtn: '戦績に加える', imported: '戦績に加えました。',
    changePassword: 'パスワードを変更', passwordChanged: 'パスワードを変更しました。他の端末はログアウトしました。',
    signOut: 'ログアウト', deleteTitle: '退会',
    deleteBody: 'アカウントと保存された戦績はすべて削除され、元に戻せません。確認のためパスワードを入力してください。',
    deleteBtn: '退会する', deleted: '退会が完了しました。',
    playOnline: 'オンライン対局へ →',
    errors: {
      'bad-username': 'IDは2〜20文字の文字・数字・「_」のみ使えます（空白なし）。', 'bad-password': 'パスワードは8〜128文字にしてください。',
      mismatch: 'パスワードが一致しません。', taken: 'そのIDはすでに使われています。別のIDにしてください。',
      'too-many': '試行回数が多すぎます。しばらくしてからお試しください。', 'bad-login': 'IDまたはパスワードが違います。',
      'bad-current': 'パスワードが違います。', 'signed-out': 'ログアウトされました。もう一度ログインしてください。',
      'already-imported': 'この端末の戦績はすでに加えています。', 'not-configured': '現在アカウント機能は使えません。', network: 'サーバーに接続できませんでした。もう一度お試しください。',
    },
  },
  zh: {
    pageTitle: '账号 — PlayGonu',
    why: '账号是可选的——不注册也随时可以玩。登录后，你的在线对局胜、平、负会被保存，在任何设备上都能看到。',
    signinTitle: '登录', signupTitle: '注册账号',
    username: '用户名', usernameHint: '2–20 个字母、数字或“_”——在线对局中显示', password: '密码', passwordHint: '至少 8 个字符',
    password2: '再次输入密码', newPassword: '新密码', newPassword2: '再次输入新密码', currentPassword: '当前密码',
    signinBtn: '登录', signupBtn: '注册', saveBtn: '保存',
    toSignup: '注册账号', toSignin: '我已有账号',
    noRecovery: '我们不收集邮箱，忘记密码后无法找回，请妥善保管。',
    forgotNote: '忘记密码？没有邮箱无法重置——可以注册一个新用户名。',
    consentBody: '注册后会保存你的用户名、密码（加密保存，无法还原）和在线战绩，注销账号后立即删除。',
    privacy: '隐私政策',
    welcome: '注册完成——欢迎来到 PlayGonu！',
    profileTitle: '我的账号', signedInAs: '当前登录',
    recordTitle: '在线战绩', games: { cham: '参高努', gomoku: '五子棋' }, win: '胜', draw: '平', loss: '负',
    recordNote: '登录状态下的在线对局会自动记录。',
    importBody: (n) => `注册前此浏览器记录了 ${n} 局在线对局。要加到你的账号战绩里吗？（仅限一次）`,
    importBtn: '加到我的战绩', imported: '已加入战绩。',
    changePassword: '修改密码', passwordChanged: '密码已修改，其他设备已退出登录。',
    signOut: '退出登录', deleteTitle: '注销账号',
    deleteBody: '账号和保存的战绩会被永久删除，无法恢复。请输入密码确认。',
    deleteBtn: '注销我的账号', deleted: '你的账号已注销。',
    playOnline: '去在线对局 →',
    errors: {
      'bad-username': '用户名为 2–20 个字母、数字或“_”（不能有空格）。', 'bad-password': '密码需要 8–128 个字符。',
      mismatch: '两次输入的密码不一致。', taken: '该用户名已被使用，请换一个。',
      'too-many': '尝试次数过多，请稍后再试。', 'bad-login': '用户名或密码错误。',
      'bad-current': '密码不正确。', 'signed-out': '你已退出登录，请重新登录。',
      'already-imported': '此设备的战绩已经加过了。', 'not-configured': '账号功能暂时不可用。', network: '无法连接服务器，请重试。',
    },
  },
};

const LANG_CODES = Object.keys(STRINGS);

function pickLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (LANG_CODES.includes(q)) return q;
  try {
    const saved = localStorage.getItem('playgonu:lang');
    if (LANG_CODES.includes(saved)) return saved;
  } catch { /* ignore */ }
  const cookie = (document.cookie.match(/(?:^|;\s*)pg_lang=([a-z]{2})/) || [])[1];
  if (LANG_CODES.includes(cookie)) return cookie;
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANG_CODES.includes(nav) ? nav : 'en';
}

const lang = pickLang();
const t = STRINGS[lang];
const prefix = lang === 'en' ? '' : `/${lang}`;
const onlineHref = `${prefix}/online.html`;
const privacyHref = lang === 'ko' ? '/ko/privacy.html' : '/privacy.html';
document.documentElement.lang = lang;
document.title = t.pageTitle;
document.querySelector('[data-home]').href = `${prefix}/`;

const root = document.querySelector('[data-account-root]');

// ---- tiny DOM helpers (all user-derived text goes in via textContent) ----
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) el.append(c);
  return el;
}

const field = (label, input, hint) => h('label', {}, label, input, hint ? h('span', { class: 'hint', text: hint }) : null);
const input = (type, name, autocomplete, extra = {}) => h('input', { type, name, autocomplete, required: true, ...extra });
const idInput = () => input('text', 'username', 'username', { maxlength: 20, autocapitalize: 'off', spellcheck: 'false' });
const pwInput = (name, autocomplete) => input('password', name, autocomplete, { maxlength: 128 });
const msgBox = () => h('div', { class: 'msg', role: 'status' });
const showMsg = (box, text, ok = false) => { box.textContent = text || ''; box.className = `msg ${ok ? 'ok' : 'err'}`; };
const errText = (code) => t.errors[code] || t.errors.network;
const lead = (text) => h('p', { class: 'hint', style: 'margin:0;font-size:14px;line-height:1.7;', text });

// A form whose submit handler gets the form's values and the message box,
// with the submit button disabled while it runs.
function form(children, submitLabel, onSubmit) {
  const box = msgBox();
  const btn = h('button', { class: 'btn-primary', type: 'submit', text: submitLabel });
  const f = h('form', { class: 'acct-card', novalidate: true }, children, box, btn);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    try { await onSubmit(Object.fromEntries(new FormData(f)), box, f); } finally { btn.disabled = false; }
  });
  return f;
}

const links = (...items) => h('div', { class: 'links' }, items.map(([label, fn]) => h('button', { type: 'button', text: label, onclick: fn })));

// ---- screens ----
function showSignin(notice) {
  const f = form([
    h('h2', { text: t.signinTitle }),
    field(t.username, idInput()),
    field(t.password, pwInput('password', 'current-password')),
  ], t.signinBtn, async (v, box) => {
    const r = await accountPost('/login', { username: v.username, password: v.password });
    if (r.error) return showMsg(box, errText(r.error));
    showProfile(r.user);
  });
  if (notice) showMsg(f.querySelector('.msg'), notice.text, notice.ok);
  root.replaceChildren(
    h('h1', { class: 'serif', text: t.signinTitle }),
    lead(t.why),
    f,
    links([t.toSignup, () => showSignup()]),
    h('p', { class: 'hint', style: 'margin:0;', text: t.forgotNote }),
  );
}

function showSignup() {
  const f = form([
    h('h2', { text: t.signupTitle }),
    field(t.username, idInput(), t.usernameHint),
    field(t.password, pwInput('password', 'new-password'), t.passwordHint),
    field(t.password2, pwInput('password2', 'new-password')),
    h('p', { class: 'hint', style: 'margin:0;font-weight:700;', text: t.noRecovery }),
    h('div', { class: 'consent' }, t.consentBody, ' ', h('a', { href: privacyHref, target: '_blank', rel: 'noopener', text: t.privacy })),
  ], t.signupBtn, async (v, box) => {
    if (v.password !== v.password2) return showMsg(box, t.errors.mismatch);
    const r = await accountPost('/signup', { username: v.username, password: v.password, lang });
    if (r.error) return showMsg(box, errText(r.error));
    showProfile(r.user, { text: t.welcome, ok: true });
  });
  root.replaceChildren(
    h('h1', { class: 'serif', text: t.signupTitle }),
    lead(t.why),
    f,
    links([t.toSignin, () => showSignin()]),
  );
}

function recordTable(stats) {
  return h('table', {},
    h('thead', {}, h('tr', {}, h('th', {}), h('th', { text: t.win }), h('th', { text: t.draw }), h('th', { text: t.loss }))),
    h('tbody', {}, Object.keys(t.games).map((g) => {
      const s = stats?.[g] || { wins: 0, draws: 0, losses: 0 };
      return h('tr', {}, h('td', { text: t.games[g] }), h('td', { text: String(s.wins) }), h('td', { text: String(s.draws) }), h('td', { text: String(s.losses) }));
    })),
  );
}

function showProfile(user, notice) {
  if (!user) return showSignin();
  try { localStorage.setItem('playgonu:name', user.username); } catch { /* ignore */ }

  const top = msgBox();
  if (notice) showMsg(top, notice.text, notice.ok);

  const recordCard = h('div', { class: 'acct-card' },
    h('h2', { text: t.recordTitle }),
    recordTable(user.stats),
    h('p', { class: 'hint', style: 'margin:0;', text: t.recordNote }),
  );
  if (user.canImport) {
    const local = Object.fromEntries(Object.keys(t.games).map((g) => [g, readLocalStats(g)]));
    const n = Object.values(local).reduce((a, s) => a + s.wins + s.draws + s.losses, 0);
    if (n > 0) {
      const box = msgBox();
      const btn = h('button', { class: 'btn', type: 'button', text: t.importBtn });
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const r = await accountPost('/import', { stats: local });
        if (r.error) { btn.disabled = false; return showMsg(box, errText(r.error)); }
        showProfile(r.user, { text: t.imported, ok: true });
      });
      recordCard.append(h('div', { class: 'consent' }, t.importBody(n)), btn, box);
    }
  }

  const pwForm = form([
    field(t.currentPassword, pwInput('current', 'current-password')),
    field(t.newPassword, pwInput('password', 'new-password'), t.passwordHint),
    field(t.newPassword2, pwInput('password2', 'new-password')),
  ], t.saveBtn, async (v, box, f) => {
    if (v.password !== v.password2) return showMsg(box, t.errors.mismatch);
    const r = await accountPost('/password', { current: v.current, password: v.password });
    if (r.error) return r.error === 'signed-out' ? showSignin({ text: errText(r.error) }) : showMsg(box, errText(r.error));
    f.reset();
    showMsg(box, t.passwordChanged, true);
  });
  pwForm.classList.remove('acct-card');

  const delForm = form([
    h('p', { class: 'hint', style: 'margin:0;line-height:1.7;', text: t.deleteBody }),
    field(t.password, pwInput('password', 'current-password')),
  ], t.deleteBtn, async (v, box) => {
    const r = await accountPost('/delete', { password: v.password });
    if (r.error) return showMsg(box, errText(r.error));
    await fetchMe(true);
    showSignin({ text: t.deleted, ok: true });
  });
  delForm.classList.remove('acct-card');
  delForm.querySelector('button[type=submit]').className = 'btn danger';

  const signOut = h('button', { class: 'btn', type: 'button', text: t.signOut });
  signOut.addEventListener('click', async () => {
    await accountPost('/logout');
    await fetchMe(true);
    showSignin();
  });

  root.replaceChildren(
    h('h1', { class: 'serif', text: t.profileTitle }),
    top,
    h('div', { class: 'acct-card' },
      h('div', { class: 'hint', text: t.signedInAs }),
      h('div', { style: 'font-weight:700;word-break:break-all;', text: user.username }),
      h('div', { class: 'links' }, h('a', { href: onlineHref, class: 'btn-primary', style: 'text-decoration:none;', text: t.playOnline }), signOut),
    ),
    recordCard,
    h('div', { class: 'acct-card' }, h('details', {}, h('summary', { text: t.changePassword }), pwForm)),
    h('div', { class: 'acct-card' }, h('details', {}, h('summary', { text: t.deleteTitle }), delForm)),
  );
}

// ---- start ----
fetchMe().then((user) => (user ? showProfile(user) : showSignin()));
