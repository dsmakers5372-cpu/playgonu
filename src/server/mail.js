// Account emails (confirm address, reset password, "you already have an
// account"), sent through Resend's HTTP API. The API key is the Worker secret
// RESEND_API_KEY; the sender is the MAIL_FROM var (a playgonu.com address
// verified in Resend). On a local dev server without a key, the link is
// printed to the terminal instead of being emailed.

const TEXT = {
  en: {
    verify: { subject: 'Confirm your PlayGonu account', lead: 'Welcome to PlayGonu! Confirm your email address to finish signing up.', button: 'Confirm my email', note: 'This link works for 24 hours. If you didn’t sign up, just ignore this email.' },
    reset: { subject: 'Reset your PlayGonu password', lead: 'Someone (hopefully you) asked to reset the password for your PlayGonu account.', button: 'Choose a new password', note: 'This link works for 1 hour. If you didn’t ask, ignore this email — your password stays the same.' },
    exists: { subject: 'You already have a PlayGonu account', lead: 'Someone tried to sign up with this email address, but it already has a PlayGonu account.', button: 'Sign in', note: 'Forgot your password? Use “Forgot password” on the sign-in page. If this wasn’t you, you can ignore this email.' },
  },
  ko: {
    verify: { subject: '플레이고누 가입 확인', lead: '플레이고누에 오신 걸 환영해요! 아래 버튼을 눌러 이메일 주소를 확인하면 가입이 끝나요.', button: '이메일 확인하기', note: '이 링크는 24시간 동안 쓸 수 있어요. 가입한 적이 없다면 이 메일은 무시하세요.' },
    reset: { subject: '플레이고누 비밀번호 재설정', lead: '플레이고누 계정의 비밀번호 재설정을 요청하셨어요.', button: '새 비밀번호 정하기', note: '이 링크는 1시간 동안 쓸 수 있어요. 요청한 적이 없다면 무시하세요 — 비밀번호는 그대로예요.' },
    exists: { subject: '이미 플레이고누 계정이 있어요', lead: '이 이메일 주소로 가입하려는 시도가 있었는데, 이미 가입된 주소예요.', button: '로그인하기', note: '비밀번호가 기억나지 않으면 로그인 화면의 “비밀번호 찾기”를 눌러주세요. 본인이 아니라면 무시하세요.' },
  },
  es: {
    verify: { subject: 'Confirma tu cuenta de PlayGonu', lead: '¡Bienvenido a PlayGonu! Confirma tu correo para terminar el registro.', button: 'Confirmar mi correo', note: 'El enlace funciona durante 24 horas. Si no te registraste, ignora este correo.' },
    reset: { subject: 'Restablece tu contraseña de PlayGonu', lead: 'Alguien (seguramente tú) pidió restablecer la contraseña de tu cuenta de PlayGonu.', button: 'Elegir nueva contraseña', note: 'El enlace funciona durante 1 hora. Si no lo pediste, ignora este correo: tu contraseña no cambia.' },
    exists: { subject: 'Ya tienes una cuenta de PlayGonu', lead: 'Alguien intentó registrarse con este correo, pero ya tiene una cuenta de PlayGonu.', button: 'Iniciar sesión', note: '¿Olvidaste tu contraseña? Usa “Olvidé mi contraseña” en la página de inicio de sesión. Si no fuiste tú, ignora este correo.' },
  },
  ja: {
    verify: { subject: 'PlayGonu アカウントの確認', lead: 'PlayGonu へようこそ！メールアドレスを確認すると登録が完了します。', button: 'メールアドレスを確認', note: 'このリンクは24時間有効です。登録した覚えがなければ、このメールは無視してください。' },
    reset: { subject: 'PlayGonu パスワードの再設定', lead: 'PlayGonu アカウントのパスワード再設定がリクエストされました。', button: '新しいパスワードを設定', note: 'このリンクは1時間有効です。心当たりがなければ無視してください。パスワードは変わりません。' },
    exists: { subject: 'PlayGonu アカウントはすでにあります', lead: 'このメールアドレスで登録しようとしましたが、すでにアカウントがあります。', button: 'ログイン', note: 'パスワードを忘れた場合は、ログイン画面の「パスワードを忘れた」から再設定できます。心当たりがなければ無視してください。' },
  },
  zh: {
    verify: { subject: '确认你的 PlayGonu 账号', lead: '欢迎来到 PlayGonu！确认邮箱地址即可完成注册。', button: '确认邮箱', note: '此链接 24 小时内有效。如果你没有注册，请忽略此邮件。' },
    reset: { subject: '重置 PlayGonu 密码', lead: '有人（希望是你）请求重置你的 PlayGonu 账号密码。', button: '设置新密码', note: '此链接 1 小时内有效。如果不是你本人操作，请忽略此邮件，密码不会改变。' },
    exists: { subject: '你已经有 PlayGonu 账号了', lead: '有人尝试用这个邮箱注册，但它已经有 PlayGonu 账号了。', button: '登录', note: '忘记密码？在登录页点击“忘记密码”。如果不是你本人操作，请忽略此邮件。' },
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildMail(kind, lang, link) {
  const t = (TEXT[lang] || TEXT.en)[kind];
  const html = `<!doctype html><html><body style="margin:0;background:#F6F1E6;font-family:-apple-system,'Segoe UI',sans-serif;color:#2A2420;">
<div style="max-width:480px;margin:0 auto;padding:32px 24px;">
<div style="font-family:Georgia,serif;font-size:22px;font-weight:700;margin-bottom:20px;">PlayGonu</div>
<p style="font-size:15px;line-height:1.7;margin:0 0 24px;">${esc(t.lead)}</p>
<p style="margin:0 0 24px;"><a href="${esc(link)}" style="display:inline-block;background:#B23A2E;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;">${esc(t.button)}</a></p>
<p style="font-size:13px;line-height:1.7;color:#7A6E62;margin:0 0 8px;">${esc(t.note)}</p>
<p style="font-size:12px;line-height:1.6;color:#9A8F84;margin:0;word-break:break-all;">${esc(link)}</p>
</div></body></html>`;
  const text = `PlayGonu\n\n${t.lead}\n\n${t.button}: ${link}\n\n${t.note}\n`;
  return { subject: t.subject, html, text };
}

const isLocal = (url) => ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.localhost');

// Whether account email can go out from this host at all.
export const canSendMail = (env, url) => !!env.RESEND_API_KEY || isLocal(url);

export async function sendMail(env, url, to, kind, lang, link) {
  const { subject, html, text } = buildMail(kind, lang, link);
  if (!env.RESEND_API_KEY) {
    if (isLocal(url)) console.log(`[dev mail] ${kind} → ${link}`);
    return isLocal(url);
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM || 'PlayGonu <no-reply@playgonu.com>', to: [to], subject, html, text }),
  });
  if (!res.ok) console.error('account mail failed', res.status, kind);
  return res.ok;
}
