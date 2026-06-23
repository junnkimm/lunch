const cron = require('node-cron');
const db = require('../db/database');
const { isHoliday, getTodaySeoul, isFridaySeoul } = require('./holidays');
const { createTokensForDay } = require('./tokens');
const { sendToMember, sendToAllMembers } = require('./mailer');
const { buildWeekdayEmail } = require('../templates/email-weekday');
const { buildFridayEmail } = require('../templates/email-friday');
const { buildResultsEmail } = require('../templates/email-results');

async function runMorningJob({ force = false } = {}) {
  const today = getTodaySeoul();
  console.log(`[scheduler] 초대 잡 실행: ${today}`);

  if (isHoliday(today)) {
    console.log(`[scheduler] ${today}는 공휴일 - 건너뜀`);
    return;
  }

  const existing = db.prepare('SELECT id FROM lunch_days WHERE date=?').get(today);
  if (existing) {
    if (!force) {
      console.log(`[scheduler] ${today} 이미 처리됨 - 건너뜀`);
      return;
    }
    console.log(`[scheduler] ${today} 강제 초기화`);
    db.prepare('DELETE FROM responses WHERE lunch_day_id=?').run(existing.id);
    db.prepare('DELETE FROM tokens WHERE lunch_day_id=?').run(existing.id);
    db.prepare('DELETE FROM email_log WHERE lunch_day_id=?').run(existing.id);
    db.prepare('DELETE FROM lunch_days WHERE id=?').run(existing.id);
  }

  const dayType = isFridaySeoul() ? 'friday' : 'weekday';
  const lunchDay = db.prepare(
    'INSERT INTO lunch_days (date, day_type) VALUES (?, ?) RETURNING *'
  ).get(today, dayType);

  const tokens = createTokensForDay(lunchDay.id);
  console.log(`[scheduler] 토큰 생성 완료 (${tokens.length}명)`);

  // 팀원별 개인 이메일 발송
  let sentCount = 0;
  for (const t of tokens) {
    const member = db.prepare('SELECT email FROM members WHERE id=?').get(t.member_id);
    if (!member?.email) continue;

    let subject, html;
    if (dayType === 'friday') {
      subject = '[점심] 금요일 점심 - 메뉴 추천해주세요!';
      html = buildFridayEmail(today, t.member_name, t.token);
    } else {
      subject = '[점심] 오늘 점심 참석 여부를 알려주세요 (마감: 오후 2:39)';
      html = buildWeekdayEmail(today, t.member_name, t.token);
    }

    try {
      await sendToMember(member.email, subject, html);
      sentCount++;
    } catch (err) {
      console.error(`[scheduler] ${t.member_name} 발송 실패:`, err.message);
      db.prepare(
        'INSERT INTO email_log (lunch_day_id, type, success, error_msg) VALUES (?, ?, 0, ?)'
      ).run(lunchDay.id, 'morning_request', `${t.member_name}: ${err.message}`);
    }
  }

  db.prepare("UPDATE lunch_days SET email_sent_at=datetime('now','localtime') WHERE id=?").run(lunchDay.id);
  db.prepare(
    'INSERT INTO email_log (lunch_day_id, type, success) VALUES (?, ?, 1)'
  ).run(lunchDay.id, 'morning_request');
  console.log(`[scheduler] 아침 이메일 발송 완료: ${sentCount}/${tokens.length}명`);
}

async function runResultsJob() {
  const today = getTodaySeoul();
  console.log(`[scheduler] 결과 잡 실행: ${today}`);

  const lunchDay = db.prepare('SELECT * FROM lunch_days WHERE date=?').get(today);
  if (!lunchDay) {
    console.log(`[scheduler] ${today} 세션 없음 - 건너뜀`);
    return;
  }
  if (lunchDay.results_sent_at) {
    console.log(`[scheduler] ${today} 결과 이미 발송됨 - 건너뜀`);
    return;
  }

  // 월~목: 미응답자 자동 불참 처리
  if (lunchDay.day_type === 'weekday') {
    const members = db.prepare('SELECT id FROM members').all();
    const autoAbsent = db.prepare(`
      INSERT OR IGNORE INTO responses (lunch_day_id, member_id, status, responded_at)
      VALUES (?, ?, '불참', datetime('now','localtime'))
    `);
    db.transaction(() => { for (const m of members) autoAbsent.run(lunchDay.id, m.id); })();
  }

  db.prepare("UPDATE lunch_days SET locked=1, results_sent_at=datetime('now','localtime') WHERE id=?").run(lunchDay.id);

  const responses = db.prepare(`
    SELECT m.name AS member_name, m.email, r.status, r.menu_suggestion
    FROM members m
    LEFT JOIN responses r ON r.member_id=m.id AND r.lunch_day_id=?
    ORDER BY m.id
  `).all(lunchDay.id);

  const subject = lunchDay.day_type === 'friday'
    ? '[점심] 금요일 점심 메뉴 추천 모음'
    : `[점심] 오늘 점심 결과 - ${responses.filter(r => r.status === '참석').length}명 참석`;

  const html = buildResultsEmail(today, lunchDay.day_type, responses);
  const allEmails = responses.map(r => r.email).filter(Boolean);

  try {
    await sendToAllMembers(allEmails, subject, html);
    db.prepare(
      'INSERT INTO email_log (lunch_day_id, type, success) VALUES (?, ?, 1)'
    ).run(lunchDay.id, 'results_summary');
    console.log(`[scheduler] 결과 이메일 발송 완료: ${allEmails.length}명`);
  } catch (err) {
    db.prepare(
      'INSERT INTO email_log (lunch_day_id, type, success, error_msg) VALUES (?, ?, 0, ?)'
    ).run(lunchDay.id, 'results_summary', err.message);
    console.error('[scheduler] 결과 이메일 발송 실패:', err.message);
  }
}

function startScheduler() {
  // 테스트 설정: 14:30 초대(강제 초기화), 14:40 결과 (응답 마감 14:39)
  cron.schedule('30 14 * * 1-5', () => runMorningJob({ force: true }), { timezone: 'Asia/Seoul' });
  cron.schedule('40 14 * * 1-5', runResultsJob, { timezone: 'Asia/Seoul' });
  console.log('[scheduler] 스케줄러 시작됨 (테스트: 14:30 초대[강제], 14:40 결과)');
}

module.exports = { startScheduler, runMorningJob, runResultsJob };
