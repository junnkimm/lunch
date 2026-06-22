const nodemailer = require('nodemailer');
require('dotenv').config();

let transport;

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transport;
}

function checkSmtp() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[mailer] SMTP 설정이 없어 이메일 발송을 건너뜁니다.');
    return false;
  }
  return true;
}

// 개인 이메일 발송
async function sendToMember(toEmail, subject, html) {
  if (!checkSmtp()) return { skipped: true };
  console.log(`[mailer] 발송 → ${toEmail}`);
  const info = await getTransport().sendMail({
    from: `"점심 알리미" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject,
    html,
  });
  console.log(`[mailer] 완료 → ${toEmail} (${info.messageId})`);
  return info;
}

// 전체 팀 결과 이메일 (5명 개별 발송)
async function sendToAllMembers(memberEmails, subject, html) {
  if (!checkSmtp()) return { skipped: true };
  for (const email of memberEmails) {
    try {
      await sendToMember(email, subject, html);
    } catch (err) {
      console.error(`[mailer] 실패 → ${email}:`, err.message);
    }
  }
}

module.exports = { sendToMember, sendToAllMembers };
