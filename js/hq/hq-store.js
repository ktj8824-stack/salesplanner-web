/* =========================================
   세일즈플래너 — 본사·팀장 상황판 데이터
   로그인(본사 = secretary 역할): 같은 회사 팀원 · 회사 고객 · 연결된 팀원 일정을 서버에서 읽음
   데모: 가상 팀(5명)을 이 브라우저에 만들어 둠
   권한은 서버 규칙(RLS)이 지킴 — 본사는 '회사 고객'과 '공유된 개인 고객'만 보고, 일정은 연결된 팀원 것만 보냄
   ========================================= */
const HqStore = {
  KEY: 'sp_demo_hq_v1',
  data: null,
  error: null,

  live() { return typeof Store !== 'undefined' && Store.mode === 'supabase' && !!Store.client && !!Store.user; },
  newId() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },

  async load() {
    this.error = null;
    try { this.data = this.live() ? await this._loadLive() : this._loadDemo(); }
    catch (e) { this.error = e.message || String(e); this.data = this.data || { templateId: this.pickedTemplate(), reps: [], customers: [], activities: [], schedules: [] }; }
  },

  // ---------- 서버 ----------
  async _loadLive() {
    const c = Store.client, me = Store.user.id, from = U.addDays(U.today(), -31), to = U.addDays(U.today(), 14);
    const [pr, lk, fd, cu, ac] = await Promise.all([
      c.from('sp_profiles').select('id, name, role, phone, login_id').eq('company_id', Store.companyId),
      c.from('sp_links').select('ceo_id').eq('member_id', me).eq('role', 'secretary'),
      c.from('sp_schedule_feed').select('*').gte('date', from).lte('date', to),
      c.from('sp_customers').select('*'),
      c.from('sp_activities').select('*').order('created_at', { ascending: false }).limit(500),
    ]);
    const err = [pr, lk, fd, cu, ac].find(r => r.error); if (err) throw new Error(err.error.message);
    const linked = new Set(lk.data.map(r => r.ceo_id));
    const customers = cu.data.map(r => Object.assign(SalesStore.fromRow(r), { repId: r.rep_id }));
    const tally = {}; customers.forEach(x => { tally[x.templateId] = (tally[x.templateId] || 0) + 1; });
    // 회사 업종: 본사가 고른 것 → 없으면 팀원 고객에 가장 많이 쓰인 업종 → 없으면 아직 안 정함(null)
    const templateId = this.pickedTemplate() || Object.keys(tally).filter(id => Templates.has(id)).sort((a, b) => tally[b] - tally[a])[0] || null;
    return {
      templateId,
      reps: pr.data.filter(p => p.role === 'ceo').map(p => ({ id: p.id, name: p.name || p.login_id, phone: p.phone || '', linked: linked.has(p.id) })),
      customers,
      activities: ac.data.map(a => Object.assign(SalesStore.actFromRow(a), { repId: a.rep_id })),
      schedules: fd.data.filter(r => !r.masked).map(r => Object.assign(Store._fromRow(r), { repId: r.ceo_id })),
    };
  },

  /** 본사가 고른 회사 업종 (이 브라우저 · 데모는 앱에서 고른 업종도 이어받음) */
  PICK: 'sp_hq_tpl',
  pickedTemplate() {
    try {
      const v = JSON.parse(localStorage.getItem(this.PICK) || 'null'); if (v && Templates.has(v.id)) return v.id;
      if (!this.live()) { const a = JSON.parse(localStorage.getItem('sp_demo_sales_v1') || 'null'); if (a && Templates.has(a.templateId)) return a.templateId; }
    } catch { /* */ }
    return null;
  },
  pickedLabel() { try { const v = JSON.parse(localStorage.getItem(this.PICK) || 'null'); return v && v.label || null; } catch { return null; } },
  setTemplate(id, label) {
    try { localStorage.setItem(this.PICK, JSON.stringify({ id, label: label || null })); localStorage.removeItem(this.KEY); } catch { /* */ }
  },

  // ---------- 데모 (가상 팀 · 가상 고객) ----------
  _loadDemo() {
    const want = this.pickedTemplate();
    if (!want) return { day: U.today(), templateId: null, reps: [], customers: [], activities: [], schedules: [] };   // 업종부터 고르기
    try { const d = JSON.parse(localStorage.getItem(this.KEY)); if (d && d.day === U.today() && d.templateId === want) return d; } catch { /* */ }
    const d = this._demo(want); this._save(d); return d;
  },
  _save(d) { if (!this.live()) { try { localStorage.setItem(this.KEY, JSON.stringify(d || this.data)); } catch { /* */ } } },
  _demo(tid) {
    const t = U.today(), tm = U.addDays(t, 1), T = Templates.get(tid), type = Templates.type(T).id;
    const names = [['박지훈', '성동·광진'], ['이서연', '강남'], ['김도윤', '송파'], ['정하린', '마포'], ['최민준', '영등포']];
    const reps = names.map(([n, area], i) => ({ id: 'r' + i, name: n, area, phone: '010-0000-10' + i + '0', linked: true }));
    const PEOPLE = ['오태민', '남궁진', '류하나', '표지원', '윤보람', '서동현', '길소영', '하승우', '변정우', '탁준영', '명수아', '도하늘', '권도영', '엄태준', '차서윤', '피주원', '국하린', '예민재', '한지성', '문채아', '배성호', '노은서', '심재윤', '홍다인', '구본혁', '석예린', '맹준수', '연가은', '편승호', '육다빈'];
    const SHOPS = ['성수 한식당', '뚝섬 분식', '왕십리 카페', '건대 고깃집', '성동 급식소', '강남 일식', '역삼 베이커리', '선릉 국밥', '삼성 중식당', '잠실 치킨', '송파 피자', '석촌 카페', '문정 샐러드', '합정 파스타', '망원 칼국수', '연남 타코', '상수 브런치', '여의도 한정식', '당산 냉면', '문래 이자카야', '영등포 김밥', '신길 족발', '대림 마라탕', '구로 백반', '가산 도시락', '신림 순대', '봉천 감자탕', '사당 해장국', '방배 스시', '서초 버거'];
    const COMPANIES = ['청운건설', '한결테크', '동아정밀', '미래물산', '대성산업', '삼호기계', '우리소프트', '가람물류', '새빛전자', '태평양식품', '누리텔레콤', '하나디자인', '정우금속', '보람제약', '세진화학', '현대캐피탈', '나래항공', '한빛전자', '그린벤처스', '루이테크', '동해수산', '서울광고', '빛고을에너지', '산들교육', '바른의료', '온누리유통', '대한건설', '큰숲목재', '푸른바다', '제일정공'];
    const people = type === 'route' ? SHOPS : type === 'b2b' ? COMPANIES : PEOPLE;
    const word = Templates.word(T, 'visit');
    const customers = [], activities = [], schedules = [];
    people.forEach((p, i) => {
      const r = reps[i % reps.length], st = T.stages[Math.min(T.stages.length - 1, [0, 1, 2, 1, 0, 2, 3, 1, 2, 4][i % 10])], ago = (i * 7) % 26;
      const fields = type === 'route' ? { cycle: ['매주', '2주', '한 달'][i % 3], unpaid: i % 4 === 0 ? 30 + i * 5 : 0 } : type === 'b2b' ? { amount: 500 + (i * 370) % 5000, chance: ['10%', '30%', '50%', '70%', '90%'][i % 5] } : {};
      const c = { id: 'c' + i, repId: r.id, templateId: tid, name: p, phone: '', stage: st, fields, stageAt: U.addDays(t, -ago), lastActivityAt: U.addDays(t, -((i * 5) % 70)), birthday: null, owner: 'company', source: i % 4 ? 'manual' : 'hq', nextContact: null };
      customers.push(c);
      if (ago < 20) activities.push({ id: 'a' + i, customerId: c.id, repId: r.id, kind: 'stage', date: c.stageAt, by: i % 3 ? 'user' : 'auto', body: { from: T.stages[Math.max(0, T.stages.indexOf(st) - 1)], to: st } });
      if (i % 3 === 0) activities.push({ id: 'm' + i, customerId: c.id, repId: r.id, kind: 'call', date: U.addDays(t, -(i % 3)), by: 'user', body: { minutes: 3 + (i % 9), result: ['good', 'hold', 'later'][i % 3] } });
    });
    const slot = ['09:30', '11:00', '14:00', '16:30'];
    reps.forEach((r, ri) => {
      const mine = customers.filter(c => c.repId === r.id);
      mine.slice(0, 2 + (ri % 3)).forEach((c, k) => schedules.push({ id: `s${ri}${k}`, repId: r.id, title: `${c.name} ${word}`, category: 'external', date: t, start: slot[k], end: slot[k].replace(/^(\d\d)/, h => String(Number(h) + 1).padStart(2, '0')), location: `${r.area} 일대`, mode: 'car', travelMin: 20, bufferMin: 10, visibility: 'normal', status: 'scheduled', ackAt: t, createdBy: 'ceo', briefing: { customerId: c.id, who: c.name } }));
      if (ri % 2 === 0) schedules.push({ id: `n${ri}`, repId: r.id, title: `${mine[mine.length - 1].name} ${word}`, category: 'external', date: tm, start: '10:00', end: '11:00', location: `${r.area} 일대`, mode: 'car', travelMin: 20, bufferMin: 10, visibility: 'normal', status: 'scheduled', ackAt: null, createdBy: 'secretary', briefing: { customerId: mine[mine.length - 1].id, who: mine[mine.length - 1].name, purpose: '본사 배정 루트' } });
    });
    activities.sort((a, b) => (a.date < b.date ? 1 : -1));
    return { day: t, templateId: tid, reps, customers, activities, schedules };
  },

  // ---------- 본사가 하는 일 ----------
  /** 회사 고객을 팀원에게 배정 */
  async assignCustomer({ repId, name, phone, stage }) {
    const d = this.data, today = U.today();
    const c = { id: this.newId(), repId, templateId: d.templateId, name, phone: phone || '', stage, stageAt: today, lastActivityAt: today, fields: {}, birthday: null, owner: 'company', source: 'hq', nextContact: { date: U.addDays(today, 1), task: '본사 배정 고객 · 첫 연락' } };
    if (this.live()) {
      const row = Object.assign(SalesStore.toRow(c), { rep_id: repId, company_id: Store.companyId, owner: 'company', source: 'hq' });
      const { error } = await Store.client.from('sp_customers').insert(row);
      if (error) throw new Error('배정하지 못했어요: ' + error.message);
    }
    d.customers.push(c); this._save(); return c;
  },

  /** 방문 루트 보내기 → 팀원 일정(확인 대기) + 세일즈톡 알림 */
  async sendRoute(repId, date, stops) {
    const d = this.data, rep = d.reps.find(r => r.id === repId);
    if (this.live() && rep && !rep.linked) throw new Error(`${rep.name}님과 아직 연결되지 않았어요. '계정 관리'에서 연결한 뒤 보낼 수 있어요`);
    const list = stops.map(s => {
      const c = d.customers.find(x => x.id === s.customerId);
      const [h, m] = s.start.split(':').map(Number), e = Math.min(h * 60 + m + 60, 23 * 60 + 59);
      return { id: U.uid(), repId, title: `${c ? c.name : '고객'} 방문`, category: 'external', date, start: s.start, end: `${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`,
        location: s.location || '', mode: 'car', travelMin: Number(s.travelMin) || 20, bufferMin: 10, visibility: 'normal', status: 'scheduled', ackAt: null, createdBy: 'secretary',
        briefing: { customerId: c ? c.id : null, who: c ? c.name : '', purpose: '본사 배정 루트' } };
    });
    if (this.live()) {
      const rows = list.map(s => ({ id: s.id, ceo_id: repId, title: s.title, category: s.category, date: s.date, start_time: s.start, end_time: s.end, location: s.location || null,
        mode: s.mode, travel_min: s.travelMin, buffer_min: s.bufferMin, visibility: 'normal', briefing: s.briefing, status: 'scheduled', created_role: 'secretary' }));
      const { error } = await Store.client.from('sp_schedules').insert(rows);
      if (error) throw new Error('루트를 보내지 못했어요: ' + error.message);
      await Store.client.from('sp_messages').insert({ ceo_id: repId, sender_id: Store.user.id, sender_role: 'secretary',
        body: `${date.slice(5).replace('-', '/')} 방문 루트 ${list.length}곳을 보냈어요. 홈에서 확인해 주세요.`, ref_id: 'brief:' + date });
    }
    d.schedules.push(...list); this._save(); return list;
  },
};
if (typeof module !== 'undefined') module.exports = HqStore;
