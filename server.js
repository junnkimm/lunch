require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db/database');
const { startScheduler, runMorningJob, runResultsJob } = require('./lib/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me';

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// 응답 라우트
app.use('/respond', require('./routes/response'));

// 대시보드 API
app.use('/api', require('./routes/dashboard'));

// 관리자용 수동 트리거 (테스트용)
function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  if (key !== ADMIN_KEY) return res.status(403).json({ error: '인증 실패' });
  next();
}

app.post('/admin/trigger-morning', adminAuth, (req, res) => {
  const force = req.query.force === 'true';
  res.json({ ok: true, message: `이메일 발송 시작됨 (백그라운드)${force ? ' [강제]' : ''}` });
  runMorningJob({ force }).catch(err => console.error('[admin] morning 잡 오류:', err.message));
});

app.post('/admin/trigger-results', adminAuth, (req, res) => {
  res.json({ ok: true, message: '결과 이메일 발송 시작됨 (백그라운드)' });
  runResultsJob().catch(err => console.error('[admin] results 잡 오류:', err.message));
});

// 대시보드 SPA fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] 서버 시작: http://localhost:${PORT}`);
  startScheduler();
});
