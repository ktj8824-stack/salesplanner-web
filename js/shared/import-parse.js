/* =========================================================================
   세일즈플래너 고객 가져오기 — 표 글자 해석 (서버 없이, 폰 안에서)
   - 엑셀에서 칸을 복사해 붙여넣은 글자(탭 구분) 또는 CSV 파일(쉼표 구분)
   - 첫 줄이 제목이면 제목으로 칸을 맞추고(이름 · 전화 · 회사 · 주소 …),
     제목이 없으면 내용으로 짐작 (010… = 전화, 짧은 한글 = 이름)
   - 결과는 '미리보기'용. 실제 등록은 사람이 확인한 뒤에만
   ========================================================================= */
(function (root) {
  'use strict';
  const MAX = 500;
  const HEAD = {
    name: /^(이름|성명|고객명|고객 ?이름|담당자|name|full ?name)$/i,
    phone: /^(전화|전화번호|휴대폰|휴대전화|핸드폰|연락처|hp|mobile|phone|tel)/i,
    org: /^(회사|회사명|거래처|상호|병원|약국|업체|소속|기관|company|org)/i,
    title: /^(직함|직책|직위|부서|title|position)/i,
    address: /^(주소|소재지|address)/i,
    email: /^(이메일|메일|e-?mail)/i,
    memo: /^(메모|비고|특이사항|note|memo)/i,
    stage: /^(단계|진행|진행 ?단계|상태|stage|status)$/i,
    birthday: /^(생일|생년월일|birthday|birth)/i,
  };

  /** 한 줄씩 나누기 (따옴표 안 쉼표 · 줄바꿈 처리) */
  function table(text) {
    text = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    const first = text.split('\n', 1)[0];
    const sep = (first.match(/\t/g) || []).length >= (first.match(/,/g) || []).length && first.includes('\t') ? '\t' : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"' && cell === '') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.map(r => r.map(c => c.trim())).filter(r => r.some(Boolean));
  }

  const digits = v => String(v || '').replace(/\D/g, '');
  function phone(v) {
    let d = digits(v); if (d.startsWith('82') && d.length >= 11) d = '0' + d.slice(2);
    if (/^01\d{8,9}$/.test(d)) return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    if (/^1\d{9}$/.test(d)) return phone('0' + d);   // 엑셀이 앞의 0을 지운 경우 (10-1234-5678)
    if (/^02\d{7,8}$/.test(d)) return d.length === 9 ? `02-${d.slice(2, 5)}-${d.slice(5)}` : `02-${d.slice(2, 6)}-${d.slice(6)}`;
    if (/^0[3-9]\d{8,9}$/.test(d)) return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    return '';
  }
  function birthday(v) {
    const m = String(v || '').match(/(\d{2,4})\D*(\d{1,2})\D*(\d{1,2})/); if (!m) return null;
    let y = +m[1]; if (y < 100) y += y > 30 ? 1900 : 2000;
    const mo = +m[2], d = +m[3]; if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  /** 칸 맞추기: 제목 줄이 있으면 제목으로, 없으면 내용으로 짐작 */
  function columns(rows) {
    const head = rows[0] || [], map = {};
    head.forEach((h, i) => { for (const [k, re] of Object.entries(HEAD)) if (!(k in map) && re.test(h.replace(/\s+/g, ' '))) { map[k] = i; break; } });
    if ('name' in map || 'phone' in map) return { map, hasHead: true };
    const sample = rows.slice(0, 20), n = Math.max(...rows.map(r => r.length));
    const score = (i, test) => sample.filter(r => test(r[i] || '')).length;
    let best;
    best = [...Array(n).keys()].sort((a, b) => score(b, v => !!phone(v)) - score(a, v => !!phone(v)))[0];
    if (score(best, v => !!phone(v)) >= sample.length / 2) map.phone = best;
    const isName = v => /^[가-힣]{2,4}$/.test(v.replace(/\s/g, ''));
    best = [...Array(n).keys()].filter(i => i !== map.phone).sort((a, b) => score(b, isName) - score(a, isName))[0];
    if (best !== undefined && score(best, isName) >= sample.length / 2) map.name = best;
    best = [...Array(n).keys()].filter(i => !Object.values(map).includes(i)).sort((a, b) => score(b, v => /(시|구|군|동|로|길)\s?\d/.test(v)) - score(a, v => /(시|구|군|동|로|길)\s?\d/.test(v)))[0];
    if (best !== undefined && score(best, v => /(시|구|군|동|로|길)\s?\d/.test(v)) >= sample.length / 2) map.address = best;
    return { map, hasHead: false };
  }

  /**
   * @param text   붙여넣은 글자 또는 CSV 파일 내용
   * @param opts   { stages: 업종 단계 목록, existingPhones: 이미 있는 번호(숫자만) Set }
   * @returns { items: [{ name, phone, org, title, address, email, memo, stage, birthday, dup, problem }], map, hasHead, total, cut }
   */
  function parse(text, opts) {
    opts = opts || {};
    const rows = table(text);
    if (!rows.length) return { items: [], map: {}, hasHead: false, total: 0, cut: false };
    const { map, hasHead } = columns(rows);
    const body = rows.slice(hasHead ? 1 : 0), seen = new Set(), stages = opts.stages || [];
    const ex = opts.existingPhones || new Set();
    const items = body.slice(0, MAX).map(r => {
      const g = k => (k in map ? String(r[map[k]] || '').trim() : '');
      const it = {
        name: g('name').replace(/\s*(님|고객님)$/, '').slice(0, 40), phone: phone(g('phone')), org: g('org').slice(0, 60), title: g('title').slice(0, 60),
        address: g('address').slice(0, 120), email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g('email')) ? g('email').slice(0, 80) : '',
        memo: g('memo').slice(0, 200), stage: stages.find(s => s === g('stage')) || stages.find(s => g('stage') && s.includes(g('stage'))) || null,
        birthday: birthday(g('birthday')),
      };
      const d = digits(it.phone);
      it.dup = !!d && (ex.has(d) || seen.has(d)); if (d) seen.add(d);
      it.problem = !it.name ? '이름 없음' : g('phone') && !it.phone ? '전화번호 모양이 이상해요' : '';
      return it;
    });
    return { items, map, hasHead, total: body.length, cut: body.length > MAX };
  }

  const api = { parse, table, phone, birthday, MAX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ImportParse = api;
})(typeof window !== 'undefined' ? window : globalThis);
