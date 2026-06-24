let caseSummaries=[];
let currentCase=null;

const $=id=>document.getElementById(id);
const uniq=a=>[...new Set(a.filter(Boolean))].sort();
const sevClass=v=>(v||'').includes('S')?'s':((v||'').includes('A')?'a':'b');
const esc=s=>(s==null?'':String(s));

async function loadJson(url){
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function init(){
  caseSummaries=await loadJson('./data/cases.json');
  fillFilters();
  bindFilters();
  route();
  addEventListener('hashchange',route);
}

function fillFilters(){
  const groups=[
    ['market',uniq(caseSummaries.map(c=>c.market))],
    ['type',uniq(caseSummaries.flatMap(c=>(c.type||'').split('/').map(x=>x.trim()).filter(Boolean)))],
    ['cognition',uniq(caseSummaries.flatMap(c=>c.tags||[]))]
  ];
  groups.forEach(([id,items])=>{
    const el=$(id); if(!el) return;
    items.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;el.appendChild(o)});
  });
}

function bindFilters(){['q','market','type','cognition'].forEach(id=>{const el=$(id); if(el) el.addEventListener('input',renderGrid);});}

function filtered(){
  const q=$('q').value.trim().toLowerCase(),m=$('market').value,t=$('type').value,cg=$('cognition').value;
  return caseSummaries.filter(c=>{
    const hay=[c.title,c.game,c.company,c.market,c.type,c.gameType,c.playerEra,c.summary,...(c.tags||[])].join(' ').toLowerCase();
    return(!q||hay.includes(q))&&(!m||c.market===m)&&(!t||(c.type||'').includes(t))&&(!cg||(c.tags||[]).includes(cg));
  });
}

function renderStats(){
  $('stats').innerHTML=`<div class="stat"><b>${caseSummaries.length}</b><span>已收录案例</span></div><div class="stat"><b>0+5</b><span>分析结构</span></div><div class="stat"><b>v1.0</b><span>方法论版本</span></div><div class="stat"><b>3</b><span>分类维度</span></div>`;
}

function renderGrid(){
  renderStats();
  const list=filtered();
  $('resultCount').textContent=`${list.length} / ${caseSummaries.length} 个案例`;
  const grade=v=>/^[SAB]$/.test(String(v||'').trim());
  $('caseGrid').innerHTML=list.map(c=>{
    const badges=[grade(c.volume)?`<span class="badge ${sevClass(c.volume)}">声量 ${esc(c.volume)}</span>`:'',grade(c.damage)?`<span class="badge ${sevClass(c.damage)}">伤害 ${esc(c.damage)}</span>`:''].join('');
    return `<article class="card caseCard" onclick="openCase('${c.id}')"><div class="caseHead"><div><div class="caseTitle">${esc(c.title)}</div><div class="game">${esc(c.game)} / ${esc(c.company)}</div></div><div class="caseBadges">${badges}</div></div><div class="desc">${esc(c.summary||c.oneLine)}</div><div class="chips">${(c.tags||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div><div class="foot"><span>${esc(c.market)}</span><span>${esc(c.time)}</span></div></article>`;
  }).join('');
}

function openCase(id){location.hash=`case=${id}`;}
function goHome(){location.hash='';}

async function route(){
  const id=(location.hash.match(/case=([^&]+)/)||[])[1];
  if(id){
    const summary=caseSummaries.find(c=>c.id===id)||caseSummaries[0];
    currentCase=await loadJson(summary.caseFile);
    $('dashboard').style.display='none';
    $('detail').style.display='block';
    renderDetail(currentCase);
    scrollTo(0,0);
  }else{
    $('dashboard').style.display='block';
    $('detail').style.display='none';
    renderGrid();
  }
}

const TABS=[['profile','游戏画像'],['recap','事件复盘'],['cause','原因追溯'],['official','官方处置'],['impact','影响效果'],['insight','案例启发']];

