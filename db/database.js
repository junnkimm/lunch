const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './lunch.db';
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// email 컬럼 마이그레이션 (기존 DB 대응)
const cols = db.prepare("PRAGMA table_info(members)").all().map(c => c.name);
if (!cols.includes('email')) {
  db.exec("ALTER TABLE members ADD COLUMN email TEXT NOT NULL DEFAULT ''");
}

const MEMBERS = [
  { name: '임이랑', email: 'ly2r999@megastudyedu.com' },
  { name: '김소연', email: 'sy22@megastudyedu.com' },
  { name: '김혜준', email: 'hyejunkim@megastudyedu.com' },
  { name: '최서진', email: 'sj.choi@megastudyedu.com' },
  { name: '최지석', email: 'cjs@megastudyedu.com' },
];

const upsertMember = db.prepare(`
  INSERT INTO members (name, email) VALUES (?, ?)
  ON CONFLICT(name) DO UPDATE SET email=excluded.email
`);
const seedMembers = db.transaction(() => {
  for (const m of MEMBERS) {
    upsertMember.run(m.name, m.email);
  }
});
seedMembers();

module.exports = db;
