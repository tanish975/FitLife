// Offline Chromium with fictional native protocol doubles; NOT Android / Firebase.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { installNativeFixture, nativeApp } from './mock-native.mjs';
import { reloadSimulatedNative } from './native-reload.mjs';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[];
const store=(page,key)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),key);
const legacy={workout:{enabled:false,hour:8,minute:0},water:{enabled:true,hour:13,minute:15}};
async function make(reduced='reduce',seed=true){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:reduced,timezoneId:'Asia/Kolkata'});
  await context.route(/^https?:\/\//,r=>r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await installNativeFixture(page,{steps:true,reminders:true});
  if(seed) await page.addInitScript(legacy=>{if(!localStorage.getItem('__water_seeded')){localStorage.setItem('__water_seeded','1');localStorage.setItem('__fixture_reminders_qa-user',JSON.stringify(legacy));}},legacy);
  await page.goto(nativeApp,{waitUntil:'domcontentloaded'});await page.getByText("Today's overview").first().waitFor({timeout:20000});
  return {context,page};
}
const openSettings=async page=>{await page.getByRole('button',{name:'Open settings'}).first().click();await page.locator('.reminder-settings > summary').click();return page.locator('.reminder-settings');};
const noOverflow=async page=>{const d=await page.evaluate(()=>({inner:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert(d.html<=d.inner+1&&d.body<=d.inner+1,`horizontal overflow: ${JSON.stringify(d)}`);};
const water=async page=>(await store(page,'__fixture_reminders_qa-user')).water;
const openExercise=async(page,query,id)=>{
  await page.getByLabel('Search exercises').fill(query);
  const row=page.getByTestId('exercise-catalog-list').locator(`[data-exercise-id="${id}"]`);await row.waitFor();await row.locator('.exercise-open').click();
  const dialog=page.getByRole('dialog').last();await dialog.waitFor();return dialog;
};
const closeExercise=async dialog=>{await dialog.getByRole('button',{name:'Close workout details'}).click();await dialog.waitFor({state:'hidden'});};
try {
  let {context,page}=await make();
  try {
    let settings=await openSettings(page);
    await settings.getByLabel('Water reminder schedule').waitFor();
    assert.deepEqual(await store(page,'__fixture_reminders_qa-user'),legacy,'reading legacy daily reminder does not rewrite it');
    assert.equal(await settings.getByLabel('Water reminder time 1').inputValue(),'13:15');
    assert((await settings.locator('.water-heading').innerText()).includes('On'),'old enabled state retained');
    await settings.getByLabel('Water reminder schedule').selectOption('120');
    assert.equal(await settings.getByLabel('Water reminders start').inputValue(),'09:00');assert.equal(await settings.getByLabel('Water reminders end').inputValue(),'19:00');
    await settings.getByRole('button',{name:'Save schedule'}).click();
    let w=await water(page);assert.equal(w.mode,'interval');assert.equal(w.intervalMinutes,120);assert.equal(w.startMinute,540);assert.equal(w.endMinute,1140);assert.equal(w.enabled,true);
    await settings.getByLabel('Water reminder schedule').selectOption('60');await settings.getByRole('button',{name:'Save schedule'}).click();w=await water(page);assert.equal(w.intervalMinutes,60);
    await settings.getByLabel('Water reminders start').fill('20:00');await settings.getByRole('button',{name:'Save schedule'}).click();
    await settings.getByRole('status').getByText(/same-day start and end/).waitFor();assert.equal((await water(page)).startMinute,540,'invalid overnight window does not overwrite storage');
    // Switching away from an invalid hidden window must not block custom times.
    await settings.getByLabel('Water reminder schedule').selectOption('times');
    await settings.getByRole('button',{name:'Use 11:00, 15:00 & 19:00'}).click();
    await settings.getByRole('button',{name:'Save schedule'}).click();w=await water(page);assert.deepEqual(w.times,[660,900,1140]);assert.equal(w.mode,'times');assert.equal(w.startMinute,540);
    await settings.getByLabel('Water reminder time 2').fill('11:00');await settings.getByRole('button',{name:'Save schedule'}).click();
    await settings.getByRole('status').getByText(/different valid times/).waitFor();assert.deepEqual((await water(page)).times,[660,900,1140],'duplicate times cannot overwrite');
    // Invalid hidden custom times do not block a valid interval; saved times survive.
    await settings.getByLabel('Water reminder schedule').selectOption('120');await settings.getByRole('button',{name:'Save schedule'}).click();
    assert.equal((await water(page)).mode,'interval');assert.deepEqual((await water(page)).times,[660,900,1140]);
    await settings.getByLabel('Water reminder schedule').selectOption('times');
    await settings.getByRole('button',{name:'Use 11:00, 15:00 & 19:00'}).click();
    // A stale delayed snapshot cannot revert an explicitly saved schedule.
    await page.evaluate(()=>{localStorage.setItem('__fixture_reminder_snapshot_delay','700');document.dispatchEvent(new Event('visibilitychange'));});
    const beforeDouble=Number(await page.evaluate(()=>localStorage.getItem('__fixture_water_configures')||0));
    await settings.getByRole('button',{name:'Save schedule'}).evaluate(el=>{el.click();el.click();});
    await page.waitForFunction(n=>Number(localStorage.getItem('__fixture_water_configures')||0)>n,beforeDouble);
    assert.equal(Number(await page.evaluate(()=>localStorage.getItem('__fixture_water_configures'))),beforeDouble+1,'double taps issue one native request');
    await page.waitForTimeout(850);await page.evaluate(()=>localStorage.removeItem('__fixture_reminder_snapshot_delay'));
    assert.equal(await settings.getByLabel('Water reminder schedule').inputValue(),'times','stale refresh cannot restore the old interval');
    await settings.getByRole('button',{name:'Add time'}).click();assert.equal(await settings.getByLabel('Water reminder time 4').count(),1);
    await settings.getByRole('button',{name:'Remove water time 4'}).click();
    await settings.getByLabel('Water reminder time 1').fill('12:00');
    await settings.locator('.water-heading').getByRole('button',{name:'Turn off'}).click();
    w=await water(page);assert.equal(w.enabled,false);assert.deepEqual(w.times,[660,900,1140],'turn off preserves the last saved schedule, not unsaved edits');
    await page.waitForFunction(()=>document.querySelector('input[aria-label="Water reminder time 1"]')?.value==='11:00');
    assert.equal(await settings.getByLabel('Water reminder time 1').inputValue(),'11:00');
    await page.evaluate(()=>{localStorage.setItem('__fixture_notifications_denied','1');document.dispatchEvent(new Event('visibilitychange'));});
    await settings.locator('.water-schedule').getByRole('button',{name:'Turn on'}).click();
    await settings.getByRole('status').getByText(/permission was not granted/).waitFor();assert.equal((await water(page)).enabled,false);
    await page.evaluate(()=>{localStorage.removeItem('__fixture_notifications_denied');document.dispatchEvent(new Event('visibilitychange'));});
    await settings.locator('.water-schedule').getByRole('button',{name:'Turn on'}).click();assert.equal((await water(page)).enabled,true);
    // Direct bridge requests from another account must not access or create its schedule.
    const other=await page.evaluate(()=>new Promise(resolve=>{const id='bad_other';const h=e=>{if(e.detail.requestId===id){removeEventListener('fitlife-reminder-result',h);resolve(e.detail);}};addEventListener('fitlife-reminder-result',h);window.FitLifeReminders.configureWater(id,'other-account',JSON.stringify({enabled:true,mode:'times',times:[660],startMinute:540,endMinute:1140,intervalMinutes:120}));}));
    assert.equal(other.ok,false);assert.equal(await store(page,'__fixture_reminders_other-account'),null);
    for(const width of [320,360,390,768]){await page.setViewportSize({width,height:844});await noOverflow(page);}
    await page.setViewportSize({width:390,height:844});
    await reloadSimulatedNative(page,'__fixture_');await page.getByText("Today's overview").first().waitFor();settings=await openSettings(page);
    assert.equal(await settings.getByLabel('Water reminder time 1').inputValue(),'11:00');assert.equal((await water(page)).enabled,true,'simulated restart retains schedule');

    await page.getByRole('button',{name:'Workouts',exact:true}).click();
    let dialog=await openExercise(page,'Bodyweight Squat','ex-home-air-squat');
    let card=dialog.locator('.movement-preview');await card.waitFor();assert.equal(await card.getByRole('button',{name:/Play movement preview/}).count(),0,'system reduced-motion does not autoplay');
    const start=await card.locator('.movement-svg').innerHTML();await card.getByRole('button',{name:'Show movement'}).click();assert.notEqual(await card.locator('.movement-svg').innerHTML(),start,'manual position changes figure');
    await card.getByRole('button',{name:'Show start'}).click();assert.equal(await card.locator('.movement-svg').innerHTML(),start);
    await closeExercise(dialog);
    dialog=await openExercise(page,'neck flexion machine','ex-more-neck-flexion-machine');
    assert(await dialog.getByText('Movement preview coming later. Use the form cue below.').isVisible());assert.equal(await dialog.locator('.movement-svg').count(),0,'unmatched exercise does not get a fake illustration');await closeExercise(dialog);
    dialog=await openExercise(page,'Forearm Plank','ex-more-forearm-plank');
    assert(await dialog.getByText('Hold position').isVisible());assert.equal(await dialog.locator('.movement-steps').count(),0,'isometric hold is not animated as repetitions');await closeExercise(dialog);
    await page.getByLabel('Search exercises').fill('');await page.locator('.guided-picker').getByRole('button',{name:'Start',exact:true}).click();
    let guide=page.getByRole('dialog',{name:'Home full body'});await guide.waitFor();await guide.locator('.guided-motion > summary').click();
    assert.equal(await guide.locator('[data-motion-demo="ex-home-march-in-place"]').count(),1,'curated animation also available inside guided session');
    await guide.getByRole('button',{name:'Pause workout and go back'}).click();await guide.waitFor({state:'hidden'});
  } finally {await context.close();}
  ({context,page}=await make('no-preference',false));
  try {
    await page.getByRole('button',{name:'Workouts',exact:true}).click();
    const dialog=await openExercise(page,'Bodyweight Squat','ex-home-air-squat');
    const card=dialog.locator('.movement-preview');await card.scrollIntoViewIfNeeded();
    const pause=card.getByRole('button',{name:'Pause movement preview for Bodyweight Squat'});await pause.waitFor();
    const initial=await card.locator('.movement-svg').innerHTML();await page.waitForTimeout(450);const moving=await card.locator('.movement-svg').innerHTML();assert.notEqual(initial,moving,'visible illustration animates');
    await pause.click();await page.waitForTimeout(80);const stopped=await card.locator('.movement-svg').innerHTML();await page.waitForTimeout(350);assert.equal(await card.locator('.movement-svg').innerHTML(),stopped,'pause freezes movement');
    await card.getByRole('button',{name:'Play movement preview for Bodyweight Squat'}).click();await page.waitForTimeout(350);assert.notEqual(await card.locator('.movement-svg').innerHTML(),stopped,'play resumes movement');
    await page.setViewportSize({width:390,height:480});await dialog.evaluate(el=>{el.scrollTop=el.scrollHeight;});
    await page.waitForFunction(()=>{const d=document.querySelector('.workout-sheet')?.getBoundingClientRect(),c=document.querySelector('.movement-preview')?.getBoundingClientRect();return !!d&&!!c&&c.bottom<=d.top;});
    await page.waitForTimeout(180);const hidden=await card.locator('.movement-svg').innerHTML();await page.waitForTimeout(300);assert.equal(await card.locator('.movement-svg').innerHTML(),hidden,'offscreen illustration is paused');
    await card.scrollIntoViewIfNeeded();await page.waitForTimeout(300);assert.notEqual(await card.locator('.movement-svg').innerHTML(),hidden,'visible illustration resumes');
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);assert.equal(await card.getByRole('button',{name:/Pause movement preview/}).count(),0,'live OS reduced-motion change stops playback');
    await closeExercise(dialog);
  } finally {await context.close();}
  assert.deepEqual(errors,[],`no uncaught browser errors: ${errors.join('; ')}`);
  console.log('PASS browser: legacy migration, custom and interval schedules, permissions, account isolation, restart, accessible movement controls, guided demos and offline responsive widths (native doubles).');
} finally {await browser.close();}
