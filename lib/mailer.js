const nodemailer = require('nodemailer');
const dns = require('dns');
require('dotenv').config();

// Node 20+ Happy Eyeballs가 IPv6를 우선 시도해 Railway(IPv6 미지원)에서
// ENETUNREACH가 발생하는 문제 방지: IPv4 결과를 우선하도록 전역 설정
try { dns.setDefaultResultOrder('ipv4first'); } catch (_) {}

let transport;

// SMTP 호스트를 IPv4 주소로 직접 조회 (IPv6 연결 시도 자체를 차단)
async function resolveIpv4(host) {
  return new Promise((resolve) => {
    dns.lookup(host, { family: 4 }, (err, address) => {
      if (err || !address) return resolve(null); // 실패 시 호스트명 그대로 사용
      resolve(address);
    });
  });
}

async function getTransport() {
  if (!transport) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '465');
    const secure = process.env.SMTP_SECURE === 'true';
    const ipv4 = await resolveIpv4(host);
    transport = nodemailer.createTransport({
      host: ipv4 || host,
      port,
      secure,
      // IP로 접속하므로 TLS 인증서 검증은 원래 호스트명(SNI)으로 수행
      tls: ipv4 ? { servername: host } : undefined,
      // 멈춤(hang) 방지: 핸드셰이크가 안 되면 빠르게 실패시켜 원인 로그 노출
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log(`[mailer] SMTP 연결 대상: ${ipv4 ? `${ipv4} (IPv4, ${host})` : host}:${port} secure=${secure}`);
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
  const t = await getTransport();
  const info = await t.sendMail({
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
