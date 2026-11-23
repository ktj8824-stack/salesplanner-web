/* =========================================
   세일즈플래너 — 본사·팀장 상황판 (PC 웹 · 폰에서도 보임)
   오늘 현황 · 팀원이 지금 어디서 무엇을 · 진행 단계 전체 · 최근 활동
   고객 배정 · 방문 루트 보내기 (팀원 앱 홈에 '확인 대기'로 도착)
   ========================================= */
const Hq = {
  async start() {
    const root = document.getElementById('root');
    try { await Store.init('secretary'); }
    catch (e) { root.innerHTML = U.failBox(e); return; }
    if (Store.needsLogin) return Login.render(root, '세일즈플래너 본사 로그인', () => this.boot());
    this.boot();
  },

  async boot() {
    document.getElementById('root').innerHTML = '<p class="hq-muted" style="padding:40px;text-align:center">팀 현황을 불러오는 중…</p>';
    await HqStore.load();
    this.render();
    setInterval(() => this.render(), 60000);
    document.addEventListener('click', e => this.onClick(e));
  },

  // ---------- 계산 ----------
  tpl() { return Templates.get(HqStore.data.templateId || 'insurance'); },
  now() { return new Date(); },
  todayOf(repId) { return HqStore.data.schedules.filter(s => s.repId === repId && s.date === U.today() && s.status !== 'cancelled' && s.category === 'external').sort((a, b) => a.start.localeCompare(b.start)); },
  doneOf(list) { const n = this.now(); return list.filter(s => U.at(s.date, s.end) <= n); },
  where(repId) {
    const n = this.now(), list = this.todayOf(repId);
    const cur = list.find(s => U.at(s.date, s.start) <= n && U.at(s.date, s.end) > n);
    if (cur) return { dot: 'busy', text: `${cur.title} 중` };
    const nx = list.find(s => U.at(s.date, s.start) > n);
    if (nx) return { dot: 'move', text: `다음 ${nx.start} · ${nx.title}` };
    return list.length ? { dot: 'done', text: '오늘 방문 끝' } : { dot: 'none', text: '오늘 방문 없음' };
  },
  monthWins(repId) {
    const win = Templates.winStage(this.tpl()), m = U.today().slice(0, 7);
    return HqStore.data.activities.filter(a => a.kind === 'stage' && a.body.to === win && String(a.date).slice(0, 7) === m && (!repId || a.repId === repId)).length;
  },
  pendingRoutes(repId) { return HqStore.data.schedules.filter(s => s.createdBy === 'secretary' && !s.ackAt && s.date >= U.today() && s.status !== 'cancelled' && (!repId || s.repId === repId)); },
  overdue() {
    const t = this.tpl();
    return HqStore.data.customers.flatMap(c => Templates.followups(t, c, U.today()).filter(f => f.overdue).map(f => Object.assign(f, { name: c.name, repId: c.repId })));
  },
  repName(id) { const r = HqStore.data.reps.find(x => x.id === id); return r ? r.name : '팀원'; },
  custName(id) { const c = HqStore.data.customers.find(x => x.id === id); return c ? c.name : '고객'; },

  // ---------- 화면 ----------
  render() {
    const d = HqStore.data, t = this.tpl(), esc = U.esc;
    const reps = d.reps;
    const todayAll = reps.flatMap(r => this.todayOf(r.id)), done = this.doneOf(todayAll);
    const od = this.overdue(), pend = this.pendingRoutes();
    const counts = t.stages.map(s => d.customers.filter(c => c.stage === s).length), maxC = Math.max(1, ...counts);
    const RES = { good: '좋음', hold: '고민 중', later: '다시 연락', no: '거절' };
    const actLine = a => a.kind === 'stage' ? `${esc(a.body.from || '처음')} → <b>${esc(a.body.to)}</b>` : a.kind === 'call' ? `통화 ${a.body.minutes || ''}분${a.body.result ? ' · ' + (RES[a.body.result] || '') : ''}` : esc(a.body.text || a.kind);
    const longDate = (() => { const x = this.now(); return `${x.getMonth() + 1}월 ${x.getDate()}일 ${U.WEEK[x.getDay()]}요일 · ${U.hm(x)} 기준`; })();
    document.getElementById('root').innerHTML = `
      ${Store.mode === 'demo' ? `<div class="hq-demo">데모 화면이에요 — 가상 팀 5명 · 가상 고객 30명.${Store.forcedDemo ? ' <button data-hq="exitdemo">데모 끝내기</button>' : ''}</div>` : ''}
      ${HqStore.error ? `<div class="hq-demo hq-err">일부를 불러오지 못했어요: ${esc(HqStore.error)}</div>` : ''}
      <div class="hq-shell">
        <aside class="hq-side">
          <div class="hq-brand"><small>SALES PLANNER</small><b>본사 · 팀장</b></div>
          <nav aria-label="관리 메뉴">
            <a class="on" href="#">오늘 현황</a>
            <a href="#" data-hq="assign">고객 배정</a>
            <a href="#" data-hq="route">방문 루트 보내기</a>
            <a href="secretary.html">세일즈톡 · 일정 (기존 화면)</a>
          </nav>
          <p class="hq-tpl">${esc(t.name)} 템플릿 · 성과 단계 '${esc(Templates.winStage(t))}'</p>
        </aside>
        <main class="hq-main">
          <div class="hq-head">
            <div><div class="hq-muted">${esc(longDate)}</div><h1>오늘 현황</h1></div>
            <div class="hq-btns"><button class="hq-btn" data-hq="assign">고객 배정</button><button class="hq-btn hq-dark" data-hq="route">방문 루트 보내기</button></div>
          </div>
          <div class="hq-kpis">
            <div class="hq-kpi dark"><span>오늘 방문</span><b>${done.length} / ${todayAll.length}</b><small>끝남 / 계획</small></div>
            <div class="hq-kpi"><span>이번 달 성과</span><b>${this.monthWins()}</b><small>'${esc(Templates.winStage(t))}' 단계 도달</small></div>
            <div class="hq-kpi"><span>다시 연락 지연</span><b>${od.length}</b><small>날짜가 지난 고객</small></div>
            <div class="hq-kpi"><span>루트 확인 대기</span><b>${pend.length}</b><small>보냈는데 아직 확인 안 함</small></div>
          </div>
          <div class="hq-cols">
            <section class="hq-card hq-wide">
              <h2>팀원 지금 어디서 무엇을 <span class="hq-muted">방문 일정 기준</span></h2>
              <div class="hq-scroll"><table class="hq-table">
                <thead><tr><th>팀원</th><th>지금</th><th>오늘 방문</th><th>이번 달 성과</th><th>확인 대기</th></tr></thead>
                <tbody>${reps.map(r => { const w = this.where(r.id), td = this.todayOf(r.id), p = this.pendingRoutes(r.id).length;
                  return `<tr><td><b>${esc(r.name)}</b>${r.area ? `<span class="hq-muted"> · ${esc(r.area)}</span>` : ''}${HqStore.live() && !r.linked ? ' <em class="hq-tag">연결 안 됨</em>' : ''}</td>
                    <td><span class="hq-dot ${w.dot}"></span>${esc(w.text)}</td><td class="num">${this.doneOf(td).length} / ${td.length}</td>
                    <td class="num">${this.monthWins(r.id)}</td><td class="num">${p ? `<em class="hq-tag warn">${p}</em>` : '—'}</td></tr>`; }).join('') || '<tr><td colspan="5" class="hq-muted">같은 회사 영업사원이 아직 없어요</td></tr>'}</tbody>
              </table></div>
            </section>
            <section class="hq-card">
              <h2>진행 단계 전체 <span class="hq-muted">고객 ${d.customers.length}명</span></h2>
              ${t.stages.map((s, i) => `<div class="hq-bar"><span>${esc(s)}</span><i><u style="width:${Math.round(counts[i] / maxC * 100)}%"></u></i><b>${counts[i]}</b></div>`).join('')}
            </section>
          </div>
          <div class="hq-cols">
            <section class="hq-card hq-wide">
              <h2>최근 활동 <span class="hq-muted">자동 기록 포함</span></h2>
              ${d.activities.slice(0, 8).map(a => `<div class="hq-act"><b>${esc(String(a.date).slice(5).replace('-', '.'))}</b><span>${esc(this.repName(a.repId))} · ${esc(this.custName(a.customerId))} — ${actLine(a)}</span><em class="${a.by}">${a.by === 'auto' ? '자동' : '직접'}</em></div>`).join('') || '<p class="hq-muted">아직 활동이 없어요</p>'}
            </section>
            <section class="hq-card">
              <h2>다시 연락 지연 <span class="hq-muted">${od.length}건</span></h2>
              ${od.slice(0, 6).map(f => `<div class="hq-act"><b>${esc(f.date.slice(5).replace('-', '.'))}</b><span>${esc(this.repName(f.repId))} · ${esc(f.name)} — ${esc(f.task)}</span></div>`).join('') || '<p class="hq-muted">밀린 연락이 없어요</p>'}
            </section>
          </div>
        </main>
      </div>`;
  },

  // ---------- 창 ----------
  modal(html) { this.close(); const b = document.createElement('div'); b.className = 'hq-mback'; b.innerHTML = `<div class="hq-modal" role="dialog" aria-modal="true">${html}</div>`; document.body.appendChild(b); return b; },
  close() { document.querySelectorAll('.hq-mback').forEach(x => x.remove()); },
  repOptions(sel) { return HqStore.data.reps.map(r => `<option value="${U.esc(r.id)}" ${r.id === sel ? 'selected' : ''}>${U.esc(r.name)}</option>`).join(''); },

  openAssign() {
    const t = this.tpl();
    if (!HqStore.data.reps.length) return U.toast('배정할 영업사원이 아직 없어요');
    const m = this.modal(`<h2>고객 배정</h2><p class="hq-muted">배정하면 회사 고객이 돼요. 영업사원이 퇴사해도 회사에 남아요. 다음 날 첫 연락 알림이 자동으로 잡혀요.</p>
      <form><label>담당 영업사원<select name="rep">${this.repOptions()}</select></label>
      <label>고객 이름<input name="name" required maxlength="40"></label>
      <label>연락처<input name="phone" inputmode="tel" maxlength="20"></label>
      <label>시작 단계<select name="stage">${t.stages.map(s => `<option>${U.esc(s)}</option>`).join('')}</select></label>
      <div class="hq-foot"><button type="button" class="hq-btn" data-hq="close">취소</button><button class="hq-btn hq-dark">배정</button></div></form>`);
    m.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const f = e.target;
      try { await HqStore.assignCustomer({ repId: f.rep.value, name: f.name.value.trim(), phone: f.phone.value.trim(), stage: f.stage.value }); this.close(); this.render(); U.toast(`${this.repName(f.rep.value)}님에게 배정했어요`); }
      catch (err) { U.toast(err.message); }
    };
  },

  openRoute() {
    const d = HqStore.data; if (!d.reps.length) return U.toast('루트를 보낼 영업사원이 아직 없어요');
    let rep = d.reps[0].id;
    const row = i => `<div class="hq-stop" data-i="${i}"><input name="start" type="time" value="${['10:00', '11:30', '14:00', '15:30', '17:00'][i] || '10:00'}" aria-label="시간">
      <select name="cust" aria-label="고객">${d.customers.filter(c => c.repId === rep).map((c, k, all) => `<option value="${U.esc(c.id)}" ${k === i % Math.max(1, all.length) ? 'selected' : ''}>${U.esc(c.name)} · ${U.esc(c.stage)}</option>`).join('')}</select>
      <input name="loc" placeholder="장소" aria-label="장소" maxlength="80"><input name="tm" type="number" min="0" max="300" value="20" aria-label="이동 분"></div>`;
    const m = this.modal(`<h2>방문 루트 보내기</h2><p class="hq-muted">보내면 영업사원 앱 홈에 '확인 대기'로 가고, 출발 알람이 자동으로 잡혀요.</p>
      <form><div class="hq-two"><label>영업사원<select name="rep">${this.repOptions(rep)}</select></label><label>날짜<input name="date" type="date" required value="${U.addDays(U.today(), 1)}"></label></div>
      <div class="hq-stops-head"><span>시간</span><span>고객</span><span>장소</span><span>이동(분)</span></div>
      <div class="hq-stops">${row(0)}${row(1)}${row(2)}</div>
      <button type="button" class="hq-btn" data-addstop>+ 한 곳 더</button>
      <div class="hq-foot"><button type="button" class="hq-btn" data-hq="close">취소</button><button class="hq-btn hq-dark">루트 보내기</button></div></form>`);
    const box = m.querySelector('.hq-stops');
    m.querySelector('[name=rep]').onchange = e => { rep = e.target.value; box.innerHTML = row(0) + row(1) + row(2); };
    m.querySelector('[data-addstop]').onclick = () => { const n = box.children.length; if (n < 8) box.insertAdjacentHTML('beforeend', row(n)); };
    m.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const f = e.target;
      const stops = [...box.children].map(r => ({ start: r.querySelector('[name=start]').value, customerId: r.querySelector('[name=cust]').value, location: r.querySelector('[name=loc]').value.trim(), travelMin: r.querySelector('[name=tm]').value }))
        .filter(s => s.start && s.customerId);
      if (!stops.length) return U.toast('이 영업사원에게 배정된 고객이 없어요. 먼저 고객을 배정해 주세요');
      try { await HqStore.sendRoute(f.rep.value, f.date.value, stops); this.close(); this.render(); U.toast(`${this.repName(f.rep.value)}님에게 ${stops.length}곳 루트를 보냈어요`); }
      catch (err) { U.toast(err.message); }
    };
  },

  onClick(e) {
    const el = e.target.closest('[data-hq]'); if (!el) { if (e.target.classList.contains('hq-mback')) this.close(); return; }
    e.preventDefault();
    const k = el.dataset.hq;
    if (k === 'assign') this.openAssign();
    else if (k === 'route') this.openRoute();
    else if (k === 'close') this.close();
    else if (k === 'exitdemo') Store.exitDemo();
  },
};

Hq.start();
