// 대시보드 메인 스크립트

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(`${y}-${m}-${d}T00:00:00+09:00`);
  return `${y}.${m}.${d} (${WEEKDAYS[date.getDay()]})`;
}

function statusBadge(status, dayType) {
  if (dayType === 'friday') return '<span class="badge badge-friday">🎉 금요일</span>';
  if (status === '참석') return '<span class="badge badge-green">✅ 참석</span>';
  if (status === '불참') return '<span class="badge badge-red">❌ 불참</span>';
  return '<span class="badge badge-gray">미응답</span>';
}

// ── 오늘 현황 ──────────────────────────────────────
async function loadToday() {
  const data = await fetch('/api/today').then(r => r.json());

  // 마지막 갱신 시각
  const now = new Date();
  document.getElementById('last-refresh').textContent =
    `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} 갱신`;

  if (!data.lunchDay) {
    document.getElementById('today-content').innerHTML = `
      <div class="empty-hero">
        <div class="em-emoji">🍱</div>
        <div class="em-word">뭉<span class="g">살</span>흩<span class="r">죽</span></div>
        <div class="em-sub">오늘은 점심 세션이 없습니다.<br>공휴일이거나 아직 오전 9시 알림이 발송되지 않았어요.</div>
      </div>`;
    ['cnt-attend', 'cnt-absent', 'cnt-none'].forEach(id => document.getElementById(id).textContent = '-');
    return;
  }

  const { lunchDay, responses } = data;
  const isFriday = lunchDay.day_type === 'friday';

  const attending = responses.filter(r => r.status === '참석');
  const absent = responses.filter(r => r.status === '불참');
  const none = responses.filter(r => !r.status);

  document.getElementById('cnt-attend').textContent = isFriday ? '5' : attending.length;
  document.getElementById('cnt-absent').textContent = isFriday ? '-' : absent.length;
  document.getElementById('cnt-none').textContent = isFriday ? '-' : none.length;

  const rows = responses.map(r => {
    const badge = isFriday
      ? (r.menu_suggestion
          ? `<span class="badge badge-amber">🍜 추천 완료</span>`
          : `<span class="badge badge-gray">미응답</span>`)
      : statusBadge(r.status, lunchDay.day_type);
    const menu = r.menu_suggestion
      ? `<span class="menu-chip">💬 ${esc(r.menu_suggestion)}</span>` : '';
    const time = r.responded_at
      ? `<span style="font-size:11px;color:#9ca3af">${r.responded_at.slice(11,16)}</span>` : '';
    return `<tr>
      <td><strong>${r.member_name}</strong></td>
      <td>${badge}${menu}</td>
      <td>${time}</td>
    </tr>`;
  }).join('');

  const lockedBadge = lunchDay.locked
    ? '<span class="badge badge-gray" style="font-size:11px">마감됨</span>'
    : '<span class="badge badge-green" style="font-size:11px">응답 가능</span>';

  document.getElementById('today-content').innerHTML = `
    <div style="padding:0 0 12px;display:flex;align-items:center;gap:8px;">
      ${isFriday ? '<span class="badge badge-friday">🎉 금요일</span>' : ''}
      ${lockedBadge}
    </div>
    <table class="member-table">
      <thead><tr>
        <th>이름</th>
        <th>${isFriday ? '메뉴 추천' : '참석 여부'}</th>
        <th>응답 시각</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── 히스토리 ──────────────────────────────────────
async function loadHistory() {
  const data = await fetch('/api/history').then(r => r.json());
  if (!data.length) {
    document.getElementById('history-content').innerHTML = '<div class="empty-state">기록이 없습니다.</div>';
    return;
  }
  const rows = data.map(d => {
    const isFriday = d.day_type === 'friday';
    const dayType = isFriday
      ? '<span class="badge badge-friday" style="font-size:11px">금</span>'
      : '<span class="badge badge-gray" style="font-size:11px">평일</span>';
    const attend = d.attending;
    const absent = isFriday ? '<span style="color:#9ca3af">-</span>' : d.absent;
    return `<tr onclick="showDetail('${d.date}')">
      <td>${formatDate(d.date)}</td>
      <td>${dayType}</td>
      <td style="color:#22c55e;font-weight:700">${attend}</td>
      <td style="color:#ef4444">${absent}</td>
      <td>${d.menu_count > 0 ? `<span class="badge badge-amber" style="font-size:11px">🍜 ${d.menu_count}건</span>` : '-'}</td>
    </tr>`;
  }).join('');
  document.getElementById('history-content').innerHTML = `
    <table class="history-table">
      <thead><tr>
        <th>날짜</th><th>구분</th><th>참석</th><th>불참</th><th>메뉴추천</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── 팀원 통계 ──────────────────────────────────────
async function loadMemberStats() {
  const data = await fetch('/api/members').then(r => r.json());
  const rows = data.map(m => {
    const total = m.total || 0;
    const pct = total > 0 ? Math.round((m.attended / total) * 100) : 0;
    return `<div class="stat-row">
      <span class="name">${m.name}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <span class="pct">${total > 0 ? pct + '%' : '-'}</span>
    </div>`;
  }).join('');
  document.getElementById('member-stats').innerHTML = rows ||
    '<div class="empty-state">데이터가 없습니다.</div>';
}

// ── 상세 모달 ──────────────────────────────────────
async function showDetail(date) {
  const data = await fetch(`/api/history/${date}`).then(r => r.json());
  const { lunchDay, responses } = data;
  const isFriday = lunchDay.day_type === 'friday';

  const rows = responses.map(r => {
    const badge = isFriday
      ? (r.menu_suggestion ? `<span class="badge badge-amber">추천: ${esc(r.menu_suggestion)}</span>` : '<span class="badge badge-gray">미추천</span>')
      : statusBadge(r.status, lunchDay.day_type);
    return `<tr><td><strong>${r.member_name}</strong></td><td>${badge}</td></tr>`;
  }).join('');

  document.getElementById('modal-title').textContent = formatDate(date);
  document.getElementById('modal-body').innerHTML = `
    <table class="member-table">
      <thead><tr><th>이름</th><th>${isFriday ? '메뉴' : '참석 여부'}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

// ── 유틸 ──────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── 초기 로드 및 자동 갱신 ──────────────────────────
async function loadAll() {
  await Promise.all([loadToday(), loadHistory(), loadMemberStats()]);
}

document.addEventListener('DOMContentLoaded', () => {
  loadAll();
  setInterval(loadToday, 60 * 1000); // 오늘 현황 1분마다 갱신

  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) closeModal();
  });
});
