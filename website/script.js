'use strict';
const $ = id => document.getElementById(id);
const number = n => new Intl.NumberFormat('en-US').format(n);
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SITE_VERSION = '20261016-slate-rdr2-merged';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const conserveData = !!navigator.connection?.saveData;
let cases = [], stats, continuity, researchResults, heroIndex = 4, heroPaused = reduced.matches || conserveData;
let chartMode = 'clips', activeField = 'static_scene', galleryFilter = 'all', currentClip, returnFocus;
let heroVisible = true, annotationPosition = 0, annotationSeekTarget = null, resultType = 'continuity', scaleCase;
let trajectoryProjection, trajectoryFrame = 0;
const fieldNames = {static_scene:'Scene structure',subject_motion:'Player behavior',environment_motion:'World dynamics',camera_description:'Camera viewpoint & motion'};
const timeLabel = time => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2,'0')}`;
const secondLabel = time => Number.isInteger(time) ? String(time) : time.toFixed(1);

function setupImmersiveMotion() {
  const progress=document.createElement('div');progress.className='scroll-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);
  const targets=[...document.querySelectorAll('.section-heading,.statement>*,.continuity-player,.scale-layout>*,.annotation-layout,.trajectory-layout>*,.resource-card,.citation-heading,.citation-code')];
  targets.forEach((el,index)=>{el.classList.add('reveal');el.style.transitionDelay=`${Math.min(index%4,3)*55}ms`;});
  if(reduced.matches)targets.forEach(el=>el.classList.add('is-visible'));
  else {
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{rootMargin:'0px 0px -9% 0px',threshold:.08});
    targets.forEach(el=>observer.observe(el));
  }
  let pending=false;
  const paint=()=>{
    pending=false;
    const max=Math.max(document.documentElement.scrollHeight-innerHeight,1),ratio=Math.min(scrollY/max,1);
    document.documentElement.style.setProperty('--scroll-progress',`${ratio*100}%`);
    if(!reduced.matches && innerWidth>1000){
      const hero=document.querySelector('.hero-screen'),amount=Math.min(scrollY,720);
      hero?.style.setProperty('--hero-shift',`${amount*.045}px`);
      hero?.style.setProperty('--hero-tilt',`${Math.min(amount*.0022,1.25)}deg`);
    }
  };
  window.addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(paint);}},{passive:true});paint();
}

function chooseHero(index) {
  heroIndex = index;
  const c = cases[index], v = $('hero-video');
  v.autoplay = !heroPaused; v.poster = c.poster; v.src = c.preview;
  $('hero-game').textContent = c.game; $('hero-index').textContent = String(index+1).padStart(2,'0');
  $('hero-choices').querySelectorAll('button').forEach(b => {
    const active = Number(b.dataset.index) === index;
    b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active));
  });
  if (!heroPaused && heroVisible && !document.hidden) v.play().catch(() => {heroPaused=true;updateMotionButton();});
  updateMotionButton();
}
function updateMotionButton() {
  $('hero-motion').textContent = heroPaused ? 'Play ▷' : 'Pause Ⅱ';
  $('hero-motion').setAttribute('aria-label',heroPaused?'Play background video':'Pause background video');
}
function visibleCases() { return cases.filter(c => galleryFilter==='all' || c.view_group===galleryFilter); }
function renderGallery() {
  $('gallery').querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load();});
  $('gallery').replaceChildren();
  for(const c of visibleCases()) {
    const button = document.createElement('button'); button.className='game-card'; button.type='button';
    button.dataset.clip=c.clip_id; button.setAttribute('aria-label',`Inspect ${c.game}, ${c.preview_duration_s} second preview of a ${Math.round(c.duration_s)} second recording`);
    button.innerHTML=`<div class="card-media"><img src="${escapeHTML(c.poster)}" alt="${escapeHTML(c.game)} gameplay" loading="lazy" width="960" height="540"><video muted loop playsinline preload="none" aria-hidden="true" data-src="${escapeHTML(c.preview)}"></video><span class="view-tag">${c.view_group==='first'?'First person':'Third person'}</span><span class="hover-play" aria-hidden="true">Playing preview</span><span class="open-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg></span></div><div class="card-info"><h3>${escapeHTML(c.game)}</h3></div><p class="card-sub"><span class="preview-length">${c.preview_duration_s}s preview</span> · ${Math.round(c.duration_s)}s source clip<br>${escapeHTML(c.scene_label)}</p>`;
    const v=button.querySelector('video'); let previewRequested=false;
    function play() {
      if(reduced.matches || conserveData || document.hidden)return;
      previewRequested=true;
      if(!v.getAttribute('src'))v.src=v.dataset.src;
      v.play().then(()=>{if(previewRequested && !document.hidden && !$('clip-dialog').open)button.classList.add('previewing');else v.pause();}).catch(()=>{});
    }
    function stop(){previewRequested=false;v.pause();button.classList.remove('previewing');}
    button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')play();});
    button.addEventListener('pointerleave',stop);button.addEventListener('focus',play);button.addEventListener('blur',stop);
    button.addEventListener('click',()=>{stop();openClip(c,button);}); $('gallery').append(button);
  }
  $('gallery-count').textContent = `${String(visibleCases().length).padStart(2,'0')} RECORDINGS`;
}
function renderChart() {
  const data=stats.duration_bins.filter(d=>d.clips>0), max=Math.max(...data.map(d=>d[chartMode]));
  $('duration-bars').replaceChildren();
  for(const d of data){
    const row=document.createElement('div');row.className='bar-row';
    const value=chartMode==='clips'?number(d.clips):number(Math.round(d.hours));
    row.setAttribute('aria-label',`${d.label}: ${value} ${chartMode}`);
    row.innerHTML=`<span class="bar-label">${escapeHTML(d.label)}</span><span class="bar-track"><i style="width:${Math.max(.2,d[chartMode]/max*100)}%"></i></span><span class="bar-value">${value}${chartMode==='hours'?' h':''}</span>`;
    $('duration-bars').append(row);
  }
  $('chart-unit').textContent=`Horizontal axis: ${chartMode==='clips'?'number of clips':'gameplay hours (rounded)'} · Vertical axis: video duration (seconds).`;
}
function seekVideo(video, position) {
  const seek=()=>{video.currentTime=Math.max(0,Math.min(position,video.duration-.001));};
  if(video.readyState>=1)seek();
  else {video.addEventListener('loadedmetadata',seek,{once:true});video.load();}
}
function renderContinuity() {
  $('continuity-video').src=scaleCase.preview;
  $('annotation-video').src=continuity.preview;
  $('continuity-source').href=scaleCase.source_url;
  $('annotation-source').href=continuity.source_url;
  $('annotation-seek').max=Math.min(120,continuity.duration_s-.05).toFixed(2);
  for(const [index,keyframe] of scaleCase.keyframes.entries()) {
    const button=document.createElement('button');button.type='button';button.className='keyframe';
    button.setAttribute('aria-label',`Jump to ${keyframe.label_s===120?'the last frame':keyframe.label_s+' seconds'} of the recording`);
    button.setAttribute('aria-pressed',String(keyframe.label_s===0));button.classList.toggle('active',keyframe.label_s===0);
    button.dataset.time=keyframe.seek_s;
    button.innerHTML=`<span class="keyframe-dot" aria-hidden="true"></span><span class="keyframe-image"><img src="${escapeHTML(keyframe.poster)}" alt="${keyframe.label_s} second keyframe" loading="eager" width="480" height="270"></span><span class="keyframe-meta"><b>${timeLabel(keyframe.label_s)}</b><small>${index===0?'START':index===scaleCase.keyframes.length-1?'END':`MOMENT ${String(index+1).padStart(2,'0')}`}</small></span>`;
    button.addEventListener('click',()=>{seekVideo($('continuity-video'),keyframe.seek_s);markKeyframe(keyframe.seek_s);});
    $('keyframes').append(button);
  }
  renderAnnotation(0);renderTrajectory('xz');
}
function markKeyframe(position) {
  const buttons=[...$('keyframes').querySelectorAll('button')];
  const selected=buttons.reduce((nearest,b)=>Math.abs(Number(b.dataset.time)-position)<Math.abs(Number(nearest.dataset.time)-position)?b:nearest,buttons[0]);
  buttons.forEach(b=>{b.classList.toggle('active',b===selected);b.setAttribute('aria-pressed',String(b===selected));});
}
function renderAnnotation(position=annotationPosition) {
  if(!continuity)return;
  annotationPosition=position;
  const captionPosition=Math.min(position,continuity.duration_s-.05);
  const segment=continuity.segments.find(s=>s.start_s<=captionPosition && captionPosition<s.end_s);
  $('annotation-time').textContent=`${timeLabel(position)} / ${timeLabel(Math.round(continuity.duration_s))}`;
  $('annotation-seek').value=position;
  $('annotation-range').textContent=segment ? `SOURCE INTERVAL / ${secondLabel(segment.start_s)}–${secondLabel(segment.end_s)} s` : 'CAPTION REFRESH PENDING';
  $('annotation-content').textContent=segment ? (segment.fields[activeField] || 'No explicit event is described in this interval.') : 'This part of the recording is awaiting the full-duration caption refresh. Explore an earlier interval to inspect the current annotations.';
  updateTrajectoryProgress(position);
}
function updateTrajectoryProgress(position) {
  if(!trajectoryProjection)return;
  const {projected,indices}=trajectoryProjection;
  const duration=continuity.duration_s;
  const ratio=Math.max(0,Math.min(position/duration,1));
  const target=indices[0]+ratio*(indices[indices.length-1]-indices[0]);
  let upper=indices.findIndex(index=>index>=target);
  if(upper<0)upper=indices.length-1;
  const lower=Math.max(0,upper-1);
  const weight=upper===0?0:(target-indices[lower])/Math.max(indices[upper]-indices[lower],1);
  const current=upper===0?projected[0]:projected[lower].map((value,axis)=>value+(projected[upper][axis]-value)*weight);
  const visible=projected.slice(0,Math.max(upper,1));
  if(upper>0)visible.push(current);
  $('trajectory-progress').setAttribute('points',visible.map(p=>p.map(n=>n.toFixed(2)).join(',')).join(' '));
  $('trajectory-current').setAttribute('cx',current[0].toFixed(2));
  $('trajectory-current').setAttribute('cy',current[1].toFixed(2));
  $('trajectory-current-halo').setAttribute('cx',current[0].toFixed(2));
  $('trajectory-current-halo').setAttribute('cy',current[1].toFixed(2));
  $('trajectory-time').textContent=`${timeLabel(position)} / ${timeLabel(Math.round(duration))}`;
}
function renderTrajectory(plane) {
  if(!continuity.trajectory){$('trajectory-overview').hidden=true;return;}
  const a={x:0,y:1,z:2}[plane[0]],b={x:0,y:1,z:2}[plane[1]];
  const points=continuity.trajectory.points;
  const xs=points.map(p=>p[a]),ys=points.map(p=>p[b]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(420/Math.max(maxX-minX,.001),150/Math.max(maxY-minY,.001));
  const midX=(minX+maxX)/2,midY=(minY+maxY)/2;
  const projected=points.map(p=>[285+(p[a]-midX)*scale,115-(p[b]-midY)*scale]);
  trajectoryProjection={projected,indices:continuity.trajectory.sample_indices||points.map((_,index)=>index)};
  const path=projected.map(p=>p.map(n=>n.toFixed(2)).join(',')).join(' ');
  const start=projected[0],end=projected[projected.length-1];
  $('trajectory-svg').innerHTML=`<title id="trajectory-title">Estimated camera-center trajectory, ${plane.toUpperCase()} projection</title><desc id="trajectory-description">Ordered camera centers with a colored position mapped to normalized video progress. Exact frame-to-pose timing is not confirmed.</desc><defs><linearGradient id="trajectory-gradient" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#668df4"/><stop offset="55%" stop-color="#54c7d2"/><stop offset="100%" stop-color="#e5cc91"/></linearGradient></defs><line class="trajectory-axis" x1="55" y1="202" x2="510" y2="202"/><line class="trajectory-axis" x1="55" y1="25" x2="55" y2="202"/><text class="trajectory-label" x="270" y="232">${plane[0].toUpperCase()} (relative units)</text><text class="trajectory-label" x="16" y="165" transform="rotate(-90 16 165)">${plane[1].toUpperCase()} (relative units)</text><polyline class="trajectory-path" points="${path}"/><polyline class="trajectory-progress" id="trajectory-progress" points=""/><circle class="trajectory-start" cx="${start[0]}" cy="${start[1]}" r="4"/><circle class="trajectory-end" cx="${end[0]}" cy="${end[1]}" r="4"/><circle class="trajectory-current-halo" id="trajectory-current-halo" cx="${start[0]}" cy="${start[1]}" r="9"/><circle class="trajectory-current" id="trajectory-current" cx="${start[0]}" cy="${start[1]}" r="5"/><text class="trajectory-label" x="395" y="18">○ Start · ● End</text>`;
  $('trajectory-caption').textContent=`${number(continuity.trajectory.total_samples)} stored samples · ${points.length} displayed camera centers · ${plane.toUpperCase()} projection · Largest 3D axis span normalized to 1`;
  updateTrajectoryProgress(annotationPosition);
}
function populateDialog(c) {
  currentClip=c;
  $('dialog-title').textContent=c.game;
  $('dialog-meta').textContent=`${c.view_group==='first'?'First person':'Third person'} · Preview ${c.preview_duration_s} s · Original clip ${c.duration_s.toFixed(1)} s`;
  $('dialog-range').textContent=`Annotation source interval: ${c.annotation_range[0]}–${c.annotation_range[1]} s. Preview starts at ${c.preview_start_s||0} s.`;
  $('dialog-video').poster=c.poster;$('dialog-video').src=c.preview;
  $('dialog-annotations').replaceChildren();
  for(const [key,title] of Object.entries(fieldNames)) {
    const section=document.createElement('section'),h=document.createElement('h4'),p=document.createElement('p');
    h.textContent=title;p.textContent=c.annotation[key]||'No explicit event is described in this interval.';section.append(h,p);$('dialog-annotations').append(section);
  }
  $('dialog-source').href=c.source_url;
  const visible=visibleCases();$('dialog-position').textContent=`${visible.indexOf(c)+1} / ${visible.length}`;
  if(!reduced.matches)$('dialog-video').play().catch(()=>{});
}
function openClip(c,trigger) {
  returnFocus=trigger;
  document.querySelectorAll('video').forEach(v=>v.pause());
  $('gallery').querySelectorAll('.previewing').forEach(b=>b.classList.remove('previewing'));
  populateDialog(c);$('clip-dialog').showModal();document.body.classList.add('modal-open');
}
function nextClip(delta) {
  const visible=visibleCases(),index=visible.indexOf(currentClip);
  populateDialog(visible[(index+delta+visible.length)%visible.length]);
}
$('close-dialog').addEventListener('click',()=>$('clip-dialog').close());
$('previous-clip').addEventListener('click',()=>nextClip(-1));$('next-clip').addEventListener('click',()=>nextClip(1));
$('clip-dialog').addEventListener('keydown',e=>{if(!['INPUT','TEXTAREA','VIDEO'].includes(e.target.tagName) && (e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();nextClip(e.key==='ArrowRight'?1:-1);}});
$('clip-dialog').addEventListener('click',e=>{if(e.target===$('clip-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('clip-dialog').close();}});
$('clip-dialog').addEventListener('close',()=>{
  const v=$('dialog-video');v.pause();v.removeAttribute('src');v.load();document.body.classList.remove('modal-open');
  const preferred=[...$('gallery').querySelectorAll('button')].find(b=>b.dataset.clip===currentClip?.clip_id);
  const focus=preferred||returnFocus;focus?.focus({preventScroll:true});
  if(focus){const r=focus.getBoundingClientRect();if(r.top<100||r.bottom>innerHeight)focus.scrollIntoView({block:'center',behavior:'instant'});}
  if(!heroPaused && heroVisible && !document.hidden)$('hero-video').play().catch(()=>{});
});
$('hero-motion').addEventListener('click',()=>{heroPaused=!heroPaused;if(heroPaused)$('hero-video').pause();else $('hero-video').play().catch(()=>{heroPaused=true;updateMotionButton();});updateMotionButton();});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
  galleryFilter=b.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderGallery();
}));
document.querySelectorAll('[data-chart]').forEach(b=>b.addEventListener('click',()=>{
  chartMode=b.dataset.chart;document.querySelectorAll('[data-chart]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderChart();
}));
function setupTabs(buttons,panel,onChange) {
  buttons.forEach((b,i)=>{
    b.id=`${panel}-tab-${i}`;b.setAttribute('aria-controls',panel);b.tabIndex=i===0?0:-1;
    b.addEventListener('click',()=>{buttons.forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));x.tabIndex=x===b?0:-1;});$(panel).setAttribute('aria-labelledby',b.id);onChange(b);});
    b.addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[j].click();buttons[j].focus();}});
  });
  $(panel).setAttribute('aria-labelledby',buttons[0].id);
}
setupTabs([...document.querySelectorAll('[data-field]')],'annotation-content',b=>{activeField=b.dataset.field;renderAnnotation();});
$('annotation-seek').addEventListener('input',e=>{const position=Number(e.target.value);annotationSeekTarget=position;renderAnnotation(position);seekVideo($('annotation-video'),position);});
$('annotation-video').addEventListener('timeupdate',()=>{
  const position=$('annotation-video').currentTime;
  if(annotationSeekTarget!==null && Math.abs(position-annotationSeekTarget)>.3)return;
  annotationSeekTarget=null;renderAnnotation(position);
});
function animateTrajectory() {
  trajectoryFrame=0;
  const video=$('annotation-video');
  if(video.paused || document.hidden)return;
  updateTrajectoryProgress(video.currentTime);
  trajectoryFrame=requestAnimationFrame(animateTrajectory);
}
$('annotation-video').addEventListener('play',()=>{if(!trajectoryFrame)trajectoryFrame=requestAnimationFrame(animateTrajectory);});
for(const event of ['pause','ended'])$('annotation-video').addEventListener(event,()=>{cancelAnimationFrame(trajectoryFrame);trajectoryFrame=0;updateTrajectoryProgress($('annotation-video').currentTime);});
$('annotation-video').addEventListener('seeked',()=>updateTrajectoryProgress($('annotation-video').currentTime));
$('continuity-video').addEventListener('timeupdate',()=>markKeyframe($('continuity-video').currentTime));
for(const id of ['annotation-video','continuity-video'])$(id).addEventListener('play',()=>{
  document.querySelectorAll('video').forEach(v=>{if(v!==$(id))v.pause();});
});
document.querySelectorAll('[data-plane]').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('[data-plane]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderTrajectory(b.dataset.plane);
}));
function renderResultScene() {
  const result=researchResults.groups[resultType][Number($('result-scene').value||0)];
  $('result-frames').replaceChildren();
  for(const [frameIndex,frame] of result.frames.entries()) {
    const figure=document.createElement('figure');figure.className='result-frame';
    figure.innerHTML=`<a href="${escapeHTML(frame.src)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHTML(result.label)} generated frame ${frameIndex+1}"><img src="${escapeHTML(frame.src)}" alt="${escapeHTML(result.label)}: generated frame ${frameIndex+1}" loading="lazy" width="960" height="544"></a>`;
    $('result-frames').append(figure);
  }
  $('result-caption').textContent=resultType==='camera'?'Original generated frames · Left: movement control · Right: camera rotation · Select a frame to view it at full resolution.':'Original generated frames · Select a frame to view it at full resolution.';
  $('result-prompt').textContent=result.prompt;
}
function renderResult(type) {
  resultType=type;$('result-scene').replaceChildren();
  researchResults.groups[type].forEach((result,index)=>{const o=document.createElement('option');o.value=index;o.textContent=result.label;$('result-scene').append(o);});
  renderResultScene();
}
setupTabs([...document.querySelectorAll('[data-result]')],'result-panel',b=>renderResult(b.dataset.result));
$('result-scene').addEventListener('change',renderResultScene);
$('copy-citation').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('bibtex').textContent);$('copy-citation').textContent='Copied';$('copy-status').textContent='BibTeX copied to clipboard';}
  catch{const range=document.createRange();range.selectNodeContents($('bibtex'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);$('copy-citation').textContent='Selected — copy text';$('copy-status').textContent='BibTeX selected. Use your keyboard to copy.';}
});
document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('effects-paused',document.hidden);if(document.hidden){document.querySelectorAll('video').forEach(v=>v.pause());}else if(!heroPaused && heroVisible && !$('clip-dialog').open)$('hero-video').play().catch(()=>{});});
new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;if(!heroVisible)$('hero-video').pause();else if(!heroPaused && !document.hidden && !$('clip-dialog').open && !$('annotation-video').currentTime && !$('continuity-video').currentTime)$('hero-video').play().catch(()=>{});},{threshold:.05}).observe($('hero-video'));
new IntersectionObserver(entries=>{$('top').classList.toggle('ambient-paused',!entries[0].isIntersecting);},{threshold:.05}).observe(document.querySelector('.hero-copy'));
const navSections=[...document.querySelectorAll('.nav nav a')].map(a=>({a,section:document.querySelector(a.getAttribute('href'))}));
let scrollPending=false;
function updateNavigation(){scrollPending=false;let current;for(const item of navSections)if(item.section.getBoundingClientRect().top<=160)current=item;navSections.forEach(item=>{item.a.classList.toggle('active',item===current);if(item===current)item.a.setAttribute('aria-current','location');else item.a.removeAttribute('aria-current');});}
window.addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(updateNavigation);}},{passive:true});
async function init() {
  try {
    const result=await Promise.all(['statistics','cases','continuity','scale','results'].map(async name=>{const response=await fetch(`assets/data/${name}.json?v=${SITE_VERSION}`);if(!response.ok)throw Error(name);return response.json();}));
    [stats,cases,continuity,scaleCase,researchResults]=result;
    $('stat-clips').textContent=number(stats.clips);$('stat-hours').textContent=number(Math.round(stats.hours));$('stat-frames').textContent=(stats.frames/1e6).toFixed(1)+'M';$('stat-two').textContent=number(stats.two_minute_clips);
    $('two-minute-share').textContent=(stats.two_minute_hours/stats.hours*100).toFixed(1)+'%';
    $('horizon-description').textContent=`${number(stats.two_minute_clips)} continuous two-minute recordings contribute ${number(Math.round(stats.two_minute_hours))} hours of gameplay.`;
    $('statistics-source').textContent=`Source: final retained clip manifest · ${stats.snapshot_date}. Video-track durations and encoded frame counts are measured directly. Two-minute clips: 120 ± 0.05 s. Displayed hours are rounded.`;
    for(const [index,label] of [[4,'Elden Ring'],[7,'The Witcher 3'],[8,'Odyssey'],[1,'GTA V'],[5,'Avatar']]) {
      const b=document.createElement('button');b.type='button';b.dataset.index=index;b.textContent=label;
      b.setAttribute('aria-label',`Show ${cases[index].game} preview`);b.addEventListener('click',()=>chooseHero(index));$('hero-choices').append(b);
    }
    chooseHero(4);renderGallery();renderChart();renderContinuity();renderResult('continuity');setupImmersiveMotion();updateNavigation();
  } catch(error) {$('load-error').hidden=false;console.error('Could not load website data',error);}
}
init();
