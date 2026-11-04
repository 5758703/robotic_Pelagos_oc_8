import fs from 'node:fs/promises';
import {synthesizeScore} from '../src/score.js';
const timeline=JSON.parse(await fs.readFile('artifacts/film/timeline.json','utf8'));
const {left,right,sampleRate}=synthesizeScore(timeline),bytes=left.length*8;
const wav=Buffer.alloc(44+bytes);wav.write('RIFF');wav.writeUInt32LE(36+bytes,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(3,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(sampleRate,24);wav.writeUInt32LE(sampleRate*8,28);wav.writeUInt16LE(8,32);wav.writeUInt16LE(32,34);wav.write('data',36);wav.writeUInt32LE(bytes,40);
let peak=0;for(let i=0;i<left.length;i++){wav.writeFloatLE(left[i],44+i*8);wav.writeFloatLE(right[i],48+i*8);peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));}
await fs.writeFile('artifacts/film/score-premaster.wav',wav);
console.log(JSON.stringify({seconds:timeline.duration,sampleRate,channels:2,peakDbfs:20*Math.log10(peak),cues:timeline.cues.length}));
