const { formatDateKo } = require('../lib/holidays');
const { bannerHtml } = require('./_banner');

// 개인별 이메일 - 본인 참석/불참 버튼만 포함
function buildWeekdayEmail(dateStr, memberName, token) {
  const host = process.env.SERVER_HOST || 'http://localhost:3000';
  const dateLabel = formatDateKo(dateStr);
  const attendUrl = `${host}/respond?token=${token}&action=%EC%B0%B8%EC%84%9D`;
  const absentUrl = `${host}/respond?token=${token}&action=%EB%B6%88%EC%B0%B8`;

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F6FB;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 26px rgba(31,42,68,.10);">
    ${bannerHtml('오늘 점심, 같이 드실래요?', dateLabel)}
    <div style="padding:24px 28px;">
      <p style="margin:0 0 20px;font-size:15px;color:#46506a;">
        안녕하세요, <strong>${memberName}</strong>님!<br>
        오늘 점심 참석 여부를 알려주세요.
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 8px 8px 0;">
            <a href="${attendUrl}" style="display:block;padding:14px;background:#1FA85A;color:#fff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:700;text-align:center;">✅ 참석할게요</a>
          </td>
          <td style="padding:8px 0 8px 8px;">
            <a href="${absentUrl}" style="display:block;padding:14px;background:#E54A4D;color:#fff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:700;text-align:center;">❌ 불참합니다</a>
          </td>
        </tr>
      </table>
      <div style="margin-top:16px;padding:12px 14px;background:#fff1e8;border-radius:10px;font-size:13px;color:#d2602a;line-height:1.6;">
        ⏰ 마감: <strong>오전 10시 59분</strong><br>
        미응답 시 자동으로 <strong>불참</strong> 처리됩니다.
      </div>
    </div>
    <div style="padding:16px 28px;background:#fafbfe;text-align:center;border-top:1px solid #eaeef6;">
      <a href="${host}" style="font-size:13px;color:#2B5BD7;font-weight:700;text-decoration:none;">📊 전체 현황 대시보드 보기</a>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { buildWeekdayEmail };