function renderDetail(c){
  $('detailHero').innerHTML=`<div class="sub">${esc(c.game)} / ${esc(c.company)}</div><h2>${esc(c.title)}</h2><p class="muted">${esc(c.oneLine)}</p><div class="meta"><span>${esc(c.gameType)}</span><span>${esc(c.playerEra)}</span><span>${esc(c.time)}</span><span>${esc(c.lifecycle)}</span><span>声量 ${esc(c.volume)}</span><span>伤害 ${esc(c.damage)}</span><span>${esc(c.outcome)}</span></div>`;
  $('tabs').innerHTML=TABS.map((x,i)=>`<button class="tab ${i?'':'active'}" data-tab="${x[0]}" onclick="tab('${x[0]}')">${x[1]}</button>`).join('');
  $('tabContent').innerHTML=TABS.map((x,i)=>`<section class="tabPanel ${i?'':'active'}" id="tab-${x[0]}">${renderTab(c,x[0])}</section>`).join('');
}

function tab(id){
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));
  document.querySelectorAll('.tabPanel').forEach(x=>x.classList.toggle('active',x.id===`tab-${id}`));
}

function renderTab(c,id){
  if(id==='profile')return renderProfile(c);
  if(id==='recap')return renderRecap(c);
  if(id==='cause')return renderCause(c);
  if(id==='official')return renderOfficial(c);
  if(id==='impact')return renderImpact(c);
  if(id==='insight')return renderInsight(c);
  return '';
}

