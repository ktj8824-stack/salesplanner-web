/* =========================================
   세일즈플래너 — 업종 템플릿 엔진 (축 ① 어떤 영업이든)
   업종마다 앱을 따로 만들지 않고, '템플릿' 설정 하나만 바꿔 끼웁니다.
   템플릿 = 진행 단계 + 고객 카드 항목 + 다시 연락 규칙 + 부르는 말
   영업 방식(type) 3가지 — 업종이 달라도 일하는 방식이 같으면 메뉴 · 홈 카드가 같음
     personal : 개인 고객 영업 (보험 · 자동차 · 금융 · 렌탈 · 교육 · 인테리어 · 방문판매 · 부동산)
     b2b      : 기업 수주 영업 (IT·솔루션 · 장비 · 광고 · 자재 — 긴 영업 기간 · 담당자 여럿 · 수주 가능성)
     route    : 거래처 순회 영업 (식자재·유통 · 제약 · 주류 — 정해진 거래처 · 방문 주기 · 주문 · 납품 · 미수금)
   (화면·네트워크와 상관없는 순수 계산 모듈 → tests/templates-test.cjs)
   ========================================= */
(function (root) {
  const FIELD_TYPES = ['text', 'number', 'date', 'select'];
  const RULE_ON = ['stage', 'field', 'birthday', 'idle', 'cycle'];
  /** 방문 주기 보기 → 날 수 (거래처 순회형) */
  const CYCLE = { '매주': 7, '2주': 14, '3주': 21, '한 달': 30, '두 달': 60 };

  /** 영업 방식 3가지 — 메뉴 · 홈 카드 · 부르는 말의 바탕 */
  const TYPES = {
    personal: { id: 'personal', name: '개인 고객 영업', short: '개인 고객', desc: '개인에게 상담하고 계약 · 판매해요', noun: '고객', icon: 'user',
      examples: '보험 · 자동차 · 금융 · 렌탈 · 교육 · 인테리어', modules: ['renewal', 'referral'] },
    b2b: { id: 'b2b', name: '기업 수주 영업', short: '기업 영업', desc: '회사에 제안하고 큰 건을 수주해요', noun: '고객사', icon: 'building',
      examples: 'IT·솔루션 · 장비 · 광고 · 건설자재 · 인력', modules: ['deal'] },
    route: { id: 'route', name: '거래처 순회 영업', short: '거래처 순회', desc: '정해진 거래처를 돌며 주문 · 납품을 챙겨요', noun: '거래처', icon: 'truck',
      examples: '식자재·유통 · 제약·의료기기 · 주류·음료 · 사무용품', modules: ['cycle', 'order'] },
  };
  // 거래처 순회형 · 기업 수주형 공통 칸
  const ROUTE_FIELDS = [
    { key: 'cycle', label: '방문 주기', type: 'select', options: Object.keys(CYCLE) },
    { key: 'items', label: '주요 품목', type: 'text' },
    { key: 'nextDelivery', label: '다음 납품일', type: 'date' },
    { key: 'unpaid', label: '미수금(만 원)', type: 'number' },
  ];
  const DEAL_FIELDS = [
    { key: 'amount', label: '예상 금액(만 원)', type: 'number' },
    { key: 'chance', label: '수주 가능성', type: 'select', options: ['10%', '30%', '50%', '70%', '90%'] },
    { key: 'closeBy', label: '결정 예정일', type: 'date' },
    { key: 'contacts', label: '담당자 · 결정권자', type: 'text' },
  ];
  const LIMITS = { minStages: 2, maxStages: 10, maxFields: 10, maxRules: 20 };

  // 업종 템플릿. rep: 대표 업종(첫 화면에 크게) · hidden: 목록에 안 보이는 '직접 만들기' 바탕
  const BASE = {
    // ── 개인 고객 영업 ──
    insurance: {
      id: 'insurance', type: 'personal', rep: true, name: '보험',
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
      id: 'auto', type: 'personal', name: '자동차',
      win: '계약',
      stages: ['문의', '시승', '견적', '계약', '출고'],
      fields: [
        { key: 'model', label: '관심 차종', type: 'text' },
        { key: 'current', label: '보유 차량', type: 'text' },
        { key: 'payment', label: '결제 조건', type: 'select', options: ['현금', '할부', '리스', '렌트'] },
        { key: 'referrer', label: '소개해 준 분', type: 'text' },
        { key: 'delivery', label: '출고 예정일', type: 'date' },
      ],
      rules: [
        { id: 'quote', on: 'stage', stage: '견적', days: 3, task: '견적 후 결정 확인' },
        { id: 'after', on: 'stage', stage: '출고', days: 30, task: '출고 1개월 안부' },
        { id: 'delivery', on: 'field', field: 'delivery', days: -1, task: '출고 전날 안내' },
        { id: 'bday', on: 'birthday', days: 0, task: '생일 축하 연락' },
        { id: 'idle', on: 'idle', days: 30, task: '한 달째 연락 없음' },
      ],
      words: { customer: '고객님', visit: '상담', honor: '님' },
    },
    finance: {
      id: 'finance', type: 'personal', name: '금융·대출',
      win: '실행',
      stages: ['문의', '상담', '서류', '심사', '실행'],
      fields: [
        { key: 'product', label: '상품', type: 'select', options: ['신용', '담보', '전세', '사업자', '카드', '기타'] },
        { key: 'amountWant', label: '희망 금액(만 원)', type: 'number' },
        { key: 'docs', label: '받을 서류', type: 'text' },
        { key: 'referrer', label: '소개해 준 분', type: 'text' },
        { key: 'maturity', label: '만기일', type: 'date' },
      ],
      rules: [
        { id: 'docs', on: 'stage', stage: '서류', days: 3, task: '서류 준비 확인' },
        { id: 'maturity', on: 'field', field: 'maturity', days: -45, task: '만기 전 연장 · 갈아타기 안내' },
        { id: 'after', on: 'stage', stage: '실행', days: 30, task: '실행 1개월 안부' },
        { id: 'idle', on: 'idle', days: 60, task: '두 달째 연락 없음' },
      ],
      words: { customer: '고객님', visit: '상담', honor: '님' },
    },
    rental: {
      id: 'rental', type: 'personal', name: '렌탈·통신·가전',
      win: '설치',
      stages: ['문의', '상담', '계약', '설치', '관리'],
      fields: [
        { key: 'product', label: '상품', type: 'text' },
        { key: 'monthly', label: '월 요금(원)', type: 'number' },
        { key: 'referrer', label: '소개해 준 분', type: 'text' },
        { key: 'contractEnd', label: '약정 만료일', type: 'date' },
      ],
      rules: [
        { id: 'install', on: 'stage', stage: '설치', days: 7, task: '설치 1주 후 사용 확인' },
        { id: 'end', on: 'field', field: 'contractEnd', days: -60, task: '약정 만료 전 재계약 안내' },
        { id: 'idle', on: 'idle', days: 90, task: '석 달째 연락 없음' },
      ],
      words: { customer: '고객님', visit: '방문', honor: '님' },
    },
    edu: {
      id: 'edu', type: 'personal', name: '교육·학원',
      win: '등록',
      stages: ['문의', '상담', '체험 수업', '등록', '재원'],
      fields: [
        { key: 'student', label: '학생 · 학년', type: 'text' },
        { key: 'subject', label: '과목', type: 'text' },
        { key: 'referrer', label: '소개해 준 분', type: 'text' },
        { key: 'renew', label: '재등록일', type: 'date' },
      ],
      rules: [
        { id: 'trial', on: 'stage', stage: '체험 수업', days: 2, task: '체험 수업 후 마음 확인' },
        { id: 'renew', on: 'field', field: 'renew', days: -7, task: '재등록 안내' },
      ],
      words: { customer: '학부모님', visit: '상담', honor: '님' },
    },
    interior: {
      id: 'interior', type: 'personal', name: '인테리어·리모델링',
      win: '계약',
      stages: ['문의', '실측', '견적', '계약', '시공', 'A/S'],
      fields: [
        { key: 'site', label: '현장 주소 · 평수', type: 'text' },
        { key: 'budget', label: '예산(만 원)', type: 'number' },
        { key: 'start', label: '시공 시작일', type: 'date' },
      ],
      rules: [
        { id: 'quote', on: 'stage', stage: '견적', days: 5, task: '견적 후 결정 확인' },
        { id: 'start', on: 'field', field: 'start', days: -3, task: '시공 3일 전 안내' },
        { id: 'as', on: 'stage', stage: 'A/S', days: 180, task: '6개월 하자 점검 연락' },
      ],
      words: { customer: '고객님', visit: '방문', honor: '님' },
    },
    realty: {
      id: 'realty', type: 'personal', name: '부동산',
      win: '계약',
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
    door: {
      id: 'door', type: 'personal', name: '방문판매·화장품',
      win: '구매',
      stages: ['소개', '체험', '구매', '재구매'],
      fields: [
        { key: 'skin', label: '관심 · 피부 타입', type: 'text' },
        { key: 'bought', label: '산 제품', type: 'text' },
        { key: 'referrer', label: '소개해 준 분', type: 'text' },
        { key: 'refill', label: '다 쓸 때쯤', type: 'date' },
      ],
      rules: [
        { id: 'trial', on: 'stage', stage: '체험', days: 3, task: '샘플 써 보신 느낌 확인' },
        { id: 'refill', on: 'field', field: 'refill', days: -5, task: '재구매 안내' },
        { id: 'bday', on: 'birthday', days: 0, task: '생일 축하 연락' },
        { id: 'idle', on: 'idle', days: 45, task: '한 달 반 연락 없음' },
      ],
      words: { customer: '고객님', visit: '방문', honor: '님' },
    },
    // ── 기업 수주 영업 ──
    b2b: {
      id: 'b2b', type: 'b2b', rep: true, name: 'IT·솔루션',
      win: '수주',
      stages: ['발굴', '미팅', '제안', '협상', '수주'],
      fields: DEAL_FIELDS.concat([
        { key: 'size', label: '회사 규모', type: 'text' },
        { key: 'renewal', label: '계약 갱신일', type: 'date' },
      ]),
      rules: [
        { id: 'proposal', on: 'stage', stage: '제안', days: 7, task: '제안서 검토 확인' },
        { id: 'close', on: 'field', field: 'closeBy', days: -3, task: '결정 3일 전 마지막 확인' },
        { id: 'renewal', on: 'field', field: 'renewal', days: -60, task: '계약 갱신 협의' },
        { id: 'idle', on: 'idle', days: 21, task: '3주째 연락 없음' },
      ],
      words: { customer: '담당자님', visit: '미팅', honor: '님' },
    },
    equipment: {
      id: 'equipment', type: 'b2b', name: '장비·기계·자재',
      win: '수주',
      stages: ['발굴', '방문', '견적', '협상', '수주', '납품'],
      fields: DEAL_FIELDS.concat([{ key: 'spec', label: '필요 사양', type: 'text' }, { key: 'delivery', label: '납품 예정일', type: 'date' }]),
      rules: [
        { id: 'quote', on: 'stage', stage: '견적', days: 7, task: '견적 검토 확인' },
        { id: 'close', on: 'field', field: 'closeBy', days: -3, task: '결정 3일 전 마지막 확인' },
        { id: 'delivery', on: 'field', field: 'delivery', days: -2, task: '납품 이틀 전 확인' },
        { id: 'idle', on: 'idle', days: 30, task: '한 달째 연락 없음' },
      ],
      words: { customer: '담당자님', visit: '방문', honor: '님' },
    },
    // ── 거래처 순회 영업 ──
    food: {
      id: 'food', type: 'route', rep: true, name: '식자재·유통 납품',
      win: '정기 거래',
      stages: ['신규 발굴', '샘플·견적', '첫 주문', '정기 거래'],
      fields: ROUTE_FIELDS.concat([{ key: 'owner', label: '사장님 · 담당자', type: 'text' }]),
      rules: [
        { id: 'cycle', on: 'cycle', field: 'cycle', days: 0, task: '방문 주기 — 들를 때예요' },
        { id: 'delivery', on: 'field', field: 'nextDelivery', days: -1, task: '납품 전날 확인' },
        { id: 'sample', on: 'stage', stage: '샘플·견적', days: 5, task: '샘플 · 견적 반응 확인' },
      ],
      words: { customer: '사장님', visit: '방문', honor: '사장님' },
    },
    pharma: {
      id: 'pharma', type: 'route', name: '제약·의료기기',
      win: '처방·도입',
      stages: ['방문', '디테일링', '샘플', '처방·도입'],
      fields: ROUTE_FIELDS.concat([
        { key: 'dept', label: '진료과', type: 'text' },
        { key: 'bestTime', label: '선호 방문 시간', type: 'text' },
      ]),
      rules: [
        { id: 'cycle', on: 'cycle', field: 'cycle', days: 0, task: '방문 주기 — 들를 때예요' },
        { id: 'sample', on: 'stage', stage: '샘플', days: 14, task: '샘플 반응 확인' },
        { id: 'delivery', on: 'field', field: 'nextDelivery', days: -1, task: '납품 전날 확인' },
      ],
      words: { customer: '원장님', visit: '방문', honor: '원장님' },
    },
    liquor: {
      id: 'liquor', type: 'route', name: '주류·음료',
      win: '정기 거래',
      stages: ['신규 발굴', '시음·제안', '입점', '정기 거래'],
      fields: ROUTE_FIELDS.concat([{ key: 'owner', label: '사장님 · 담당자', type: 'text' }]),
      rules: [
        { id: 'cycle', on: 'cycle', field: 'cycle', days: 0, task: '방문 주기 — 들를 때예요' },
        { id: 'delivery', on: 'field', field: 'nextDelivery', days: -1, task: '납품 전날 확인' },
        { id: 'trial', on: 'stage', stage: '시음·제안', days: 7, task: '시음 반응 확인' },
      ],
      words: { customer: '사장님', visit: '방문', honor: '사장님' },
    },
    // ── 직접 만들기 바탕 (업종 이름은 사용자가 적은 대로) ──
    'gen-personal': {
      id: 'gen-personal', type: 'personal', hidden: true, name: '개인 고객 영업',
      win: '계약', stages: ['문의', '상담', '제안', '계약', '관리'],
      fields: [{ key: 'interest', label: '관심 상품', type: 'text' }, { key: 'referrer', label: '소개해 준 분', type: 'text' }, { key: 'renew', label: '만기 · 재구매 시기', type: 'date' }],
      rules: [
        { id: 'proposal', on: 'stage', stage: '제안', days: 5, task: '제안 후 결정 확인' },
        { id: 'renew', on: 'field', field: 'renew', days: -30, task: '만기 · 재구매 안내' },
        { id: 'bday', on: 'birthday', days: 0, task: '생일 축하 연락' },
        { id: 'idle', on: 'idle', days: 45, task: '한 달 반 연락 없음' },
      ],
      words: { customer: '고객님', visit: '상담', honor: '님' },
    },
    'gen-b2b': {
      id: 'gen-b2b', type: 'b2b', hidden: true, name: '기업 수주 영업',
      win: '수주', stages: ['발굴', '미팅', '제안', '협상', '수주'],
      fields: DEAL_FIELDS.slice(),
      rules: [
        { id: 'proposal', on: 'stage', stage: '제안', days: 7, task: '제안 검토 확인' },
        { id: 'close', on: 'field', field: 'closeBy', days: -3, task: '결정 3일 전 마지막 확인' },
        { id: 'idle', on: 'idle', days: 21, task: '3주째 연락 없음' },
      ],
      words: { customer: '담당자님', visit: '미팅', honor: '님' },
    },
    'gen-route': {
      id: 'gen-route', type: 'route', hidden: true, name: '거래처 순회 영업',
      win: '정기 거래', stages: ['신규 발굴', '제안', '첫 거래', '정기 거래'],
      fields: ROUTE_FIELDS.concat([{ key: 'owner', label: '담당자', type: 'text' }]),
      rules: [
        { id: 'cycle', on: 'cycle', field: 'cycle', days: 0, task: '방문 주기 — 들를 때예요' },
        { id: 'delivery', on: 'field', field: 'nextDelivery', days: -1, task: '납품 전날 확인' },
      ],
      words: { customer: '담당자님', visit: '방문', honor: '님' },
    },
  };

  // ---- 날짜 (기기 시간대와 상관없이 'YYYY-MM-DD' 문자열로만 계산) ----
  const toDay = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
  const fromDay = n => new Date(n * 864e5).toISOString().slice(0, 10);
  const addDays = (s, n) => fromDay(toDay(s) + n);
  const isYmd = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && fromDay(toDay(s)) === String(s);   // 2월 30일 같은 날짜는 거절
  const clone = o => JSON.parse(JSON.stringify(o));

  const Templates = {
    FIELD_TYPES, RULE_ON, LIMITS, TYPES, CYCLE,

    /** 업종 목록 (첫 화면용 · '직접 만들기' 바탕은 뺌). type 을 주면 그 방식만 */
    list(type) { return Object.values(BASE).filter(t => !t.hidden && (!type || t.type === type)).map(t => ({ id: t.id, name: t.name, type: t.type, rep: !!t.rep, stages: t.stages.slice() })); },

    /** 기본 템플릿 하나 (복사본 — 고쳐도 원본은 그대로). label: 직접 적은 업종 이름 */
    get(id, label) {
      const t = BASE[id]; if (!t) throw new Error('없는 업종 템플릿: ' + id);
      const c = clone(t); if (label && String(label).trim()) c.name = String(label).trim().slice(0, 20);
      return c;
    },
    has(id) { return !!BASE[id]; },

    /** 영업 방식 정보 (업종 id 또는 템플릿) */
    type(t) { const id = typeof t === 'string' ? (BASE[t] || {}).type : t && t.type; return TYPES[id] || TYPES.personal; },

    /** '직접 만들기' 질문 두 개 → 영업 방식 · 바탕 템플릿
     *  who: 'person'(개인) | 'company'(사업자) · how: 'once'(한 번 크게) | 'repeat'(계속 거래) */
    pickType(who, how) {
      const type = who === 'person' ? 'personal' : how === 'repeat' ? 'route' : 'b2b';
      return { type, base: 'gen-' + type };
    },

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
        if (r.on === 'cycle' && !fields.some(x => x.key === r.field && x.type === 'select')) errors.push(`방문 주기 항목이 없어요: ${r.field}`);
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
        if (r.on === 'cycle' && isYmd(customer.lastActivityAt)) {   // 마지막 방문 + 주기 (주기를 안 정한 거래처는 계산 안 함)
          const n = CYCLE[(customer.fields || {})[r.field]];
          if (n) push(addDays(customer.lastActivityAt, n + r.days), r);
        }
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
