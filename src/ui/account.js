// The /account/ page: sign in, sign up (email + password), forgot / reset
// password, and "my account" (nickname, saved online record, password,
// sign out, delete). Language comes from ?lang=, then the site's saved
// language choice, then the browser.
import { fetchMe, accountPost, readLocalStats } from './accountClient.js';

const STRINGS = {
  en: {
    pageTitle: 'Account — PlayGonu',
    why: 'An account is optional — you can always play without one. Signed in, your online wins, draws and losses are saved and follow you to any device.',
    signinTitle: 'Sign in', signupTitle: 'Create an account', forgotTitle: 'Forgot your password?', resetTitle: 'Choose a new password',
    email: 'Email', password: 'Password', passwordHint: '8 characters or more', nickname: 'Nickname', nicknameHint: '2–20 letters or numbers — shown in online games',
    newPassword: 'New password', newPassword2: 'New password again', currentPassword: 'Current password',
    signinBtn: 'Sign in', signupBtn: 'Create account', sendLinkBtn: 'Email me a reset link', resetBtn: 'Save new password', saveBtn: 'Save',
    toSignup: 'Create an account', toSignin: 'I already have an account', toForgot: 'Forgot password?',
    forgotBody: 'Enter your account’s email and we’ll send you a link to choose a new password.',
    age: 'I am 14 years old or older.',
    consent: 'I agree to the collection and use of my personal information (required).',
    consentBody: 'What we keep: your email address, nickname and online game results. Why: to sign you in and save your record. How long: until you delete your account (unconfirmed sign-ups are removed after 7 days). Emails are sent through Resend.',
    privacy: 'Privacy policy',
    sentTitle: 'Check your email', sentBody: (e) => `If ${e} can receive mail from us, a link is on its way. Open it to continue — and check the spam folder if it doesn’t show up in a few minutes.`,
    verifying: 'Confirming your email…', verified: 'Your email is confirmed — welcome to PlayGonu!', resetDone: 'Your new password is saved.',
    profileTitle: 'My account', signedInAs: 'Signed in as',
    recordTitle: 'Online record', games: { cham: 'Cham-gonu', gomoku: 'Gomoku' }, win: 'W', draw: 'D', loss: 'L',
    recordNote: 'Games against online opponents are added automatically while you’re signed in.',
    importBody: (n) => `This browser recorded ${n} online game${n === 1 ? '' : 's'} before you signed up. Add them to your account? (one time only)`,
    importBtn: 'Add to my account', imported: 'Added to your record.',
    changePassword: 'Change password', passwordChanged: 'Password changed. Other devices have been signed out.', saved: 'Saved.',
    signOut: 'Sign out', deleteTitle: 'Delete account',
    deleteBody: 'This permanently deletes your account and your saved record. It can’t be undone. Enter your password to confirm.',
    deleteBtn: 'Delete my account', deleted: 'Your account has been deleted.',
    playOnline: 'Play online →',
    errors: {
      'bad-email': 'Please check the email address.', 'bad-nickname': 'Nickname: 2–20 letters, numbers, spaces, “_”, “.” or “-”.',
      'bad-password': 'Password must be 8–128 characters.', age: 'You need to be 14 or older to create an account.', consent: 'Please agree to the collection and use of personal information.',
      mismatch: 'The two new passwords don’t match.', 'mail-off': 'Sign-up email isn’t available yet. Please try again later.',
      'too-many': 'Too many tries. Please wait a while and try again.', 'bad-link': 'This link has expired or was already used.',
      'bad-login': 'Wrong email or password.', unverified: 'Your email isn’t confirmed yet — we’ve sent the link again. Please check your inbox.',
      'bad-current': 'The password is not correct.', 'signed-out': 'You’ve been signed out. Please sign in again.',
      'already-imported': 'This device’s record was already added.', 'not-configured': 'Accounts aren’t available right now.', network: 'Couldn’t reach the server. Please try again.',
    },
  },
  ko: {
    pageTitle: '계정 — 플레이고누',
    why: '계정은 선택이에요 — 가입하지 않아도 언제든 플레이할 수 있어요. 로그인하면 온라인 대전 승·무·패가 저장되고 어느 기기에서든 이어져요.',
    signinTitle: '로그인', signupTitle: '회원가입', forgotTitle: '비밀번호를 잊으셨나요?', resetTitle: '새 비밀번호 정하기',
    email: '이메일', password: '비밀번호', passwordHint: '8자 이상', nickname: '닉네임', nicknameHint: '2~20자 글자·숫자 — 온라인 대전에서 보여요',
    newPassword: '새 비밀번호', newPassword2: '새 비밀번호 확인', currentPassword: '지금 비밀번호',
    signinBtn: '로그인', signupBtn: '가입하기', sendLinkBtn: '재설정 링크 받기', resetBtn: '새 비밀번호 저장', saveBtn: '저장',
    toSignup: '회원가입', toSignin: '이미 계정이 있어요', toForgot: '비밀번호 찾기',
    forgotBody: '가입한 이메일을 적으면 새 비밀번호를 정할 수 있는 링크를 보내드려요.',
    age: '만 14세 이상입니다.',
    consent: '개인정보 수집·이용에 동의합니다. (필수)',
    consentBody: '수집 항목: 이메일 주소, 닉네임, 온라인 대전 결과. 목적: 로그인과 전적 저장. 보관 기간: 회원 탈퇴 시까지(이메일 확인을 하지 않은 가입은 7일 뒤 삭제). 메일 발송은 Resend에 맡겨요.',
    privacy: '개인정보처리방침',
    sentTitle: '메일함을 확인해 주세요', sentBody: (e) => `${e} 로 링크를 보냈어요. 메일의 버튼을 누르면 이어서 진행돼요. 몇 분이 지나도 안 오면 스팸함도 확인해 주세요.`,
    verifying: '이메일을 확인하는 중…', verified: '이메일 확인 완료 — 플레이고누에 오신 걸 환영해요!', resetDone: '새 비밀번호를 저장했어요.',
    profileTitle: '내 계정', signedInAs: '로그인 계정',
    recordTitle: '온라인 전적', games: { cham: '참고누', gomoku: '오목' }, win: '승', draw: '무', loss: '패',
    recordNote: '로그인한 상태로 둔 온라인 대전은 자동으로 기록돼요.',
    importBody: (n) => `가입 전에 이 브라우저에 기록된 온라인 대전 ${n}판이 있어요. 내 계정 전적에 더할까요? (한 번만 가능)`,
    importBtn: '내 전적에 더하기', imported: '전적에 더했어요.',
    changePassword: '비밀번호 바꾸기', passwordChanged: '비밀번호를 바꿨어요. 다른 기기는 로그아웃됐어요.', saved: '저장했어요.',
    signOut: '로그아웃', deleteTitle: '회원 탈퇴',
    deleteBody: '계정과 저장된 전적이 모두 지워지고 되돌릴 수 없어요. 확인을 위해 비밀번호를 입력해 주세요.',
    deleteBtn: '탈퇴하기', deleted: '탈퇴가 완료됐어요. 그동안 고마웠어요.',
    playOnline: '온라인 대전 하러 가기 →',
    errors: {
      'bad-email': '이메일 주소를 확인해 주세요.', 'bad-nickname': '닉네임은 2~20자 글자·숫자·공백·“_”·“.”·“-”만 쓸 수 있어요.',
      'bad-password': '비밀번호는 8~128자로 정해 주세요.', age: '만 14세 이상만 가입할 수 있어요.', consent: '개인정보 수집·이용에 동의해 주세요.',
      mismatch: '새 비밀번호 두 개가 서로 달라요.', 'mail-off': '아직 가입 메일을 보낼 수 없어요. 잠시 뒤에 다시 해주세요.',
      'too-many': '시도가 너무 많아요. 잠시 뒤에 다시 해주세요.', 'bad-link': '만료됐거나 이미 사용한 링크예요.',
      'bad-login': '이메일 또는 비밀번호가 맞지 않아요.', unverified: '아직 이메일 확인 전이에요 — 확인 링크를 다시 보냈으니 메일함을 봐주세요.',
      'bad-current': '비밀번호가 맞지 않아요.', 'signed-out': '로그아웃됐어요. 다시 로그인해 주세요.',
      'already-imported': '이 기기 전적은 이미 더했어요.', 'not-configured': '지금은 계정 기능을 쓸 수 없어요.', network: '서버에 연결하지 못했어요. 다시 해주세요.',
    },
  },
  es: {
    pageTitle: 'Cuenta — PlayGonu',
    why: 'La cuenta es opcional: siempre puedes jugar sin ella. Con sesión iniciada, tus victorias, empates y derrotas en línea se guardan en cualquier dispositivo.',
    signinTitle: 'Iniciar sesión', signupTitle: 'Crear una cuenta', forgotTitle: '¿Olvidaste tu contraseña?', resetTitle: 'Elige una nueva contraseña',
    email: 'Correo', password: 'Contraseña', passwordHint: '8 caracteres o más', nickname: 'Apodo', nicknameHint: '2–20 letras o números — se ve en las partidas en línea',
    newPassword: 'Nueva contraseña', newPassword2: 'Repite la nueva contraseña', currentPassword: 'Contraseña actual',
    signinBtn: 'Entrar', signupBtn: 'Crear cuenta', sendLinkBtn: 'Enviarme un enlace', resetBtn: 'Guardar contraseña', saveBtn: 'Guardar',
    toSignup: 'Crear una cuenta', toSignin: 'Ya tengo cuenta', toForgot: '¿Olvidaste tu contraseña?',
    forgotBody: 'Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una nueva contraseña.',
    age: 'Tengo 14 años o más.',
    consent: 'Acepto la recogida y el uso de mis datos personales (obligatorio).',
    consentBody: 'Qué guardamos: correo, apodo y resultados en línea. Para qué: iniciar sesión y guardar tu historial. Hasta cuándo: hasta que borres la cuenta (los registros sin confirmar se eliminan a los 7 días). Los correos se envían con Resend.',
    privacy: 'Política de privacidad',
    sentTitle: 'Revisa tu correo', sentBody: (e) => `Si ${e} puede recibir nuestros correos, el enlace ya va en camino. Ábrelo para continuar y, si no llega en unos minutos, mira en spam.`,
    verifying: 'Confirmando tu correo…', verified: '¡Correo confirmado! Bienvenido a PlayGonu.', resetDone: 'Tu nueva contraseña está guardada.',
    profileTitle: 'Mi cuenta', signedInAs: 'Sesión iniciada como',
    recordTitle: 'Historial en línea', games: { cham: 'Cham-gonu', gomoku: 'Gomoku' }, win: 'G', draw: 'E', loss: 'P',
    recordNote: 'Las partidas en línea se añaden solas mientras tienes la sesión iniciada.',
    importBody: (n) => `Este navegador registró ${n} partida(s) en línea antes de que te registraras. ¿Añadirlas a tu cuenta? (solo una vez)`,
    importBtn: 'Añadir a mi cuenta', imported: 'Añadidas a tu historial.',
    changePassword: 'Cambiar contraseña', passwordChanged: 'Contraseña cambiada. Se cerró la sesión en otros dispositivos.', saved: 'Guardado.',
    signOut: 'Cerrar sesión', deleteTitle: 'Eliminar cuenta',
    deleteBody: 'Se borrarán para siempre tu cuenta y tu historial. No se puede deshacer. Escribe tu contraseña para confirmar.',
    deleteBtn: 'Eliminar mi cuenta', deleted: 'Tu cuenta ha sido eliminada.',
    playOnline: 'Jugar en línea →',
    errors: {
      'bad-email': 'Revisa el correo.', 'bad-nickname': 'Apodo: 2–20 letras, números, espacios, “_”, “.” o “-”.',
      'bad-password': 'La contraseña debe tener 8–128 caracteres.', age: 'Debes tener 14 años o más para crear una cuenta.', consent: 'Acepta la recogida y el uso de datos personales.',
      mismatch: 'Las dos contraseñas nuevas no coinciden.', 'mail-off': 'Aún no podemos enviar correos de registro. Inténtalo más tarde.',
      'too-many': 'Demasiados intentos. Espera un poco.', 'bad-link': 'Este enlace caducó o ya se usó.',
      'bad-login': 'Correo o contraseña incorrectos.', unverified: 'Tu correo aún no está confirmado: te reenviamos el enlace.',
      'bad-current': 'La contraseña no es correcta.', 'signed-out': 'Se cerró tu sesión. Vuelve a entrar.',
      'already-imported': 'El historial de este dispositivo ya se añadió.', 'not-configured': 'Las cuentas no están disponibles ahora.', network: 'No se pudo conectar. Inténtalo de nuevo.',
    },
  },
  ja: {
    pageTitle: 'アカウント — PlayGonu',
    why: 'アカウントは任意です。登録しなくてもいつでも遊べます。ログインすると、オンライン対局の勝敗が保存され、どの端末でも引き継がれます。',
    signinTitle: 'ログイン', signupTitle: 'アカウント作成', forgotTitle: 'パスワードを忘れた場合', resetTitle: '新しいパスワードを設定',
    email: 'メールアドレス', password: 'パスワード', passwordHint: '8文字以上', nickname: 'ニックネーム', nicknameHint: '2〜20文字の文字・数字 — オンライン対局で表示されます',
    newPassword: '新しいパスワード', newPassword2: '新しいパスワード（確認）', currentPassword: '現在のパスワード',
    signinBtn: 'ログイン', signupBtn: '登録する', sendLinkBtn: '再設定リンクを送る', resetBtn: '新しいパスワードを保存', saveBtn: '保存',
    toSignup: 'アカウント作成', toSignin: 'アカウントを持っています', toForgot: 'パスワードを忘れた',
    forgotBody: '登録したメールアドレスを入力すると、新しいパスワードを設定するリンクを送ります。',
    age: '14歳以上です。',
    consent: '個人情報の収集・利用に同意します（必須）。',
    consentBody: '収集項目：メールアドレス、ニックネーム、オンライン対局の結果。目的：ログインと戦績の保存。保存期間：退会まで（メール未確認の登録は7日後に削除）。メール送信は Resend を利用します。',
    privacy: 'プライバシーポリシー',
    sentTitle: 'メールを確認してください', sentBody: (e) => `${e} にリンクを送りました。メールのボタンを押して続けてください。数分たっても届かない場合は迷惑メールフォルダも確認してください。`,
    verifying: 'メールアドレスを確認しています…', verified: 'メールアドレスを確認しました。PlayGonu へようこそ！', resetDone: '新しいパスワードを保存しました。',
    profileTitle: 'マイアカウント', signedInAs: 'ログイン中',
    recordTitle: 'オンライン戦績', games: { cham: 'チャムゴヌ', gomoku: '五目並べ' }, win: '勝', draw: '分', loss: '敗',
    recordNote: 'ログイン中のオンライン対局は自動で記録されます。',
    importBody: (n) => `登録前にこのブラウザに記録されたオンライン対局が${n}局あります。アカウントの戦績に加えますか？（1回のみ）`,
    importBtn: '戦績に加える', imported: '戦績に加えました。',
    changePassword: 'パスワードを変更', passwordChanged: 'パスワードを変更しました。他の端末はログアウトしました。', saved: '保存しました。',
    signOut: 'ログアウト', deleteTitle: '退会',
    deleteBody: 'アカウントと保存された戦績はすべて削除され、元に戻せません。確認のためパスワードを入力してください。',
    deleteBtn: '退会する', deleted: '退会が完了しました。',
    playOnline: 'オンライン対局へ →',
    errors: {
      'bad-email': 'メールアドレスを確認してください。', 'bad-nickname': 'ニックネームは2〜20文字の文字・数字・空白・「_」「.」「-」のみ使えます。',
      'bad-password': 'パスワードは8〜128文字にしてください。', age: '登録できるのは14歳以上の方です。', consent: '個人情報の収集・利用に同意してください。',
      mismatch: '新しいパスワードが一致しません。', 'mail-off': 'まだ登録メールを送れません。しばらくしてからお試しください。',
      'too-many': '試行回数が多すぎます。しばらくしてからお試しください。', 'bad-link': 'このリンクは期限切れか、すでに使われています。',
      'bad-login': 'メールアドレスまたはパスワードが違います。', unverified: 'メールアドレスがまだ確認されていません。確認リンクを再送しました。',
      'bad-current': 'パスワードが違います。', 'signed-out': 'ログアウトされました。もう一度ログインしてください。',
      'already-imported': 'この端末の戦績はすでに加えています。', 'not-configured': '現在アカウント機能は使えません。', network: 'サーバーに接続できませんでした。もう一度お試しください。',
    },
  },
  zh: {
    pageTitle: '账号 — PlayGonu',
    why: '账号是可选的——不注册也随时可以玩。登录后，你的在线对局胜、平、负会被保存，在任何设备上都能看到。',
    signinTitle: '登录', signupTitle: '注册账号', forgotTitle: '忘记密码？', resetTitle: '设置新密码',
    email: '邮箱', password: '密码', passwordHint: '至少 8 个字符', nickname: '昵称', nicknameHint: '2–20 个字母或数字——在线对局中显示',
    newPassword: '新密码', newPassword2: '再次输入新密码', currentPassword: '当前密码',
    signinBtn: '登录', signupBtn: '注册', sendLinkBtn: '发送重置链接', resetBtn: '保存新密码', saveBtn: '保存',
    toSignup: '注册账号', toSignin: '我已有账号', toForgot: '忘记密码？',
    forgotBody: '输入注册时用的邮箱，我们会发送设置新密码的链接。',
    age: '我已年满 14 岁。',
    consent: '我同意收集和使用我的个人信息（必选）。',
    consentBody: '收集内容：邮箱、昵称、在线对局结果。用途：登录和保存战绩。保存期限：直到你注销账号（未确认邮箱的注册 7 天后删除）。邮件通过 Resend 发送。',
    privacy: '隐私政策',
    sentTitle: '请查看邮箱', sentBody: (e) => `如果 ${e} 能收到我们的邮件，链接已经在路上了。打开它继续——几分钟后还没收到的话，请看看垃圾邮件文件夹。`,
    verifying: '正在确认邮箱…', verified: '邮箱已确认——欢迎来到 PlayGonu！', resetDone: '新密码已保存。',
    profileTitle: '我的账号', signedInAs: '当前登录',
    recordTitle: '在线战绩', games: { cham: '参高努', gomoku: '五子棋' }, win: '胜', draw: '平', loss: '负',
    recordNote: '登录状态下的在线对局会自动记录。',
    importBody: (n) => `注册前此浏览器记录了 ${n} 局在线对局。要加到你的账号战绩里吗？（仅限一次）`,
    importBtn: '加到我的战绩', imported: '已加入战绩。',
    changePassword: '修改密码', passwordChanged: '密码已修改，其他设备已退出登录。', saved: '已保存。',
    signOut: '退出登录', deleteTitle: '注销账号',
    deleteBody: '账号和保存的战绩会被永久删除，无法恢复。请输入密码确认。',
    deleteBtn: '注销我的账号', deleted: '你的账号已注销。',
    playOnline: '去在线对局 →',
    errors: {
      'bad-email': '请检查邮箱地址。', 'bad-nickname': '昵称为 2–20 个字母、数字、空格、“_”、“.” 或 “-”。',
      'bad-password': '密码需要 8–128 个字符。', age: '年满 14 岁才能注册账号。', consent: '请同意收集和使用个人信息。',
      mismatch: '两次输入的新密码不一致。', 'mail-off': '暂时无法发送注册邮件，请稍后再试。',
      'too-many': '尝试次数过多，请稍后再试。', 'bad-link': '链接已过期或已被使用。',
      'bad-login': '邮箱或密码错误。', unverified: '邮箱还没有确认——我们已重新发送确认链接。',
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
const msgBox = () => h('div', { class: 'msg', role: 'status' });
const showMsg = (box, text, ok = false) => { box.textContent = text || ''; box.className = `msg ${ok ? 'ok' : 'err'}`; };
const errText = (code) => t.errors[code] || t.errors.network;

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
    field(t.email, input('email', 'email', 'email')),
    field(t.password, input('password', 'password', 'current-password')),
  ], t.signinBtn, async (v, box) => {
    const r = await accountPost('/login', { email: v.email, password: v.password });
    if (r.error) return showMsg(box, errText(r.error), r.error === 'unverified');
    showProfile(r.user);
  });
  if (notice) showMsg(f.querySelector('.msg'), notice.text, notice.ok);
  root.replaceChildren(
    h('h1', { class: 'serif', text: t.signinTitle }),
    h('p', { class: 'hint', style: 'margin:0;font-size:14px;line-height:1.7;', text: t.why }),
    f,
    links([t.toSignup, () => showSignup()], [t.toForgot, () => showForgot()]),
  );
}

