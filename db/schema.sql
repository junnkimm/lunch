CREATE TABLE IF NOT EXISTS members (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS lunch_days (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  date            TEXT NOT NULL UNIQUE,
  day_type        TEXT NOT NULL CHECK(day_type IN ('weekday', 'friday')),
  email_sent_at   TEXT,
  results_sent_at TEXT,
  locked          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tokens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  lunch_day_id INTEGER NOT NULL REFERENCES lunch_days(id),
  member_id    INTEGER NOT NULL REFERENCES members(id),
  token        TEXT NOT NULL UNIQUE,
  UNIQUE(lunch_day_id, member_id)
);

CREATE TABLE IF NOT EXISTS responses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  lunch_day_id    INTEGER NOT NULL REFERENCES lunch_days(id),
  member_id       INTEGER NOT NULL REFERENCES members(id),
  status          TEXT CHECK(status IN ('참석', '불참')),
  menu_suggestion TEXT,
  responded_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE(lunch_day_id, member_id)
);

CREATE TABLE IF NOT EXISTS email_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  lunch_day_id INTEGER REFERENCES lunch_days(id),
  type         TEXT NOT NULL,
  sent_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  success      INTEGER NOT NULL DEFAULT 1,
  error_msg    TEXT
);