/* 0 · 游戏画像 */
function renderProfile(c){
  const p=c.profile||{};const s=p.segments||{};
  const partyCards=(s.parties||[]).map(pt=>`<article class="party party-${esc(pt.tone)}"><span class="partyRole">${esc(pt.role)}</span>${(pt.rows||[]).map(r=>`<p><b>${esc(r.label)}：</b>${esc(r.text)}</p>`).join('')}</article>`).join('');
  const conflicts=(s.conflicts||[]).map(x=>`<article><b>${esc(x.name)}</b><p>${esc(x.text)}</p></article>`).join('');
  const segBlock=(s.list||[]).length?`<div class="block"><h3>玩家类型谱（${esc(s.axisType)}）</h3><table class="table"><tr><th>分群</th><th>玩法目标 / 核心利益</th></tr>${s.list.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.interest)}</td></tr>`).join('')}</table>${partyCards?`<h4>三方利益关系</h4><div class="partyMap">${partyCards}</div>`:''}${s.partiesNote?`<p class="muted partiesNote">${esc(s.partiesNote)}</p>`:''}${conflicts?`<h4>核心矛盾</h4><div class="conclusionGrid">${conflicts}</div>`:''}</div>`:'';

  const glossary=(p.glossary||[]).length?`<div class="block"><h3>社区术语词表</h3><div class="glossary">${p.glossary.map(g=>`<div><b>${esc(g.term)}</b><span>${esc(g.def)}</span></div>`).join('')}</div></div>`:'';
  return `<div class="block"><h3>游戏基础画像</h3><div class="profileGrid">${[['游戏类型与玩法',p.type],['生命周期位置',p.lifecycle],['承重墙张力轴',p.loadBearingAxis],['承重墙是谁',p.loadBearing+(p.loadBearingConfidence?`　〔置信度：${esc(p.loadBearingConfidence)}〕`:'')]].filter(x=>x[1]).map(x=>`<article><b>${x[0]}</b><p>${esc(x[1])}</p></article>`).join('')}</div></div>${segBlock}${glossary}`;
}

/* 1 · 事件复盘 */
function renderRecap(c){
  const r=c.recap||{};const tl=r.timeline||[];
  let lastSeg=null;
  const rows=tl.map(e=>{
    let band='';
    if(e.segment&&e.segment!==lastSeg){band=`<div class="tlBand"><span>${esc(e.segment)}</span></div>`;lastSeg=e.segment;}
    return `${band}<div class="event ${e.side}"><div class="time"><span class="side">${e.side==='official'?'官方':'玩家'}</span>${esc(e.phase)} / ${esc(e.time)}</div>${e.name?`<div class="name">${esc(e.name)}</div>`:''}<div class="eventText">${esc(e.event)}</div>${e.impact?`<div class="impact">影响：${esc(e.impact)}</div>`:''}${(e.tags&&e.tags.length)?`<div class="evTags">${e.tags.map(t=>`<span class="evTag">${esc(t)}</span>`).join('')}</div>`:''}${e.links&&e.links.length?`<div class="eventLinks"><span>来源</span>${e.links.map(l=>`<a target="_blank" href="${esc(l.url)}">${esc(l.label)}</a>`).join('')}</div>`:''}</div>`;
  }).join('');
  const seg=tl.some(e=>e.segment);
  return `${r.background?`<div class="block goldBox"><h3>事件背景</h3><p>${esc(r.background)}</p></div>`:''}<div class="block"><h3>时间线（官方 / 玩家双线，T-window 记法）</h3><div class="timeline${seg?' timelineSeg':''}">${rows}</div></div>`;
}

/* 2 · 原因追溯：催化剂总览 → 玩家心路历程（趋势图含阶段0+可点击折叠卡片）→ 诉求 */
function renderCause(c){
  const ca=c.cause||{};
  const stages=ca.journey||[];
  const trend=stages.length?renderEmotionTrend(stages):'';
  const cn=['一','二','三','四','五','六','七','八'];
  const stageNo=(s,i)=>esc(s.stageNo||cn[i]||(i+1));

  const cats=(ca.catalysts||[]).map(x=>`<span class="catChip">${esc(x)}</span>`).join('');
  const catBanner=cats?`<div class="block catBanner"><h3>本案命中的催化剂</h3><p class="muted">以下因素叠加，把一次普通的版本平衡调整放大为信任级冲突——它们是贯穿整段心路历程的“放大器”。</p><div class="catChips">${cats}</div></div>`:'';

  const stageBody=s=>{
    const head=s.summary?`<div class="storyPoint">${esc(s.summary)}</div>`:'';
    if((s.econ||[]).length){
      return `${head}<div class="econGrid">${s.econ.map(x=>`<article><b>${esc(x.title)}</b><p>${esc(x.text)}</p></article>`).join('')}</div>${s.nature?`<p><b>舆情性质：</b>${esc(s.nature)}</p>`:''}${s.platform?`<p><b>平台放大：</b>${esc(s.platform)}</p>`:''}`;
    }
    return `${head}${s.psychology?`<p><b>玩家怎么想：</b>${esc(s.psychology)}</p>`:''}${s.playerDemand?`<p><b>玩家要什么：</b>${esc(s.playerDemand)}</p>`:''}${s.trigger?`<p><b>触发因素：</b>${esc(s.trigger)}</p>`:''}${(s.evidence||[]).length?`<div class="storyEvidence"><h5>玩家原话摘录</h5>${s.evidence.map(renderEvidenceCard).join('')}</div>`:''}`;
  };

  const cards=stages.map((s,i)=>`<details class="jStage${s.stageNo==='0'?' jStage0':''}" id="jstage-${i}" name="jacc"${i===0?' open':''}><summary><span class="jBadge">阶段${stageNo(s,i)}</span><span class="jHead"><span class="jStageName">${esc(s.title||s.label)}</span><span class="jMeta">${esc(s.time)}｜${esc(s.emotion)}</span></span></summary><div class="jBody">${stageBody(s)}</div></details>`).join('');
  const journeyBlock=`<div class="block"><h3>玩家心路历程</h3><p class="muted">阶段0 是事件前的经济存量底色（决定爆发烈度），阶段一起为本次事件的情绪演变。情绪强度趋势为骨架；点击趋势图上的节点，可展开对应阶段的详情卡片。</p>${trend}<div class="jSpine">${cards}</div></div>`;

  const topics=(ca.topics||[]).map(renderTopic).join('');

  const f=ca.demandFunnel||{};
  const funnel=(f.surface||f.middle||f.deep)?`<div class="block"><h3>诉求三层漏斗</h3><div class="funnelGrid">${[['表层诉求','玩家直接说出口的要求',f.surface],['中层诉求','希望官方真正解决的问题',f.middle],['深层诉求','想重新确认的关系与契约',f.deep]].map((g,i)=>`<section class="funnelLevel level${i+1}"><div class="funnelHead"><b>${g[0]}</b><span>${g[1]}</span></div><ul>${(g[2]||[]).map(x=>(x&&typeof x==='object')?`<li><b class="fnKey">${esc(x.t)}：</b>${esc(x.d)}</li>`:`<li>${esc(x)}</li>`).join('')}</ul></section>`).join('')}</div>${ca.ownership?`<div class="quote"><b>Ownership：</b>${esc(ca.ownership)}</div>`:''}</div>`:'';

  return catBanner+journeyBlock+topics+funnel;
}

function renderTopic(t){
  const chain=(t.chain||[]).map((x,i)=>`<article><b>${i+1}. ${esc(x.name)}</b><p>${esc(x.text)}</p></article>`).join('');
  const ev=(t.evidence||[]).length?`<div class="topicEvidenceHead">关键证据</div><div class="topicEvidence">${t.evidence.map(renderEvidenceCard).join('')}</div>`:'';
  return `<div class="block topicModule">${t.eyebrow?`<span class="moduleEyebrow">${esc(t.eyebrow)}</span>`:''}${t.title?`<h4 class="topicTitle">${esc(t.title)}</h4>`:''}${t.lead?`<p class="topicLead">${esc(t.lead)}</p>`:''}${chain?`<div class="topicChain">${chain}</div>`:''}${t.takeaway?`<div class="topicTakeaway">${esc(t.takeaway)}</div>`:''}${ev}</div>`;
}

function renderEmotionTrend(stages){
  const W=900,H=340,padL=66,padR=28,padT=30,padB=86;
  const iw=W-padL-padR,ih=H-padT-padB,n=stages.length;
  const cn=['一','二','三','四','五','六','七','八'];
  const sno=(s,i)=>esc(s.stageNo||cn[i]||(i+1));
  const sd=t=>(t||'').replace('2025-','').split(/[ /至]/)[0];
  const x=i=>padL+(n===1?iw/2:iw*i/(n-1));
  const y=v=>padT+ih-(Math.max(0,Math.min(100,v))/100)*ih;
  const pts=stages.map((s,i)=>`${x(i)},${y(s.emotionScore||0)}`).join(' ');
  const area=`${padL},${padT+ih} ${pts} ${padL+iw},${padT+ih}`;
  const grid=[0,25,50,75,100];
  return `<div class="trendWrap"><svg class="emoTrend" viewBox="0 0 ${W} ${H}" role="img" aria-label="玩家情感强度趋势"><defs><linearGradient id="emoArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a32d2d" stop-opacity="0.18"/><stop offset="1" stop-color="#a32d2d" stop-opacity="0.02"/></linearGradient></defs>${grid.map(g=>`<line x1="${padL}" y1="${y(g)}" x2="${padL+iw}" y2="${y(g)}" class="tGrid"/><text x="${padL-12}" y="${y(g)+4}" class="tAxis" text-anchor="end">${g}</text>`).join('')}<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+ih}" class="tAxisLine"/><line x1="${padL}" y1="${padT+ih}" x2="${padL+iw}" y2="${padT+ih}" class="tAxisLine"/><text x="22" y="${padT+ih/2}" class="tAxisTitle" transform="rotate(-90 22 ${padT+ih/2})">玩家情感强度</text><polygon points="${area}" fill="url(#emoArea)"/><polyline points="${pts}" class="tLine" fill="none"/>${stages.map((s,i)=>{const sc=s.emotionScore||0;const cy=y(sc);const ly=sc>=75?cy+28:cy-26;return `<g class="tPoint" onclick="openStage(${i})"><line x1="${x(i)}" y1="${cy}" x2="${x(i)}" y2="${padT+ih}" class="tGuide"/><circle cx="${x(i)}" cy="${cy}" r="7"/><text x="${x(i)}" y="${cy-13}" class="tScore" text-anchor="middle">${esc(sc)}</text><text x="${x(i)}" y="${ly}" class="tCallout" text-anchor="middle">${esc(s.label)}</text><text x="${x(i)}" y="${padT+ih+26}" class="tStageNo" text-anchor="middle">阶段${sno(s,i)}</text><text x="${x(i)}" y="${padT+ih+45}" class="tDate" text-anchor="middle">${esc(s.chartDate||sd(s.time))}</text></g>`;}).join('')}</svg><div class="tHint">点击趋势图节点展开对应阶段（每次只展开一个）↓</div></div>`;
}

