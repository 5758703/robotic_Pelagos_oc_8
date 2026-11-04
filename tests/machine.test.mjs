import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMachine} from '../src/machine.js';
import {stateAt,P,armPoints} from '../src/model.js';
const machine=createMachine();
test('shell surface normals face outwards',()=>{
 const panel=machine.root.getObjectByName('ceramic petal 0');
 const p=panel.geometry.attributes.position,n=panel.geometry.attributes.normal;
 for(let i=0;i<p.count;i++)assert.ok(p.getX(i)*n.getX(i)+p.getZ(i)*n.getZ(i)>=-1e-7);
});
test('each link remains attached and suction side stays below its tangent',()=>{
 for(let p=0;p<1;p+=P.inspectionStep/P.period){
  machine.update(stateAt(p),{});
  for(let i=0;i<8;i++)for(let j=0;j<11;j++){
   const segment=machine.arms[i].segments[j],next=machine.arms[i].segments[j+1];
   const end=new THREE.Vector3(0,P.armLengths[j],0).applyMatrix4(segment.matrixWorld);
   assert.ok(end.distanceTo(next.getWorldPosition(new THREE.Vector3()))<1e-8);
   const upper=new THREE.Vector3(0,0,1).applyQuaternion(segment.quaternion);
   const a=i*2*Math.PI/8+Math.PI/8;
   const tangent=new THREE.Vector3(0,1,0).applyQuaternion(segment.quaternion);
   assert.ok(Math.abs(upper.dot(tangent))<1e-8);
   assert.ok(Math.abs(upper.dot(new THREE.Vector3(-Math.cos(a),0,Math.sin(a))))<1e-8);
  }
 }
});
test('selected subsystem alone and isolate use distinct visibility rules',()=>{
 machine.update(stateAt(.25),{mode:'solo',subsystem:'optics'});
 assert.ok(machine.root.children.filter(g=>g.visible).every(g=>g.userData.subsystem==='optics'));
 machine.update(stateAt(.25),{mode:'isolate',subsystem:'optics'});
 assert.ok(machine.root.children.every(g=>g.visible));
 let ghosts=0;machine.root.traverse(o=>{if(o.isMesh&&o.material===machine.materials.ghost)ghosts++;});assert.ok(ghosts>0);
});
test('current-driven links do not roll discontinuously through vertical',()=>{
 machine.update(stateAt(.712,3),{});const before=machine.arms[0].segments[11].quaternion.clone();
 machine.update(stateAt(.713,3),{});const after=machine.arms[0].segments[11].quaternion;
 assert.ok(before.angleTo(after)<.05,`sudden roll ${before.angleTo(after)} radians`);
});
