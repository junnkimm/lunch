// 뭉살흩죽 가로 와이드 배너 (디자인 자산 ①) — 이메일 상단 공용
// eyebrow: 작은 윗줄 문구, dateLabel: 날짜, opts.color: 배너 그라데이션(기본 브랜드 블루)
function bannerHtml(eyebrow, dateLabel, opts = {}) {
  const grad = opts.grad || 'linear-gradient(120deg,#4A7BF7 0%,#2B5BD7 100%)';
  const emoji = opts.emoji || '🍱';
  return `
    <div style="background:${grad};padding:28px 30px;color:#fff;">
      <div style="font-size:13px;color:rgba(255,255,255,.82);font-weight:600;letter-spacing:.03em;margin-bottom:7px;">${eyebrow}</div>
      <div style="font-family:'Black Han Sans','Pretendard','Apple SD Gothic Neo',sans-serif;font-size:42px;line-height:1;font-weight:800;">뭉<span style="color:#9DEBB6;">살</span>흩<span style="color:#FFB0B2;">죽</span> <span style="font-size:28px;">${emoji}</span></div>
      <div style="font-size:13px;color:rgba(255,255,255,.86);margin-top:10px;">${dateLabel} · 뭉치면 살고 흩어지면 죽는다</div>
    </div>`;
}

module.exports = { bannerHtml };
