/* 세일즈플래너 — 시작 · 로그인 · 가입 화면 (Supabase 모드에서만 사용)
   카카오/구글 로그인 없음. 아이디 + 비밀번호.
   영업사원 앱: 로그인 · 회사 코드로 가입(팀장에게 받은 코드) · 혼자 쓰기(개인 가입)
   본사 웹   : 로그인 · 회사 등록(사업자번호 · 국세청 확인) → 가입하면 회사 코드가 나와요 */
const Login = {
  render(root, title, onDone) {
    this._title = title; this._done = onDone;
    if (Store.loginError) return this.renderId(root, title, onDone);   // 로그인 문제는 바로 아이디 화면에서 안내
    const chev = Icon.svg('chevron', 18), app = Store.role !== 'secretary';
    const canJoin = !!(window.CEOP_CONFIG && CEOP_CONFIG.FEATURES && CEOP_CONFIG.FEATURES.signup);
    const trial = Plan.isFree() ? Plan.FREE_TEXT : Plan.PRICES.trialDays + '일 무료 체험';
    root.innerHTML = `
      <div class="auth auth-start">
        <div class="auth-brand">
          <img src="icon.svg" alt="" class="auth-logo" width="84" height="84">
          <h1>세일즈플래너</h1>
          <p>${app ? '어떤 영업이든<br>입력은 거의 없이 기록돼요' : '팀의 하루가<br>한 화면에 보여요'}</p>
        </div>
        <div class="auth-choices">
          <h2>어떻게 시작하시나요?</h2>
          <button type="button" class="auth-card" data-id>
            <span class="ico">${Icon.svg('building', 24)}</span>
            <span class="t"><b>아이디가 있어요</b><small>가입한 아이디로 로그인</small></span>${chev}
          </button>
          ${!canJoin ? '' : app ? `
          <button type="button" class="auth-card" data-join>
            <span class="ico brass">${Icon.svg('users', 24)}</span>
            <span class="t"><b>회사 코드로 시작</b><small>팀장님께 받은 8자리 코드로 가입</small></span>${chev}
          </button>
          <button type="button" class="auth-card" data-solo>
            <span class="ico">${Icon.svg('file', 24)}</span>
            <span class="t"><b>혼자 쓸래요</b><small>개인 영업사원 · ${trial}</small></span>${chev}
          </button>` : `
          <button type="button" class="auth-card" data-signup>
            <span class="ico brass">${Icon.svg('file', 24)}</span>
            <span class="t"><b>처음이에요 · 회사 등록</b><small>사업자번호로 가입 · ${trial}</small></span>${chev}
          </button>`}
          <button type="button" class="auth-demo" data-demo>${Icon.svg('bolt', 16)} 데모로 둘러보기</button>
        </div>
        <footer class="auth-foot">
          <span>카카오 · 구글 로그인 없이, 세일즈플래너 아이디로만 들어와요</span>
          <a href="privacy.html" target="_blank">개인정보 처리방침</a>
        </footer>
      </div>`;
    const on = (sel, fn) => { const el = root.querySelector(sel); if (el) el.addEventListener('click', fn); };
    on('[data-id]', () => this.renderId(root, title, onDone));
    on('[data-signup]', () => this.renderSignup(root, title, onDone));
    on('[data-join]', () => this.renderJoin(root, title, onDone, 'code'));
    on('[data-solo]', () => this.renderJoin(root, title, onDone, 'solo'));
    on('[data-demo]', () => Store.enterDemo());
  },

  /** 아이디 · 비밀번호 로그인 */
  renderId(root, title, onDone) {
    const app = Store.role !== 'secretary';
    root.innerHTML = `
      <div class="auth auth-form">
        <button type="button" class="auth-back" data-back aria-label="뒤로">${Icon.svg('left', 22)}</button>
        <div class="auth-title"><h1>${app ? '영업사원' : '본사 · 팀장'}<br>로그인</h1><p>가입할 때 정한 아이디로 들어와요</p></div>
        <form id="loginForm" autocomplete="on" class="auth-fields">
          <label>아이디<input type="text" name="uid" required autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="latin"></label>
          <label>비밀번호<input type="password" name="pw" required autocomplete="current-password"></label>
          <p class="login-err" id="loginErr" role="alert">${U.esc(Store.loginError || '')}</p>
          <button class="auth-primary" type="submit">로그인</button>
        </form>
        <div class="auth-note">${Icon.svg('info', 20)}<p>아이디나 비밀번호를 잊으셨다면 ${app ? '<b>팀장님</b>께 재설정을 요청해 주세요. 혼자 쓰시는 분은 고객센터로 문의해 주세요.' : '같은 회사의 <b>다른 팀장 · 본사 담당자</b>에게 재설정을 요청해 주세요.'}</p></div>
        ${(window.CEOP_CONFIG && CEOP_CONFIG.FEATURES && CEOP_CONFIG.FEATURES.signup) ? `<p class="auth-switch">처음이세요? <button type="button" data-signup>${app ? '회사 코드로 시작' : '회사 등록하기'}</button></p>` : ''}
      </div>`;
    Store.loginError = null;
    const f = root.querySelector('#loginForm');
    root.querySelector('[data-back]').addEventListener('click', () => this.render(root, title, onDone));
    const su = root.querySelector('[data-signup]'); if (su) su.addEventListener('click', () => app ? this.renderJoin(root, title, onDone, 'code') : this.renderSignup(root, title, onDone));
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = '확인 중…';
      try { await Store.signIn(f.uid.value, f.pw.value); onDone(); }
      catch (err) { root.querySelector('#loginErr').textContent = err.message || String(err); }
      finally { btn.disabled = false; btn.textContent = '로그인'; }
    });
    f.uid.focus();
  },

  idInput(name, ph) { return `<input type="text" name="${name}" placeholder="${ph}" required autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="latin" pattern="[A-Za-z0-9][A-Za-z0-9._\\-]{2,29}" title="영어·숫자 3~30자 (기호는 . _ - 만)">`; },
  codeFmt(v) { const c = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); return c.length > 4 ? c.slice(0, 4) + '-' + c.slice(4) : c; },

  /** 영업사원 가입: kind 'code'(회사 코드) | 'solo'(혼자 쓰기) */
  renderJoin(root, title, onDone, kind) {
    const code = kind === 'code';
    root.innerHTML = `
      <form class="auth auth-form login signup" id="jnForm" novalidate>
        <button type="button" class="auth-back" data-back aria-label="뒤로">${Icon.svg('left', 22)}</button>
        <div class="auth-title"><h1>${code ? '회사 코드로 시작' : '혼자 쓰기'}</h1><p>${code ? '가입하면 코드를 준 팀장님 팀으로 바로 연결돼요.' : '회사 없이 나 혼자 써요. 고객은 모두 내 것이에요. 나중에 회사에 들어가도 돼요.'}</p></div>
        ${code ? `<fieldset><legend>회사 코드</legend>
          <label>8자리 코드<input type="text" name="code" placeholder="ABCD-2345" required autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="9" class="auth-code"></label>
          <small class="hint">팀장님이 보낸 초대 문자에 있어요</small></fieldset>` : ''}
        <fieldset><legend>내 정보</legend>
          <label>이름<input type="text" name="name" required autocomplete="name" maxlength="40"></label>
          <label>아이디${this.idInput('loginId', '영어·숫자 3~30자')}</label>
          <label>비밀번호<input type="password" name="pw" placeholder="8자 이상" minlength="8" required autocomplete="new-password"></label>
          <label>비밀번호 확인<input type="password" name="pw2" required autocomplete="new-password"></label>
          <label><span>휴대폰 <span class="muted">(선택)</span></span><input type="tel" name="phone" autocomplete="tel" placeholder="010-0000-0000"></label>
        </fieldset>
        <label class="agree"><input type="checkbox" name="agree" required> <span><a href="privacy.html" target="_blank">개인정보 처리방침</a>에 동의해요 <span class="muted">(필수)</span></span></label>
        <p class="login-err" id="jnErr" role="alert"></p>
        <button class="auth-primary" type="submit">가입하고 시작하기</button>
        <p class="auth-switch">${code ? '코드가 없어요 · <button type="button" data-other>혼자 쓰기</button>' : '팀장님께 코드를 받았어요 · <button type="button" data-other>회사 코드로 시작</button>'}</p>
      </form>`;
    const f = root.querySelector('#jnForm'), err = root.querySelector('#jnErr');
    root.querySelector('[data-back]').addEventListener('click', () => this.render(root, title, onDone));
    root.querySelector('[data-other]').addEventListener('click', () => this.renderJoin(root, title, onDone, code ? 'solo' : 'code'));
    if (f.code) f.code.addEventListener('input', () => { f.code.value = this.codeFmt(f.code.value); });
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = '';
      const bad = [...f.querySelectorAll('input')].find(i => !i.checkValidity());
      if (bad) { err.textContent = bad.name === 'agree' ? '개인정보 처리방침에 동의해 주세요.' : `'${bad.closest('label').firstChild.textContent.replace(/\(선택\)/, '').trim()}' 칸을 확인해 주세요.`; bad.focus(); return; }
      if (code && f.code.value.replace(/-/g, '').length !== 8) { err.textContent = '회사 코드 8자리를 확인해 주세요.'; f.code.focus(); return; }
      if (f.pw.value !== f.pw2.value) { err.textContent = '비밀번호 확인이 달라요.'; f.pw2.focus(); return; }
      const form = { name: f.name.value.trim(), loginId: f.loginId.value.trim().toLowerCase(), password: f.pw.value, phone: f.phone.value.trim(), agree: true, ...(code ? { code: f.code.value } : {}) };
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = '가입 중…';
      try {
        if (code) await Store.joinWithCode(form); else await Store.signUpPersonal(form);
        await Store.signIn(form.loginId, form.password);
        onDone();
      } catch (x) { err.textContent = x.message || String(x); }
      finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = '가입하고 시작하기'; } }
    });
  },

  /** 사업자번호 10자리 계산식 (서버에서 국세청 조회를 한 번 더 해요) */
  bizOk(raw) {
    const d = String(raw || '').replace(/\D/g, '');
    if (d.length !== 10) return false;
    const n = [...d].map(Number), w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += n[i] * w[i];
    sum += Math.floor((n[8] * 5) / 10);
    return (10 - (sum % 10)) % 10 === n[9];
  },
  bizFmt(raw) {
    const d = String(raw || '').replace(/\D/g, '').slice(0, 10);
    return d.length > 5 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d;
  },

  renderSignup(root, title, onDone) {
    const idIn = (name, ph) => this.idInput(name, ph);
    root.innerHTML = `
      <form class="auth auth-form login signup" id="suForm" novalidate>
        <button type="button" class="auth-back" data-back aria-label="뒤로">${Icon.svg('left', 22)}</button>
        <div class="auth-title"><h1>회사 등록</h1><p>사업자 정보로 가입해요. 가입하면 팀원 초대용 회사 코드가 바로 나와요.</p></div>

        <fieldset><legend>사업자 정보</legend>
          <label>사업자등록번호<input type="text" name="bizNo" placeholder="000-00-00000" inputmode="numeric" required autocomplete="off"></label>
          <small class="hint" id="bizHint">국세청에서 영업 중인 사업자인지 확인해요.</small>
          <label>대표자 이름<input type="text" name="ceoName" required autocomplete="off"></label>
          <label>사업장 주소<input type="text" name="address" required autocomplete="street-address" placeholder="예: 서울 강남구 테헤란로 123"></label>
          <label><span>상호 <span class="muted">(선택)</span></span><input type="text" name="bizName" autocomplete="organization"></label>
        </fieldset>

        <fieldset><legend>가입하는 분 (본사 · 팀장)</legend>
          <label>내 이름<input type="text" name="myName" required autocomplete="name"></label>
          <label>내 아이디${idIn('myId', '영어·숫자 3~30자')}</label>
          <label>비밀번호<input type="password" name="myPw" placeholder="8자 이상" minlength="8" required autocomplete="new-password"></label>
          <label>비밀번호 확인<input type="password" name="myPw2" required autocomplete="new-password"></label>
          <label><span>휴대폰 <span class="muted">(선택)</span></span><input type="tel" name="myPhone" autocomplete="tel" placeholder="010-0000-0000"></label>
        </fieldset>

        <label class="agree"><input type="checkbox" name="agree" required> <span><a href="privacy.html" target="_blank">개인정보 처리방침</a>에 동의해요 <span class="muted">(필수)</span></span></label>
        <p class="login-err" id="suErr" role="alert"></p>
        <button class="auth-primary" type="submit">사업자 확인하고 가입</button>
        <p class="auth-switch">이미 아이디가 있어요 · <button type="button" data-tologin>로그인</button></p>
      </form>`;
    const f = root.querySelector('#suForm'), err = root.querySelector('#suErr');
    f.bizNo.addEventListener('input', () => {
      f.bizNo.value = this.bizFmt(f.bizNo.value);
      const d = f.bizNo.value.replace(/\D/g, ''), h = root.querySelector('#bizHint');
      h.textContent = d.length < 10 ? '국세청에서 영업 중인 사업자인지 확인해요.' : this.bizOk(d) ? '번호 형식이 맞아요. 가입할 때 국세청에 확인해요.' : '번호가 맞지 않아요. 다시 확인해 주세요.';
      h.classList.toggle('bad', d.length === 10 && !this.bizOk(d));
    });
    root.querySelector('[data-back]').addEventListener('click', () => this.render(root, title, onDone));
    root.querySelector('[data-tologin]').addEventListener('click', () => this.renderId(root, title, onDone));

    // 잘못된 칸: 그 칸을 빨갛게 + 칸 바로 아래에 안내 + 화면을 그 칸으로 (맨 아래 안내만 있으면 못 봐요)
    const mark = (input, msg) => {
      f.querySelectorAll('.invalid').forEach(x => x.classList.remove('invalid'));
      f.querySelectorAll('.field-err').forEach(x => x.remove());
      err.textContent = msg;
      if (!input) return;
      input.classList.add('invalid');
      const at = input.type === 'checkbox' ? input.closest('label') : input;
      at.insertAdjacentHTML('afterend', `<small class="field-err" role="alert">${U.esc(msg)}</small>`);
      input.focus({ preventScroll: true });
      at.scrollIntoView({ block: 'center', behavior: 'smooth' });
      input.addEventListener('input', () => { input.classList.remove('invalid'); const n = at.nextElementSibling; if (n && n.classList.contains('field-err')) n.remove(); }, { once: true });
    };
    f.addEventListener('submit', async e => {
      e.preventDefault();
      mark(null, '');
      const bad = [...f.querySelectorAll('input')].find(i => !i.closest('[hidden]') && !i.checkValidity());
      if (bad) return mark(bad, bad.name === 'agree' ? '개인정보 처리방침에 동의해 주세요.' : `'${bad.closest('label').firstChild.textContent.replace(/\(선택\)/, '').trim()}' 칸을 확인해 주세요.`);
      if (!this.bizOk(f.bizNo.value)) return mark(f.bizNo, '사업자등록번호를 다시 확인해 주세요.');
      if (f.myPw.value !== f.myPw2.value) return mark(f.myPw2, '비밀번호 확인이 달라요.');
      const form = {
        bizNo: f.bizNo.value, ceoName: f.ceoName.value.trim(), address: f.address.value.trim(), bizName: f.bizName.value.trim(), agree: true,
        signer: { role: 'secretary', name: f.myName.value.trim(), loginId: f.myId.value.trim().toLowerCase(), password: f.myPw.value, phone: f.myPhone.value.trim() },
      };
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = '국세청 확인 중…';
      try {
        const r = await Store.signUp(form);
        this.renderDone(root, title, onDone, form, r && r.joinCode);
      } catch (x) { err.textContent = x.message || String(x); }
      finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = '사업자 확인하고 가입'; } }
    });
  },

  /** 가입 완료 (본사 웹): 아이디 + 팀원 초대용 회사 코드 */
  renderDone(root, title, onDone, form, code) {
    const s = form.signer;
    root.innerHTML = `
      <div class="auth auth-form login signup">
        <div class="auth-title"><span class="auth-ok">${Icon.svg('check', 28)}</span><h1>가입 완료</h1><p>사업자 확인을 마쳤어요. 이제 아래 아이디로 로그인할 수 있어요.</p></div>
        <dl class="kv acc">
          <dt>본사 · 팀장 (나)</dt><dd><b>${U.esc(s.loginId)}</b></dd>
          ${code ? `<dt>회사 코드</dt><dd><b class="auth-code">${U.esc(code)}</b></dd>` : ''}
        </dl>
        <p class="muted small" style="margin:0">영업사원에게 이 회사 코드를 보내 주세요. 앱에서 '회사 코드로 시작'을 누르고 코드를 넣으면 내 팀으로 바로 연결돼요. 코드는 상황판의 '팀원 초대'에서 언제든 다시 볼 수 있어요.</p>
        <p class="login-err" id="doneErr" role="alert"></p>
        <button class="auth-primary" data-go>상황판으로 시작하기</button>
      </div>`;
    root.querySelector('[data-go]').addEventListener('click', async e => {
      e.target.disabled = true;
      try { await Store.signIn(s.loginId, s.password); onDone(); }
      catch (x) { root.querySelector('#doneErr').textContent = x.message || String(x); e.target.disabled = false; }
    });
  },
};
