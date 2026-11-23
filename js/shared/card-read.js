/* =========================================================================
   세일즈플래너 명함 읽기 (앱 쪽)
   - 사진 고르기(폰은 카메라 바로 열림) → 1600px JPEG 로 줄이기 → 서버 sp-card-read 로 보내기
   - 서버가 읽은 결과만 돌려줌. 사진은 서버에도 앱에도 남기지 않음.
   - 체험(데모) 모드에서는 서버 없이 예시 명함 한 장을 돌려줌
   ========================================================================= */
(function () {
  'use strict';
  const MAX = 1600;

  function pickFile() {
    return new Promise(resolve => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment');
      inp.style.display = 'none';
      inp.onchange = () => { const f = inp.files && inp.files[0]; inp.remove(); resolve(f || null); };
      document.body.appendChild(inp); inp.click();
    });
  }

  /** 사진 → 긴 변 1600px JPEG base64 (머리말 없이) */
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, MAX / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('사진을 열지 못했어요')); };
      img.src = url;
    });
  }

  const ERR = {
    daily_limit: '명함 읽기는 하루 30장까지예요. 직접 입력을 써 주세요.',
    login_required: '로그인한 뒤에 쓸 수 있어요.',
    not_configured: '명함 읽기가 아직 켜지지 않았어요.',
    bad_image: '사진이 너무 크거나 열 수 없어요.',
  };

  window.CardRead = {
    demo() {
      return [{ name: '최은영', org: '한빛물산', title: '총무팀 차장', phone: '010-0000-2481', tel: '02-0000-1200',
        email: 'ey.choi@example.com', address: '서울 성동구 성수이로 113', unsure: [] }];
    },
    /** 사진 고르기부터 읽기까지. 취소하면 null, 실패하면 Error 를 던짐 */
    async run(onBusy) {
      const file = await pickFile(); if (!file) return null;
      if (onBusy) onBusy(true);
      try {
        if (!(window.Store && Store.mode === 'supabase' && Store.client)) { await new Promise(r => setTimeout(r, 700)); return this.demo(); }
        const image = await shrink(file);
        const { data, error } = await Store.client.functions.invoke('sp-card-read', { body: { image, mime: 'image/jpeg' } });
        if (error) {
          let code = '';
          try { const b = await error.context.json(); code = b.error; } catch { /* */ }
          throw new Error(ERR[code] || '명함을 읽지 못했어요. 잠시 뒤 다시 해 주세요.');
        }
        return (data && data.cards) || [];
      } finally { if (onBusy) onBusy(false); }
    },
  };
})();
