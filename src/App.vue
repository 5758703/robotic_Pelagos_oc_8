<script setup>
import { ref, shallowRef, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { stateAt, pressureHistory, armPoints, P, peak } from './model.js';
import {createAudioEngine} from './score.js';
import {filmCurrent} from './film.js';
import { createViewer, qualityLevels } from './viewer.js';
import { beats, beatSeconds, tourDuration, tourAt } from './tour.js';
const canvas=ref(),ready=ref(false),error=ref(''),state=shallowRef(stateAt(.18));
const current=ref(0),soundEnabled=ref(false),pressureSamples=shallowRef([]);
const capacity=stateAt(.25,P.currentMax);
const phase=ref(.18),playing=ref(true),auto=ref(!matchMedia('(prefers-reduced-motion: reduce)').matches),panels=ref(true),showNotes=ref(false);
const subsystem=ref('all'),mode=ref('assembled'),view=ref('hero'),labels=ref(true),wake=ref(true),quality=ref('studio');
const callouts=shallowRef([]),fps=ref(0),runtime=ref(0),tourTime=ref(0),cursor=ref({x:800,y:70,press:false}),gpu=ref('');
const names={all:'全部系统',mantle:'外套膜',optics:'视觉单元',arm2:'机械臂 02',siphon:'虹吸管',beak:'喙'};
const english={mantle:'MANTLE SHELL',optics:'OPTIC ARRAY',arm2:'ARM CHAIN / R2',siphon:'SIPHON NOZZLE',beak:'TWIN BEAK'};
const subButtons=[['all','完整装配'],['optics','Optics'],['mantle','Mantle'],['arm2','Arm 02'],['siphon','Siphon'],['beak','Beak']];
const views=[['hero','Hero'],['front','Front'],['side','Side'],['top','Top'],['underside','Under']];
const modes=[['assembled','装配'],['isolate','隔离'],['cut','剖切'],['solo','单独'],['exploded','展开']];
const tour=computed(()=>tourAt(tourTime.value));
const history=computed(()=>pressureHistory(state.value.phase,65,state.value.current));
const pressureCeiling=computed(()=>Math.max(state.value.peakPressure,...pressureSamples.value.map(s=>s.pressure)));
function recordPressure(time,s){pressureSamples.value=[...pressureSamples.value.filter(v=>v.time>=time-P.historySeconds),{time,pressure:s.pressure}];}
const chart=computed(()=>pressureSamples.value.length>1?pressureSamples.value.map(s=>`${Math.max(0,1-(pressureSamples.value.at(-1).time-s.time)/P.historySeconds)*240},${78-s.pressure/pressureCeiling.value*66}`).join(' '):history.value.map((p,i)=>`${i/(history.value.length-1)*240},${78-p/pressureCeiling.value*66}`).join(' '));
const armPaths=computed(()=>Array.from({length:P.armCount},(_,i)=>armPoints(i,state.value.phase,state.value.current).map((p,j)=>`${j?'L':'M'}${120+p[0]*112},${105+p[2]*112}`).join(' ')));
const display=()=>({subsystem:subsystem.value,mode:mode.value,labels:labels.value,wake:wake.value});
const fmt=(n,d=1)=>Number(n).toFixed(d);
const runtimeText=computed(()=>new Date(runtime.value*1000).toISOString().slice(11,19));
let viewer,raf,last=0,lastInput=0,frame=0,accum=0,count=0,tourAction=-1,dead=false,inspection=false,audioEngine=null,exporting=false,exportTime=0,exportCues=[];
function takeControl(){inspection=false;auto.value=false;lastInput=performance.now();}
function selectSub(key){if(key==='all')mode.value='assembled';subsystem.value=key;viewer?.setView(view.value,display());}
function selectMode(key){if(key==='exploded'&&mode.value!=='exploded')cue('separation');mode.value=key;if(key!=='assembled'&&key!=='exploded'&&subsystem.value==='all')subsystem.value='mantle';viewer?.setView(view.value,display());}
function selectView(key){view.value=key;viewer?.setView(key,display());}
function setPhase(event){playing.value=false;phase.value=Number(event.target.value);state.value=stateAt(phase.value,current.value);}
function setCurrent(event){takeControl();current.value=Number(event.target.value);playing.value=true;state.value=stateAt(phase.value,current.value);}
function cue(kind){if(exporting)exportCues.push({time:exportTime,kind});else audioEngine?.cue(kind);}
function buttonSound(e){if(e.target.closest('button'))cue('click');}
async function toggleSound(){audioEngine??=createAudioEngine();soundEnabled.value=!soundEnabled.value;await audioEngine.enable(soundEnabled.value);if(soundEnabled.value)audioEngine.cue('click');}
function reset(){subsystem.value='all';mode.value='assembled';selectView('hero');}
function resumeTour(){auto.value=true;playing.value=true;tourAction=-1;}
function applyBeat(index,instant=false){const b=beats[index];subsystem.value=b.subsystem;mode.value=b.mode;view.value=b.camera;viewer?.update(state.value,display(),0,true);viewer?.setView(b.camera,display(),instant);}
function goBeat(index){takeControl();tourTime.value=index*beatSeconds;applyBeat(index);}
function setQuality(){viewer?.setQuality(quality.value);}
let pointerHeld=false;
function input(e){
  if(!e.isTrusted)return;
  if(e.type==='pointerdown')pointerHeld=true;
  if(e.type==='pointerup'||e.type==='pointercancel'){pointerHeld=false;lastInput=performance.now();return;}
  if(e.type==='pointermove'&&!pointerHeld)return;
  if(e.target?.closest?.('[data-tour-toggle]'))return;
  takeControl();
}
function keydown(e){input(e);if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;if(e.key.toLowerCase()==='h')panels.value=!panels.value;if(e.code==='Space'){e.preventDefault();playing.value=!playing.value;}}
function autoClick(id){document.getElementById(id)?.click();}
function runTour(dt){
  tourTime.value=(tourTime.value+dt)%tourDuration;
  const t=tour.value,b=t.beat;
  const stage=Math.min(2,Math.floor(t.local/1.3));
  const key=t.index*3+stage;
  const ids=[`sub-${b.subsystem}`,`mode-${b.mode}`,`view-${b.camera}`];
  const rect=document.getElementById(ids[stage])?.getBoundingClientRect();
  if(rect){const amount=1-Math.exp(-dt*7);cursor.value={x:cursor.value.x+(rect.left+rect.width*.65-cursor.value.x)*amount,y:cursor.value.y+(rect.top+rect.height*.6-cursor.value.y)*amount,press:false};}
  if(t.local%1.3>.8&&tourAction!==key){autoClick(ids[stage]);tourAction=key;cursor.value.press=true;}
}
function loop(now){
  if(dead)return;
  const dt=last?Math.min((now-last)/1000,.1):0;last=now;runtime.value+=dt;
  if(inspection){raf=requestAnimationFrame(loop);return;}
  if(!auto.value&&!pointerHeld&&now-lastInput>P.idleSeconds*1000&&!showNotes.value){resumeTour();}
  if(auto.value)runTour(dt);
  if(playing.value)phase.value=(phase.value+dt/stateAt(phase.value,current.value).period)%1;
  const s=stateAt(phase.value,current.value);viewer.update(s,display(),dt);audioEngine?.update(s,playing.value);
  const skip=qualityLevels[quality.value].panelSkip;
  if(frame++%skip===0){state.value=s;recordPressure(runtime.value,s);callouts.value=viewer.labels(display());}
  accum+=dt;count++;if(accum>.5){fps.value=Math.round(count/accum);accum=0;count=0;}
  raf=requestAnimationFrame(loop);
}
onMounted(async()=>{
  for(const event of ['pointerdown','pointerup','pointercancel','pointermove','wheel'])window.addEventListener(event,input,{capture:true,passive:true});
  window.addEventListener('keydown',keydown);document.addEventListener('click',buttonSound);
  try{
    viewer=await createViewer(canvas.value,takeControl);gpu.value=viewer.gpu;
    if(/Intel|Iris|UHD|SwiftShader|llvmpipe/i.test(viewer.gpu)){quality.value='eco';setQuality();}
    ready.value=true;lastInput=performance.now();
    canvas.value.addEventListener('pointerup',e=>{const picked=viewer.pick(e);if(picked){selectSub(names[picked]?picked:'arm2');}});
    // Public inspection interface also used by the reproducible QA script.
    window.oc8={state:()=>stateAt(phase.value,current.value),parameters:P,gpu:viewer.gpu,
      inspect(p,beat=0){takeControl();playing.value=false;phase.value=p;state.value=stateAt(p,current.value);pressureSamples.value=[];tourTime.value=beat*beatSeconds;applyBeat(beat,true);callouts.value=viewer.labels(display());},
      snapshot:()=>({phase:phase.value,current:current.value,soundEnabled:soundEnabled.value,mode:mode.value,subsystem:subsystem.value,view:view.value,auto:auto.value,playing:playing.value,fps:fps.value,drawCalls:viewer.renderer.info.render.calls,triangles:viewer.renderer.info.render.triangles,gpu:viewer.gpu,quality:quality.value}),
      transitionStart(beat){takeControl();playing.value=false;inspection=true;const b=beats[beat];subsystem.value=b.subsystem;mode.value=b.mode;view.value=b.camera;viewer.setView(b.camera,display());},
      transitionSample(seconds){viewer.seekTransition(seconds);viewer.update(state.value,display(),seconds===0?0:P.inspectionStep);callouts.value=viewer.labels(display());return {camera:viewer.camera.position.toArray(),roots:viewer.machine.arms.map(a=>a.segments[0].position.toArray())};},
      async prepareFilm(){takeControl();inspection=true;exporting=true;soundEnabled.value=true;exportTime=0;exportCues=[];phase.value=.18;current.value=filmCurrent(0);tourTime.value=0;tourAction=-1;runtime.value=0;auto.value=true;playing.value=true;subsystem.value='all';mode.value='assembled';view.value='hero';pressureSamples.value=[];quality.value='balanced';setQuality();viewer.setClock(0);state.value=stateAt(phase.value,current.value);viewer.update(state.value,display(),0,true);viewer.setView('hero',display(),true);await nextTick();},
      async renderFilmFrame(time,fpsValue=30){const dt=time-exportTime;exportTime=time;viewer.setClock(time*1000);current.value=filmCurrent(time);runtime.value=time;runTour(dt);phase.value=(phase.value+dt/stateAt(phase.value,current.value).period)%1;const s=stateAt(phase.value,current.value);state.value=s;recordPressure(time,s);viewer.update(s,display(),dt);callouts.value=viewer.labels(display());fps.value=fpsValue;await nextTick();return {time,...s};},
      filmCues:()=>exportCues,
      resume:resumeTour,
      scene:viewer.machine.root,
      renderer:viewer.renderer
    };
    raf=requestAnimationFrame(loop);
  }catch(e){error.value=e.message;console.error(e);}
});
onBeforeUnmount(()=>{dead=true;cancelAnimationFrame(raf);viewer?.dispose();for(const event of ['pointerdown','pointerup','pointercancel','pointermove','wheel'])window.removeEventListener(event,input,true);window.removeEventListener('keydown',keydown);document.removeEventListener('click',buttonSound);audioEngine?.dispose();delete window.oc8;});
</script>

<template>
  <main class="console" :class="{'panels-hidden':!panels}">
    <header class="masthead">
      <div class="brand-mark" aria-label="Pelagos octopus mark"><svg viewBox="0 0 70 70" fill="none"><path d="M20 30c0-22 30-22 30 0v7H20zM22 37c0 18-17 19-17 7m23-7c0 25-17 25-17 15m23-15v17c0 13-10 13-10 5m16-22v17c0 13 10 13 10 5m-4-22c0 25 17 25 17 15M50 37c0 18 17 19 17 7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="29" cy="28" r="3" fill="currentColor"/><circle cx="42" cy="28" r="3" fill="currentColor"/></svg><span>OC—8</span></div>
      <div class="identity"><div class="eyebrow">ROBOTIC CEPHALOPOD / FIELD SIMULATOR</div><h1>Pelagos OC-8<span>/</span></h1><p>八臂仿生机器人 · 数字孪生实验台</p></div>
      <div class="jet-load"><div>JET LOAD <strong>{{fmt(state.thrust/capacity.thrust*100,0)}}%</strong></div><div class="load-ticks"><i v-for="n in 32" :key="n" :class="{lit:n<=state.thrust/capacity.thrust*32}"></i></div><div class="load-labels"><span>IDLE</span><span>CRUISE</span><span>BURST</span></div></div>
      <div class="header-metric"><small>RUNTIME</small><b>{{runtimeText}}</b></div>
      <div class="header-metric status"><small>CONTROL</small><b><i></i>{{auto?'AUTO TOUR':'VISITOR'}}</b></div>
    </header>

    <div class="workspace">
      <aside class="left-rail panels">
        <section class="panel thrust-panel"><div class="panel-title"><h2>喷射推力 <span>JET THRUST</span></h2><span class="index">01</span></div>
          <div class="hero-number"><strong data-testid="thrust">{{fmt(state.thrust,2)}}</strong><span>N</span></div>
          <div class="secondary-reading"><span>外套膜表压</span><b>{{fmt(state.pressure/1000,2)}} <small>kPa</small></b></div>
          <div class="chart-caption">MANTLE PRESSURE <span>{{fmt(pressureCeiling/1000,0)}} kPa</span></div>
          <svg class="pressure-chart" viewBox="0 0 240 90" aria-label="最近1.2秒外套膜压力"><defs><linearGradient id="chartFade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f15c29" stop-opacity=".16"/><stop offset="1" stop-color="#f15c29" stop-opacity="0"/></linearGradient></defs><path d="M0 12H240M0 45H240M0 78H240" class="chart-grid"/><polygon :points="`0,78 ${chart} 240,78`" fill="url(#chartFade)"/><polyline :points="chart" fill="none" stroke="#ef622f" stroke-width="2"/><circle cx="240" :cy="78-state.pressure/pressureCeiling*66" r="3" fill="#ef622f"/></svg>
          <div class="chart-times"><span>−{{P.historySeconds.toFixed(1)}} S</span><span>NOW</span></div><div class="panel-foot"><span>{{state.flow>0?'喷射中':'补水 / 换向'}}</span><b>{{fmt(state.frequency,2)}} Hz</b></div>
        </section>
        <section class="panel arms-panel"><div class="panel-title"><h2>臂链卷曲 <span>ARM CURL</span></h2><span class="index">02</span></div><p class="micro">各臂曲率响应 / {{P.armCount}} CHANNELS</p>
          <div v-for="(curl,i) in state.curls" :key="i" class="arm-row" :class="{selected:subsystem==='arm2'&&i===1}" @click="selectSub('arm2')"><span>{{i<4?'R':'L'}}{{i%4+1}}</span><div class="bar"><i :style="{width:`${curl*100}%`}"></i></div><b>{{fmt(curl*100,0)}}<small>%</small></b></div>
        </section>
        <section class="panel flow-panel"><div class="panel-title"><h2>流体状态 <span>FLUID STATE</span></h2><span class="index">03</span></div><div class="pair"><div><small>JET VELOCITY</small><b>{{fmt(state.velocity,2)}}<em>m/s</em></b></div><div><small>DISPLACEMENT</small><b>{{fmt(state.displacement*1000,2)}}<em>L</em></b></div></div><div class="current-control"><label for="water-current">水流 <span>WATER CURRENT</span><output data-testid="current">{{fmt(state.current,2)}} m/s</output></label><input id="water-current" aria-label="Water current" type="range" min="0" :max="P.currentMax" step="0.01" :value="current" @input="setCurrent"/><div class="current-readings"><span>0 — {{P.currentMax}} m/s</span><span>HOLD LOAD <b>{{fmt(state.drag,1)}} N</b></span></div></div></section>
      </aside>

      <section class="viewport" aria-label="交互式三维机械八爪鱼">
        <div class="view-top"><span>MODEL OC-8 <i>REV. B</i></span><span>{{mode==='exploded'?'SERVICE / OPEN':mode==='cut'?'SECTION / A—A':'LIVE DIGITAL TWIN'}}</span></div>
        <svg class="orbital-grid" viewBox="0 0 900 680" aria-hidden="true"><ellipse cx="450" cy="370" rx="365" ry="236"/><ellipse cx="450" cy="370" rx="290" ry="300" transform="rotate(35 450 370)"/><path d="M450 25V75M450 625V660M20 370H80M820 370H880"/><circle cx="450" cy="70" r="4"/><circle cx="815" cy="370" r="4"/></svg>
        <canvas ref="canvas" :class="{ready}" aria-label="拖动旋转，滚轮缩放"></canvas>
        <div v-if="!ready" class="loading"><div class="loading-ring"></div><b>{{error?'无法启动三维视图':'PREPARING THE SPECIMEN'}}</b><span>{{error||'正在预热材质与阴影…'}}</span></div>
        <svg v-if="ready&&labels" class="callouts" :viewBox="`0 0 ${canvas?.clientWidth||900} ${canvas?.clientHeight||680}`"><g v-for="c in callouts" :key="c.key"><path :d="`M${c.x} ${c.y} L${c.lx+(c.lx>c.x?-8:124)} ${c.ly+6} L${c.lx} ${c.ly+6}`"/><circle :cx="c.x" :cy="c.y" r="2.8"/><rect :x="c.lx-7" :y="c.ly-9" width="139" height="34" rx="2"/><text :x="c.lx" :y="c.ly+4">{{english[c.key]}}</text><text class="callout-sub" :x="c.lx" :y="c.ly+19">{{names[c.key]}}</text></g></svg>
        <div class="specimen-caption"><div class="caption-line"></div><small>{{mode==='exploded'?'MAINTENANCE CONFIGURATION':'SOFT-ARM MANIPULATOR'}}</small><h2>{{mode==='exploded'?'Mantle open.':subsystem==='all'?'Engineered to flow.':english[subsystem]}}</h2><p>{{mode==='exploded'?'外套膜检修展开 · 泵芯可视':names[subsystem]+' · '+state.stage}}</p></div>
        <div class="viewport-bottom"><span><i class="live-dot"></i> {{ready?'LIVE MODEL':'INITIALIZING'}}</span><span>拖动旋转 / 滚轮缩放 / H 隐藏面板</span><span>{{fps}} FPS</span></div>
      </section>

      <aside class="right-rail panels">
        <section class="panel schematic-panel"><div class="panel-title"><h2>机构示意 <span>SCHEMATIC</span></h2><span class="index">04</span></div>
          <svg viewBox="0 0 240 215" class="schematic" aria-label="由相同相位模型驱动的机构俯视图"><path d="M120 5V205M10 105H230" stroke="#d6dbd5" stroke-dasharray="3 4"/><circle cx="120" cy="105" r="78" fill="none" stroke="#e2e5df"/><path v-for="(path,i) in armPaths" :key="i" :d="path" :stroke="i===1?'#ef622f':'#65756d'" fill="none" stroke-width="5" stroke-linecap="round"/><ellipse cx="120" cy="105" :rx="21*state.scale" :ry="26*state.scale" fill="#e5e9e1" stroke="#60746b"/><circle cx="120" cy="105" :r="11+state.piston*160" fill="none" stroke="#ef622f" stroke-width="2"/><path :d="`M120 129v${8+state.valve*20}`" stroke="#ef622f" stroke-width="3"/><circle cx="113" cy="120" r="3" fill="#202724"/><circle cx="127" cy="120" r="3" fill="#202724"/></svg>
          <div class="schematic-readings"><span>VOLUME <b>{{fmt(state.volume*1000,2)}} L</b></span><span>STROKE <b>{{fmt(state.piston*1000,1)}} mm</b></span></div>
        </section>
        <section class="panel assembly-panel"><div class="panel-title"><h2>子系统 <span>ASSEMBLIES</span></h2><span class="index">05</span></div><div class="button-grid"><button v-for="[key,label] in subButtons" :id="`sub-${key}`" :key="key" :class="{active:subsystem===key}" @click="selectSub(key)">{{label}}</button></div><div class="segmented"><button v-for="[key,label] in modes" :id="`mode-${key}`" :key="key" :class="{active:mode===key}" @click="selectMode(key)">{{label}}</button></div></section>
        <section class="panel display-panel"><div class="panel-title"><h2>观察视角 <span>CAMERA</span></h2><span class="index">06</span></div><div class="button-grid cameras"><button v-for="[key,label] in views" :id="`view-${key}`" :key="key" :class="{active:view===key}" @click="selectView(key)">{{label}}</button></div><div class="toggles"><label><input type="checkbox" v-model="labels">标注</label><label><input type="checkbox" v-model="wake">喷流</label><button id="reset" class="text-button" @click="reset">重置 ↺</button></div></section>
        <section class="panel quality-panel"><div class="panel-title"><h2>渲染质量</h2><span class="live-badge">ONLINE</span></div><select v-model="quality" @change="setQuality" aria-label="渲染质量"><option v-for="(q,k) in qualityLevels" :key="k" :value="k">{{q.name}}</option></select><button id="sound-toggle" class="sound-button" :aria-pressed="soundEnabled" @click="toggleSound">{{soundEnabled?'♫ Sound on':'♪ Enable sound'}}</button><button class="notes-button" @click="showNotes=true">参数来源与手算校验 <span>↗</span></button></section>
      </aside>
    </div>

    <footer class="timeline panels"><button class="play" @click="playing=!playing" :aria-label="playing?'暂停相位':'播放相位'">{{playing?'Ⅱ':'▶'}}</button><div class="transport"><div class="transport-title"><strong>{{auto?'自动导览':'自由探索'}}</strong><span>{{tour.beat.name}}</span><button data-tour-toggle @click="auto?takeControl():resumeTour()" :class="{engaged:auto}">{{auto?'接管控制':'恢复导览'}}</button></div><div class="phase-control"><label for="phase">JET PHASE</label><input id="phase" type="range" min="0" max="1" step="0.001" :value="phase" @input="setPhase" :style="{'--fill':`${phase*100}%`}"/><output>{{fmt(phase,3)}}</output></div><div class="tour-beats"><button v-for="(b,i) in beats" :key="b.name" :class="{current:tour.index===i}" @click="goBeat(i)" :title="b.name"><i></i><span>{{b.name.split(' / ')[0]}}</span></button></div></div><div class="tour-state"><b>{{auto?'AUTOPILOT':'MANUAL'}}</b><span>{{auto?'点击任意位置接管':`${P.idleSeconds} s 静置后恢复导览`}}</span></div></footer>
    <div class="page-foot"><span>PELAGOS MARINE ROBOTICS</span><span>PROCEDURAL STUDY · {{P.armCount}} ARMS · SI UNITS</span><span>DESIGN ESTIMATES / NOT MEASURED HARDWARE</span></div>
    <div v-if="auto&&ready" class="tour-cursor" :class="{press:cursor.press}" :style="{transform:`translate(${cursor.x}px,${cursor.y}px)`}"><svg viewBox="0 0 24 30"><path d="M2 1L3 24L9 18L14 28L18 26L13 16L22 15Z" fill="#202724" stroke="white" stroke-width="2"/></svg><span>AUTO</span></div>
    <button v-if="!panels" class="restore-panels" @click="panels=true">显示控制台 · H</button>
    <div v-if="showNotes" class="modal-backdrop" @click.self="showNotes=false"><section class="notes-modal" role="dialog" aria-modal="true" aria-labelledby="notes-title"><button class="close" @click="showNotes=false" aria-label="关闭">×</button><p class="eyebrow">MODEL NOTES / REV. B</p><h2 id="notes-title">一个相位，整个系统。</h2><p>外形参考提供的机械八爪鱼图片。所有尺寸、材料和物理系数均为 <b>my guess（设计估算）</b>，没有真实硬件传感器接入。</p><div class="formula">x = (1 − cos 2πp) / 2<br>V = Vmax − ΔV · x<br>Q = max(0, ΔV · π/T · sin 2πp)<br>P = ρ/2 · [Q/(Cd · A)]²<br>F = ρQ² / A</div><div class="notes-values"><span>周期 {{P.period}} s</span><span>排量 {{P.displacement*1000}} L</span><span>喷口 {{P.nozzleDiameter*1000}} mm</span><span>ρ {{P.density}} kg/m³</span><span>Cd {{P.discharge}}</span></div><p>p = 0.25 时：Q = {{fmt(peak.flow*1000,3)}} L/s，v = {{fmt(peak.velocity,3)}} m/s，P = {{fmt(peak.pressure/1000,3)}} kPa，F = {{fmt(peak.thrust,3)}} N。积分喷出体积等于排量；补水阶段喷射推力为零。</p><p>水流控制：估算阻力 D = ½ρ × 0.5 × 0.008 × u²；平均喷射推力增加 D，排量最多增至基线的 1.6 倍，周期随流速缩短。臂链随流偏转，固定段长不变。水流方向沿虹吸管喷流方向，反作用推力逆流。</p><p>检修展开是展示状态；相位继续显示理想循环，不代表真实设备可以开壳加压运行。</p><small>GPU：{{gpu}}<br>关闭环境光遮蔽；低质量档降低像素比、阴影和面板刷新率。</small></section></div>
  </main>
</template>