function showSignup() {
  const f = form([
    h('h2', { text: t.signupTitle }),
    field(t.nickname, input('text', 'nickname', 'nickname', { maxlength: 20, value: (() => { try { return localStorage.getItem('playgonu:name') || ''; } catch { return ''; } })() }), t.nicknameHint),
    field(t.email, input('email', 'email', 'email')),
    field(t.password, input('password', 'password', 'new-password', { minlength: 8, maxlength: 128 }), t.passwordHint),
    h('div', { class: 'consent' }, t.consentBody, ' ', h('a', { href: privacyHref, target: '_blank', rel: 'noopener', text: t.privacy })),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'consent' }), t.consent),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'age14' }), t.age),
  ], t.signupBtn, async (v, box) => {
    if (!v.consent) return showMsg(box, t.errors.consent);
    if (!v.age14) return showMsg(box, t.errors.age);
    const r = await accountPost('/signup', { email: v.email, password: v.password, nickname: v.nickname, lang, age14: true });
    if (r.error) return showMsg(box, errText(r.error));
    showSent(v.email.trim());
  });
  root.replaceChildren(
    h('h1', { class: 'serif', text: t.signupTitle }),
    h('p', { class: 'hint', style: 'margin:0;font-size:14px;line-height:1.7;', text: t.why }),
    f,
    links([t.toSignin, () => showSignin()]),
  );
}

