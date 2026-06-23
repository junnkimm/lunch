require('dotenv').config();

// Railway가 아웃바운드 SMTP 포트(25/465/587)를 차단하므로 nodemailer 직접 연결은
// 불가능. 대신 Brevo 트랜잭션 이메일 API(HTTPS 443)로 발송한다.
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

// 발신 주소: Brevo에 인증된 발신자(Senders)여야 함
function getFrom() {
  return process.env.BREVO_FROM || process.env.SMTP_USER;
}

function checkConfig() {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[mailer] BREVO_API_KEY 가 없어 이메일 발송을 건너뜁니다.');
    return false;
  }
  if (!getFrom()) {
    console.warn('[mailer] 발신 주소(BREVO_FROM/SMTP_USER)가 없어 건너뜁니다.');
    return false;
  }
  return true;
}

// 개인 이메일 발송
async function sendToMember(toEmail, subject, html) {
  if (!checkConfig()) return { skipped: true };
  console.log(`[mailer] 발송 → ${toEmail}`);

  const body = {
    sender: { name: '점심 알리미', email: getFrom() },
    to: [{ email: toEmail }],
    subject,
    htmlContent: html,
  };

  // Node 20+ 내장 fetch 사용 (HTTPS 443 → Railway 차단 우회)
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    // Brevo는 실패 시 JSON에 code/message를 담아 4xx/5xx 반환
    const detail = await res.text().catch(() => '');
    throw new Error(`Brevo ${res.status}: ${detail}`);
  }

  const data = await res.json().catch(() => ({}));
  console.log(`[mailer] 완료 → ${toEmail} (${data.messageId || ''})`);
  return data;
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
