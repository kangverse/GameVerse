'use strict';
const $ = id => document.getElementById(id);
const number = n => new Intl.NumberFormat('en-US').format(n);
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SITE_VERSION = '20261010-light-nine';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let cases = [], stats, heroIndex = 0, heroPaused = reduced.matches, chartMode = 'clips', activeField = 'static_scene';
const fieldNames = {static_scene:'Scene structure',subject_motion:'Player behavior',environment_motion:'World dynamics',camera_description:'Camera viewpoint & motion'};

function chooseHero(index) {
  heroIndex = index;
  const c = cases[index], v = $('hero-video');
  v.autoplay = !heroPaused;
  v.poster = c.poster; v.src = c.preview;
  $('hero-game').textContent = c.game; $('hero-index').textContent = String(index+1).padStart(2,'0');
  $('hero-choices').querySelectorAll('button').forEach((b,i) => {b.classList.toggle('active', i===index);b.setAttribute('aria-pressed',String(i===index));});
  if (!heroPaused) v.play().catch(() => {heroPaused=true;updateMotionButton();});
  updateMotionButton();
}
function updateMotionButton(){ $('hero-motion').textContent = heroPaused ? 'Play ▷' : 'Pause Ⅱ'; $('hero-motion').setAttribute('aria-label',heroPaused?'Play background video':'Pause background video'); }
function renderGallery(filter='all') {
  const visible = cases.filter(c => filter==='all'||c.view_group===filter);
  $('gallery').replaceChildren();
  for(const c of visible) {
    const button = document.createElement('button'); button.className='game-card'; button.type='button'; button.setAttribute('aria-label',`Inspect ${c.game} gameplay recording`);
    button.innerHTML=`<div class="card-media"><img src="${escapeHTML(c.poster)}" alt="${escapeHTML(c.game)} gameplay" loading="lazy"><video muted loop playsinline preload="none" aria-hidden="true" data-src="${escapeHTML(c.preview)}"></video><span class="view-tag">${escapeHTML(c.view_label)}</span><span class="open-icon" aria-hidden="true">↗</span></div><div class="card-info"><h3>${escapeHTML(c.game)}</h3><span>${Math.round(c.duration_s)} s</span></div><p class="card-sub">${escapeHTML(c.scene_label)}</p>`;
    const v=button.querySelector('video');
    function play(){if(reduced.matches)return;if(!v.src)v.src=v.dataset.src;v.play().catch(()=>{});}
    function stop(){v.pause();}
    button.addEventListener('pointerenter',play);button.addEventListener('pointerleave',stop);button.addEventListener('focus',play);button.addEventListener('blur',stop);
    button.addEventListener('click',()=>openClip(c,button)); $('gallery').append(button);
  }
  $('gallery-count').textContent = `${String(visible.length).padStart(2,'0')} RECORDINGS`;
}
function renderChart() {
  const data = stats.duration_bins.filter(d=>d.clips>0);
  const max = Math.max(...data.map(d=>d[chartMode]));
  $('duration-bars').replaceChildren();
  for(const d of data){
    const row=document.createElement('div');row.className='bar-row';
    const value=chartMode==='clips'?number(d.clips):number(Math.round(d.hours));
    row.setAttribute('aria-label',`${d.label}: ${value} ${chartMode}`);
    row.innerHTML=`<span class="bar-label">${escapeHTML(d.label)}</span><span class="bar-track"><i style="width:${Math.max(.2,d[chartMode]/max*100)}%"></i></span><span class="bar-value">${value}${chartMode==='hours'?' h':''}</span>`;
    $('duration-bars').append(row);
  }
  $('chart-unit').textContent=`Horizontal axis: ${chartMode==='clips'?'number of clips':'gameplay hours'} · Vertical axis: video duration (seconds).`;
}
function renderAnnotation() {
  const c=cases.find(c=>c.annotation?.static_scene)||cases[0];
  $('annotation-poster').src=c.poster;$('annotation-game').textContent=c.game;
  $('annotation-range').textContent=`${c.annotation_range[0]}–${c.annotation_range[1]} s`;
  $('annotation-content').textContent=c.annotation[activeField]||'No explicit event is described in this segment.';
}
let returnFocus;
function openClip(c,trigger){
  returnFocus=trigger;
  $('dialog-title').textContent=c.game;
  $('dialog-meta').textContent=`${c.view_label} · Original clip ${c.duration_s.toFixed(1)} s · Preview ${c.preview_duration_s} s`;
  $('dialog-video').poster=c.poster;$('dialog-video').src=c.preview;
  $('dialog-annotations').replaceChildren();
  for(const [key,title] of Object.entries(fieldNames)) {
    const section=document.createElement('section');const h=document.createElement('h4'),p=document.createElement('p');
    h.textContent=title;p.textContent=c.annotation[key]||'No explicit event is described in this segment.';section.append(h,p);$('dialog-annotations').append(section);
  }
  $('dialog-source').href=c.source_url;
  $('hero-video').pause();$('gallery').querySelectorAll('video').forEach(v=>v.pause());
  $('clip-dialog').showModal();document.body.classList.add('modal-open');
  if(!reduced.matches)$('dialog-video').play().catch(()=>{});
}
function closeClip(){ $('clip-dialog').close(); }
$('close-dialog').addEventListener('click',closeClip);
$('clip-dialog').addEventListener('click',e=>{if(e.target===$('clip-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeClip();}});
$('clip-dialog').addEventListener('close',()=>{ $('dialog-video').pause();$('dialog-video').removeAttribute('src');$('dialog-video').load();document.body.classList.remove('modal-open');if(!heroPaused)$('hero-video').play().catch(()=>{});returnFocus?.focus(); });
$('hero-motion').addEventListener('click',()=>{heroPaused=!heroPaused;if(heroPaused)$('hero-video').pause();else $('hero-video').play().catch(()=>{});updateMotionButton();});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderGallery(b.dataset.filter);}));
document.querySelectorAll('[data-chart]').forEach(b=>b.addEventListener('click',()=>{chartMode=b.dataset.chart;document.querySelectorAll('[data-chart]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderChart();}));
const annotationTabs=[...document.querySelectorAll('[data-field]')];
annotationTabs.forEach((b,i)=>{
  b.id=`annotation-tab-${i}`;
  b.setAttribute('aria-controls','annotation-content');b.tabIndex=i===0?0:-1;
  b.addEventListener('click',()=>{activeField=b.dataset.field;annotationTabs.forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));x.tabIndex=x===b?0:-1;});$('annotation-content').setAttribute('aria-labelledby',b.id);renderAnnotation();});
  b.addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?annotationTabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+annotationTabs.length)%annotationTabs.length;annotationTabs[j].click();annotationTabs[j].focus();}});
});
$('annotation-content').setAttribute('aria-labelledby','annotation-tab-0');
$('copy-citation').addEventListener('click',async()=>{
  const content=$('bibtex').textContent;
  try{await navigator.clipboard.writeText(content);$('copy-citation').textContent='Copied';$('copy-status').textContent='BibTeX copied to clipboard';}
  catch{const range=document.createRange();range.selectNodeContents($('bibtex'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);$('copy-citation').textContent='Selected — copy text';$('copy-status').textContent='BibTeX selected. Use your keyboard to copy.';}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){$('hero-video').pause();document.querySelectorAll('.game-card video').forEach(v=>v.pause());}else if(!heroPaused&&!$('clip-dialog').open){$('hero-video').play().catch(()=>{});}});