function showSent(email) {
  root.replaceChildren(
    h('h1', { class: 'serif', text: t.sentTitle }),
    h('div', { class: 'acct-card' }, h('p', { style: 'margin:0;line-height:1.7;', text: t.sentBody(email) })),
    links([t.toSignin, () => showSignin()]),
  );
}

function showForgot() {
  const f = form([
    h('h2', { text: t.forgotTitle }),
    h('p', { class: 'hint', style: 'margin:0;', text: t.forgotBody }),
    field(t.email, input('email', 'email', 'email')),
  ], t.sendLinkBtn, async (v, box) => {
    const r = await accountPost('/forgot', { email: v.email, lang });
    if (r.error) return showMsg(box, errText(r.error));
    showSent(v.email.trim());
  });
  root.replaceChildren(h('h1', { class: 'serif', text: t.forgotTitle }), f, links([t.toSignin, () => showSignin()]));
}

function showReset(token) {
  const f = form([
    h('h2', { text: t.resetTitle }),
    field(t.newPassword, input('password', 'password', 'new-password', { minlength: 8, maxlength: 128 }), t.passwordHint),
    field(t.newPassword2, input('password', 'password2', 'new-password', { minlength: 8, maxlength: 128 })),
  ], t.resetBtn, async (v, box) => {
    if (v.password !== v.password2) return showMsg(box, t.errors.mismatch);
    const r = await accountPost('/reset', { token, password: v.password });
    if (r.error) return showMsg(box, errText(r.error));
    showProfile(r.user, { text: t.resetDone, ok: true });
  });
  root.replaceChildren(h('h1', { class: 'serif', text: t.resetTitle }), f);
}

