import test from 'node:test';import assert from 'node:assert/strict';
import {P,armPoints} from '../src/model.js';
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),clamp=x=>Math.max(0,Math.min(1,x));
function distance(p1,q1,p2,q2){
 const d1=sub(q1,p1),d2=sub(q2,p2),r=sub(p1,p2),a=dot(d1,d1),e=dot(d2,d2),f=dot(d2,r),c=dot(d1,r),b=dot(d1,d2),den=a*e-b*b;
 let s=den?clamp((b*f-c*e)/den):0,t=(b*s+f)/e;
 if(t<0){t=0;s=clamp(-c/a);}else if(t>1){t=1;s=clamp((b-c)/a);}
 return Math.hypot(...r.map((v,i)=>v+s*d1[i]-t*d2[i]));
}
test('swept arm capsules remain disjoint outside neighboring joints',()=>{
 let clearance=Infinity;
 for(const current of [0,.3,1.5,3])for(let phase=0;phase<1;phase+=.025){
  const arms=Array.from({length:8},(_,i)=>armPoints(i,phase,current));
  for(let i=0;i<8;i++)for(let k=i;k<8;k++)for(let j=0;j<12;j++)for(let l=0;l<12;l++){
   if(i===k&&Math.abs(j-l)<=1)continue;
   // Armor stops half the specified joint gap before each articulation center.
   const inset=(a,b,len)=>a.map((v,k)=>v+(b[k]-v)*P.jointGap/(2*len));
   const d=distance(inset(arms[i][j],arms[i][j+1],P.armLengths[j]),inset(arms[i][j+1],arms[i][j],P.armLengths[j]),inset(arms[k][l],arms[k][l+1],P.armLengths[l]),inset(arms[k][l+1],arms[k][l],P.armLengths[l]))-P.armRadii[j]-P.armRadii[l];
   clearance=Math.min(clearance,d);assert.ok(d>0,`collision arm ${i}/${k} links ${j}/${l} phase ${phase}: ${d}`);
  }
 }
 console.log(`Minimum sampled nonadjacent capsule clearance: ${(clearance*1000).toFixed(2)} mm`);
});
