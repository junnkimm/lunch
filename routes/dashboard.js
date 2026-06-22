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

// GET /api/history
router.get('/history', (req, res) => {
  const rows = db.prepare(`
    SELECT ld.date, ld.day_type, ld.locked,
      COUNT(CASE WHEN r.status='참석' THEN 1 END) AS attending,
      COUNT(CASE WHEN r.status='불참' THEN 1 END) AS absent,
      COUNT(CASE WHEN r.status IS NULL THEN 1 END) AS no_response,
      COUNT(CASE WHEN r.menu_suggestion IS NOT NULL THEN 1 END) AS menu_count
    FROM lunch_days ld
    LEFT JOIN responses r ON r.lunch_day_id=ld.id
    GROUP BY ld.id
    ORDER BY ld.date DESC
    LIMIT 60
  `).all();
  res.json(rows);
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

// GET /api/members - 팀원별 30일 참석률
router.get('/members', (req, res) => {
  const rows = db.prepare(`
    SELECT m.name,
      COUNT(CASE WHEN r.status='참석' THEN 1 END) AS attended,
      COUNT(CASE WHEN ld.day_type='weekday' THEN 1 END) AS total_weekdays
    FROM members m
    LEFT JOIN responses r ON r.member_id=m.id
    LEFT JOIN lunch_days ld ON ld.id=r.lunch_day_id AND ld.date >= date('now','-30 days')
    GROUP BY m.id
    ORDER BY m.id
  `).all();
  res.json(rows);
});

function getTodaySeoul() {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
}

module.exports = router;
