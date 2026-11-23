/* =========================================
   세일즈플래너 — 고객 · 활동 저장소
   로그인했으면 서버(sp_customers · sp_activities), 아니면 이 기기에만 (데모)
   업종 템플릿 선택은 내 프로필 설정(settings.templateId)에 저장
   ========================================= */
const SalesStore = {
  KEY: 'sp_demo_sales_v1',
  data: { templateId: null, customers: [], activities: [], seeded: {} },
  loaded: false,
  error: null,

  live() { return typeof Store !== 'undefined' && Store.mode === 'supabase' && !!Store.client && !!Store.user; },
  me() { return this.live() ? Store.user.id : 'demo'; },
  newId() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },

  // ---- 서버 행 ↔ 앱 모양 ----
  fromRow(r) {
    return { id: r.id, templateId: r.template_id, name: r.name, phone: r.phone || '', stage: r.stage, stageAt: r.stage_at,
      lastActivityAt: r.last_activity_at, fields: r.fields || {}, birthday: r.birthday, owner: r.owner, source: r.source,
      nextContact: r.next_contact_at ? { date: r.next_contact_at, task: r.next_contact_task || '' } : null,
      org: r.org || '', title: r.title || '', email: r.email || '', address: r.address || '' };
  },
  toRow(c) {
    return { id: c.id, rep_id: this.me(), template_id: c.templateId, name: c.name, phone: c.phone || null, stage: c.stage,
      stage_at: c.stageAt, last_activity_at: c.lastActivityAt, fields: c.fields || {}, birthday: c.birthday || null,
      owner: c.owner || 'personal', source: c.source || 'manual',
      next_contact_at: (c.nextContact && c.nextContact.date) || null, next_contact_task: (c.nextContact && c.nextContact.task ? String(c.nextContact.task).slice(0, 80) : null),
      org: c.org ? String(c.org).slice(0, 60) : null, title: c.title ? String(c.title).slice(0, 60) : null,
      email: c.email ? String(c.email).slice(0, 80) : null, address: c.address ? String(c.address).slice(0, 120) : null };
  },
  actFromRow(a) { return { id: a.id, customerId: a.customer_id, kind: a.kind, date: a.date, by: a.by, body: a.body || {} }; },

  /** 불러오기 (동시에 여러 번 불러도 한 번만) */
  load() {
    if (!this._p) this._p = this._load().finally(() => { this._p = null; });
    return this._p;
  },
  async _load() {
    this.error = null;
    if (!this.live()) {
      try { this.data = Object.assign({ templateId: null, customers: [], activities: [], seeded: {} }, JSON.parse(localStorage.getItem(this.KEY)) || {}); } catch { /* 처음 */ }
      this.loaded = true; return;
    }
    const c = Store.client;
    const [cu, ac] = await Promise.all([
      c.from('sp_customers').select('*').eq('rep_id', this.me()).order('created_at'),
      c.from('sp_activities').select('*').eq('rep_id', this.me()).order('created_at', { ascending: false }).limit(300),
    ]);
    if (cu.error || ac.error) { this.error = (cu.error || ac.error).message; this.loaded = true; return; }
    this.data = { templateId: (Store.profile() || {}).templateId || null, customers: cu.data.map(r => this.fromRow(r)),
      activities: ac.data.map(a => this.actFromRow(a)), seeded: {} };
    this.loaded = true;
  },

  _saveLocal() { if (!this.live()) { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch { /* 저장소 막힘 */ } } },

  async setTemplate(id) {
    this.data.templateId = id;
    if (this.live()) await Store.saveProfile({ templateId: id });
    else this._saveLocal();
  },

  /** 고객 추가 (실패하면 화면에서 빼고 오류를 던짐) */
  async addCustomer(c) {
    c.id = c.id || this.newId();
    this.data.customers.push(c);
    if (this.live()) {
      const { error } = await Store.client.from('sp_customers').insert(this.toRow(c));
      if (error) { this.data.customers = this.data.customers.filter(x => x.id !== c.id); throw new Error('고객을 저장하지 못했어요: ' + error.message); }
    } else this._saveLocal();
    return c;
  },

  async updateCustomer(c) {
    if (this.live()) {
      const row = this.toRow(c); delete row.id; delete row.rep_id; delete row.owner;   // 주인 · 담당자는 서버 규칙대로
      const { error } = await Store.client.from('sp_customers').update(row).eq('id', c.id);
      if (error) throw new Error('저장하지 못했어요: ' + error.message);
    } else this._saveLocal();
  },

  /** 활동 기록. by: 'user' | 'auto' */
  async addActivity(c, kind, body, by, date) {
    const a = { id: this.newId(), customerId: c.id, kind, date, by: by === 'auto' ? 'auto' : 'user', body: body || {} };
    this.data.activities.unshift(a);
    c.lastActivityAt = date;
    if (this.live()) {
      const { error } = await Store.client.from('sp_activities').insert({ id: a.id, customer_id: c.id, rep_id: this.me(), kind, date, by: a.by, body: a.body });
      if (error) { this.data.activities = this.data.activities.filter(x => x.id !== a.id); throw new Error('기록을 저장하지 못했어요: ' + error.message); }
    } else this._saveLocal();
    return a;
  },
};
if (typeof module !== 'undefined') module.exports = SalesStore;
