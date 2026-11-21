/* Questline 0.9 | Game-first screens. Stateless presentation: save schema remains v2. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I={gold:'🪙',wood:'🪵',stone:'🪨',insight:'📘',sparks:'✨',crystals:'💠'};
const money=(v)=>Object.entries(v||{}).filter(([k,n])=>k!=='m'&&n>0).map(([k,n])=>`<span class="v9-money" title="${esc(k)}"><span>${I[k]||'◆'}</span><b>${Number(n).toLocaleString()}</b></span>`).join('');
const action=(act,label,id='',cls='')=>`<button type="button" class="v9-button ${cls}" data-act="${act}" ${id?`data-id="${esc(id)}"`:''}>${label}</button>`;
const dock=(data)=>{const {progress,study,dispatch,claim,forge,questDone}=data;const links=[
 ['forge','⚒️','공방',forge,'go-forge'],['study','📚','연구',study,'study'],['map','🧭','탐험',dispatch,'map'],['town','🏘️','마을',claim,'town']];
return `<div class="v9-dock" aria-label="바로가기">${links.filter(([key])=>progress.available(key)).map(([key,ic,label,attention,act])=>`<button type="button" class="v9-dock-item" ${act==='go-forge'?`data-act="go-forge"`:act==='town'?`data-town="all"`:`data-act="tab" data-tab="${act}"`}><span class="v9-dock-icon">${ic}</span><b>${label}</b>${attention?'<i class="v9-alert"></i>':''}</button>`).join('')}${progress.available('quests')?`<button type="button" class="v9-dock-item" data-act="tab" data-tab="quests"><span class="v9-dock-icon">📜</span><b>퀘스트</b>${questDone?'<i class="v9-alert"></i>':''}</button>`:''}</div>`};
const home=({q,mine,village,progress,production,dispatch,dispatchDone,canClaim,studyCount,lv,questDone})=>{
 const active=q?.kind==='active',mineProgress=progress.step(),prodSum=['gold','wood','stone','insight'].reduce((s,k)=>s+(production[k]||0),0);
 return `<section class="page v9-page v9-home">
 <div class="v9-home-stage">
 <div class="v9-play-area">
 <div class="v9-play-ribbon"><span class="v9-ribbon-mark">⚔️</span><span class="v9-ribbon-title">${esc(q?.title||'지금 할 일 하나 시작')}</span><button type="button" data-act="${active?'resume':'open-quest'}" data-id="${esc(q?.id||'starter')}" class="v9-ribbon-go">${active?'이어하기':'시작'} <b>›</b></button></div>
 ${mine}
 </div>
 <aside class="v9-side" aria-label="왕국과 성장">
 ${progress.available('town')?`<div class="v9-world-pane"><div class="v9-pane-top"><strong>🏡 나의 왕국</strong><button type="button" data-town="all" aria-label="생산 시설 모두 보기">관리 ›</button></div>${village}</div>`:''}
 <div class="v9-hero-status"><span class="v9-avatar-orb">⭐</span><span><b>모험가 Lv.${lv.n}</b><i class="v9-xp-track"><em style="width:${lv.p}%"></em></i></span><span class="v9-xp-num">${lv.p}%</span></div>
 <div class="v9-claim-tray">${prodSum?`<button class="v9-collect" type="button" data-act="claim"><b>📦 생산 수령</b><span>${money(production)}</span><strong>받기</strong></button>`:''}${dispatchDone?`<button class="v9-collect" type="button" data-act="tab" data-tab="map">🧭 탐험대 귀환 <strong>확인 ›</strong></button>`:''}${canClaim?`<button class="v9-collect" type="button" data-act="chest">🎁 보물상자 <strong>열기 ›</strong></button>`:''}${!prodSum&&!dispatchDone&&!canClaim?`<div class="v9-silent-production">${progress.available('town')?'🏭 생산 중':'✦ 새로운 왕국'} <span>${progress.available('map')?(dispatch?' · 탐험 '+(dispatchDone?'완료':'진행 중'):' · 탐험대 대기'):''}</span></div>`:''}</div>

 </aside></div></section>`;
};
const STEPS=[['⛏️','광석을 한 번 눌러 봐'],['🪨','광석 한 개를 채굴해 봐'],['⚒️','곡괭이를 한 단계 강화해'],['📜','현실에서 할 일을 하나 시작해'],['📚','첫 연구를 완료해']];
const tutorial=({q,mine,progress,step})=>{
 const n=Math.min(4,Math.max(0,step)),active=q?.kind==='active';
 const instruction=n===4?'첫 연구를 완료해':n===3?'현실의 할 일 하나 시작':STEPS[n][1];
 const go=n===4?`<button class="v92-onboard-go" type="button" data-act="tab" data-tab="study">연구하기 ›</button>`:
   n===3?`<button class="v92-onboard-go" type="button" data-act="${active?'resume':'open-quest'}" data-id="${esc(q?.id||'starter')}">${active?'이어하기':'퀘스트 시작'} ›</button>`:
   `<span class="v92-onboard-hint" aria-hidden="true">↓ 채굴 화면</span>`;
 return `<section class="page v9-page v9-home v9-intro"><div class="v92-onboard" aria-label="현재 튜토리얼 목표">
 <span class="v92-onboard-icon" aria-hidden="true">${STEPS[n][0]}</span><span class="v92-onboard-text"><small>첫 모험 ${n+1}/5</small><strong>${esc(instruction)}</strong></span>
 ${go}<button type="button" class="v92-onboard-skip" data-qprogress="skip" aria-label="튜토리얼 건너뛰기" title="튜토리얼 건너뛰기">건너뛰기</button>
 </div>${mine}</section>`;
};
const questRow=({id,title,icon,source,done,progress})=>`<div class="v9-quest-row ${done?'done':''}"><span class="v9-quest-coin">${esc(icon||'📜')}</span><span class="v9-quest-name">${esc(title)}${source?`<small>${esc(source)}</small>`:''}</span>${done?`<span class="v9-done">✓ 완료</span>`:`<button type="button" class="v9-go" data-act="open-quest" data-id="${esc(id)}">${progress?'이어하기':'시작'}</button>`}</div>`;
const quests=({todos,done,dt,progressOf})=>{
 const ready=Array.isArray(todos)?todos:[];return `<section class="page v9-page v9-quests"><div class="v9-page-head"><span class="v9-head-emblem">📜</span><div><h1>퀘스트 길드</h1><small>지금 할 행동 하나</small></div><button type="button" class="v9-head-tool" data-act="add-todo">＋ 추가</button></div>
 <div class="v9-quest-board"><div class="v9-quest-main">
 <div class="v9-guild-head">오늘의 추천 <span>⚡ 현실 행동</span></div>
 ${questRow({id:'starter',icon:'⚡',title:'일 하나만 펼치기',source:'가장 가벼운 시작',done:done[`starter:${dt}`]})}
 ${questRow({id:'focus',icon:'⏱️',title:'자유 집중',source:'1·3·10·25분'})}
 <div class="v9-quest-row"><span class="v9-quest-coin">🍱</span><span class="v9-quest-name">생활 시간 기록<small>필요할 때 한 번만</small></span><button type="button" class="v9-go" data-act="life">기록</button></div>
 </div><div class="v9-quest-main v9-todo-board"><div class="v9-guild-head">할 일 <span>${ready.length}개</span></div>
 ${ready.length?ready.map(t=>questRow({id:'todo:'+(t.id||t.key),icon:/수면|취침/.test(t.content)?'🌙':'📘',title:t.content,source:t.category||'',progress:progressOf(t)>0})).join(''):`<div class="v9-quest-empty">오늘 남은 할 일이 없어.</div>`}
 <div class="v9-quest-links"><button type="button" data-act="add-todo">＋ 할 일 추가</button><button type="button" data-act="tab" data-tab="study">📚 연구하기 ›</button></div>
 </div></div></section>`;
};
const explore=({zones,selected,opened,dispatch,done,remaining,own,levelCount,sparks})=>{
 const total=zones.length;return `<section class="page v9-page v9-expeditions"><div class="v9-page-head"><span class="v9-head-emblem">🧭</span><div><h1>왕국 탐험</h1><small>${own.size}개 유물 수집</small></div><span class="v9-map-progress">${zones.filter(z=>opened(z)).length} / ${total} 지역</span></div>
 <div class="v9-expedition-layout"><div class="v9-expedition-scene" aria-label="탐험 지역 선택"><div class="v9-world-sky"><span class="v9-map-sun"></span></div><div class="v9-map-trail" aria-hidden="true"></div><div class="v9-expedition-nodes">${zones.map((z,i)=>`<button type="button" class="v9-region ${z.id===selected.id?'selected':''} ${opened(z)?'':'locked'}" data-act="zone" data-id="${z.id}" aria-pressed="${z.id===selected.id}"><span>${opened(z)?z.icon:'🔒'}</span><b>${esc(z.name)}</b></button>`).join('')}</div></div>
 <aside class="v9-region-sheet"><div class="v9-region-hero"><span>${selected.icon}</span><div><small>${opened(selected)?'탐험 가능':'아직 잠긴 지역'}</small><h2>${esc(selected.name)}</h2></div></div><div class="v9-region-facts"><span>✨ ${selected.cost} 불씨</span><span>💎 ${selected.relics.filter(x=>!own.has(x)).length}개 미발견</span></div>${opened(selected)?'':`<div class="v9-region-lock">🔒 시설 레벨 합계 ${selected.req} 필요 · 현재 ${levelCount}</div>`}
 ${dispatch?`<div class="v9-dispatch-status">${done?'🎁 탐험 완료':'🕰️ 탐험 중'}<b>${esc(zones.find(x=>x.id===dispatch.zone)?.name||'탐험')} · ${remaining}</b></div>${done?`<button class="v9-primary-action" data-act="collect-explore">보상 받기</button>`:`<button class="v9-primary-action" disabled>탐험 중</button>`}`:
 `<div class="v9-expedition-actions"><button class="v9-primary-action" type="button" data-act="dispatch" data-id="${selected.id}" data-time="2" ${!opened(selected)||sparks<selected.cost?'disabled':''}>2분 탐험</button><button type="button" class="v9-secondary-action" data-act="dispatch" data-id="${selected.id}" data-time="8" ${!opened(selected)||sparks<selected.cost?'disabled':''}>8분 탐험</button></div>`}
 <div class="v9-relic-row">${selected.relics.map(x=>`<span title="${esc(x)}">${own.has(x)?'💎':'◇'}</span>`).join('')}</div></aside></div></section>`;
};
const strip=(name,icon,onclick,selected)=>`<button type="button" class="v9-shop-tab ${selected?'active':''}" data-act="store-pane" data-pane="${onclick}"><span>${icon}</span><b>${name}</b></button>`;
const shop=({pane,panes,body})=>`<section class="page v9-page v9-shop"><div class="v9-shop-header"><h1>⚒️ 왕국 발전</h1><div class="v9-shop-nav" aria-label="발전 메뉴">${panes.map(([key,icon,label])=>strip(label,icon,key,pane===key)).join('')}</div></div><div class="v9-shop-body">${body}</div></section>`;
const workshop=({items,selected,levels,equipped,cost,unlocked,avail,learned,techs})=>{
 const x=items.find(i=>i.id===selected)||items[0],n=levels[x.id]||0,can=unlocked(x),c=cost(x),aff=avail(c),equippedNow=equipped.includes(x.id);
 return `<div class="v9-workshop"><div class="v9-equipment"><div class="v9-equip-title">장착 장비 <span>${equipped.length}/2</span></div><div class="v9-equip-tiles">${[0,1].map(i=>{const g=items.find(v=>v.id===equipped[i]);return `<div class="v9-equip-tile ${g?'filled':''}"><span>${g?.icon||'＋'}</span><small>${esc(g?.name||'빈 슬롯')}</small></div>`}).join('')}</div><div class="v9-shop-grid">${items.map(i=>{const lv=levels[i.id]||0,a=unlocked(i);return `<button type="button" class="v9-shop-item ${i.id===x.id?'picked':''} ${a?'':'locked'}" data-forge="select" data-id="${i.id}" aria-pressed="${i.id===x.id}"><span class="v9-item-art">${a?i.icon:'🔒'}</span><strong>${esc(i.name)}</strong><small>${lv?'Lv.'+lv:a?i.kind:'해금 전'}</small>${equipped.includes(i.id)?'<i>장착</i>':''}</button>`}).join('')}</div></div><aside class="v9-item-inspector"><div class="v9-item-spotlight">${can?x.icon:'🔒'}</div><span class="v9-item-category">${esc(x.kind)} 장비</span><h2>${esc(x.name)}</h2><p class="v9-item-effect">${n?esc(x.effect(n)):esc(x.desc)}</p>${can?`<div class="v9-item-cost"><small>${n>=6?'최고 단계':'제작 재료'}</small><div>${n>=6?'최대 강화':money(c)}</div></div>`:`<div class="v9-item-unlock">갱도 ${x.req}층${x.tech?' 또는 관련 연구 완료':''}에서 해금</div>`}
 <div class="v9-item-buttons">${n?`<button type="button" class="v9-secondary-action" data-forge="equip" data-id="${x.id}">${equippedNow?'장착 해제':'장착하기'}</button>`:''}<button type="button" class="v9-primary-action" data-forge="craft" data-id="${x.id}" ${!can||!aff||n>=6?'disabled':''}>${n?'강화':'제작'}</button></div></aside></div>`;
};
window.QuestV09={money,home,tutorial,quests,explore,shop,workshop};
})();