/* =========================================
   세일즈플래너 — 말 한마디 정리 (축 ② 입력 제로)
   "샘플 반응 좋대. 다음 주 화요일에 처방 얘기 다시 하재. 실장님이 자료 메일로 보내 달래"
   → 반응(좋음/고민/거절) · 다음 연락 날짜 · 할 일 목록
   지금은 규칙으로 정리 (기기 안에서, 무료 · 즉시). 서버 AI 정리는 나중에 이 결과를 다듬는 데 씀.
   ========================================= */
(function (root) {
  const WD = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
  const NUM = { 한: 1, 하루: 1, 두: 2, 이틀: 2, 세: 3, 사흘: 3, 네: 4, 나흘: 4, 다섯: 5, 여섯: 6, 일곱: 7, 열: 10 };

  const toDay = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
  const fromDay = n => new Date(n * 864e5).toISOString().slice(0, 10);
  const add = (s, n) => fromDay(toDay(s) + n);
  const dow = s => new Date(toDay(s) * 864e5).getUTCDay();
  const num = w => (/^\d+$/.test(w) ? Number(w) : NUM[w] || null);

  const POS = /(좋대|좋았|좋다고|좋아하|괜찮대|괜찮다고|긍정|하재|하자고|진행하|계약하|사인|결정했|해 보재|해보재|오케이|하기로)/;
  const NEG = /(거절|안 한대|안한대|안 하겠|싫대|관심 없|관심없|필요 없|필요없|다른 데|다른데로|취소)/;
  const HOLD = /(고민|생각해 보|생각해보|보류|미루|나중에|애매)/;
  const TODO = /(보내|챙겨|준비|자료|메일|문자|견적|확인해|알아봐|드리기로|가져가)/;

  /** 날짜 찾기 → { date, text } 또는 null. today: 'YYYY-MM-DD' */
  function findDate(text, today) {
    const t = text.replace(/\s+/g, ' ');
    let m;
    if ((m = t.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/)) || (m = t.match(/(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\s|$)/))) {
      const y = Number(today.slice(0, 4)), mm = String(m[1]).padStart(2, '0'), dd = String(m[2]).padStart(2, '0');
      let d = `${y}-${mm}-${dd}`;
      if (fromDay(toDay(d)) !== d) return null;
      if (d < today) d = `${y + 1}-${mm}-${dd}`;
      return { date: d, text: m[0].trim() };
    }
    if ((m = t.match(/(다음\s*주|담주|다음주|이번\s*주|이번주)\s*([일월화수목금토])요일?/))) {
      const next = /다음|담주/.test(m[1]);
      const monday = add(today, -((dow(today) + 6) % 7));          // 이번 주 월요일
      const d = add(monday, (next ? 7 : 0) + ((WD[m[2]] + 6) % 7));
      return { date: d < today ? add(d, 7) : d, text: m[0] };
    }
    if ((m = t.match(/([일월화수목금토])요일/))) {
      let n = (WD[m[1]] - dow(today) + 7) % 7; if (n === 0) n = 7;  // 오늘과 같은 요일이면 다음 주
      return { date: add(today, n), text: m[0] };
    }
    if ((m = t.match(/(\d+|한|두|세|네|다섯|여섯|일곱|열)\s*(일|주|달|개월)\s*(뒤|후|있다가)/))) {
      const n = num(m[1]); if (!n) return null;
      const days = m[2] === '일' ? n : m[2] === '주' ? n * 7 : n * 30;
      return { date: add(today, days), text: m[0] };
    }
    if ((m = t.match(/(하루|이틀|사흘|나흘)\s*(뒤|후)/))) return { date: add(today, NUM[m[1]]), text: m[0] };
    if ((m = t.match(/다음\s*달|담달|다음달/))) return { date: add(today, 30), text: m[0] };
    if ((m = t.match(/다음\s*주|담주|다음주/))) return { date: add(today, 7), text: m[0] };
    if ((m = t.match(/글피/))) return { date: add(today, 3), text: m[0] };
    if ((m = t.match(/모레/))) return { date: add(today, 2), text: m[0] };
    if ((m = t.match(/내일/))) return { date: add(today, 1), text: m[0] };
    return null;
  }

  /** 문장 나누기 (마침표 · 줄바꿈 · '그리고' · '아 그리고') */
  const sentences = text => String(text || '').split(/[.!?。\n]+|\s(?:아\s)?그리고\s/).map(s => s.trim()).filter(Boolean);

  const NoteParse = {
    findDate,
    /**
     * @returns {{ mood: 'good'|'hold'|'no'|null, nextStage: boolean, date: string|null, dateText: string|null, dateSentence: string|null, todos: string[], text: string }}
     */
    parse(text, today) {
      const clean = String(text || '').trim();
      const ss = sentences(clean);
      const mood = NEG.test(clean) ? 'no' : POS.test(clean) ? 'good' : HOLD.test(clean) ? 'hold' : null;
      const d = findDate(clean, today);
      const ds = d ? ss.find(x => x.includes(d.text)) || null : null;          // 날짜가 들어 있는 문장 = 다음 연락 내용
      const todos = ss.filter(x => TODO.test(x) && x !== ds).map(x => x.replace(/\s+/g, ' ').slice(0, 60));
      return { mood, nextStage: mood === 'good', date: d ? d.date : null, dateText: d ? d.text : null,
        dateSentence: ds ? ds.replace(/\s+/g, ' ').slice(0, 60) : null, todos, text: clean };
    },
  };

  root.NoteParse = NoteParse;
  if (typeof module !== 'undefined') module.exports = NoteParse;
})(typeof window !== 'undefined' ? window : globalThis);
