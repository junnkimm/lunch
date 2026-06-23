require('dotenv').config();

// Railway가 아웃바운드 SMTP 포트(25/465/587)를 차단하므로 nodemailer 직접 연결은
// 불가능. 대신 SendGrid HTTP API(443 포트)로 발송한다.
const SENDGRID_URL = 'https://api.sendgrid.com/v3/mail/send';

// 발신 주소: SendGrid에 인증된 단일 발신자(Single Sender)여야 함
function getFrom() {
  return process.env.SENDGRID_FROM || process.env.SMTP_USER;
}

function checkConfig() {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[mailer] SENDGRID_API_KEY 가 없어 이메일 발송을 건너뜁니다.');
    return false;
  }
  if (!getFrom()) {
    console.warn('[mailer] 발신 주소(SENDGRID_FROM/SMTP_USER)가 없어 건너뜁니다.');
    return false;
  }
  return true;
}

// 개인 이메일 발송
async function sendToMember(toEmail, subject, html) {
  if (!checkConfig()) return { skipped: true };
  console.log(`[mailer] 발송 → ${toEmail}`);

  const body = {
    personalizations: [{ to: [{ email: toEmail }] }],
    from: { email: getFrom(), name: '점심 알리미' },
    subject,
    content: [{ type: 'text/html', value: html }],
  };

  // Node 20+ 내장 fetch 사용 (HTTPS 443 → Railway 차단 우회)
  const res = await fetch(SENDGRID_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    // SendGrid는 실패 시 JSON에 errors 배열을 담아 4xx/5xx 반환
    const detail = await res.text().catch(() => '');
    throw new Error(`SendGrid ${res.status}: ${detail}`);
  }

  const messageId = res.headers.get('x-message-id') || '';
  console.log(`[mailer] 완료 → ${toEmail} (${messageId})`);
  return { messageId };
}

// 전체 팀 결과 이메일 (개별 발송)
async function sendToAllMembers(memberEmails, subject, html) {
  if (!checkConfig()) return { skipped: true };
  for (const email of memberEmails) {
    try {
      await sendToMember(email, subject, html);
    } catch (err) {
      console.error(`[mailer] 실패 → ${email}:`, err.message);
    }
  }
}

module.exports = { sendToMember, sendToAllMembers };
