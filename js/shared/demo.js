/* =========================================
   세일즈플래너 — 데모 데이터 (처음 열었을 때 채워 넣는 샘플)
   날짜는 항상 '오늘' 기준으로 만듭니다.
   ========================================= */
const Demo = {
  /** 데모 공지사항 */
  notices() {
    // 데모를 처음 만들 때 한 번만 정해 저장 (매일 '새 글'로 바뀌지 않게) · 한국 시간 오전 9시
    const day = n => U.at(U.addDays(U.today(), -n), '09:00').toISOString();
    return [
      { id: 'n1', pinned: true, at: day(3), title: '세일즈플래너에 오신 걸 환영해요',
        body: '비서님이 일정을 넣으면 대표님 앱에 바로 보여요.\n출발 · 기사 호출 시간은 앱이 거꾸로 계산해 알려 드려요.\n일정이 겹치면 홈 화면에 빨간 줄로 표시돼요.' },
      { id: 'n2', at: day(1), title: 'AI 비서 사용법',
        body: '아래 메뉴 가운데 마이크를 누르고 말씀하세요.\n예: "점심 30분 미뤄 줘", "길 막혀서 15분 늦어"\n바꾸기 전에 꼭 한 번 확인을 받아요.' },
      { id: 'n3', at: day(0), title: '2027년 2월 28일까지 무료',
        body: '출시 기념으로 2027년 2월 28일까지 AI 비서를 포함한 모든 기능을 무료로 쓸 수 있어요.\n무료 기간이 끝나기 전에 요금과 결제 방법을 미리 알려 드려요. 그때까지 결제 정보는 받지 않아요.' },
    ];
  },
  /** 데모 회사 구독: 무료 체험 10일 남음 */
  company() {
    return { plan: 'trial', trialUntil: new Date(Date.now() + 10 * 86400000).toISOString(), paidUntil: null, extraExecs: 0 };
  },
  /** 데모 회사 계정 (계정 관리 화면용) */
  members(p = {}) {
    return [
      { loginId: 'kim', name: p.name || '박지훈', role: 'ceo', phone: p.ceoPhone || '' },
      { loginId: 'lee', name: p.secretaryName || '이비서', role: 'secretary', phone: p.secretaryPhone || '' },
      { loginId: 'park', name: p.driverName || '박기사', role: 'driver', phone: p.driverPhone || '' },
    ];
  },
  /** 지난 3주 기록 — 실제 출발·도착 시각과 식사 평가가 있는 일정 */
  history(t, S) {
    const at = (d, hm) => U.at(d, hm).toISOString();
    const trip = (n, depart, min, extra = {}) => { const d = U.addDays(t, -n);
      return S({ title: '한빛전자 실무 미팅', category: 'external', date: d, start: '10:00', end: '11:00', location: '한빛전자 삼성동 사옥', origin: '본사', mode: 'driver', travelMin: 35, ackAt: at(d, '08:00'),
        actual: { departAt: at(d, depart), arriveAt: U.addMin(U.at(d, depart), min).toISOString() }, ...extra }); };
    const meal = (n, title, place, rating, b = {}) => { const d = U.addDays(t, -n);
      return S({ title, category: 'dinner', date: d, start: '12:00', end: '13:30', location: place, mode: 'driver', travelMin: 25, ackAt: at(d, '08:00'), actual: { rating }, briefing: b }); };
    return [
      trip(15, '09:05', 40), trip(9, '09:03', 45), trip(4, '09:08', 41),
      // 같은 길도 퇴근 시간대(17시대)엔 60분 안팎 — 시간대별 학습 시연
      trip(14, '17:10', 62, { title: '한빛전자 저녁 협의', start: '18:20', end: '19:30' }), trip(8, '17:05', 58, { title: '한빛전자 저녁 협의', start: '18:10', end: '19:00' }), trip(3, '17:15', 64, { title: '한빛전자 저녁 협의', start: '18:30', end: '19:30' }),
      meal(13, '그린벤처스 점심', '광화문 한정식 소담', 'good', { who: '최서연 상무', company: '그린벤처스' }),
      meal(11, '대한건설 오찬', '청담 스시 오마카세', 'bad', { who: '윤태식 회장', company: '대한건설' }),
      meal(7, '한빛전자 점심', '광화문 한정식 소담', 'good', { who: '정민호 부사장', company: '한빛전자' }),
      meal(5, '협력사 점심', '여의도 중식당 루이', 'ok', { who: '박지훈 대표', company: '루이테크' }),
      meal(2, '팀 점심', '삼청동 이탈리안 산마리노', 'good', { who: '팀원 4명', company: '' }),
    ];
  },

  /** 고른 업종의 데모 하루: 그 업종 예시 고객을 실제로 찾아가는 일정 (이름 · 장소는 모두 가상)
   *  route(순회형)는 짧게 여러 곳, 나머지는 길게 세 곳 */
  dayFor(t, customers, type) {
    const td = U.today(), d1 = U.addDays(td, 1), now = new Date().toISOString();
    const S = o => ({ id: U.uid(), visibility: 'normal', bufferMin: 10, status: 'scheduled', ackAt: now, briefing: {}, createdBy: 'secretary', demoDay: true, category: 'external', mode: 'car', travelMin: 15, ...o });
    const PLACES = ['왕십리역 카페', '성수동 사무실', '뚝섬역 근처', '건대입구 사무실', '성수 지점 3층'];
    const visit = (Templates.word(t, 'visit') || '방문');
    const win = Templates.winStage(t);
    const pick = customers.filter(c => c.stage !== win).concat(customers.filter(c => c.stage === win));
    const slots = type === 'route' ? [['09:40', '10:20'], ['11:00', '11:40'], ['13:30', '14:10'], ['15:00', '15:40'], ['16:30', '17:10']] : [['10:30', '11:30'], ['14:00', '15:00'], ['17:30', '18:20']];
    const out = [S({ title: type === 'route' ? '아침 출고 · 물량 확인' : '아침 팀 회의', category: 'meeting', date: td, start: '08:30', end: '09:10', location: '성수 지점 3층', mode: 'none' })];
    slots.forEach(([a, b], i) => {
      const c = pick[i]; if (!c) return;
      const order = type === 'route', f = c.fields || {};
      out.push(S({ title: `${c.name} ${order ? '정기 방문' : visit}`, date: td, start: a, end: b, location: c.address || PLACES[i % PLACES.length], mode: i === 2 && !order ? 'walk' : 'car',
        briefing: { who: c.name, customerId: c.id, purpose: order ? `주문 받기${f.items ? ' · ' + f.items : ''}` : `${c.stage} 단계 이어 가기`, notes: f.unpaid ? `미수금 ${f.unpaid}만 원 확인` : '', bring: order ? '주문서 · 단가표' : '자료' } }));
    });
    const c4 = pick[slots.length];
    if (c4) out.push(S({ title: `${c4.name} ${visit}`, date: d1, start: '11:00', end: '11:40', location: c4.address || '건대입구 사무실', briefing: { who: c4.name, customerId: c4.id, purpose: `${c4.stage} 단계 이어 가기` } }));
    return out;
  },

  build() {
    const t = U.today(), d1 = U.addDays(t, 1), d2 = U.addDays(t, 2);
    const S = (o) => ({ id: U.uid(), visibility: 'normal', bufferMin: 10, status: 'scheduled', ackAt: null, briefing: {}, createdBy: 'secretary', ...o });
    return {
      profile: { name: '박지훈', prepMin: 50, ceoPhone: '010-0000-0000', secretaryName: '이팀장', secretaryPhone: '010-0000-0001', driverName: '', driverPhone: '' },
      schedules: [
        // 세일즈플래너 데모: 업종을 고르기 전 기본 하루 (업종을 고르면 App.demoRetheme 이 그 업종의 하루로 바꿈)
        S({ demoDay: true, title: '아침 팀 회의', category: 'meeting', date: t, start: '08:30', end: '09:10', location: '성수 지점 3층', mode: 'none', ackAt: new Date().toISOString() }),
        // 지난 기록 (학습 · 추천 시연용): 본사 → 한빛전자 실제 이동 40·45·41분, 식사 장소 평가
        ...this.history(t, S),
      ],
      company: this.company(),
      notices: this.notices(),
      messages: [
        { id: U.uid(), from: 'secretary', body: '지훈님, 오늘 방문 일정 확인 부탁해요. 끝나면 마감 보고 보내 주세요.', urgent: false, at: new Date(Date.now() - 3600e3).toISOString() },
      ],
    };
  },
};
