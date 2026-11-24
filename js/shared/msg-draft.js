/* =========================================================================
   세일즈플래너 '고객에게 보내기' — 메시지 초안 (폰 안에서 · 서버 없이)
   - 고객 기록(단계 · 다시 연락 이유 · 마지막 메모 · 날짜 칸)으로 사람마다 다른 글을 만듦
   - 서버 AI(sp-message-draft)가 켜져 있으면 그쪽 글을 쓰고, 꺼져 있거나 실패하면 이 글을 씀
   - 광고(ad) 글은 법으로 정한 표시를 자동으로 붙임: 맨 앞 (광고) · 보내는 사람 · 연락처 · 수신거부 방법
   - 숫자(금액 · 보장 · 할인율)는 지어내지 않음. 영업사원이 직접 넣음
   ========================================================================= */
(function (root) {
  'use strict';
  const AD_START = 8, AD_END = 21;   // 광고는 오전 8시 ~ 오후 9시 전에만 (그 밖은 야간 동의가 따로 필요)

  /** 부르는 이름: '남궁진 님' · '성수 한식당 사장님' · '이재훈 과장님' · '청운건설 담당자님' */
  function callName(name, honor) {
    name = String(name || '').trim(); honor = String(honor || '님');
    const p = name.match(/\(([^)]+)\)/);
    if (p) {   // '청운건설 (이재훈 과장)' → '이재훈 과장님'
      const who = p[1].trim();
      return /(님)$/.test(who) ? who : who + '님';
    }
    if (/(원장|사장|대표|과장|부장|팀장|실장|차장|이사|상무|전무)$/.test(name)) return name + '님';
    if (/학부모$/.test(name)) return name + '님';
    if (honor === '님') return name + ' 님';
    if (honor === '담당자님') return name + ' 담당자님';
    return name + ' ' + honor;
  }
  const md = ymd => { const [, m, d] = String(ymd).split('-').map(Number); return `${m}월 ${d}일`; };
  const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  /** 연락하는 이유 한 문장 */
  function reasonLine(r, ctx) {
    const visit = ctx.visit || '상담';
    if (!r) return `지난번 ${visit} 이후 궁금하신 점은 없으신지 여쭤보려고 연락드려요.`;
    switch (r.kind) {
      case 'birthday': return r.date && ctx.today && r.date > ctx.today
        ? `${md(r.date)} 생일이 다가와서 미리 축하드려요! 기분 좋은 하루 보내시길 바랄게요.`
        : '생일 진심으로 축하드려요! 오늘 하루 기분 좋은 일만 가득하시길 바랄게요.';
      case 'field': return r.label && r.date ? `${r.label.replace(/\(.*\)|일$/g, '').trim()}이 ${md(r.date)}로 다가와서 미리 챙겨 드리려고 연락드려요.` : '챙겨 드릴 일정이 다가와서 연락드려요.';
      case 'idle': return '한동안 연락을 못 드렸네요. 그동안 잘 지내셨지요?';
      case 'cycle': return '이번 주 들를 날을 잡으려고 연락드려요. 편하신 요일이나 시간 있으면 알려 주세요.';
      case 'next': return r.task ? `지난번 이야기 나눈 '${clip(r.task, 24)}' 건으로 연락드려요.` : '지난번 말씀 나눈 건으로 연락드려요.';
      case 'stage': return r.task ? `${clip(r.task.replace(/\s*확인$/, ''), 24)} 관련해서 어떻게 생각하셨는지 여쭤보려고 연락드려요.` : `지난번 ${visit} 이후 생각해 보셨는지 여쭤보려고 연락드려요.`;
      default: return r.task ? `${clip(r.task, 30)} — 그 일로 연락드려요.` : `지난번 ${visit} 이후 안부 여쭤요.`;
    }
  }

  /**
   * @param o { today(YYYY-MM-DD), name, honor, visit, reason:{kind, task, label, date}, lastNote, purpose:'care'|'ad', request, rep:{name, phone} }
   * @returns 글 (광고면 표시 포함)
   */
  function draft(o) {
    const lines = [];
    lines.push(`${callName(o.name, o.honor)}, 안녕하세요. ${o.rep && o.rep.name ? o.rep.name + '입니다.' : ''}`.trim());
    lines.push(reasonLine(o.reason, o));
    if (o.lastNote && o.purpose !== 'ad' && (!o.reason || o.reason.kind !== 'birthday')) lines.push(`지난번에 말씀하신 '${clip(o.lastNote, 28)}' 부분도 계속 신경 쓰고 있어요.`);
    if (o.request) lines.push(clip(o.request, 120));
    lines.push(o.reason && o.reason.kind === 'birthday' ? '늘 감사드려요.' : '편하실 때 답장 주시면 맞춰서 연락드릴게요.');
    const body = lines.join('\n');
    return o.purpose === 'ad' ? adWrap(body, o.rep) : body;
  }

  /** 광고 표시 붙이기 (이미 붙어 있으면 그대로) */
  function adWrap(text, rep) {
    text = String(text || '').trim();
    if (!/^\(광고\)/.test(text)) text = '(광고) ' + text;
    const sender = [rep && rep.name, rep && rep.org].filter(Boolean).join(' · ') || '보내는 사람';
    if (!/수신거부/.test(text)) text += `\n\n보낸 사람: ${sender}${rep && rep.phone ? ' ' + rep.phone : ''}\n수신거부: 이 번호로 '거부'라고 답장 주세요 (무료)`;
    return text;
  }

  /** 광고를 지금 보내도 되는 시간인가 (오전 8시 ~ 오후 9시 전) */
  function adTimeOk(d) { const h = (d || new Date()).getHours(); return h >= AD_START && h < AD_END; }

  /** 문자 앱 열기 주소 (아이폰은 &body, 나머지는 ?body) */
  function smsHref(phone, text, ios) {
    const n = String(phone || '').replace(/[^0-9+]/g, '');
    return `sms:${n}${ios ? '&' : '?'}body=${encodeURIComponent(text)}`;
  }

  const api = { draft, adWrap, adTimeOk, smsHref, callName, reasonLine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MsgDraft = api;
})(typeof window !== 'undefined' ? window : globalThis);
