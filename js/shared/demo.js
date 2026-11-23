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
      meal(2, '이사회 오찬', '삼청동 이탈리안 산마리노', 'good', { who: '사외이사 3명', company: '' }),
    ];
  },

  build() {
    const t = U.today(), d1 = U.addDays(t, 1), d2 = U.addDays(t, 2);
    const S = (o) => ({ id: U.uid(), visibility: 'normal', bufferMin: 10, status: 'scheduled', ackAt: null, briefing: {}, createdBy: 'secretary', ...o });
    return {
      profile: { name: '박지훈', prepMin: 50, ceoPhone: '010-0000-0000', secretaryName: '이팀장', secretaryPhone: '010-0000-0001', driverName: '', driverPhone: '' },
      schedules: [
        // 세일즈플래너 데모: 보험 영업사원의 하루 (이름 · 장소는 모두 가상)
        S({ title: '지점 아침 회의', category: 'meeting', date: t, start: '08:30', end: '09:10', location: '성수 지점 3층', mode: 'none', ackAt: new Date().toISOString() }),
        S({ title: '오태민 고객 실손 상담', category: 'external', date: t, start: '10:30', end: '11:30', location: '왕십리역 카페', mode: 'car', travelMin: 20, ackAt: new Date().toISOString(),
            briefing: { who: '오태민 고객님', purpose: '실손 리모델링 상담', notes: '지난주 통화: 보험료 부담 크다고 함', bring: '비교표 2부' } }),
        S({ title: '남궁진 고객 설계안 설명', category: 'external', date: t, start: '14:00', end: '15:00', location: '성수동 사무실', mode: 'car', travelMin: 15, ackAt: new Date().toISOString(),
            briefing: { who: '남궁진 고객님', purpose: '정기보험 전환 설계안 2가지', notes: '월 30만 원 이하 희망', bring: '설계안 출력본' } }),
        S({ title: '류하나 고객 첫 인사', category: 'external', date: t, start: '17:30', end: '18:20', location: '뚝섬역 근처', mode: 'walk', travelMin: 15, ackAt: new Date().toISOString(),
            briefing: { who: '류하나 고객님', purpose: '남궁진 고객 소개 · 첫 상담', bring: '명함' } }),
        S({ title: '윤보람 고객 가입 1개월 안부', category: 'external', date: d1, start: '11:00', end: '11:40', location: '건대입구 사무실', mode: 'car', travelMin: 25, ackAt: new Date().toISOString(),
            briefing: { who: '윤보람 고객님', purpose: '운전자보험 가입 후 안부' } }),
        // 지난 기록 (학습 · 추천 시연용): 본사 → 한빛전자 실제 이동 40·45·41분, 식사 장소 평가
        ...this.history(t, S),
      ],
      company: this.company(),
      notices: this.notices(),
      messages: [
        { id: U.uid(), from: 'secretary', body: '지훈님, 이번 주 신규 배정 고객 2명은 고객 탭에 넣어 뒀어요. 오늘 남궁진 고객님 설계안 설명 잘 부탁해요.', urgent: false, at: new Date(Date.now() - 3600e3).toISOString() },
      ],
    };
  },
};
