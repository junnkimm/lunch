const { formatDateKo } = require('../lib/holidays');

// 개인별 이메일 - 본인 참석/불참 버튼만 포함
function buildWeekdayEmail(dateStr, memberName, token) {
  const host = process.env.SERVER_HOST || 'http://localhost:3000';
  const dateLabel = formatDateKo(dateStr);
  const attendUrl = `${host}/respond?token=${token}&action=%EC%B0%B8%EC%84%9D`;
  const absentUrl = `${host}/respond?token=${token}&action=%EB%B6%88%EC%B0%B8`;

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Apple SD Gothic Neo',sans-serif;">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#3b82f6;padding:24px 28px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">🍽️ 오늘 점심 참석 여부</h1>
      <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">${dateLabel}</p>
    </div>
    <div style="padding:24px 28px;">
      <p style="margin:0 0 20px;font-size:15px;color:#374151;">
        안녕하세요, <strong>${memberName}</strong>님!<br>
        오늘 점심 참석 여부를 알려주세요.
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 8px 8px 0;">
            <a href="${attendUrl}" style="display:block;padding:14px;background:#22c55e;color:#fff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;text-align:center;">✅ 참석할게요</a>
          </td>
          <td style="padding:8px 0 8px 8px;">
            <a href="${absentUrl}" style="display:block;padding:14px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;text-align:center;">❌ 불참합니다</a>
          </td>
        </tr>
      </table>
      <div style="margin-top:16px;padding:12px 14px;background:#fef9c3;border-radius:8px;font-size:13px;color:#713f12;line-height:1.6;">
        ⏰ 마감: <strong>오전 10시 59분</strong><br>
        미응답 시 자동으로 <strong>불참</strong> 처리됩니다.
      </div>
    </div>
    <div style="padding:14px 28px;background:#f9fafb;text-align:center;">
      <a href="${process.env.SERVER_HOST || 'http://localhost:3000'}" style="font-size:13px;color:#6b7280;text-decoration:none;">전체 현황 대시보드 보기</a>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { buildWeekdayEmail };
