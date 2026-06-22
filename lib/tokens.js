const crypto = require('crypto');
const db = require('../db/database');

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

function createTokensForDay(lunchDayId) {
  const members = db.prepare('SELECT id, name FROM members ORDER BY id').all();
  const insert = db.prepare(
    'INSERT OR IGNORE INTO tokens (lunch_day_id, member_id, token) VALUES (?, ?, ?)'
  );
  const createAll = db.transaction(() => {
    for (const member of members) {
      insert.run(lunchDayId, member.id, generateToken());
    }
  });
  createAll();
  return getTokensForDay(lunchDayId);
}

function getTokensForDay(lunchDayId) {
  return db.prepare(`
    SELECT t.token, m.id AS member_id, m.name AS member_name
    FROM tokens t
    JOIN members m ON m.id = t.member_id
    WHERE t.lunch_day_id = ?
    ORDER BY m.id
  `).all(lunchDayId);
}

function lookupToken(token) {
  return db.prepare(`
    SELECT t.token, t.lunch_day_id, t.member_id, m.name AS member_name,
           ld.date, ld.day_type, ld.locked
    FROM tokens t
    JOIN members m ON m.id = t.member_id
    JOIN lunch_days ld ON ld.id = t.lunch_day_id
    WHERE t.token = ?
  `).get(token);
}

module.exports = { createTokensForDay, getTokensForDay, lookupToken };