function openStage(i){
  document.querySelectorAll('.jStage').forEach(d=>{d.open=(d.id==='jstage-'+i);});
  const wrap=document.querySelector('#tab-cause .trendWrap');
  if(wrap) wrap.scrollIntoView({behavior:'smooth',block:'start'});
  const el=document.getElementById('jstage-'+i);
  if(el){el.classList.add('jFlash');setTimeout(()=>el.classList.remove('jFlash'),1400);}
}

/* 3 · 官方处置：关键转向要素（顶部）→ 处置时间线（彩色折叠卡片） */
function renderOfficial(c){
  const d=c.official||{};
  const qClass={good:'q-good',bad:'q-bad',neutral:'q-neutral'};
  const turn=(d.turnElements||[]).length?`<div class="block officialApex"><div class="moduleEyebrow">★ 关键转向要素</div><h3>这次舆情为什么能转好</h3>${d.keyJudgement?`<p class="muted">${esc(d.keyJudgement)}</p>`:''}<div class="turnGrid">${d.turnElements.map(x=>`<article><span class="turnTag">${esc(x.tag)}</span><p>${esc(x.text)}</p></article>`).join('')}</div></div>`:'';
  const rr=d.responseReview;
  const stColor=s=>/未|不足/.test(s)?'q-bad':(/部分/.test(s)?'q-neutral':'q-good');
  let review='';
  if(rr){
    const doubts=((rr.attitude||{}).doubts||[]).map(x=>`<tr><td>${esc(x.doubt)}</td><td><span class="stTag ${stColor(x.status)}">${esc(x.status)}</span></td><td>${esc(x.how)}</td><td>${esc(x.timely)}</td></tr>`).join('');
    const fhead=(key,cls,rest)=>`<h4 class="respHead"><span class="respKey ${cls}">${key}</span><span class="respSub">${rest}</span></h4>`;
    const attitude=rr.attitude?`<div class="respFrame">${fhead('态度','rkAtt','玩家质疑是否被正面回应')}${rr.attitude.note?`<p class="muted">${esc(rr.attitude.note)}</p>`:''}<table class="table respTable"><tr><th>玩家质疑</th><th>是否回应</th><th>如何回应</th><th>是否及时</th></tr>${doubts}</table></div>`:'';
    const frame=(o,key,cls,rest)=>o?`<div class="respFrame">${fhead(key,cls,rest)}<ul>${(o.items||[]).map(x=>`<li><b>${esc(x.name)}：</b>${esc(x.text)}</li>`).join('')}</ul>${o.assess?`<p class="respAssess">${esc(o.assess)}</p>`:''}</div>`:'';
    review=`<div class="block officialApex"><div class="moduleEyebrow">★ 处置评估</div><h3>官方回应拆解与评估</h3>${d.keyJudgement?`<p class="muted">${esc(d.keyJudgement)}</p>`:''}${attitude}<div class="respRow">${frame(rr.improvement,'改进','rkImp','实际修复与机制')}${frame(rr.compensation,'补偿','rkComp','实在的代价')}</div></div>`;
  }
  const reviewBlock=review+turn;
  const cards=(d.stages||[]).map((s,i)=>{
    const q=qClass[s.quality]||qClass.neutral;
    const elems=(s.elements||[]).length?`<span class="oElems">${s.elements.map(e=>`<span class="oElem">${esc(e)}</span>`).join('')}</span>`:'';
    return `<details class="oCard ${q}" id="ocard-${i}" name="oacc"${i===0?' open':''}><summary><span class="oDot"></span><span class="oHead"><span class="oName"><span class="oKind">${esc(s.kind)}</span>${esc(s.name)}</span><span class="oMeta">${esc(s.time)}｜${esc(s.source)}${s.qualityLabel?`　<b class="oQuality">${esc(s.qualityLabel)}</b>`:''}</span></span>${elems}</summary><div class="oBody">${(s.officialExcerpt||[]).length?`<div class="officialQuoteBlock"><b>官方原文 / 要点摘录</b>${s.officialExcerpt.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}<div class="officialValueGrid"><section><h5>有价值的部分</h5><ul>${(s.valuable||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section><h5>低价值 / 未回答的部分</h5><ul>${(s.lowValue||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section></div><div class="officialEffect"><b>实际效果：</b>${esc(s.effect)}</div></div></details>`;
  }).join('');
  const intro=`<div class="block officialIntro goldBox"><h3>官方处置复盘</h3><p>${esc(d.summary)}</p></div>`;
  const timeline=`<div class="block"><h3>官方处置时间线</h3><p class="muted">每张卡片为一次官方动作，点击展开详情。色条表示该动作对舆情的实际作用——<span class="qLegend q-bad">红＝激化 / 失分</span><span class="qLegend q-good">绿＝有效缓解</span><span class="qLegend q-neutral">灰＝作用有限</span>。</p><div class="oSpine">${cards}</div></div>`;
  return `${intro}${timeline}${reviewBlock}${d.caution?`<div class="notice">${esc(d.caution)}</div>`:''}`;
}

/* 4 · 影响效果（声量 ≠ 伤害）：声量维度 → 情绪与行动 → 产品影响 → 三轴四象限判定 */
function renderImpact(c){
  const q=c.impact||{};const quad=q.quadrant||{};

  const metrics=(q.volumeMetrics||[]).map(m=>`<article><b>${esc(m.value)}</b><span>${esc(m.label)}</span><p>${esc(m.note)}</p></article>`).join('');
  const volBlock=`<div class="block"><h3>声量维度</h3><div class="volHead"><span class="volLevel">声量 ${esc(q.volumeLevel)} 级</span><span class="volConf">置信度：${esc(q.volumeConfidence)}</span></div><div class="impactMetricGrid">${metrics}</div></div>`;

  const ea=q.emotionAction||{};
  const phases=(ea.phases||[]).map(p=>`<article class="eaCard tone-${esc(p.tone||'')}"><div class="eaHead"><span class="eaPhase">${esc(p.phase)}</span><b>${esc(p.name)}</b><span class="eaTag">${esc(p.tag)}</span></div><ul>${(p.quotes||[]).map(qt=>`<li>${esc(qt)}</li>`).join('')}</ul></article>`).join('');
  const eaBlock=`<div class="block"><h3>情绪与行动</h3>${ea.summary?`<p>${esc(ea.summary)}</p>`:''}<div class="eaGrid">${phases}</div>${ea.note?`<p class="muted eaNote">${esc(ea.note)}</p>`:''}${ea.caution?`<div class="notice">${esc(ea.caution)}</div>`:''}</div>`;

  const pi=q.productImpact||[];
  const piBlock=`<div class="block"><h3>产品影响</h3><div class="damageGrid">${pi.map(x=>`<article><div><b>${esc(x.name)}</b>${x.level?`<span>${esc(x.level)}</span>`:''}</div><p>${esc(x.text)}</p></article>`).join('')}</div></div>`;

  const strip=t=>esc((t||'').replace(/^[^：]*：/,''));
  const axes=[['声量','akVol','来自谁',quad.axis1],['承重墙','akWall','是谁',quad.axis2],['数据','akData','动没动',quad.axis3]];
  const axisRow=`<div class="axisRow">${axes.map(a=>`<article class="axisCard"><div class="axisHead"><span class="axisKey ${a[1]}">${a[0]}</span><span class="axisSub">${a[2]}</span></div><p>${strip(a[3])}</p></article>`).join('')}</div>`;
  const cell=(key,name,desc)=>{const on=quad.resultCell===key;return `<div class="qmCell${on?' qmActive':''}"><b>${name}</b>${desc?`<small>${desc}</small>`:''}${on?'<span class="qmHere">← 本案落点</span>':''}</div>`;};
  const matrix=`<div class="quadMatrix"><div class="qmCorner">声量 ↓ ／ 数据 →</div><div class="qmColHead">数据动了</div><div class="qmColHead">数据没动</div><div class="qmRowHead">声量来自<br>承重墙</div>${cell('crisis','真危机','')}${cell('deficit','信任赤字累积','延迟爆发')}<div class="qmRowHead">声量来自<br>非承重墙</div>${cell('silent','沉默流失','最易误判')}${cell('noise','真噪声','')}</div><p class="muted qmHint">读法：纵轴看声量来自不来自承重墙、横轴看内部数据动没动；高亮格即本案落点。</p>`;
  const quadBlock=`<div class="block"><h3>三轴四象限判定</h3>${axisRow}${matrix}<div class="quote"><b>判定：</b>${esc(quad.result)}</div>${(q.sideEvidence||[]).length?`<h4>旁证</h4><ul>${q.sideEvidence.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</div>`;

  const valueBlock=q.valueConclusion?`<div class="block researchNote"><h3>价值结论（待数据验证）</h3><p>${esc(q.valueConclusion)}</p></div>`:'';

  const hero=q.headline?`<div class="block impactHero"><h3>${esc(q.headline)}</h3>${q.headlineSub?`<p>${esc(q.headlineSub)}</p>`:''}</div>`:'';
  return `${hero}${volBlock}${eaBlock}${piBlock}${quadBlock}${valueBlock}`;
}

/* 5 · 案例启发（只留可迁移结论，不复述事件 / 情绪 / 处置） */
function renderInsight(c){
  const n=c.insight||{};
  const core=n.coreInsight?`<div class="block goldBox"><h3>核心启发</h3><p class="coreInsight">${esc(n.coreInsight)}</p></div>`:'';
  const traits=(n.cognitionTraits||[]).map(x=>`<article><b>${esc(x.trait)} <span class="tagPill">${esc(x.type)}</span></b><p>${esc(x.text)}</p></article>`).join('');
  const cogBlock=`<div class="block insightApex"><div class="moduleEyebrow">★ 项目北极星落点</div><h3>玩家认知特征</h3>${n.cognitionCoordinate?`<p class="muted">坐标：${esc(n.cognitionCoordinate)}</p>`:''}<div class="conclusionGrid">${traits}</div></div>`;
  const gov=(n.governance||[]).map(x=>`<article><b>${esc(x.name)}</b><p>${esc(x.text)}</p></article>`).join('');
  const govBlock=gov?`<div class="block"><h3>运营治理启发</h3><div class="conclusionGrid">${gov}</div></div>`:'';
  const transfer=(n.transferable||[]).map(x=>`<tr><td>${esc(x.scenario)}</td><td>${esc(x.value)}</td></tr>`).join('');
  const transBlock=transfer?`<div class="block"><h3>可迁移模板价值</h3><table class="table"><tr><th>适用场景</th><th>复用价值</th></tr>${transfer}</table></div>`:'';
  const cross=n.crossCase?`<div class="block researchNote"><h3>跨案例综述（项目终产出 · 占位）</h3><p>${esc(n.crossCase)}</p></div>`:'';
  return core+cogBlock+govBlock+transBlock+cross;
}

function renderEvidenceCard(e){
  const identity=e.playerId||'公开评论用户';
  const meta=[e.platform,e.time,e.sourceType].filter(Boolean).join('｜');
  return `<a class="commentShot" target="_blank" href="${esc(e.url||'#')}"><div class="commentShotTop"><span class="avatar">${esc((e.platform||'评').slice(0,1))}</span><div><b>${esc(identity)}</b><small>${esc(meta)}</small></div></div><div class="commentShotText">${esc(e.text)}</div>${e.note?`<div class="commentShotMeta">${esc(e.note)}</div>`:''}<div class="commentShotFoot"><span>${esc(e.heat||'热度待补')}</span><span>点击查看来源</span></div></a>`;
}

init().catch(err=>{
  document.body.innerHTML=`<div class="app"><div class="block"><h3>页面加载失败</h3><p>请通过本地服务器访问（直接打开 file:// 时浏览器可能阻止 JSON 读取）。</p><p class="muted">${err.message}</p></div></div>`;
});
