const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { lookupToken } = require('../lib/tokens');

function getCurrentHourSeoul() {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour').value);
  const m = parseInt(parts.find(p => p.type === 'minute').value);
  return h * 60 + m; // 분 단위
}

function renderPage(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Apple SD Gothic Neo',sans-serif;background:#f5f5f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .card{background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);max-width:480px;width:100%;overflow:hidden}
    .card-header{padding:24px 28px;background:#3b82f6;color:#fff}
    .card-header h1{font-size:20px;margin-bottom:4px}
    .card-header p{font-size:13px;color:#bfdbfe}
    .card-body{padding:24px 28px}
    .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600}
    .badge-green{background:#dcfce7;color:#166534}
    .badge-red{background:#fee2e2;color:#991b1b}
    .badge-gray{background:#f3f4f6;color:#374151}
    .status-list{margin-top:16px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
    .status-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:14px}
    .status-item:last-child{border-bottom:none}
    .form-group{margin-top:20px}
    .form-group label{display:block;font-size:14px;font-weight:600;color:#374151;margin-bottom:8px}
    .form-group input[type=text]{width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none}
    .form-group input[type=text]:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
    .btn{display:block;width:100%;padding:12px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;margin-top:12px}
    .btn:hover{background:#2563eb}
    .btn-amber{background:#f59e0b}.btn-amber:hover{background:#d97706}
    .notice{margin-top:14px;padding:12px 14px;background:#fef9c3;border-radius:8px;font-size:13px;color:#713f12;line-height:1.6}
    .success-icon{font-size:48px;text-align:center;margin-bottom:16px}
  </style>
</head>
<body>
  <div class="card">${bodyHtml}</div>
</body>
</html>`;
}

function getStatusList(lunchDayId) {
  return db.prepare(`
    SELECT m.name, r.status, r.menu_suggestion
    FROM members m
    LEFT JOIN responses r ON r.member_id = m.id AND r.lunch_day_id = ?
    ORDER BY m.id
  `).all(lunchDayId);
}

// GET /respond?token=X&action=참석|불참   (월~목)
// GET /respond?token=X                    (금요일 메뉴 페이지)
router.get('/', (req, res) => {
  const { token, action } = req.query;
  if (!token) {
    return res.status(400).send(renderPage('오류', `
      <div class="card-header" style="background:#ef4444"><h1>잘못된 링크</h1></div>
      <div class="card-body"><p>유효하지 않은 링크입니다.</p></div>`));
  }

  const info = lookupToken(token);
  if (!info) {
    return res.status(404).send(renderPage('오류', `
      <div class="card-header" style="background:#ef4444"><h1>유효하지 않은 링크</h1></div>
      <div class="card-body"><p>링크가 만료되었거나 존재하지 않습니다.</p></div>`));
  }

  // 마감 체크
  const minuteNow = getCurrentHourSeoul();
  const deadline = 16 * 60 + 54; // 16:54 마감 (테스트용)
  if (info.locked || minuteNow >= deadline) {
    const statusList = getStatusList(info.lunch_day_id);
    return res.send(renderPage('마감', buildClosedPage(info, statusList)));
  }

  if (info.day_type === 'friday') {
    // 금요일: 메뉴 추천 페이지만
    const existing = db.prepare('SELECT menu_suggestion FROM responses WHERE lunch_day_id=? AND member_id=?')
      .get(info.lunch_day_id, info.member_id);
    const statusList = getStatusList(info.lunch_day_id);
    return res.send(renderPage('메뉴 추천', buildFridayResponsePage(info, existing, statusList)));
  }

  // 월~목: 참석/불참 처리
  if (!action || !['참석', '불참'].includes(action)) {
    return res.status(400).send(renderPage('오류', `
      <div class="card-header" style="background:#ef4444"><h1>잘못된 요청</h1></div>
      <div class="card-body"><p>참석 또는 불참 버튼을 다시 클릭해 주세요.</p></div>`));
  }

  db.prepare(`
    INSERT INTO responses (lunch_day_id, member_id, status, responded_at)
    VALUES (?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(lunch_day_id, member_id) DO UPDATE SET
      status=excluded.status,
      responded_at=excluded.responded_at
  `).run(info.lunch_day_id, info.member_id, action);

  const statusList = getStatusList(info.lunch_day_id);
  return res.send(renderPage('응답 완료', buildConfirmedPage(info, action, statusList)));
});

// POST /respond/menu - 메뉴 추천 제출
router.post('/menu', express.urlencoded({ extended: false }), (req, res) => {
  const { token, menu } = req.body;
  if (!token) return res.status(400).send('잘못된 요청');

  const info = lookupToken(token);
  if (!info) return res.status(404).send('유효하지 않은 링크');

  const minuteNow = getCurrentHourSeoul();
  if (info.locked || minuteNow >= 16 * 60 + 54) {
    return res.send(renderPage('마감', `
      <div class="card-header" style="background:#6b7280"><h1>마감되었습니다</h1></div>
      <div class="card-body"><p>오전 11시 이후에는 메뉴를 추천할 수 없습니다.</p></div>`));
  }

  const menuText = (menu || '').trim().slice(0, 100);

  if (info.day_type === 'friday') {
    db.prepare(`
      INSERT INTO responses (lunch_day_id, member_id, status, menu_suggestion, responded_at)
      VALUES (?, ?, NULL, ?, datetime('now','localtime'))
      ON CONFLICT(lunch_day_id, member_id) DO UPDATE SET
        menu_suggestion=excluded.menu_suggestion,
        responded_at=excluded.responded_at
    `).run(info.lunch_day_id, info.member_id, menuText || null);
  } else {
    db.prepare(`
      UPDATE responses SET menu_suggestion=?, responded_at=datetime('now','localtime')
      WHERE lunch_day_id=? AND member_id=?
    `).run(menuText || null, info.lunch_day_id, info.member_id);
  }

  const statusList = getStatusList(info.lunch_day_id);
  return res.send(renderPage('메뉴 추천 완료', buildMenuSavedPage(info, menuText, statusList)));
});

function buildConfirmedPage(info, action, statusList) {
  const isAttending = action === '참석';
  const headerBg = isAttending ? '#22c55e' : '#ef4444';
  const icon = isAttending ? '✅' : '❌';
  const statusRows = statusList.map(s => {
    const badge = s.status === '참석'
      ? '<span class="badge badge-green">참석</span>'
      : s.status === '불참'
        ? '<span class="badge badge-red">불참</span>'
        : '<span class="badge badge-gray">미응답</span>';
    return `<div class="status-item"><span>${s.name}</span>${badge}</div>`;
  }).join('');

  const menuForm = isAttending ? `
    <div class="form-group">
      <label>💬 메뉴 추천 (선택)</label>
      <form action="/respond/menu" method="POST">
        <input type="hidden" name="token" value="${info.token}">
        <input type="text" name="menu" placeholder="예: 삼겹살, 초밥, 라멘..." maxlength="100">
        <button type="submit" class="btn">메뉴 추천하기</button>
      </form>
    </div>` : '';

  return `
    <div class="card-header" style="background:${headerBg}">
      <h1>${icon} ${info.member_name}님, ${action}으로 기록되었습니다!</h1>
      <p>마감 전까지 변경 가능합니다.</p>
    </div>
    <div class="card-body">
      ${menuForm}
      <p style="font-size:14px;font-weight:600;color:#374151;margin-top:20px;">현재 응답 현황</p>
      <div class="status-list">${statusRows}</div>
    </div>`;
}

function buildFridayResponsePage(info, existing, statusList) {
  const currentMenu = existing?.menu_suggestion || '';
  const statusRows = statusList.map(s => {
    const badge = s.menu_suggestion
      ? `<span class="badge badge-green">추천 완료</span>`
      : `<span class="badge badge-gray">미응답</span>`;
    return `<div class="status-item"><span>${s.name}</span>${badge}</div>`;
  }).join('');

  return `
    <div class="card-header" style="background:#f59e0b">
      <h1>🎉 ${info.member_name}님, 메뉴를 추천해 주세요!</h1>
      <p>오늘은 금요일! 다 같이 먹는 날이에요.</p>
    </div>
    <div class="card-body">
      <div class="form-group">
        <label>🍜 오늘 먹고 싶은 메뉴 (선택)</label>
        <form action="/respond/menu" method="POST">
          <input type="hidden" name="token" value="${info.token}">
          <input type="text" name="menu" placeholder="예: 삼겹살, 초밥, 라멘..." value="${escHtml(currentMenu)}" maxlength="100">
          <button type="submit" class="btn btn-amber">추천하기</button>
        </form>
      </div>
      <p style="font-size:14px;font-weight:600;color:#374151;margin-top:20px;">현재 추천 현황</p>
      <div class="status-list">${statusRows}</div>
    </div>`;
}

function buildMenuSavedPage(info, menu, statusList) {
  const statusRows = statusList.map(s => {
    const badge = s.menu_suggestion
      ? `<span class="badge badge-green">추천: ${escHtml(s.menu_suggestion)}</span>`
      : `<span class="badge badge-gray">미응답</span>`;
    return `<div class="status-item"><span>${s.name}</span>${badge}</div>`;
  }).join('');

  return `
    <div class="card-header" style="background:#22c55e">
      <h1>✅ 메뉴가 등록되었습니다!</h1>
      <p>${menu ? `"${escHtml(menu)}"` : '(추천 없음으로 저장)'}</p>
    </div>
    <div class="card-body">
      <p style="font-size:14px;font-weight:600;color:#374151;margin-bottom:8px;">현재 현황</p>
      <div class="status-list">${statusRows}</div>
    </div>`;
}

function buildClosedPage(info, statusList) {
  const statusRows = statusList.map(s => {
    const badge = s.status === '참석'
      ? `<span class="badge badge-green">참석${s.menu_suggestion ? ` · ${escHtml(s.menu_suggestion)}` : ''}</span>`
      : s.status === '불참'
        ? '<span class="badge badge-red">불참</span>'
        : '<span class="badge badge-gray">미응답</span>';
    return `<div class="status-item"><span>${s.name}</span>${badge}</div>`;
  }).join('');

  return `
    <div class="card-header" style="background:#6b7280">
      <h1>⏰ 마감되었습니다</h1>
      <p>오전 11시 이후에는 응답을 변경할 수 없습니다.</p>
    </div>
    <div class="card-body">
      <p style="font-size:14px;font-weight:600;color:#374151;margin-bottom:8px;">오늘 최종 현황</p>
      <div class="status-list">${statusRows}</div>
    </div>`;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = router;