async function init(){
  try{
    const result=await Promise.all(['assets/data/statistics.json','assets/data/cases.json'].map(async path=>{const r=await fetch(`${path}?v=${SITE_VERSION}`);if(!r.ok)throw Error(path);return r.json();}));
    [stats,cases]=result;
    $('stat-clips').textContent=number(stats.clips);$('stat-hours').textContent=number(Math.round(stats.hours));$('stat-frames').textContent=(stats.frames/1e6).toFixed(1)+'M';$('stat-two').textContent=number(stats.two_minute_clips);
    $('two-minute-share').textContent=(stats.two_minute_hours/stats.hours*100).toFixed(1)+'%';
    $('horizon-description').textContent=`${number(stats.two_minute_clips)} continuous two-minute recordings contribute ${number(Math.round(stats.two_minute_hours))} hours of gameplay.`;
    $('statistics-source').textContent=`Source: final retained clip manifest · ${stats.snapshot_date}. Video-track durations and encoded frame counts are measured directly. Two-minute clips: 120 ± 0.05 s. Displayed hours are rounded.`;
    for(let i=0;i<Math.min(5,cases.length);i++){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Show ${cases[i].game}`);b.addEventListener('click',()=>chooseHero(i));$('hero-choices').append(b);}
    chooseHero(Math.min(4,cases.length-1));renderGallery();renderChart();renderAnnotation();
  }catch(e){$('load-error').hidden=false;console.error('Could not load website data',e);}
}
init();