async function runVerify(token) {
  root.replaceChildren(h('h1', { class: 'serif', text: t.signupTitle }), h('p', { class: 'hint', text: t.verifying }));
  const r = await accountPost('/verify', { token });
  if (r.error) return showSignin({ text: errText(r.error) });
  showProfile(r.user, { text: t.verified, ok: true });
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
  try { localStorage.setItem('playgonu:name', user.nickname); } catch { /* ignore */ }

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

  const nickForm = form([
    field(t.nickname, input('text', 'nickname', 'nickname', { maxlength: 20, value: user.nickname }), t.nicknameHint),
  ], t.saveBtn, async (v, box) => {
    const r = await accountPost('/profile', { nickname: v.nickname, lang });
    if (r.error) return r.error === 'signed-out' ? showSignin({ text: errText(r.error) }) : showMsg(box, errText(r.error));
    try { localStorage.setItem('playgonu:name', r.user.nickname); } catch { /* ignore */ }
    showMsg(box, t.saved, true);
  });

  const pwForm = form([
    field(t.currentPassword, input('password', 'current', 'current-password')),
    field(t.newPassword, input('password', 'password', 'new-password', { minlength: 8, maxlength: 128 }), t.passwordHint),
    field(t.newPassword2, input('password', 'password2', 'new-password', { minlength: 8, maxlength: 128 })),
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
    field(t.password, input('password', 'password', 'current-password')),
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
      h('div', { style: 'font-weight:700;word-break:break-all;', text: user.email }),
      h('div', { class: 'links' }, h('a', { href: onlineHref, class: 'btn-primary', style: 'text-decoration:none;', text: t.playOnline }), signOut),
    ),
    recordCard,
    nickForm,
    h('div', { class: 'acct-card' }, h('details', {}, h('summary', { text: t.changePassword }), pwForm)),
    h('div', { class: 'acct-card' }, h('details', {}, h('summary', { text: t.deleteTitle }), delForm)),
  );
}

// ---- start ----
const params = new URLSearchParams(location.search);
const verifyToken = params.get('verify');
const resetToken = params.get('reset');
if (verifyToken || resetToken) history.replaceState(null, '', `${location.pathname}?lang=${lang}`);

if (verifyToken) runVerify(verifyToken);
else if (resetToken) showReset(resetToken);
else fetchMe().then((user) => (user ? showProfile(user) : showSignin()));
