import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { P, TAU, stateAt, armPoints } from './model.js';
const Y=new THREE.Vector3(0,1,0);
export function createMachine() {
  const root=new THREE.Group(); root.name='Pelagos_OC8';
  const parts={}, arms=[], petals=[], pistons=[], eyes=[];
  const materials={
    ceramic:new THREE.MeshStandardMaterial({color:'#eceee8',roughness:.52,metalness:.25,side:THREE.DoubleSide}),
    dark:new THREE.MeshStandardMaterial({color:'#202a29',roughness:.26,metalness:.38}),
    metal:new THREE.MeshStandardMaterial({color:'#89928b',roughness:.52,metalness:.72}),
    orange:new THREE.MeshStandardMaterial({color:'#f15c29',roughness:.5,metalness:.2}),
    rubber:new THREE.MeshStandardMaterial({color:'#303c38',roughness:.75}),
    glass:new THREE.MeshPhysicalMaterial({color:'#a9d7cb',roughness:.15,metalness:0,transmission:.65,thickness:.004,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false}),
    lens:new THREE.MeshPhysicalMaterial({color:'#11262b',roughness:.08,metalness:.15,clearcoat:1}),
    wake:new THREE.MeshBasicMaterial({color:'#f15c29',transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide})
  };
  function group(name,parent=root,subsystem=name) {const g=new THREE.Group(); g.name=name; g.userData.subsystem=subsystem;parent.add(g);parts[name]=g;return g;}
  function mesh(name,geometry,mat,parent,pos=[0,0,0]){const m=new THREE.Mesh(geometry,materials[mat]);m.name=name;m.position.fromArray(pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const sphere=new THREE.SphereGeometry(1,20,12), cylinder=new THREE.CylinderGeometry(1,1,1,16), box=new THREE.BoxGeometry(1,1,1);
  function ball(name,parent,pos,scale,mat='dark'){const m=mesh(name,sphere,mat,parent,pos);m.scale.set(...scale);return m;}
  function cyl(name,parent,pos,r,h,mat='metal'){const m=mesh(name,cylinder,mat,parent,pos);m.scale.set(r,h,r);return m;}
  function cube(name,parent,pos,scale,mat){const m=mesh(name,box,mat,parent,pos);m.scale.set(...scale);return m;}
  function ring(name,parent,r,t,mat='orange',pos=[0,0,0]){const m=mesh(name,new THREE.TorusGeometry(r,t,8,40),mat,parent,pos);m.rotation.x=Math.PI/2;return m;}
  function rod(name,parent,a,b,r,mat='metal'){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b);const m=cyl(name,parent,aa.clone().add(bb).multiplyScalar(.5).toArray(),r,aa.distanceTo(bb),mat);m.quaternion.setFromUnitVectors(Y,bb.sub(aa).normalize());return m;}
  const body=group('chassis',root,'mantle');
  ball('lower pressure housing',body,[0,.285,0],[.172,.105,.172],'dark');
  ring('lower titanium frame',body,.167,.009,'metal',[0,.26,0]);
  ring('equator frame',body,.174,.009,'metal',[0,.35,0]);
  const shell=group('mantle');
  const profile=[];
  for(let j=0;j<=24;j++){const t=j/24;profile.push(new THREE.Vector2(.045+.135*Math.sin(Math.PI/2*Math.sqrt(t)),.42*(1-t)));}
  profile.reverse();
  for(let i=0;i<8;i++){
    const pivot=group(`petal_${i}`,shell,'mantle');
    pivot.rotation.y=i*TAU/8;
    const hinge=group(`hinge_${i}`,pivot,'mantle');hinge.position.set(0,.32,.18);
    const panel=mesh(`ceramic petal ${i}`,new THREE.LatheGeometry(profile,10,-Math.PI/8+P.shellGap,Math.PI/4-2*P.shellGap),'ceramic',hinge,[0,0,-.18]);
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(panel.geometry,22),new THREE.LineBasicMaterial({color:'#606962',transparent:true,opacity:.45}));panel.add(outline);
    const inner=mesh(`petal liner ${i}`,panel.geometry,'dark',hinge,[0,0,-.18]);inner.scale.set(.978,.994,.978);
    const hingeAxle=cyl('hinge pin',hinge,[0,0,0],.009,.055);hingeAxle.rotation.z=Math.PI/2;
    cube('orange latch',hinge,[0,.06,-.002],[.014,.038,.008],'orange');
    cube('inspection inset',hinge,[0,.12,-.002],[.034,.045,.006],'dark');
    for(const side of [-1,1])for(const h of [.035,.09,.15]) ball('panel screw',hinge,[side*.031,h,-.006],[.003,.003,.003],'metal');
    petals.push(hinge);
  }
  const lid=group('lid',root,'mantle');cyl('service cap',lid,[0,0,0],.05,.014,'dark');ring('cap seal',lid,.044,.002,'orange');
  const core=group('core',root,'mantle');
  const liner=ball('glass pressure liner',core,[0,.49,0],[.14,.16,.14],'glass');
  cyl('central pump column',core,[0,.485,0],.045,.27,'dark');
  const rotor=group('rotor',core,'mantle');ring('reactor drive ring',rotor,.111,.012,'orange',[0,.53,0]);
  for(let i=0;i<7;i++){
    const a=i*TAU/7,x=Math.sin(a)*.082,z=Math.cos(a)*.082;
    const pump=group(`piston_${i}`,core,'mantle');
    cyl('pump barrel',pump,[x,.435,z],.019,.10,'dark');
    cyl('piston rod',pump,[x,.51,z],.007,.10,'metal');pistons.push(pump);
    for(const y of [.395,.435,.475])ring('barrel rib',pump,.020,.002,'metal',[x,y,z]);
    rod('diagonal brace',core,[x,.37,z],[Math.sin(a+.6)*.09,.61,Math.cos(a+.6)*.09],.004,'metal');
    const curve=new THREE.CatmullRomCurve3([[x,.37,z],[x*1.4,.43,z*1.4],[x*1.35,.58,z*1.35],[x,.62,z]].map(v=>new THREE.Vector3(...v)));
    mesh('hydraulic loop',new THREE.TubeGeometry(curve,20,.004,6,false),'rubber',core);
  }
  for(const y of [.375,.49,.61])ring('pump support ring',core,.105,.005,'metal',[0,y,0]);
  const optics=group('optics');
  for(const sign of [-1,1]){
    const eye=group(`optic_${sign}`,optics,'optics');eye.position.set(sign*.108,.325,.133);eye.rotation.y=sign*.42;
    ball('optic housing',eye,[0,0,0],[.047,.047,.034],'ceramic');
    const rim=ring('lens trim',eye,.037,.004,'orange',[0,0,.027]);rim.rotation.x=0;
    const bezel=cyl('lens bezel',eye,[0,0,.03],.035,.015,'dark');bezel.rotation.x=Math.PI/2;
    const lens=ball('optical glass',eye,[0,0,.041],[.027,.027,.009],'lens');
    ball('lens reflection',eye,[-.008,.009,.049],[.006,.006,.001],'metal');
    eyes.push(eye);
  }
  const siphon=group('siphon');
  const siphonCurve=new THREE.CatmullRomCurve3([[0,.24,.11],[0,.21,.19],[0,.18,.25],[0,.18,.29]].map(v=>new THREE.Vector3(...v)));
  mesh('siphon elbow',new THREE.TubeGeometry(siphonCurve,24,.025,20,false),'ceramic',siphon);
  for(const z of [.245,.273,.29]){const r=ring('siphon sleeve',siphon,.025,.003,'metal',[0,.18,z]);r.rotation.x=0;}
  const nozzle=cyl('nozzle bore',siphon,[0,.18,.294],P.nozzleDiameter/2,.006,'dark');nozzle.rotation.x=Math.PI/2;
  const valve=group('valve',siphon,'siphon');
  for(let i=0;i<6;i++){const flap=cube('nozzle flap',valve,[Math.sin(i*TAU/6)*.011,.18+Math.cos(i*TAU/6)*.011,.298],[.005,.012,.003],'metal');flap.rotation.z=-i*TAU/6;}
  const wake=mesh('jet wake',new THREE.ConeGeometry(.025,.20,24,1,true),'wake',siphon,[0,.18,.41]);wake.rotation.x=-Math.PI/2;
  const beak=group('beak');ring('beak socket',beak,.046,.009,'metal',[0,.185,0]);
  for(const sign of [-1,1]){const jaw=mesh('beak jaw',new THREE.ConeGeometry(.027,.055,5),'dark',beak,[sign*.014,.155,0]);jaw.rotation.z=Math.PI+sign*.25;}
  for(let i=0;i<8;i++){
    const ag=group(`arm${i+1}`,root,`arm${i+1}`), segments=[];
    const a=i*TAU/8+Math.PI/8;
    ball('arm root bearing',ag,[Math.sin(a)*.18,.24,Math.cos(a)*.18],[.05,.05,.05],'dark');
    for(let j=0;j<P.segments;j++){
      const r=P.armRadii[j],len=P.armLengths[j];
      const seg=group(`arm${i+1}_segment${j+1}`,ag,`arm${i+1}`);
      cyl('arm inner actuator',seg,[0,len/2,0],r*.62,len,'metal');
      const armor=mesh('ceramic vertebra',new THREE.CylinderGeometry(r*.87,r,len-P.jointGap,20,1,false),'ceramic',seg,[0,len/2,0]);
      ring('joint ink gasket',seg,r*.91,.0025,'dark',[0,len*.13,0]);
      ring('joint orange seal',seg,r*.91,.0015,'orange',[0,len*.19,0]);
      ball('articulation bearing',seg,[0,0,0],[r*.7,r*.7,r*.7],'dark');
      cube('service recess',seg,[0,len*.55,r*.94],[r*.6,len*.25,.003],'dark');
      cube('actuator marker',seg,[0,len*.55,r*.98],[r*.18,len*.15,.003],'orange');
      for(const sign of [-1,1]){
        const cup=cyl('suction disc',seg,[sign*r*.48,len*.55,-r*.87],r*.28,r*.2,'rubber');cup.rotation.x=Math.PI/2;
        const lip=ring('suction lip',seg,r*.22,r*.06,'orange',[sign*r*.48,len*.55,-r*1.02]);lip.rotation.x=0;
        ball('fastener',seg,[sign*r*.7,len*.76,r*.65],[.0022,.0022,.0022],'metal');
      }
      segments.push(seg);
    }
    arms.push({group:ag,segments});
  }
  const anchors={mantle:new THREE.Vector3(0,.57,0),optics:new THREE.Vector3(.12,.325,.17),siphon:new THREE.Vector3(0,.18,.29),beak:new THREE.Vector3(0,.15,0),arm2:new THREE.Vector3()};
  // Merge the fixed pieces of each link by material. Articulated link transforms stay independent.
  for(const {segments} of arms)for(const seg of segments){
    const buckets=new Map();
    for(const child of [...seg.children]){
      if(!child.isMesh)continue;child.updateMatrix();
      const list=buckets.get(child.material)||[];
      list.push(child.geometry.clone().applyMatrix4(child.matrix));buckets.set(child.material,list);seg.remove(child);
    }
    for(const [material,geos]of buckets){
      const merged=mergeGeometries(geos.map(g=>g.index?g.toNonIndexed():g));
      const child=new THREE.Mesh(merged,material);child.name=material===materials.ceramic?'ceramic vertebra':material===materials.orange?'seals and suction lips':'link fittings';child.castShadow=true;child.receiveShadow=true;seg.add(child);geos.forEach(g=>g.dispose());
    }
  }
  const ghost=new THREE.MeshStandardMaterial({color:'#bcc8bc',roughness:.8,transparent:true,opacity:.12,depthWrite:false});
  materials.ghost=ghost;
  const meshes=[];root.traverse(o=>{if(o.isMesh){o.userData.baseMaterial=o.material;meshes.push(o);}});
  function update(state, display={}) {
    const e=display.explode??0;
    shell.scale.set(state.scale,1,state.scale);
    petals.forEach(h=>h.rotation.x=e*P.shellOpenAngle*Math.PI/180);
    lid.position.y=.747+e*P.lidLift;
    core.position.y=e*P.coreLift;
    liner.scale.set(.14*state.scale,.16,.14*state.scale);
    rotor.rotation.y=state.ringAngle;
    pistons.forEach(g=>g.position.y=state.piston);
    eyes.forEach((g,i)=>{const sign=i?1:-1;g.rotation.y=sign*.42+sign*state.optics;g.position.z=.133+e*P.opticsLift;});
    wake.visible=!!display.wake&&state.flow>1e-6;wake.scale.set(.25+state.valve*.75,(.25+state.valve*.75)*Math.sqrt(state.flowGain),.25+state.valve*.75);
    valve.scale.set(1-.3*state.valve,1,1);
    arms.forEach(({segments},i)=>{
      const points=armPoints(i,state.phase,state.current);
      segments.forEach((g,j)=>{g.position.fromArray(points[j]);const tangent=new THREE.Vector3(...points[j+1]).sub(g.position).normalize();const base=i*TAU/8+Math.PI/8;const u=(j+.5)/P.segments;const a=base-state.sway*Math.sin(base)*u*u;const side=new THREE.Vector3(-Math.cos(a),0,Math.sin(a));const normal=new THREE.Vector3().crossVectors(side,tangent);g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side,tangent,normal));});
      if(i===1)anchors.arm2.fromArray(points[6]);
    });
    anchors.mantle.set(0,.57+e*P.coreLift,0);
    anchors.optics.set(.108,.325,.174+e*P.opticsLift);
    const selected=display.subsystem||'all', solo=display.mode==='solo';
    root.children.forEach(g=>g.visible=!solo||g.userData.subsystem===selected);
    if(solo&&selected==='mantle')body.visible=true;
    for(const o of meshes){const sub=findSubsystem(o);o.userData.active=selected!=='all'&&sub===selected;o.material=display.mode==='isolate'&&selected!=='all'&&sub!==selected?ghost:o.userData.baseMaterial;}
    root.updateMatrixWorld(true);
  }
  function findSubsystem(o){while(o){if(o.userData.subsystem)return o.userData.subsystem;o=o.parent;}return 'all';}
  update(stateAt(.25));
  return {root,parts,materials,anchors,arms,petals,update,findSubsystem};
}
