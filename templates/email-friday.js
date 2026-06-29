const { formatDateKo } = require('../lib/holidays');
const { bannerHtml } = require('./_banner');

// 개인별 이메일 - 본인 메뉴 추천 링크만 포함
function buildFridayEmail(dateStr, memberName, token) {
  const host = process.env.SERVER_HOST || 'http://localhost:3000';
  const dateLabel = formatDateKo(dateStr);
  const menuUrl = `${host}/respond?token=${token}`;

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F6FB;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 26px rgba(31,42,68,.10);">
    ${bannerHtml('🎉 금요일 점심 — 다 같이 먹는 날!', dateLabel, { grad: 'linear-gradient(120deg,#FF9F52 0%,#FF7A3D 100%)', emoji: '🍙' })}
    <div style="padding:24px 28px;">
      <p style="margin:0 0 20px;font-size:15px;color:#46506a;">
        안녕하세요, <strong>${memberName}</strong>님! 🎊<br>
        오늘은 금요일, 다 함께 점심을 먹는 날이에요.<br>
        먹고 싶은 메뉴가 있으면 추천해 주세요!
      </p>
      <a href="${menuUrl}" style="display:block;padding:14px;background:#FF7A3D;color:#fff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:700;text-align:center;">🍜 메뉴 추천하기</a>
      <div style="margin-top:16px;padding:12px 14px;background:#e7f6ee;border-radius:10px;font-size:13px;color:#1FA85A;line-height:1.6;">
        메뉴 추천은 선택사항입니다. <strong>오전 10시 59분</strong>까지 가능해요.
      </div>
    </div>
    <div style="padding:16px 28px;background:#fafbfe;text-align:center;border-top:1px solid #eaeef6;">
      <a href="${host}" style="font-size:13px;color:#2B5BD7;font-weight:700;text-decoration:none;">📊 전체 현황 대시보드 보기</a>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { buildFridayEmail };
