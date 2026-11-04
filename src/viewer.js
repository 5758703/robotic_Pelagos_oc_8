import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { batchMachine } from './batching.js';
import { createMachine } from './machine.js';
import { P, stateAt } from './model.js';
export const qualityLevels={
  studio:{name:'Studio',ratio:1.5,shadow:2048,panelSkip:1},
  balanced:{name:'Balanced',ratio:1,shadow:1024,panelSkip:1},
  eco:{name:'Integrated GPU',ratio:.75,shadow:512,panelSkip:2}
};
export async function createViewer(canvas, onInput) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.localClippingEnabled=true;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.01,30);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=.25;controls.maxDistance=5;controls.maxPolarAngle=Math.PI;controls.target.set(0,.35,0);
  controls.addEventListener('start',()=>{transition=null;onInput();});
  scene.add(new THREE.HemisphereLight(0xffffff,0x75817a,1.5));
  const light=new THREE.DirectionalLight(0xfff7ec,2.6);light.position.set(-1.5,3,2);light.castShadow=true;
  light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-1.3,right:1.3,top:1.3,bottom:-1.3,near:.1,far:8});light.shadow.bias=-.0003;light.shadow.normalBias=.006;light.shadow.radius=4;scene.add(light);
  const fill=new THREE.DirectionalLight(0xc2d6de,1.3);fill.position.set(2,1,-2);scene.add(fill);
  const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(new RoomEnvironment(),.05);scene.environment=env.texture;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.14}));floor.rotation.x=-Math.PI/2;floor.position.y=P.floorY;floor.receiveShadow=true;scene.add(floor);
  const machine=createMachine();const batched=batchMachine(machine);scene.add(batched.root);
  const clip=new THREE.Plane(new THREE.Vector3(-1,0,0),.012);
  const raycaster=new THREE.Raycaster();
  let clockOverride=null;const now=()=>clockOverride??performance.now();
  let transition=null, viewName='hero', quality='studio', currentDisplay={}, exploded=0;
  const target=new THREE.Vector3(0,.34,0);
  const views={hero:[1.35,1.38,1.85],front:[0,.65,2.5],side:[2.5,.7,0],top:[.01,2.9,.01],underside:[.9,-1.8,1.4]};
  function focus(sub='all',mode='assembled') {
    if(mode!=='solo')return {target:target.clone(),scale:1};
    const box=new THREE.Box3();
    for(const g of machine.root.children)if(g.userData.subsystem===sub)box.union(new THREE.Box3().setFromObject(g));
    const sphere=box.getBoundingSphere(new THREE.Sphere());
    const distance=sphere.radius/(Math.sin(camera.fov*Math.PI/360)*.7*Math.min(1,camera.aspect));
    return {target:sphere.center,distance:Math.max(.28,distance)};
  }
  function setView(name='hero',display=currentDisplay,instant=false){
    viewName=name;const f=focus(display.subsystem,display.mode);
    const delta=new THREE.Vector3(...views[name]).sub(target);const to=delta.normalize().multiplyScalar(f.distance??new THREE.Vector3(...views[name]).distanceTo(target)).add(f.target);
    if(instant){camera.position.copy(to);controls.target.copy(f.target);controls.update();transition=null;}
    else transition={from:camera.position.clone(),to,fromTarget:controls.target.clone(),target:f.target,start:now(),duration:1100};
  }
  setView('hero',{},true);
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function setQuality(name){quality=name;const q=qualityLevels[name];renderer.setPixelRatio(Math.min(devicePixelRatio,q.ratio));light.shadow.mapSize.set(q.shadow,q.shadow);light.shadow.map?.dispose();light.shadow.map=null;resize();}
  function update(state,display,dt=1/60,instant=false){
    currentDisplay=display;
    const goal=display.mode==='exploded'?1:0;
    exploded=instant?goal:THREE.MathUtils.damp(exploded,goal,5,dt);
    machine.update(state,{...display,explode:exploded});
    for(const [name,mat] of Object.entries(machine.materials)){
      const cutting=display.mode==='cut';
      const next=cutting?[clip]:null;
      if(!!mat.clippingPlanes!==cutting){mat.clippingPlanes=next;mat.clipShadows=true;mat.needsUpdate=true;}
    }
    // Selected assemblies get a controlled orange glow; other parts retain their actual material.
    machine.root.traverse(o=>{if(o.isMesh&&o.material.emissive)o.material.emissive.set(0x000000);});
    if(display.subsystem!=='all'){
      machine.materials.orange.emissive.set('#9c2500');machine.materials.orange.emissiveIntensity=.14;
    }
    if(transition){const t=Math.min(1,(transition.sample??(now()-transition.start))/transition.duration),s=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,s);controls.target.lerpVectors(transition.fromTarget,transition.target,s);if(t===1)transition=null;}
    controls.update();batched.update();
    floor.visible=viewName!=='underside'&&display.mode!=='solo';
    renderer.render(scene,camera);
  }
  function labels(display){
    if(!display.labels)return [];
    const keys=display.mode==='solo'?[display.subsystem]:display.subsystem==='all'?['mantle','optics','arm2']: [display.subsystem];
    const w=canvas.clientWidth,h=canvas.clientHeight;
    return keys.map((key,i)=>{
      const point=machine.anchors[key];if(!point)return null;
      const p=point.clone().project(camera);
      if(p.z>1||p.z< -1)return null;
      const x=(p.x+1)*w/2,y=(-p.y+1)*h/2;
      const left=x<w/2, lx=left?Math.max(22,x-160):Math.min(w-140,x+100),ly=Math.max(90,Math.min(h-100,y-65-i*8));
      return {key,x,y,lx,ly};
    }).filter(Boolean);
  }
  const start=new THREE.Vector2();
  canvas.addEventListener('pointerdown',e=>start.set(e.clientX,e.clientY));
  function pick(e){if(start.distanceTo(new THREE.Vector2(e.clientX,e.clientY))>4)return null;const b=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);const hit=raycaster.intersectObjects(machine.root.children,true).find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});return hit?machine.findSubsystem(hit.object):null;}
  // Warm both clipping variants, transparency, shadow and the hidden wake before revealing the canvas.
  machine.update(stateAt(.25),{mode:'exploded',explode:1,wake:true});
  batched.update();await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
  Object.values(machine.materials).forEach(m=>{m.clippingPlanes=[clip];m.needsUpdate=true;});
  await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
  Object.values(machine.materials).forEach(m=>{m.clippingPlanes=null;m.needsUpdate=true;});
  await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
  machine.update(stateAt(.25),{mode:'isolate',subsystem:'mantle'});batched.update();await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
  const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  const gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  return {setClock(time){clockOverride=time;},update,setView,setQuality,labels,pick,renderer,machine,camera,controls,gpu,
    seekTransition(seconds){if(transition)transition.sample=seconds*1000;},get quality(){return quality;},get view(){return viewName;},
    dispose(){observer.disconnect();controls.dispose();renderer.dispose();env.dispose();pmrem.dispose();}
  };
}
