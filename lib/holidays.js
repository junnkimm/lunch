// 한국 공휴일 목록 (2025-2026)
// 매년 12월에 다음 해 날짜 추가 필요
const HOLIDAYS = new Set([
  // 2025
  '2025-01-01', // 신정
  '2025-01-28', // 설날 연휴
  '2025-01-29', // 설날
  '2025-01-30', // 설날 연휴
  '2025-03-01', // 삼일절
  '2025-05-05', // 어린이날
  '2025-05-06', // 어린이날 대체공휴일
  '2025-05-15', // 부처님오신날
  '2025-06-06', // 현충일
  '2025-08-15', // 광복절
  '2025-10-03', // 개천절
  '2025-10-05', // 추석 연휴
  '2025-10-06', // 추석
  '2025-10-07', // 추석 연휴
  '2025-10-08', // 추석 대체공휴일
  '2025-10-09', // 한글날
  '2025-12-25', // 크리스마스

  // 2026
  '2026-01-01', // 신정
  '2026-02-16', // 설날 연휴
  '2026-02-17', // 설날
  '2026-02-18', // 설날 연휴
  '2026-03-01', // 삼일절
  '2026-03-02', // 삼일절 대체공휴일
  '2026-05-05', // 어린이날
  '2026-05-24', // 부처님오신날
  '2026-06-06', // 현충일
  '2026-08-15', // 광복절
  '2026-08-17', // 광복절 대체공휴일
  '2026-09-24', // 추석 연휴
  '2026-09-25', // 추석
  '2026-09-26', // 추석 연휴
  '2026-10-03', // 개천절
  '2026-10-05', // 개천절 대체공휴일
  '2026-10-09', // 한글날
  '2026-12-25', // 크리스마스
]);

function isHoliday(dateStr) {
  return HOLIDAYS.has(dateStr);
}

// 'YYYY-MM-DD' 형식으로 오늘 날짜 반환 (Asia/Seoul 기준)
function getTodaySeoul() {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

function isFridaySeoul() {
  const day = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    weekday: 'long',
  }).format(new Date());
  return day === '금요일';
}

// 한국어 날짜 표시용 (예: 2026년 06월 22일 (월))
function formatDateKo(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(`${y}-${m}-${d}T00:00:00+09:00`);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const wd = weekdays[date.getDay()];
  return `${y}년 ${m}월 ${d}일 (${wd})`;
}

module.exports = { isHoliday, getTodaySeoul, isFridaySeoul, formatDateKo };
