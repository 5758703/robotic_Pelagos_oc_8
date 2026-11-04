import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {tourDuration} from '../src/tour.js';
const ffmpeg=process.env.FFMPEG_PATH||execFileSync('python',['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
await fs.mkdir('artifacts/film',{recursive:true});
const fps=30,frames=[],browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const cdp=await page.context().newCDPSession(page);
let encoder;
try{
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.oc8,{timeout:120000});
 await page.evaluate(()=>oc8.prepareFilm());
 encoder=spawn(ffmpeg,['-y','-hide_banner','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-threads','2','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart','artifacts/film/tour-silent.mp4'],{stdio:['pipe','ignore','pipe'],windowsHide:true});
 const done=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(new Error(`ffmpeg exit ${code}`)));});
 encoder.stderr.pipe(createWriteStream('artifacts/film/video-encode.log'));
 encoder.stdin.on('error',()=>{});
 for(let f=0;f<tourDuration*fps;f++){
  const state=await page.evaluate(({t,fps})=>oc8.renderFilmFrame(t,fps),{t:f/fps,fps});frames.push(state);
  const {data}=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:95,fromSurface:true,captureBeyondViewport:false});const png=Buffer.from(data,'base64');
  if([0,270,390,720,1110].includes(f))await fs.writeFile(`artifacts/film/frame-${f}.jpg`,png);
  if(!encoder.stdin.write(png))await once(encoder.stdin,'drain');
  if(f%90===0)console.log(`Rendered ${f}/${tourDuration*fps} frames (${(f/fps).toFixed(1)} s)`);
 }
 encoder.stdin.end();await done;
 const cues=await page.evaluate(()=>oc8.filmCues());
 await fs.writeFile('artifacts/film/timeline.json',JSON.stringify({duration:tourDuration,fps,frames,cues,errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
 console.log(`Video rendered: ${frames.length} frames, ${cues.length} audio cues`);
}finally{await browser.close();if(encoder&&!encoder.killed&&encoder.exitCode===null)encoder.kill();}
