import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1600,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.oc8,{timeout:120000});
const states=[];
for(const current of [0,.3,3]){
 await page.evaluate(u=>{const slider=document.querySelector('#water-current');slider.value=u;slider.dispatchEvent(new Event('input',{bubbles:true}));},current);
 assert.equal(await page.evaluate(()=>oc8.snapshot().playing),true);
 await page.evaluate(()=>oc8.inspect(.25));await page.waitForTimeout(150);
 const s=await page.evaluate(()=>oc8.state());states.push(s);
 assert.equal(Number(await page.getByTestId('thrust').textContent()),Number(s.thrust.toFixed(2)));
 assert.equal(s.current,current);await page.screenshot({path:`artifacts/current-${current}.png`});
}
assert.ok(states[2].thrust>states[0].thrust*3);assert.ok(states[2].frequency>states[0].frequency);
await page.locator('#sound-toggle').click();assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'true');
await page.locator('#mode-exploded').click();await page.waitForTimeout(300);await page.locator('#sound-toggle').click();assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');
await page.evaluate(()=>oc8.prepareFilm());const a=await page.evaluate(()=>oc8.renderFilmFrame(0));const b=await page.evaluate(()=>oc8.renderFilmFrame(1/30));assert.ok(b.phase>a.phase);
assert.equal(errors.length,0);await fs.writeFile('artifacts/current-audio-qa.json',JSON.stringify({states,errors,soundToggle:true,deterministicFrames:true},null,2));console.log({states:states.map(s=>({current:s.current,peak:s.thrust,frequency:s.frequency})),errors});await browser.close();
