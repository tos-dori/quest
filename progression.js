/* Questline v0.8 | First-time quest chain and permanent, progressive unlocks.
 * The tutorial is an optional game journey, not a modal slideshow.
 * Saves created before v0.8 are marked legacy and never locked retroactively.
 */
(()=>{'use strict';
let ctx;
const STEPS=[
  {icon:'⛏️',title:'첫 일격',task:'아래 광석을 한 번 눌러 봐.',hint:'터치하면 광석 체력이 줄어들어.'},
  {icon:'🪨',title:'첫 수확',task:'광석 하나를 끝까지 캐 보자.',hint:'자동 채굴도 함께 진행돼. 광석이 깨지면 골드와 석재를 얻어.'},
  {icon:'⚒️',title:'첫 강화',task:'채굴 화면 아래에서 곡괭이를 1단계 강화해.',hint:'강화 메뉴를 열고 골드와 석재를 사용해. 한 번 때릴 때의 피해가 커져.'},
  {icon:'📜',title:'현실과 연결',task:'실제로 할 일 하나를 펼치고 퀘스트로 기록해.',hint:'큰 일을 끝낼 필요는 없어. 자료를 여는 것부터 시작하자.'},
  {icon:'📖',title:'첫 연구',task:'연구에서 첫 개념을 배우고 문제를 풀어 보자.',hint:'운영체제·마이크로프로세서 등 원하는 과목의 열린 노드로 시작해.'}
];
const fresh=()=>({step:0,legacy:false,bypass:false,highLevel:1,highDepth:1,introSeen:false,notices:[]});
const entry=()=>{const s=ctx?.getState();if(!s)return fresh();if(!s.progression||typeof s.progression!=='object'||Array.isArray(s.progression)){
  // Existing v0.7 players retain ALL content, regardless of their level.
  s.progression={...fresh(),step:5,legacy:true,bypass:true,introSeen:true};
}
const p=s.progression;
p.step=Math.max(0,Math.min(5,Math.floor(Number(p.step)||0)));
p.highLevel=Math.max(1,Math.floor(Number(p.highLevel)||1));
p.highDepth=Math.max(1,Math.floor(Number(p.highDepth)||1));
p.legacy=!!p.legacy;p.bypass=!!p.bypass;
if(!Array.isArray(p.notices))p.notices=[];
return p;};
const level=()=>Math.max(1,ctx?.getLevel()?.n||1);
const depth=()=>Math.max(1,ctx?.getState()?.mine?.depth||1);
const step=()=>entry().step;
const finished=()=>step()>=5;
const legacy=()=>!!(entry().legacy||entry().bypass);
const available=(key)=>{
 if(legacy())return true;
 const p=entry(),l=Math.max(level(),p.highLevel),d=Math.max(depth(),p.highDepth);
 if(key==='home'||key==='settings'||key==='records')return true;
 if(key==='quests')return p.step>=3;
 if(key==='study')return p.step>=4;
 if(key==='store'||key==='milestone')return p.step>=5;
 if(key==='build')return available('town');
 if(key==='town')return p.step>=5&&(l>=2||d>=3);
 if(key==='forge')return p.step>=5&&d>=3;
 if(key==='gear')return p.step>=5&&l>=3;
 if(key==='map')return p.step>=5&&(l>=3||d>=6);
 if(key==='decor')return p.step>=5&&l>=5;
 if(key==='spark')return available('map');
 if(key==='wood')return p.step>=5;
 if(key==='ink')return p.step>=4;
 if(key==='gold'||key==='stone')return p.step>=2;
 return p.step>=5;
};
const suggest=()=>{
 if(!finished())return null;
 const goals=[
 ['town','🏭 생산 마을','모험가 Lv.2 또는 갱도 3층'],
 ['forge','🛠️ 제작 공방','갱도 3층'],
 ['gear','🛡️ 모험 장비','모험가 Lv.3'],
 ['map','🗺️ 탐험대','모험가 Lv.3 또는 갱도 6층'],
 ['decor','🎨 꾸미기','모험가 Lv.5']];
 return goals.find(([key])=>!available(key))||null;
};
const notice=(title)=>{const p=entry();if(p.notices.includes(title))return;p.notices.push(title);ctx?.toast?.('🔓 '+title+' 해금!');};
const audit=(rerender=false)=>{
 const s=ctx?.getState();if(!s)return false;
 const p=entry(),was=p.step;
 let changed=false;
 const l=level(),d=depth();
 if(l>p.highLevel){p.highLevel=l;changed=true}
 if(d>p.highDepth){p.highDepth=d;changed=true}
 if(!legacy()){
  let next=p.step;
  const count=Object.values(s.researchV4?.progress||{}).filter(x=>x?.cleared).length;
  const criteria=[()=>Number(s.mine?.hitCount||0)>=1,
    ()=>Number(s.mine?.total||0)>=1,
    ()=>Number(s.mine?.levels?.pick||0)>=1,
    ()=>(s.events||[]).some(x=>x.kind==='real'),
    ()=>count>=1];
  while(next<5&&criteria[next]())next++;
  if(next!==p.step){p.step=next;changed=true;const name=next>=5?'왕국 발전':next>=4?'연구':next>=3?'현실 퀘스트':next>=2?'곡괭이 강화':'첫 수확';notice(name)}
 }
 if(changed){ctx.persist();if(rerender){ctx.render()}else setTimeout(()=>ctx.render(),0)}
 else if(rerender&&!legacy()&&document.documentElement.dataset.questStep!==String(p.step)){ctx.render()}
 return changed;
};
const banner=()=>{
 if(legacy())return '';
 const p=entry();
 if(p.step<5){const st=STEPS[p.step];return `<section class="q8-tutorial" aria-label="초보자 퀘스트"><div class="q8-chapter">첫 여정 <strong>${p.step+1} / 5</strong></div><div class="q8-tutbody"><span class="q8-tuticon" aria-hidden="true">${st.icon}</span><div><span class="q8-chapter-name">${st.title}</span><h2>${st.task}</h2><p>${st.hint}</p></div></div><div class="q8-progress" aria-label="튜토리얼 진행 ${p.step} / 5"><span style="width:${p.step*20}%"></span></div><button class="q8-tutskip" data-qprogress="skip" type="button">튜토리얼 건너뛰기</button></section>`;}
 const next=suggest();return next?`<div class="q8-next-unlock" aria-label="다음 콘텐츠 해금"><span>🔒 다음 해금</span><strong>${next[1]}</strong><small>${next[2]}</small></div>`:' ';
};
const tutorialHome=({q,mine})=>{const n=step(),active=q?.kind==='active';return `<section class="page q8-first-home">${banner()}${n>=3?`<div class="q6-quest-strip"><div><span>현실 퀘스트</span><strong>${ctx.escape(q.title)}</strong></div><button data-act="${active?'resume':'open-quest'}" data-id="${ctx.escape(q.id)}">${active?'이어하기':'지금 시작'} ›</button></div>`:''}${n>=4?`<button class="q8-study-entry" type="button" data-act="tab" data-tab="study"><span>📖</span><div><strong>첫 연구를 시작해 보자</strong><small>열린 개념을 배우고 4단계 문제 풀기</small></div><span>›</span></button>`:''}${mine}</section>`;};
const firstPane=()=>['build','milestone','forge','gear','decor'].find(available)||'build';
const opts=()=>({step:step(),legacy:legacy(),level:level(),depth:depth(),allowed:['home','quests','study','store','town','forge','gear','map','decor'].filter(available)});
const skip=()=>{const p=entry();if(p.step===5)return; if(!confirm('튜토리얼을 건너뛸까? 기존 재화와 게임 진행은 유지되며, 아직 성장 조건을 충족하지 못한 기능은 잠금 상태로 남아 있어.'))return;p.step=5;p.introSeen=true;ctx.persist();ctx.render();ctx.toast('튜토리얼을 건너뛰었어. 설정에서 조작 안내를 다시 볼 수 있어.')};
const guide=()=>{const text=STEPS.map((x,i)=>`<div class="q8-guide-row"><span>${i+1}</span><div><strong>${x.icon} ${x.title}</strong><small>${x.task}</small></div></div>`).join('');return `<div class="q8-guide"><h2>처음부터 배우는 방법</h2><p>실제 행동을 하면서 새 기능이 열려. 이 안내는 게임 데이터를 바꾸지 않아.</p>${text}<p>이후 모험가 레벨과 갱도 깊이에 따라 시설·공방·탐험이 해금돼.</p></div>`;};
window.QuestProgress={fresh,mount(v){ctx=v;document.addEventListener('click',e=>{if(e.target.closest('[data-qprogress="skip"]')){e.preventDefault();skip()}else if(e.target.closest('[data-act],[data-mine],[data-town],[data-qra],[data-forge]')){setTimeout(()=>audit(true),0)}},true)},entry,step,finished,legacy,available,suggest,audit,banner,tutorialHome,firstPane,guide,skip,debug:opts};
})();