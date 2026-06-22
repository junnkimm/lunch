const { formatDateKo } = require('../lib/holidays');

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
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Apple SD Gothic Neo',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#f59e0b;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">🍽️ 금요일 점심 메뉴 추천 모음</h1>
      <p style="margin:6px 0 0;color:#fef3c7;font-size:14px;">${dateLabel}</p>
    </div>
    <div style="padding:24px 32px;">
      <ul style="margin:0;padding:0 0 0 20px;">${menuHtml}</ul>
      <p style="margin:24px 0 0;font-size:15px;color:#374151;">즐거운 점심 되세요! 🎉</p>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;text-align:center;">
      <a href="${host}" style="font-size:13px;color:#6b7280;text-decoration:none;">대시보드 보기</a>
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
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Apple SD Gothic Neo',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#3b82f6;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">📋 오늘 점심 결과</h1>
      <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">${dateLabel} · 참석 ${attending.length}명 / 5명</p>
    </div>
    <div style="padding:24px 32px;">
      <h3 style="margin:0 0 12px;font-size:15px;color:#374151;">✅ 참석 (${attending.length}명)</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
        <tbody>${attendRows}</tbody>
      </table>
      <h3 style="margin:0 0 12px;font-size:15px;color:#374151;">❌ 불참 (${absent.length + noResponse.length}명)</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tbody>${absentRows}</tbody>
      </table>
      ${menuSection}
    </div>
    <div style="padding:16px 32px;background:#f9fafb;text-align:center;">
      <a href="${host}" style="font-size:13px;color:#6b7280;text-decoration:none;">대시보드 보기</a>
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
