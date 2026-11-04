import test from 'node:test';import assert from 'node:assert/strict';
import {synthesizeScore,jetGain} from '../src/score.js';
import {stateAt} from '../src/model.js';
import {filmCurrent} from '../src/film.js';
test('jet sound follows actual discharge and goes silent during refill',()=>{
 assert.equal(jetGain(stateAt(.75,3)),0);
 assert.ok(jetGain(stateAt(.25,3))>jetGain(stateAt(.25,0)));
});
test('procedural stereo score is finite, repeatable and has an audible event',()=>{
 const timeline={duration:1,frames:[{time:0,valve:0,flowGain:1},{time:1,valve:0,flowGain:1}],cues:[]};
 const plain=synthesizeScore(timeline,8000),again=synthesizeScore(timeline,8000);
 assert.deepEqual(plain.left,again.left);assert.equal(plain.left.length,8000);
 assert.ok(plain.left.every(Number.isFinite));assert.ok(plain.right.every(Number.isFinite));
 const withClick=synthesizeScore({...timeline,cues:[{time:.5,kind:'click'}]},8000);
 assert.ok(withClick.left.slice(4000,4200).some((v,i)=>v!==plain.left[4000+i]));
 assert.ok(plain.left.some((v,i)=>v!==plain.right[i]));
});
test('film current automation stays in range and returns to calm',()=>{
 for(let t=0;t<=40;t+=.01)assert.ok(filmCurrent(t)>=0&&filmCurrent(t)<=3);
 assert.equal(filmCurrent(0),.3);assert.equal(filmCurrent(10),3);assert.equal(filmCurrent(40),0);
});
