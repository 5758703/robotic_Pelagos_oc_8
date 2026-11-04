import test from 'node:test';
import assert from 'node:assert/strict';
import {stateAt,armPoints,P,pressureHistory} from '../src/model.js';
test('current raises station-holding pulse without changing zero-current baseline',()=>{
 const calm=stateAt(.25,0),gentle=stateAt(.25,.3),strong=stateAt(.25,3);
 assert.ok(strong.thrust>calm.thrust*3);
 assert.ok(gentle.thrust<calm.thrust*1.1);
 assert.ok(strong.pressure>calm.pressure);
 assert.ok(strong.period<calm.period);
 assert.ok(Math.abs(strong.meanThrust-(calm.meanThrust+strong.drag))<1e-8);
});
test('current sway is bounded and link lengths are preserved',()=>{
 for(const speed of [.3,1.5,3])for(const p of [0,.25,.5,.75])for(let i=0;i<8;i++){
  const points=armPoints(i,p,speed);
  for(let j=0;j<12;j++)assert.ok(Math.abs(Math.hypot(...points[j+1].map((v,k)=>v-points[j][k]))-P.armLengths[j])<1e-9);
 }
 const calm=armPoints(1,.25,0).at(-1),gentle=armPoints(1,.25,.3).at(-1),strong=armPoints(1,.25,3).at(-1);
 const distance=a=>Math.hypot(...a.map((v,k)=>v-calm[k]));
 assert.ok(distance(gentle)>0&&distance(gentle)<.02);
 assert.ok(distance(strong)>distance(gentle)*3);
});
test('current input bounds and flow history remain consistent',()=>{
 assert.equal(stateAt(.25,-1).current,0);assert.equal(stateAt(.25,9).current,3);
 assert.throws(()=>stateAt(.25,NaN),/finite/);
 const s=stateAt(.25,3);assert.equal(pressureHistory(.25,65,3).at(-1),s.pressure);
 let v=0;const n=10000;for(let i=0;i<n;i++)v+=stateAt(i/n,3).flow*s.period/n;
 assert.ok(Math.abs(v-s.displacement)<1e-9);
});
