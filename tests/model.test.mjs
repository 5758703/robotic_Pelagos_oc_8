import test from 'node:test';
import assert from 'node:assert/strict';
import { stateAt, armPoints, P } from '../src/model.js';
test('quarter cycle agrees with independent hand calculation', () => {
  const s=stateAt(.25);
  assert.ok(Math.abs(s.thrust-9.696)<.01);
  assert.ok(Math.abs(s.pressure/1000-29.77)<.1);
  assert.ok(Math.abs(s.flow-.001570796)<1e-8);
});
test('refill produces no thrust and conserves displaced volume', () => {
  assert.equal(stateAt(.75).thrust,0);
  const n=10000, dt=P.period/n;
  let volume=0; for(let i=0;i<n;i++) volume+=stateAt(i/n).flow*dt;
  assert.ok(Math.abs(volume-P.displacement)<1e-9);
});
test('phase seam and invalid inputs are handled', () => {
  assert.deepEqual(stateAt(0),stateAt(1));
  assert.throws(()=>stateAt(NaN), /finite/);
  for(let i=0;i<8;i++) assert.deepEqual(armPoints(i,0),armPoints(i,1));
});
test('arms have fixed segment lengths and no inter-arm intersection over cycle',()=>{
  for(let p=0;p<1;p+=.025){
    const arms=Array.from({length:8},(_,i)=>armPoints(i,p));
    for(let i=0;i<8;i++){
      const a=arms[i]; assert.equal(a.length,13);
      for(let j=0;j<12;j++) assert.ok(Math.abs(Math.hypot(...a[j+1].map((v,k)=>v-a[j][k]))-P.armLengths[j])<1e-9);
      for(let k=i+1;k<8;k++) for(let j=1;j<a.length;j++) for(let l=1;l<arms[k].length;l++){
        const d=Math.hypot(...a[j].map((v,axis)=>v-arms[k][l][axis]));
        assert.ok(d>(P.armRadii[Math.min(j,11)]+P.armRadii[Math.min(l,11)]),`arms ${i}/${k}, phase ${p}`);
      }
    }
  }
});
