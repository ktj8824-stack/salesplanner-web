/* =========================================
   세일즈플래너 — 업종 템플릿 엔진 (축 ① 어떤 영업이든)
   업종마다 앱을 따로 만들지 않고, '템플릿' 설정 하나만 바꿔 끼웁니다.
   템플릿 = 진행 단계 + 고객 카드 항목 + 다시 연락 규칙 + 부르는 말
   (화면·네트워크와 상관없는 순수 계산 모듈 → tests/templates-test.cjs)
   ========================================= */
(function (root) {
  const FIELD_TYPES = ['text', 'number', 'date', 'select'];
  const RULE_ON = ['stage', 'field', 'birthday', 'idle'];
  const LIMITS = { minStages: 2, maxStages: 10, maxFields: 10, maxRules: 20 };

  // 기본 템플릿 5개 — 첫 테스트 업종은 보험
  const BASE = {
    insurance: {
      id: 'insurance', name: '보험',
      win: '청약',                                  // 성과로 세는 단계 (본사 실적)
      stages: ['소개', '상담', '설계', '청약', '유지'],
      fields: [
        { key: 'family', label: '가족 구성', type: 'text' },
        { key: 'products', label: '가입 상품', type: 'select', options: ['종신', '정기', '실손', '암', '연금', '운전자', '기타'] },
        { key: 'coverage', label: '보장 내용', type: 'text' },
        { key: 'referrer', label: '소개해 준 분', type: 'text' },
        { key: 'expiry', label: '만기·갱신일', type: 'date' },
      ],
      rules: [
        { id: 'expiry', on: 'field', field: 'expiry', days: -30, task: '만기·갱신 안내 연락' },
        { id: 'signed', on: 'stage', stage: '청약', days: 30, task: '가입 후 1개월 안부' },
        { id: 'design', on: 'stage', stage: '설계', days: 7, task: '설계안 답변 확인' },
        { id: 'bday', on: 'birthday', days: 0, task: '생일 축하 연락' },
        { id: 'idle', on: 'idle', days: 60, task: '두 달째 연락 없음 · 안부' },
      ],
      words: { customer: '고객님', visit: '상담', honor: '님' },
    },
    auto: {
      id: 'auto', name: '자동차',
      win: '계약',                                  // 성과로 세는 단계 (본사 실적)
      stages: ['문의', '시승', '견적', '계약', '출고'],
      fields: [
        { key: 'model', label: '관심 차종', type: 'text' },
        { key: 'current', label: '보유 차량', type: 'text' },
        { key: 'payment', label: '결제 조건', type: 'select', options: ['현금', '할부', '리스', '렌트'] },
        { key: 'household', label: '가족 수', type: 'number' },
        { key: 'delivery', label: '출고 예정일', type: 'date' },
      ],
      rules: [
        { id: 'quote', on: 'stage', stage: '견적', days: 3, task: '견적 후 결정 확인' },
        { id: 'after', on: 'stage', stage: '출고', days: 30, task: '출고 1개월 안부' },
        { id: 'delivery', on: 'field', field: 'delivery', days: -1, task: '출고 전날 안내' },
        { id: 'idle', on: 'idle', days: 30, task: '한 달째 연락 없음' },
      ],
      words: { customer: '고객님', visit: '상담', honor: '님' },
    },
    pharma: {
      id: 'pharma', name: '제약·의료',
      win: '처방·도입',                                  // 성과로 세는 단계 (본사 실적)
      stages: ['방문', '디테일링', '샘플', '처방·도입'],
      fields: [
        { key: 'dept', label: '진료과', type: 'text' },
        { key: 'rx', label: '주 처방', type: 'text' },
        { key: 'bestTime', label: '선호 방문 시간', type: 'text' },
        { key: 'staff', label: '담당 실장', type: 'text' },
      ],
      rules: [
        { id: 'sample', on: 'stage', stage: '샘플', days: 14, task: '샘플 반응 확인' },
        { id: 'regular', on: 'idle', days: 14, task: '정기 방문 주기' },
      ],
      words: { customer: '원장님', visit: '방문', honor: '원장님' },
    },
    realty: {
      id: 'realty', name: '부동산',
      win: '계약',                                  // 성과로 세는 단계 (본사 실적)
      stages: ['문의', '매물 안내', '현장 방문', '계약'],
      fields: [
        { key: 'area', label: '희망 지역', type: 'text' },
        { key: 'budget', label: '예산(만 원)', type: 'number' },
        { key: 'moveIn', label: '입주 시기', type: 'date' },
        { key: 'must', label: '필수 조건', type: 'text' },
        { key: 'leaseEnd', label: '현 거주 만기일', type: 'date' },
      ],
      rules: [
        { id: 'lease', on: 'field', field: 'leaseEnd', days: -60, task: '만기 두 달 전 연락' },
        { id: 'moveIn', on: 'field', field: 'moveIn', days: -14, task: '입주 2주 전 확인' },
        { id: 'tour', on: 'stage', stage: '현장 방문', days: 2, task: '현장 방문 후 마음 확인' },
      ],
      words: { customer: '고객님', visit: '안내', honor: '님' },
    },
    b2b: {
      id: 'b2b', name: 'B2B·유통',
      win: '수주',                                  // 성과로 세는 단계 (본사 실적)
      stages: ['발굴', '미팅', '제안', '협상', '수주'],
      fields: [
        { key: 'size', label: '회사 규모', type: 'text' },
        { key: 'contact', label: '담당자', type: 'text' },
        { key: 'items', label: '거래 품목', type: 'text' },
        { key: 'approval', label: '결재 라인', type: 'text' },
        { key: 'renewal', label: '계약 갱신일', type: 'date' },
      ],
      rules: [
        { id: 'proposal', on: 'stage', stage: '제안', days: 7, task: '제안서 검토 확인' },
        { id: 'reorder', on: 'stage', stage: '수주', days: 30, task: '재주문 확인' },
        { id: 'renewal', on: 'field', field: 'renewal', days: -30, task: '계약 갱신 협의' },
      ],
      words: { customer: '담당자님', visit: '미팅', honor: '님' },
    },
  };

  // ---- 날짜 (기기 시간대와 상관없이 'YYYY-MM-DD' 문자열로만 계산) ----
  const toDay = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
  const fromDay = n => new Date(n * 864e5).toISOString().slice(0, 10);
  const addDays = (s, n) => fromDay(toDay(s) + n);
  const isYmd = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && fromDay(toDay(s)) === String(s);   // 2월 30일 같은 날짜는 거절
  const clone = o => JSON.parse(JSON.stringify(o));

  const Templates = {
    FIELD_TYPES, RULE_ON, LIMITS,

    /** 기본 템플릿 목록 (시작 화면용) */
    list() { return Object.values(BASE).map(t => ({ id: t.id, name: t.name, stages: t.stages.slice() })); },

    /** 기본 템플릿 하나 (복사본 — 고쳐도 원본은 그대로) */
    get(id) { const t = BASE[id]; if (!t) throw new Error('없는 업종 템플릿: ' + id); return clone(t); },

    /** 템플릿 검사 — 회사 템플릿·내 템플릿을 저장하기 전에 꼭 거침 */
    validate(t) {
      const errors = [];
      if (!t || typeof t !== 'object') return { ok: false, errors: ['템플릿이 비었어요'] };
      if (!String(t.name || '').trim()) errors.push('업종 이름이 없어요');
      const st = Array.isArray(t.stages) ? t.stages.map(s => String(s).trim()) : [];
      if (st.length < LIMITS.minStages || st.length > LIMITS.maxStages) errors.push(`진행 단계는 ${LIMITS.minStages}~${LIMITS.maxStages}개여야 해요`);
      if (st.some(s => !s)) errors.push('이름 없는 단계가 있어요');
      if (new Set(st).size !== st.length) errors.push('같은 이름의 단계가 있어요');
      const fields = Array.isArray(t.fields) ? t.fields : [];
      if (fields.length > LIMITS.maxFields) errors.push(`고객 항목은 ${LIMITS.maxFields}개까지예요`);
      const keys = new Set();
      for (const f of fields) {
        if (!f || !String(f.key || '').trim() || !String(f.label || '').trim()) { errors.push('이름 없는 항목이 있어요'); continue; }
        if (keys.has(f.key)) errors.push(`항목 키가 겹쳐요: ${f.key}`);
        keys.add(f.key);
        if (!FIELD_TYPES.includes(f.type)) errors.push(`항목 종류가 이상해요: ${f.label}`);
        if (f.type === 'select' && !(Array.isArray(f.options) && f.options.length)) errors.push(`선택형 항목에 보기가 없어요: ${f.label}`);
      }
      const rules = Array.isArray(t.rules) ? t.rules : [];
      if (t.win && !st.includes(t.win)) errors.push(`성과 단계가 없어요: ${t.win}`);
      if (rules.length > LIMITS.maxRules) errors.push(`규칙은 ${LIMITS.maxRules}개까지예요`);
      for (const r of rules) {
        if (!r || !RULE_ON.includes(r.on)) { errors.push('규칙 종류가 이상해요'); continue; }
        if (!Number.isInteger(r.days)) errors.push(`규칙 날짜 수가 이상해요: ${r.task || r.id}`);
        if (!String(r.task || '').trim()) errors.push('할 일이 없는 규칙이 있어요');
        if (r.on === 'stage' && !st.includes(r.stage)) errors.push(`규칙의 단계가 없어요: ${r.stage}`);
        if (r.on === 'field') {
          const f = fields.find(x => x.key === r.field);
          if (!f) errors.push(`규칙의 항목이 없어요: ${r.field}`);
          else if (f.type !== 'date') errors.push(`날짜 항목에만 규칙을 걸 수 있어요: ${f.label}`);
        }
        if (r.on === 'idle' && r.days <= 0) errors.push('연락 없음 규칙은 1일 이상이어야 해요');
      }
      return { ok: errors.length === 0, errors };
    },

    /** 내 템플릿 · 회사 템플릿: 기본 템플릿을 고쳐서 새로 만들기 (검사 통과해야 돌려줌) */
    custom(baseId, changes) {
      const t = Object.assign(Templates.get(baseId), clone(changes || {}), { base: baseId });
      t.id = (changes && changes.id) || `custom-${baseId}`;
      const v = Templates.validate(t);
      if (!v.ok) { const e = new Error(v.errors.join(' · ')); e.errors = v.errors; throw e; }
      return t;
    },

    /** 단계 순서 (없으면 -1) */
    stageIndex(t, stage) { return t.stages.indexOf(stage); },

    /** 다음 단계 이름 (마지막이면 null) */
    nextStage(t, stage) { const i = t.stages.indexOf(stage); return i >= 0 && i < t.stages.length - 1 ? t.stages[i + 1] : null; },

    /** 단계 옮기기 → 바뀐 고객 + 남길 활동 기록. by: 'user' | 'auto' (자동 기록인지 꼭 남김) */
    moveStage(t, customer, toStage, date, by) {
      if (!t.stages.includes(toStage)) throw new Error('없는 단계: ' + toStage);
      if (!isYmd(date)) throw new Error('날짜 형식이 이상해요: ' + date);
      const from = customer.stage || null;
      const next = Object.assign({}, customer, { stage: toStage, stageAt: date, lastActivityAt: date });
      const activity = { kind: 'stage', date, from, to: toStage, by: by === 'auto' ? 'auto' : 'user', customerId: customer.id };
      return { customer: next, activity };
    },

    /** 고객 항목 값 검사 */
    fieldOk(field, value) {
      if (value === undefined || value === null || value === '') return true;   // 비워 두는 건 괜찮음
      if (field.type === 'number') return typeof value === 'number' ? isFinite(value) : /^-?\d+(\.\d+)?$/.test(String(value));
      if (field.type === 'date') return isYmd(value);
      if (field.type === 'select') return (field.options || []).includes(value);
      return typeof value === 'string';
    },

    /**
     * 다시 연락할 일 계산 (축 ② 8번 — 입력 없이 알림 자동 생성)
     * customer: { id, name, stage, stageAt, fields:{}, birthday:'MM-DD'|'YYYY-MM-DD', lastActivityAt, nextContact:{date,task} }
     * 돌려줌: [{ date, task, ruleId, customerId, overdue }] 날짜순. 30일 넘게 지난 건 뺌
     */
    followups(t, customer, today) {
      if (!isYmd(today)) throw new Error('오늘 날짜 형식이 이상해요');
      const out = [];
      const push = (date, r) => { if (isYmd(date)) out.push({ date, task: r.task, ruleId: r.id || r.on, customerId: customer.id }); };
      for (const r of t.rules || []) {
        if (r.on === 'stage' && customer.stage === r.stage && isYmd(customer.stageAt)) push(addDays(customer.stageAt, r.days), r);
        if (r.on === 'field') { const v = (customer.fields || {})[r.field]; if (isYmd(v)) push(addDays(v, r.days), r); }
        if (r.on === 'idle' && isYmd(customer.lastActivityAt)) push(addDays(customer.lastActivityAt, r.days), r);
        if (r.on === 'birthday' && customer.birthday) {
          const md = String(customer.birthday).slice(-5);
          if (/^\d{2}-\d{2}$/.test(md)) {
            const y = Number(today.slice(0, 4));
            const fix = yy => (md === '02-29' && !isYmd(`${yy}-02-29`) ? `${yy}-02-28` : `${yy}-${md}`);   // 윤년이 아닌 해는 2월 28일
            let d = fix(y);
            if (d < today) d = fix(y + 1);                                    // 올해 생일이 지났으면 내년
            push(addDays(d, r.days), r);
          }
        }
      }
      // 사람이 정한(또는 통화 · 말 한마디에서 나온) 다음 연락
      const nc = customer.nextContact;
      if (nc && isYmd(nc.date)) out.push({ date: nc.date, task: nc.task || '다시 연락', ruleId: 'next', customerId: customer.id });
      return out
        .map(x => Object.assign(x, { overdue: x.date < today }))
        .filter(x => toDay(today) - toDay(x.date) <= 30)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    },

    /** 성과로 세는 단계 (없으면 마지막 단계) */
    winStage(t) { return t.win && t.stages.includes(t.win) ? t.win : t.stages[t.stages.length - 1]; },

    /** 부르는 말 — 화면·AI 브리핑 문장에 씀 */
    word(t, key) { return (t.words && t.words[key]) || ({ customer: '고객님', visit: '방문', honor: '님' })[key] || ''; },

    _date: { addDays, isYmd },
  };

  root.Templates = Templates;
  if (typeof module !== 'undefined') module.exports = Templates;
})(typeof window !== 'undefined' ? window : globalThis);
