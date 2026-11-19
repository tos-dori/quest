/* Questline cloud bridge. Game saves live on Supabase; legacy local data is only a migration source. */
(function () {
  'use strict';
  const config = window.QUESTLINE_CLOUD_CONFIG || {};
  const configured = /^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/i.test((config.url || '').trim()) && !!(config.publishableKey || '').trim();
  const bridge = {
    configured,
    active: false,
    revision: 0,
    pending: null,
    saving: false,
    blocked: false,
    client: null,
    user: null,
    context: null,
    lastStatus: '',
    lastMessage: '',
    status(name, message) {
      this.lastStatus = name;
      this.lastMessage = message || '';
      const banner = document.getElementById('storageBanner');
      if (banner) {
        banner.textContent = message || name;
        banner.dataset.mode = name;
      }
      const btn = document.getElementById('cloudStatus');
      if (btn) {
        btn.title = message || name;
        btn.setAttribute('aria-label', '저장 상태: ' + (message || name) + '. 계정 관리');
        btn.textContent = name === 'saved' ? '☁✓' : name === 'saving' ? '☁…' : name === 'error' ? '☁!' : '☁';
      }
    },
    showOverlay(html) {
      document.getElementById('overlayRoot').innerHTML = '<div class="overlay cloud-gate"><div class="modal cloud-modal" role="dialog" aria-modal="true" aria-label="클라우드 계정">' + html + '</div></div>';
    },
    hideOverlay() {
      const modal = document.querySelector('#overlayRoot .cloud-gate');
      if (modal) modal.remove();
    },
    async start(ctx) {
      this.context = ctx;
      if (!configured) {
        this.status('local', '이 기기에만 저장 중 · 서버 연결 전');
        ctx.localBoot();
        return;
      }
      if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        this.status('error', '로그인 모듈을 불러오지 못했어. 인터넷 연결을 확인해.');
        this.showOverlay('<h2>☁ 클라우드 연결 오류</h2><p>로그인 모듈을 불러오지 못했어. 인터넷 연결을 확인하고 새로고침해줘.</p><button class="btn gold wide" data-cloud-act="retry">새로고침</button>');
        return;
      }
      this.client = window.supabase.createClient(config.url.replace(/\/$/, ''), config.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      this.status('loading', '클라우드 저장 상태를 확인하고 있어…');
      this.showOverlay('<h2>☁ 저장 데이터 확인</h2><p>계정을 확인하고 서버의 게임 데이터를 불러오는 중이야.</p>');
      const { data, error } = await this.client.auth.getSession();
      if (error) { this.status('error', '로그인 확인 오류'); this.showSignIn(error.message); return; }
      if (!data.session) { this.status('login', '계정 로그인 후 서버 저장 가능'); this.showSignIn(); return; }
      await this.loadForUser(data.session.user);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.refreshIfSafe(); });
      window.addEventListener('beforeunload', (event) => { if (this.pending || this.saving) { event.preventDefault(); event.returnValue = ''; } });
    },
    showSignIn(error = '') {
      this.active = false;
      this.showOverlay('<span class="eyebrow">QUESTLINE CLOUD</span><h2>☁ 계정으로 이어서 플레이</h2>' +
        '<p>한 번 로그인하면 Mac과 iPhone에서 같은 게임 진행을 사용할 수 있어. 진행 내용은 서버에 저장돼.</p>' +
        (error ? '<p class="cloud-error">' + this.esc(error) + '</p>' : '') +
        '<label class="cloud-label" for="cloudEmail">로그인 이메일</label><input id="cloudEmail" type="email" autocomplete="email" placeholder="name@example.com" class="cloud-input">' +
        '<button class="btn gold wide mt12" data-cloud-act="send">로그인 이메일 받기</button>' +
        '<p class="cloud-small">받은 이메일의 링크를 이 브라우저에서 열어줘. 다른 기기에서도 동일한 이메일로 로그인하면 돼.</p>');
    },
    esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
    async sendLink() {
      const email = document.getElementById('cloudEmail')?.value.trim() || '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('이메일 주소를 확인해줘.'); return; }
      const redirectTo = location.origin + location.pathname;
      const { error } = await this.client.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo}});
      if (error) { this.showSignIn(error.message); return; }
      this.showOverlay('<h2>📨 로그인 이메일 발송</h2><p>' + this.esc(email) + ' 주소로 로그인 링크를 보냈어.</p><p>이 페이지는 그대로 두고 받은 편지함을 확인해줘.</p><button class="btn gold wide" data-cloud-act="retry">로그인 링크를 연 뒤 새로고침</button>');
    },
    async loadForUser(user) {
      this.user = user;
      this.status('loading', '서버에서 게임 진행을 불러오는 중…');
      this.showOverlay('<h2>☁ 저장 데이터 불러오기</h2><p>서버의 최신 진행을 확인하는 중이야.</p>');
      const {data,error} = await this.client.from('questline_saves').select('game_state,revision,updated_at').eq('user_id',user.id).maybeSingle();
      if (error) { this.status('error', '서버 읽기 실패'); this.showOverlay('<h2>⚠ 서버를 읽지 못했어</h2><p>' + this.esc(error.message) + '</p><button class="btn gold wide" data-cloud-act="retry">다시 시도</button>'); return; }
      if (!data) {
        const previous = this.context.getLocalSave();
        const restore = !!previous && confirm('이 기기에서 사용하던 기존 게임 진행을 발견했어. 서버로 처음 가져올까?\n\n[확인] 기존 게임 진행을 서버에 복사\n[취소] 새 게임으로 서버 시작\n\n로컬 원본은 삭제하지 않아.');
        const initial = restore ? previous : this.context.makeNewState();
        const {data:rev,error:saveError} = await this.client.rpc('questline_save',{p_state:initial,p_expected_revision:0});
        if (saveError) { this.status('error', '첫 서버 저장 실패'); this.showOverlay('<h2>⚠ 최초 저장 실패</h2><p>' + this.esc(saveError.message) + '</p><button class="btn gold wide" data-cloud-act="retry">다시 시도</button>'); return; }
        this.revision = Number(rev);
        this.context.applyState(initial);
      } else {
        this.revision = Number(data.revision);
        this.context.applyState(data.game_state);
      }
      this.active = true;
      this.blocked = false;
      this.hideOverlay();
      this.status('saved', '클라우드 저장 연결됨 · 모든 기기에서 같은 진행');
      if (!this.context.getState().firstOpen) {
        this.context.getState().firstOpen = true;
        this.queueSave(this.context.getState());
        setTimeout(() => { if (!document.getElementById('overlayRoot').innerHTML) this.context.welcome(); }, 450);
      }
    },
    queueSave(rawState) {
      if (!configured || !this.active || this.blocked) return false;
      this.pending = JSON.parse(JSON.stringify(rawState));
      this.status('saving','클라우드 저장 중…');
      void this.flush();
      return true;
    },
    async flush() {
      if (this.saving || this.blocked || !this.pending) return;
      this.saving = true;
      while (this.pending && !this.blocked) {
        const snapshot = this.pending;
        this.pending = null;
        const {data,error} = await this.client.rpc('questline_save',{p_state:snapshot,p_expected_revision:this.revision});
        if (error) {
          this.pending = this.pending || snapshot; // keep newest unsaved state in memory; never overwrite the server
          if ((error.message || '').includes('QUESTLINE_REVISION_CONFLICT')) {
            this.blocked = true;
            this.status('error','다른 기기에서 데이터가 바뀜 · 충돌 해결 필요');
            this.showConflict();
          } else {
            this.status('error','서버 저장 실패 · 게임을 닫지 말고 다시 시도');
            this.showSaveFailure(error.message || '네트워크 또는 권한 오류');
          }
          break;
        }
        this.revision = Number(data);
        this.status('saved','클라우드에 저장됨');
      }
      this.saving = false;
    },
    showSaveFailure(message) {
      this.showOverlay('<h2>⚠ 서버 저장 실패</h2><p>방금 변경한 내용은 아직 서버에 저장되지 않았어. 페이지를 닫지 말아줘.</p><p class="cloud-error">' + this.esc(message) + '</p>' +
        '<button class="btn gold wide" data-cloud-act="retry-save">저장 다시 시도</button><button class="btn ghost wide mt12" data-cloud-act="export">현재 데이터 백업</button>');
    },
    showConflict() {
      this.showOverlay('<h2>⚠ 다른 기기와 저장 충돌</h2><p>다른 기기나 관리 작업에서 서버 진행을 변경했어. 지금 화면의 내용으로 서버를 덮어쓰지 않을게.</p>' +
        '<button class="btn ghost wide" data-cloud-act="export">현재 변경 내용 백업</button><button class="btn gold wide mt12" data-cloud-act="load-remote">서버의 최신 진행 불러오기</button><p class="cloud-small">최신 진행을 불러오면 이 기기의 미저장 변경은 사라져. 필요하면 먼저 백업해줘.</p>');
    },
    downloadCurrent() { this.context.exportState(); },
    async replaceWithServer() {
      if (!confirm('서버의 최신 상태로 바꿀까? 이 기기의 미저장 진행은 사라져.')) return;
      this.pending = null; this.blocked = false; this.active = false;
      await this.loadForUser(this.user);
    },
    async refreshIfSafe() {
      if (!this.active || this.saving || this.pending || this.blocked) return;
      const {data,error} = await this.client.from('questline_saves').select('game_state,revision').eq('user_id',this.user.id).maybeSingle();
      if (error || !data) return;
      if (Number(data.revision) !== this.revision) {
        this.revision = Number(data.revision);
        this.context.applyState(data.game_state);
        this.status('saved','다른 기기에서 변경된 진행을 불러왔어');
      }
    },
    openAccount() {
      if (!configured) {
        alert('현재 게임 진행은 이 브라우저에만 저장돼. Supabase 서버 설정을 마치면 계정별 클라우드 저장으로 전환할 수 있어.');
        return;
      }
      if (!this.active) { this.showSignIn(); return; }
      this.showOverlay('<h2>☁ 클라우드 계정</h2><p>' + this.esc(this.user.email || '로그인됨') + '</p>' +
        '<p>저장 버전: ' + this.revision + '</p><button class="btn gold wide" data-cloud-act="refresh">서버에서 최신 진행 확인</button>' +
        '<button class="btn ghost wide mt12" data-cloud-act="export">게임 데이터 백업</button>' +
        '<button class="btn ghost wide mt12" data-cloud-act="logout">로그아웃</button><button class="btn ghost wide mt12" data-cloud-act="close">게임으로 돌아가기</button>');
    },
    async signOut() {
      if (this.pending || this.saving) { alert('아직 저장 중인 변경이 있어. 저장을 완료한 뒤 로그아웃해줘.'); return; }
      await this.client.auth.signOut(); this.active = false; this.user = null; this.revision = 0;
      this.status('login', '로그아웃됨 · 서버에 진행 보관 중'); this.showSignIn();
      document.getElementById('content').innerHTML = '';
      document.getElementById('resources').innerHTML = '';
      document.getElementById('nav').innerHTML = '';
    }
  };
  document.addEventListener('click', async event => {
    const b = event.target.closest('[data-cloud-act]');
    if (b) {
      event.preventDefault();event.stopPropagation();
      const action = b.dataset.cloudAct;
      if (action === 'send') await bridge.sendLink();
      if (action === 'retry') location.reload();
      if (action === 'retry-save') {bridge.hideOverlay(); await bridge.flush();}
      if (action === 'load-remote') await bridge.replaceWithServer();
      if (action === 'export') bridge.downloadCurrent();
      if (action === 'refresh') {bridge.hideOverlay(); await bridge.refreshIfSafe();}
      if (action === 'logout') await bridge.signOut();
      if (action === 'close') bridge.hideOverlay();
    }
  }, true);
  document.addEventListener('click', event => {
    if (event.target.closest('#cloudStatus')) bridge.openAccount();
  });
  window.__QUESTLINE_CLOUD__ = bridge;
})();