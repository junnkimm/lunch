const { formatDateKo } = require('../lib/holidays');
const { bannerHtml } = require('./_banner');

// responses: [{ member_name, status, menu_suggestion }]
function buildResultsEmail(dateStr, dayType, responses) {
  const host = process.env.SERVER_HOST || 'http://localhost:3000';
  const dateLabel = formatDateKo(dateStr);

  if (dayType === 'friday') {
    const menuItems = responses.filter(r => r.menu_suggestion);
    const menuHtml = menuItems.length > 0
      ? menuItems.map(r => `<li style="margin:6px 0;font-size:15px;">👤 <strong>${r.member_name}</strong>: ${escHtml(r.menu_suggestion)}</li>`).join('')
      : '<li style="margin:6px 0;font-size:15px;color:#6b7280;">이번 주는 메뉴 추천이 없었습니다.</li>';

    return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F6FB;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 26px rgba(31,42,68,.10);">
    ${bannerHtml('🍽️ 금요일 점심 메뉴 추천 모음', dateLabel, { grad: 'linear-gradient(120deg,#FF9F52 0%,#FF7A3D 100%)', emoji: '🍙' })}
    <div style="padding:24px 32px;">
      <ul style="margin:0;padding:0 0 0 20px;color:#46506a;">${menuHtml}</ul>
      <p style="margin:24px 0 0;font-size:15px;color:#46506a;">즐거운 점심 되세요! 🎉</p>
    </div>
    <div style="padding:16px 32px;background:#fafbfe;text-align:center;border-top:1px solid #eaeef6;">
      <a href="${host}" style="font-size:13px;color:#2B5BD7;font-weight:700;text-decoration:none;">📊 대시보드 보기</a>
    </div>
  </div>
</body>
</html>`;
  }

  // 월~목 결과
  const attending = responses.filter(r => r.status === '참석');
  const absent = responses.filter(r => r.status === '불참');
  const noResponse = responses.filter(r => !r.status);

  const attendRows = attending.length > 0
    ? attending.map(r => `
        <tr>
          <td style="padding:10px 16px;font-size:14px;">✅ ${r.member_name}</td>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;">${r.menu_suggestion ? `💬 "${escHtml(r.menu_suggestion)}"` : ''}</td>
        </tr>`).join('')
    : '<tr><td colspan="2" style="padding:10px 16px;font-size:14px;color:#6b7280;">없음</td></tr>';

  const absentRows = [...absent, ...noResponse].length > 0
    ? [...absent, ...noResponse].map(r => `
        <tr>
          <td style="padding:10px 16px;font-size:14px;">❌ ${r.member_name}</td>
          <td style="padding:10px 16px;font-size:13px;color:#6b7280;">${noResponse.includes(r) ? '(미응답 → 불참 처리)' : ''}</td>
        </tr>`).join('')
    : '<tr><td colspan="2" style="padding:10px 16px;font-size:14px;color:#6b7280;">없음</td></tr>';

  const menuItems = attending.filter(r => r.menu_suggestion);
  const menuSection = menuItems.length > 0 ? `
    <div style="margin-top:20px;">
      <h3 style="margin:0 0 12px;font-size:15px;color:#374151;">📍 메뉴 추천</h3>
      <ul style="margin:0;padding:0 0 0 20px;">
        ${menuItems.map(r => `<li style="margin:6px 0;font-size:14px;">👤 <strong>${r.member_name}</strong>: ${escHtml(r.menu_suggestion)}</li>`).join('')}
      </ul>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F6FB;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 26px rgba(31,42,68,.10);">
    ${bannerHtml(`📋 오늘 점심 결과 · 참석 ${attending.length}명 / 5명`, dateLabel)}
    <div style="padding:24px 32px;">
      <h3 style="margin:0 0 12px;font-size:15px;color:#2b3550;">✅ 참석 (${attending.length}명)</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eaeef6;border-radius:10px;overflow:hidden;margin-bottom:16px;">
        <tbody>${attendRows}</tbody>
      </table>
      <h3 style="margin:0 0 12px;font-size:15px;color:#2b3550;">❌ 불참 (${absent.length + noResponse.length}명)</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eaeef6;border-radius:10px;overflow:hidden;">
        <tbody>${absentRows}</tbody>
      </table>
      ${menuSection}
    </div>
    <div style="padding:16px 32px;background:#fafbfe;text-align:center;border-top:1px solid #eaeef6;">
      <a href="${host}" style="font-size:13px;color:#2B5BD7;font-weight:700;text-decoration:none;">📊 대시보드 보기</a>
    </div>
  </div>
</body>
</html>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { buildResultsEmail };
