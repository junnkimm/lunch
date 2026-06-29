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
  <title>${title} · 뭉살흩죽</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{--brand:#2B5BD7;--attend:#1FA85A;--absent:#E54A4D;--friday:#FF7A3D;--line:#eaeef6;--ink:#2b3550;--text:#46506a;--mut:#6b7280;--faint:#9aa3b5}
    body{font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#F4F6FB;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px;color:var(--text);-webkit-font-smoothing:antialiased}
    .wrap{width:100%;max-width:480px}
    .brand-bar{display:flex;align-items:center;gap:12px;margin-bottom:14px;padding-left:4px}
    .brand-mark{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#4A7BF7,#2B5BD7);display:flex;align-items:center;justify-content:center;font-size:23px;box-shadow:0 5px 14px rgba(43,91,215,.3);flex:none}
    .wordmark{font-family:'Black Han Sans',sans-serif;font-size:26px;line-height:1;color:var(--brand)}
    .wordmark .g{color:var(--attend)}.wordmark .r{color:var(--absent)}
    .card{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 8px 30px rgba(31,42,68,.10);width:100%;overflow:hidden}
    .card-header{padding:26px 28px;background:var(--brand);color:#fff}
    .card-header h1{font-size:20px;margin-bottom:5px;line-height:1.35;font-weight:800}
    .card-header p{font-size:13px;color:rgba(255,255,255,.85)}
    .card-body{padding:24px 28px}
    .badge{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:700}
    .badge-green{background:#e7f6ee;color:#1FA85A}
    .badge-red{background:#fdebeb;color:#E54A4D}
    .badge-gray{background:#eef1f6;color:#6b7280}
    .badge-amber{background:#fff1e8;color:#d2602a}
    .status-list{margin-top:14px;border:1px solid var(--line);border-radius:12px;overflow:hidden}
    .status-item{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-bottom:1px solid var(--line);font-size:14px;color:var(--ink)}
    .status-item:last-child{border-bottom:none}
    .form-group{margin-top:20px}
    .form-group label{display:block;font-size:14px;font-weight:700;color:var(--ink);margin-bottom:8px}
    .form-group input[type=text]{width:100%;padding:11px 14px;border:1px solid #d6dbe6;border-radius:10px;font-size:14px;outline:none;font-family:inherit}
    .form-group input[type=text]:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(43,91,215,.15)}
    .btn{display:block;width:100%;padding:13px;background:var(--brand);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-top:12px;text-decoration:none;text-align:center}
    .btn:hover{filter:brightness(1.05)}
    .btn-amber{background:var(--friday)}
    .btn-dash{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;margin-top:20px;padding:13px;border-radius:10px;background:#EAF1FE;color:var(--brand);font-size:14px;font-weight:700;text-decoration:none;border:1px solid #d8e4fb}
    .btn-dash:hover{background:#dde9fd}
    .sub-label{font-size:13px;font-weight:700;color:var(--ink);margin-top:20px;margin-bottom:2px}
    .foot{margin-top:16px;text-align:center;font-size:12px;color:var(--faint)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand-bar">
      <div class="brand-mark">🍱</div>
      <div class="wordmark">뭉<span class="g">살</span>흩<span class="r">죽</span></div>
    </div>
    <div class="card">${bodyHtml}</div>
    <div class="foot">뭉치면 살고 · 흩어지면 죽는다</div>
  </div>
</body>
</html>`;
}

// 응답/마감 화면 하단 → 대시보드 바로가기 (같은 서버이므로 상대경로)
function dashboardButton() {
  return `<a href="/" class="btn-dash">📊 대시보드에서 전체 현황 보기</a>`;
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
  const deadline = 11 * 60; // 11:00 마감
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
    VALUES (?, ?, ?, datetime('now'))
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
  if (info.locked || minuteNow >= 11 * 60) {
    return res.send(renderPage('마감', `
      <div class="card-header" style="background:#6b7280"><h1>마감되었습니다</h1></div>
      <div class="card-body"><p>오전 11시 이후에는 메뉴를 추천할 수 없습니다.</p></div>`));
  }

  const menuText = (menu || '').trim().slice(0, 100);

  if (info.day_type === 'friday') {
    db.prepare(`
      INSERT INTO responses (lunch_day_id, member_id, status, menu_suggestion, responded_at)
      VALUES (?, ?, NULL, ?, datetime('now'))
      ON CONFLICT(lunch_day_id, member_id) DO UPDATE SET
        menu_suggestion=excluded.menu_suggestion,
        responded_at=excluded.responded_at
    `).run(info.lunch_day_id, info.member_id, menuText || null);
  } else {
    db.prepare(`
      UPDATE responses SET menu_suggestion=?, responded_at=datetime('now')
      WHERE lunch_day_id=? AND member_id=?
    `).run(menuText || null, info.lunch_day_id, info.member_id);
  }

  const statusList = getStatusList(info.lunch_day_id);
  return res.send(renderPage('메뉴 추천 완료', buildMenuSavedPage(info, menuText, statusList)));
});

function buildConfirmedPage(info, action, statusList) {
  const isAttending = action === '참석';
  const headerBg = isAttending ? '#1FA85A' : '#E54A4D';
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
      <div class="sub-label">현재 응답 현황</div>
      <div class="status-list">${statusRows}</div>
      ${dashboardButton()}
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
    <div class="card-header" style="background:#FF7A3D">
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
      <div class="sub-label">현재 추천 현황</div>
      <div class="status-list">${statusRows}</div>
      ${dashboardButton()}
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
    <div class="card-header" style="background:#1FA85A">
      <h1>✅ 메뉴가 등록되었습니다!</h1>
      <p>${menu ? `"${escHtml(menu)}"` : '(추천 없음으로 저장)'}</p>
    </div>
    <div class="card-body">
      <div class="sub-label" style="margin-top:0">현재 현황</div>
      <div class="status-list">${statusRows}</div>
      ${dashboardButton()}
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
    <div class="card-header" style="background:#64748b">
      <h1>⏰ 마감되었습니다</h1>
      <p>오전 11시 이후에는 응답을 변경할 수 없습니다.</p>
    </div>
    <div class="card-body">
      <div class="sub-label" style="margin-top:0">오늘 최종 현황</div>
      <div class="status-list">${statusRows}</div>
      ${dashboardButton()}
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
