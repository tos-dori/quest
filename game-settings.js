/* Questline v0.8 | Game-style settings, data recovery, and explicit developer actions.
 * Client-side cheats are for the owner's own save, not server-side administrative access.
 */
(()=>{'use strict';
let ctx,tab='game',pending=null;
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const FIELDS=[
 ['gold','🪙 골드',1e8],['wood','🪵 목재',1e8],['stone','🪨 석재',1e8],['sparks','✨ 불씨',1e6],['insight','📘 지식의 잉크',1e7],['xp','🌟 경험치 (레벨 기준)',1e8],
 ['mine.crystals','💎 광산 수정',1e7],['mine.depth','⛏️ 갱도 깊이',999],
 ['mine.levels.pick','⚒️ 곡괭이 레벨',60],['mine.levels.drill','⚙️ 굴착기 레벨',60],['mine.levels.sieve','🔍 선별기 레벨',60],
 ['mine.talentPoints','💠 전문 특성 포인트',999],['mine.focusCharges','✨ 집중 에너지',3],
 ['buildings.sawmill','🪵 제재소 레벨',10],['buildings.quarry','🪨 채석장 레벨',10],['buildings.academy','📘 연구탑 레벨',10],['buildings.market','🪙 교역소 레벨',10],['buildings.outpost','🧭 전초기지 레벨',10]
];
const state=()=>ctx?.getState();
const get=(path)=>path.split('.').reduce((o,k)=>o&&Object.prototype.hasOwnProperty.call(o,k)?o[k]:undefined,state());
const put=(path,v)=>{const keys=path.split('.');let target=state();for(const key of keys.slice(0,-1)){if(!target[key]||typeof target[key]!=='object')target[key]={};target=target[key]}target[keys.at(-1)]=v;};
const pref=()=>{const s=state();if(!s.preferences||typeof s.preferences!=='object')s.preferences={};return s.preferences;};
const applyPrefs=()=>{const p=pref();document.documentElement.classList.toggle('q8-reduce-motion',!!p.reduceMotion);document.documentElement.classList.toggle('q8-large-text',!!p.largeText)};
const settingRow=(icon,name,desc,body)=>`<div class="q8-setting-row"><span class="q8-setting-emoji" aria-hidden="true">${icon}</span><div><strong>${name}</strong>${desc?`<small>${desc}</small>`:''}</div>${body}</div>`;
const button=(text,action,cls='')=>`<button class="q8-setting-btn ${cls}" type="button" data-qsetting="${action}">${text}</button>`;
const gamePanel=()=>`${settingRow('✨','애니메이션 줄이기','반짝임과 움직임 최소화',`<button class="q8-switch ${pref().reduceMotion?'on':''}" aria-pressed="${!!pref().reduceMotion}" data-qsetting="motion" type="button">${pref().reduceMotion?'켬':'끔'}</button>`)}${settingRow('🔎','큰 글씨','게임 본문 글자 확대',`<button class="q8-switch ${pref().largeText?'on':''}" aria-pressed="${!!pref().largeText}" data-qsetting="font" type="button">${pref().largeText?'켬':'끔'}</button>`)}${settingRow('🧭','조작 안내','처음 플레이하는 순서 다시 보기',button('보기','guide'))}${!window.QuestProgress?.finished()?settingRow('⏭️','튜토리얼 건너뛰기','기존 진행은 그대로',button('건너뛰기','skip')):''}`;
const dataPanel=()=>{const cloud=window.__QUESTLINE_CLOUD__,connected=!!cloud?.configured;return `<div class="q8-account-card"><span class="q8-account-symbol">${connected?'☁️':'💾'}</span><div><strong>${connected?'클라우드 저장 설정됨':'이 기기에 저장 중'}</strong><small>${connected?'계정 메뉴에서 연결·저장 상태를 확인해.':'현재 기기의 브라우저 데이터. 기기 사이 자동 동기화는 아직 없어.'}</small></div>${connected?button('계정','account'):''}</div>${settingRow('📦','백업 파일 내보내기','전체 게임 진행을 JSON으로 보관',button('내보내기','export'))}${settingRow('📥','백업 파일 가져오기','현재 진행을 다른 백업으로 교체',button('가져오기','import-start'))}<input class="q8-hidden-input" id="q8ImportFile" type="file" accept=".json,application/json" aria-label="게임 백업 파일 선택">${settingRow('📜','여정 기록','지난 행동과 학습 기록',button('열기','records'))}<div class="q8-danger-area"><h3>위험 구역</h3><p>초기화 전에 백업하는 것을 권장해.</p>${settingRow('🗑️','게임 데이터 초기화','전체 성장·재화·연구·퀘스트 삭제',button('초기화','reset-start','danger'))}</div>`};
const devPanel=()=>`<div class="q8-dev-intro"><strong>🧪 개인 개발자 도구</strong><p>아래 변경은 실제 게임 데이터를 수정해. 다른 기기의 자동 동기화나 관리자 권한을 제공하지 않아. 저장된 데이터를 먼저 백업하는 것이 안전해.</p></div><label class="q8-input-label" for="q8Field">변경할 항목</label><select id="q8Field" class="q8-input">${FIELDS.map(([key,title])=>`<option value="${key}">${title}</option>`).join('')}</select><div class="q8-cheat-values"><span>현재 값 <strong id="q8CurrentValue">${Number(get('gold')||0).toLocaleString('ko-KR')}</strong></span><label class="q8-input-label" for="q8NextValue">새 값</label><input id="q8NextValue" class="q8-input" type="number" min="0" max="100000000" step="1" inputmode="numeric" value="${Math.floor(Number(get('gold'))||0)}"></div>${button('변경 내용 검토','cheat-preview','main')}<p class="q8-dev-foot">직접 적용할 때만 변경하며, 값 범위 밖이나 잘못된 입력은 거부해.</p><div class="q8-dev-shortcut">${settingRow('🔓','잠금 해제 테스트','튜토리얼·레벨 잠금만 해제. 연구 문제는 자동으로 클리어되지 않아.',button('검토','unlock-preview'))}</div>`;
const body=()=>`<div class="q8-settings"><div class="q8-settings-top"><span class="q8-setting-crown">⚙️</span><div><small>QUESTLINE · v0.9.0</small><h2>설정</h2></div></div><div class="q8-setting-tabs" role="tablist" aria-label="설정 종류">${[['game','🎮','게임'],['data','💾','저장·계정'],['dev','🛠️','개발자']].map(([id,icon,name])=>`<button type="button" role="tab" aria-selected="${tab===id}" class="${tab===id?'selected':''}" data-qsetting="tab" data-target="${id}">${icon} ${name}</button>`).join('')}</div><div class="q8-settings-body">${tab==='game'?gamePanel():tab==='data'?dataPanel():devPanel()}</div></div>`;
const open=()=>{pending=null;ctx.overlay(body());};
const choice=(heading,subtitle,inside)=>{ctx.overlay(`<div class="q8-settings q8-review"><div class="q8-settings-top"><span class="q8-setting-crown">⚠️</span><div><small>진행 확인</small><h2>${heading}</h2></div></div><p>${subtitle}</p>${inside}</div>`)};
const backup=()=>ctx.exportSave();
const resetReview=()=>choice('정말 초기화할까?','현재 기기의 레벨·재화·채굴·학습·퀘스트가 모두 초기화돼. 이후 이 저장을 되돌릴 수 없어.',`${button('먼저 백업하기','export')}<div class="q8-checkline"><span>1단계</span> 계속하면 삭제 확인 화면으로 이동해.</div>${button('초기화 확인으로 이동','reset-final','danger')}${button('취소하고 돌아가기','open')}`);
const resetFinal=()=>choice('최종 삭제 확인','안전 확인을 위해 아래에 ‘초기화’를 정확히 입력해.',`<label class="q8-input-label" for="q8ResetWord">확인 문구</label><input id="q8ResetWord" class="q8-input" type="text" autocomplete="off" placeholder="초기화"><button type="button" class="q8-setting-btn danger" data-qsetting="reset-apply">모든 게임 진행 삭제</button>${button('취소','open')}`);
const importReview=()=>choice('백업으로 교체할까?','복원할 파일을 고르면 현재 게임 진행을 덮어쓰게 돼. 먼저 지금 데이터를 백업하길 권장해.',`${button('현재 진행 백업','export')}${button('백업 파일 선택','import-pick','main')}${button('취소','open')}<input class="q8-hidden-input" id="q8ImportFile" type="file" accept=".json,application/json">`);
const unlockReview=()=>choice('콘텐츠 잠금 해제','테스트를 위해 모든 콘텐츠 메뉴를 열어. 연구 진도·재화는 바뀌지 않아.',`${button('모든 기능 열기','unlock-apply','danger')}${button('취소','open')}`);
const cheatPreview=()=>{
 const key=document.getElementById('q8Field')?.value;const raw=document.getElementById('q8NextValue')?.value;
 const f=FIELDS.find(([k])=>k===key);
 if(!f||raw===''||raw==null||!/^\d+$/.test(raw.trim())){ctx.toast('0 이상의 정수를 정확히 입력해 줘.');return}
 const val=Number(raw);if(!Number.isSafeInteger(val)||val<0||val>f[2]){ctx.toast(`허용 범위는 0~${f[2].toLocaleString('ko-KR')}이야.`);return}
 pending={key,old:Number(get(key)||0),val,title:f[1]};
 choice('수치 변경 확인','아래 항목만 변경하고 다른 진행은 유지해.',`<div class="q8-diff"><strong>${e(pending.title)}</strong><span>${pending.old.toLocaleString('ko-KR')} <b>→</b> ${val.toLocaleString('ko-KR')}</span></div>${button('이 값으로 변경','cheat-apply','danger')}${button('취소','open')}`);
};
const cheatApply=()=>{if(!pending)return;const f=FIELDS.find(([k])=>k===pending.key);if(!f||!Number.isSafeInteger(pending.val))return;
 // Never accept a client-supplied path beyond the explicit allowlist.
 const {key,val,title}=pending;pending=null;put(key,val);
 if(key==='mine.depth'&&state().mine){state().mine.rocks=0;state().mine.damage=0;state().mine.at=Date.now()}
 ctx.persist();window.QuestProgress?.audit(false);ctx.render();ctx.close();ctx.toast(`${title} 값이 변경됐어.`)};
const applyUnlock=()=>{const p=window.QuestProgress?.entry();if(!p)return;p.bypass=true;p.step=5;ctx.persist();ctx.render();ctx.close();ctx.toast('테스트용으로 모든 콘텐츠 메뉴를 열었어.')};
const onClick=(evt)=>{
 const button=evt.target.closest('[data-qsetting]');if(!button||!ctx)return;
 evt.preventDefault();evt.stopPropagation();const a=button.dataset.qsetting;
 if(a==='tab'){tab=button.dataset.target;open()}
 else if(a==='open')open();
 else if(a==='motion'||a==='font'){pref()[a==='motion'?'reduceMotion':'largeText']=!pref()[a==='motion'?'reduceMotion':'largeText'];applyPrefs();ctx.persist();open()}
 else if(a==='guide')choice('조작 안내','게임 데이터를 바꾸지 않아. 언제든 다시 확인해.',window.QuestProgress.guide()+buttonBack());
 else if(a==='skip'){window.QuestProgress?.skip?.();ctx.close()}
 else if(a==='export')backup();
 else if(a==='import-start')importReview();
 else if(a==='import-pick')document.getElementById('q8ImportFile')?.click();
 else if(a==='records'){ctx.close();ctx.switchTab('records')}
 else if(a==='account')window.__QUESTLINE_CLOUD__?.openAccount?.();
 else if(a==='reset-start')resetReview();
 else if(a==='reset-final')resetFinal();
 else if(a==='reset-apply'){
  if(document.getElementById('q8ResetWord')?.value.trim()!=='초기화'){ctx.toast('‘초기화’를 정확히 입력해 줘.');return}
  ctx.resetGame();ctx.close();ctx.toast('게임 진행을 초기화했어. 첫 여정부터 다시 시작해.')
 }
 else if(a==='cheat-preview')cheatPreview();
 else if(a==='cheat-apply')cheatApply();
 else if(a==='unlock-preview')unlockReview();
 else if(a==='unlock-apply')applyUnlock();
};
const buttonBack=()=>button('설정으로 돌아가기','open');
const onChange=(evt)=>{
 if(evt.target.id==='q8Field'){const value=get(evt.target.value);const out=document.getElementById('q8NextValue');const show=document.getElementById('q8CurrentValue');if(out)out.value=Math.floor(Number(value)||0);if(show)show.textContent=Number(value||0).toLocaleString('ko-KR');const f=FIELDS.find(([k])=>k===evt.target.value);if(out&&f)out.max=f[2]}
 if(evt.target.id==='q8ImportFile'&&evt.target.files?.[0]){const f=evt.target.files[0];evt.target.value='';ctx.importSave(f)}
};
window.QuestSettings={
 mount(v){ctx=v;applyPrefs();document.addEventListener('click',onClick);document.addEventListener('change',onChange);},
 open,resetReview,applyPrefs,debug:()=>({tab,fields:FIELDS.length})
};
})();