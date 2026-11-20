/* Questline 0.6: build-and-equip workshop, real differentiated mining effects, study technology unlocks. */
(()=>{'use strict';
let ctx=null;
const ITEMS=[
{id:'chain',icon:'⚡',name:'연쇄 타격기',kind:'수동',desc:'4번째 직접 타격에 추가 충격',effect:n=>`4번째 타격 ${Math.round(100+85*n)}% 피해`,req:1,tech:null,base:{gold:38,wood:4,stone:4,insight:0,crystals:0}},
{id:'automaton',icon:'🤖',name:'자동 드론',kind:'자동',desc:'접속하지 않아도 채굴 속도 증가',effect:n=>`자동 채굴 +${Math.round(55*n)}%`,req:3,tech:'os-thread',base:{gold:75,wood:9,stone:8,insight:1,crystals:0}},
{id:'lens',icon:'🔍',name:'광맥 탐지경',kind:'탐사',desc:'희귀 수정 획득 빈도 증가',effect:n=>`추가 수정 발견 기회 +${10*n}%`,req:6,tech:'ml-tree',base:{gold:125,wood:7,stone:13,insight:2,crystals:1}},
{id:'breaker',icon:'🪓',name:'암반 파쇄기',kind:'수동',desc:'단단한 광맥에 직접 타격 추가 효과',effect:n=>`단단한 광맥 타격 +${35*n}%`,req:9,tech:'ic-mod',base:{gold:175,wood:10,stone:16,insight:3,crystals:2}},
{id:'archive',icon:'📚',name:'지식 저장기',kind:'연구',desc:'첫 연구 보상의 잉크 추가',effect:n=>`첫 연구 완료 시 잉크 +${n}`,req:12,tech:'mp-ftl',base:{gold:195,wood:12,stone:15,insight:4,crystals:2}},
{id:'resonator',icon:'🌟',name:'집중 공명기',kind:'현실',desc:'현실 퀘스트로 얻은 집중력의 순간 효과 강화',effect:n=>`집중 폭발 피해 +${50*n}%`,req:16,tech:'ic-pipeline',base:{gold:240,wood:14,stone:21,insight:5,crystals:3}},
{id:'forester',icon:'🪚',name:'목재 회수 날',kind:'생산',desc:'채굴한 광석 6개마다 목재를 추가 회수',effect:n=>`광석 6개마다 목재 +${n}`,req:5,tech:'os-cache',base:{gold:105,wood:9,stone:11,insight:2,crystals:1}},
{id:'scribe',icon:'🖋️',name:'지식 추출기',kind:'연구',desc:'광석 10개마다 연구 잉크를 추가 획득',effect:n=>`광석 10개마다 잉크 +${n}`,req:11,tech:'mp-ftl',base:{gold:190,wood:12,stone:17,insight:5,crystals:2}},
{id:'seeker',icon:'🔮',name:'수정 공명추',kind:'탐사',desc:'광석 12개마다 수정을 확정 획득',effect:n=>`광석 12개마다 수정 +${n}`,req:17,tech:'ic-ntt',base:{gold:310,wood:16,stone:25,insight:7,crystals:5}},
{id:'charged',icon:'🔋',name:'전동 채굴심',kind:'혼합',desc:'직접 타격과 자동 채굴을 동시에 강화',effect:n=>`직접 +${15*n}% · 자동 +${8*n}%`,req:21,tech:'ic-power',base:{gold:385,wood:20,stone:30,insight:10,crystals:6}}
];
const TECHS=[
{id:'os-cache',icon:'🧠',name:'캐시 최적화',effect:'자동 채굴 +10%'},
{id:'os-thread',icon:'🧵',name:'병렬 작업',effect:'자동 채굴 +12%'},
{id:'mp-ftl',icon:'💾',name:'자원 매핑',effect:'수정 발견 +8%'},
{id:'ml-tree',icon:'🌳',name:'광맥 분류',effect:'광맥 보상 +8%'},
{id:'ml-kmeans',icon:'🧬',name:'광맥 군집 분석',effect:'수정 발견 +8%'},
{id:'ic-pipeline',icon:'⚙️',name:'채굴 파이프라인',effect:'자동 채굴 +14%'},
{id:'ic-power',icon:'🔋',name:'저전력 설계',effect:'자동 채굴 +10%'},
{id:'ic-mod',icon:'🔢',name:'정밀 연산',effect:'직접 타격 +12%'}
];
const state=()=>ctx?.getState();
const ensure=()=>{const s=state();if(!s)return {levels:{},equipped:[]};if(!s.forge||typeof s.forge!=='object'||Array.isArray(s.forge))s.forge={};if(!s.forge.levels||typeof s.forge.levels!=='object'||Array.isArray(s.forge.levels))s.forge.levels={};if(!Array.isArray(s.forge.equipped))s.forge.equipped=[];for(const x of ITEMS){s.forge.levels[x.id]=Math.max(0,Math.min(6,Math.floor(Number(s.forge.levels[x.id])||0)))}s.forge.equipped=[...new Set(s.forge.equipped.filter(id=>ITEMS.some(x=>x.id===id&&s.forge.levels[id]>0)))].slice(0,2);return s.forge};
const learned=id=>!!state()?.researchV4?.progress?.[id]?.cleared;
const unlocked=x=>ctx&&((state().mine?.depth||1)>=x.req||(x.tech&&learned(x.tech)));
const cost=x=>{const n=ensure().levels[x.id];const mul=Math.pow(1.61,n);return {gold:Math.ceil(x.base.gold*mul),wood:Math.ceil(x.base.wood*Math.pow(1.3,n)),stone:Math.ceil(x.base.stone*Math.pow(1.3,n)),insight:Math.ceil(x.base.insight*Math.pow(1.28,n)),crystals:Math.ceil(x.base.crystals*Math.pow(1.42,n))}};
const avail=c=>Object.entries(c).every(([k,n])=>(k==='crystals'?(state().mine?.crystals||0):Number(state()[k])||0)>=n);
const money=c=>Object.entries(c).filter(([k,n])=>n>0).map(([k,n])=>({gold:'🪙',wood:'🪵',stone:'🪨',insight:'📘',crystals:'💠'}[k]||k)+' '+n.toLocaleString()).join(' · ');
const techEffects=()=>{const found=TECHS.filter(x=>learned(x.id)).map(x=>x.id);return {auto:(found.includes('os-cache')?.10:0)+(found.includes('os-thread')?.12:0)+(found.includes('ic-pipeline')?.14:0)+(found.includes('ic-power')?.10:0),tap:found.includes('ic-mod')?.12:0,loot:found.includes('ml-tree')?.08:0,rare:(found.includes('mp-ftl')?.08:0)+(found.includes('ml-kmeans')?.08:0)}};
const effects=()=>{const f=ensure(),active=id=>f.equipped.includes(id)?f.levels[id]:0,t=techEffects();return {comboEvery:active('chain')?4:0,comboMult:1+.85*active('chain'),autoMult:1+.55*active('automaton')+t.auto+.08*active('charged'),tapMult:1+t.tap+.15*active('charged'),rare:.1*active('lens')+t.rare,denseMult:1+.35*active('breaker'),lootMult:1+t.loot,studyInk:active('archive'),focusMult:1+.5*active('resonator'),bonusWood:active('forester'),bonusInk:active('scribe'),bonusCrystal:active('seeker')}};
const researchBonus=()=>effects().studyInk;
const panel=()=>{const f=ensure(),m=state().mine||{},t=techEffects();const owned=ITEMS.filter(x=>f.levels[x.id]>0).length;const discovered=TECHS.filter(x=>learned(x.id));return `<section class="q6-forge" aria-label="장비 제작 공방"><div class="q6-forge-head"><div><span class="q6-micro">PRODUCTION · 연구와 채굴이 만나는 곳</span><h2>🛠️ 장비 공방</h2></div><span>장착 ${f.equipped.length}/2 · 제작 ${owned}/${ITEMS.length}</span></div><p class="q6-forge-hint">장비는 2개만 장착할 수 있어. 무엇을 장착하느냐에 따라 실제 채굴·연구 방식이 달라져.</p><div class="q6-equip-slots">${[0,1].map(i=>{const item=ITEMS.find(x=>x.id===f.equipped[i]);return `<div class="q6-equip-slot ${item?'ready':''}"><span>${item?.icon||'＋'}</span><div><strong>${item?.name||'비어 있는 장비칸'}</strong><small>${item?item.effect(f.levels[item.id]):'제작한 장비 중 선택'}</small></div></div>`}).join('')}</div><div class="q6-forge-items">${ITEMS.map(x=>{const n=f.levels[x.id],on=f.equipped.includes(x.id),can=unlocked(x),c=cost(x),aff=avail(c);return `<div class="q6-forge-item ${!can?'locked':''}"><div class="q6-item-symbol">${x.icon}</div><div class="q6-item-main"><div class="q6-item-top"><strong>${x.name}</strong><span>${n?'Lv.'+n:can?'제작 가능':'잠김'} · ${x.kind}</span></div><p>${n?x.effect(n):x.desc}</p>${can?`<small>${n>=6?'최고 단계':money(c)}</small>`:`<small>갱도 ${x.req}층 ${x.tech?'또는 '+(window.QR_NODES?.find(n=>n.id===x.tech)?.title||'연구')+' 완료':''}</small>`}</div><div class="q6-item-acts">${n?`<button type="button" data-forge="equip" data-id="${x.id}" class="q6-equip-btn ${on?'selected':''}">${on?'해제':'장착'}</button>`:''}<button type="button" data-forge="craft" data-id="${x.id}" class="q6-buy-btn" ${!can||!aff||n>=6?'disabled':''}>${n?'강화':'제작'}</button></div></div>`}).join('')}</div><details class="q6-tech-info"><summary>배운 지식으로 열린 기술 ${discovered.length}/${TECHS.length}</summary><div>${TECHS.map(t=>`<p>${learned(t.id)?'✓':'○'} ${t.icon} ${t.name} <span>${learned(t.id)?t.effect:'연구 완료 시 해금'}</span></p>`).join('')}</div></details></section>`};
const mini=()=>{const f=ensure();return `${f.equipped.length}/2 장착 · 수정 💠 ${state().mine?.crystals||0}`};
const craft=id=>{const x=ITEMS.find(x=>x.id===id),f=ensure();if(!x||!unlocked(x)||f.levels[id]>=6)return;const c=cost(x);if(!avail(c)){ctx.toast('재료가 부족해.');return}for(const [k,n]of Object.entries(c)){if(k==='crystals')state().mine.crystals-=n;else state()[k]-=n;}f.levels[id]++;ctx.log('game',`${x.name} ${f.levels[id]}단계 완성`,'⚒️');ctx.persist();ctx.render();ctx.toast(`${x.icon} ${x.name} ${f.levels[id]}단계 · ${x.effect(f.levels[id])}`)};
const equip=id=>{const x=ITEMS.find(x=>x.id===id),f=ensure();if(!x||!f.levels[id])return;if(f.equipped.includes(id))f.equipped=f.equipped.filter(k=>k!==id);else if(f.equipped.length>=2){ctx.toast('장비는 2개만 장착할 수 있어. 먼저 하나를 해제해.');return}else f.equipped.push(id);ctx.persist();ctx.render();};
window.QuestForge={mount(c){ctx=c;ensure()},panel,mini,effects,researchBonus,techEffects,debug:()=>JSON.parse(JSON.stringify(ensure()))};
document.addEventListener('click',e=>{const btn=e.target.closest('[data-forge]');if(!btn||!ctx)return;e.preventDefault();if(btn.dataset.forge==='craft')craft(btn.dataset.id);if(btn.dataset.forge==='equip')equip(btn.dataset.id)},true);
})();