const { formatDateKo } = require('../lib/holidays');

// 개인별 이메일 - 본인 메뉴 추천 링크만 포함
function buildFridayEmail(dateStr, memberName, token) {
  const host = process.env.SERVER_HOST || 'http://localhost:3000';
  const dateLabel = formatDateKo(dateStr);
  const menuUrl = `${host}/respond?token=${token}`;

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Apple SD Gothic Neo',sans-serif;">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#f59e0b;padding:24px 28px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">🎉 금요일 점심 - 다 같이 먹는 날!</h1>
      <p style="margin:6px 0 0;color:#fef3c7;font-size:14px;">${dateLabel}</p>
    </div>
    <div style="padding:24px 28px;">
      <p style="margin:0 0 20px;font-size:15px;color:#374151;">
        안녕하세요, <strong>${memberName}</strong>님! 🎊<br>
        오늘은 금요일, 다 함께 점심을 먹는 날이에요.<br>
        먹고 싶은 메뉴가 있으면 추천해 주세요!
      </p>
      <a href="${menuUrl}" style="display:block;padding:14px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;text-align:center;">🍜 메뉴 추천하기</a>
      <div style="margin-top:16px;padding:12px 14px;background:#ecfdf5;border-radius:8px;font-size:13px;color:#065f46;line-height:1.6;">
        메뉴 추천은 선택사항입니다. <strong>오전 10시 59분</strong>까지 가능해요.
      </div>
    </div>
    <div style="padding:14px 28px;background:#f9fafb;text-align:center;">
      <a href="${process.env.SERVER_HOST || 'http://localhost:3000'}" style="font-size:13px;color:#6b7280;text-decoration:none;">전체 현황 대시보드 보기</a>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { buildFridayEmail };
