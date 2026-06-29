const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/today
router.get('/today', (req, res) => {
  const today = getTodaySeoul();
  const lunchDay = db.prepare('SELECT * FROM lunch_days WHERE date=?').get(today);
  if (!lunchDay) {
    return res.json({ date: today, lunchDay: null, responses: [], members: [] });
  }
  const responses = db.prepare(`
    SELECT m.name AS member_name, r.status, r.menu_suggestion, r.responded_at
    FROM members m
    LEFT JOIN responses r ON r.member_id=m.id AND r.lunch_day_id=?
    ORDER BY m.id
  `).all(lunchDay.id);
  res.json({ date: today, lunchDay, responses });
});

// GET /api/history - 최근 7일 기록 (금요일은 전원 참석으로 집계)
router.get('/history', (req, res) => {
  const memberCount = db.prepare('SELECT COUNT(*) AS c FROM members').get().c;
  const rows = db.prepare(`
    SELECT ld.date, ld.day_type, ld.locked,
      COUNT(CASE WHEN r.status='참석' THEN 1 END) AS attending,
      COUNT(CASE WHEN r.status='불참' THEN 1 END) AS absent,
      COUNT(CASE WHEN r.status IS NULL THEN 1 END) AS no_response,
      COUNT(CASE WHEN r.menu_suggestion IS NOT NULL THEN 1 END) AS menu_count
    FROM lunch_days ld
    LEFT JOIN responses r ON r.lunch_day_id=ld.id
    WHERE ld.date >= date('now','+9 hours','-7 days')
    GROUP BY ld.id
    ORDER BY ld.date DESC
  `).all();
  // 금요일은 '다 같이 먹는 날' → 전원 참석으로 집계
  res.json(rows.map(r => r.day_type === 'friday'
    ? { ...r, attending: memberCount, absent: 0 }
    : r));
});

// GET /api/history/:date
router.get('/history/:date', (req, res) => {
  const { date } = req.params;
  const lunchDay = db.prepare('SELECT * FROM lunch_days WHERE date=?').get(date);
  if (!lunchDay) return res.status(404).json({ error: '데이터 없음' });
  const responses = db.prepare(`
    SELECT m.name AS member_name, r.status, r.menu_suggestion, r.responded_at
    FROM members m
    LEFT JOIN responses r ON r.member_id=m.id AND r.lunch_day_id=?
    ORDER BY m.id
  `).all(lunchDay.id);
  res.json({ lunchDay, responses });
});

// GET /api/members - 팀원별 30일 참석률 (금요일은 전원 참석으로 포함)
router.get('/members', (req, res) => {
  const since = `date('now','+9 hours','-30 days')`;
  const totalDays = db.prepare(`SELECT COUNT(*) AS c FROM lunch_days WHERE date >= ${since}`).get().c;
  const fridays = db.prepare(`SELECT COUNT(*) AS c FROM lunch_days WHERE date >= ${since} AND day_type='friday'`).get().c;
  const rows = db.prepare(`
    SELECT m.name,
      COUNT(CASE WHEN ld.day_type='weekday' AND r.status='참석' THEN 1 END) AS weekday_attended
    FROM members m
    LEFT JOIN responses r ON r.member_id=m.id
    LEFT JOIN lunch_days ld ON ld.id=r.lunch_day_id AND ld.date >= ${since}
    GROUP BY m.id
    ORDER BY m.id
  `).all();
  // 참석 = 평일 참석 + 금요일(전원 참석) / 분모 = 전체 점심 세션(평일+금요일)
  res.json(rows.map(r => ({ name: r.name, attended: r.weekday_attended + fridays, total: totalDays })));
});

function getTodaySeoul() {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
}

module.exports = router;
