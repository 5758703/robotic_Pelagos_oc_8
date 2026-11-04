import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.oc8,{timeout:120000});
const snapshots=[];
for(let beat=0;beat<8;beat++){
  await page.evaluate(b=>oc8.inspect(.25,b),beat);
  await page.waitForTimeout(250);
  await page.screenshot({path:`artifacts/beat-${String(beat).padStart(2,'0')}.png`});
  snapshots.push(await page.evaluate(()=>oc8.snapshot()));
}
await fs.writeFile('artifacts/beat-snapshots.json',JSON.stringify({snapshots,errors},null,2));
console.log(JSON.stringify({snapshots,errors},null,2));await browser.close();
