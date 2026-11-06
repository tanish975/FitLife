// Fictional offline data and a simulated native bridge, not Android/Firebase.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { installNativeFixture, nativeApp } from './mock-native.mjs';
import { reloadSimulatedNative } from './native-reload.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// A temporary persistent Chromium profile models a restartable local store;
// this is still a simulated bridge, not an Android WebView test. Never copy or
// restore FitLife data in the QA harness.
const contexts=new Set(), profiles=[];
const errors=[];
const oldWorkout={id:'wk-legacy',dateKey:'2026-01-01',timestamp:1767225600000,exerciseId:'ex-pushups',exerciseName:'Strict Push-Ups',muscleGroup:'Chest',sets:3,reps:10,weightKg:0,caloriesBurned:24,restSeconds:60};
const profile=age=>({name:'Exercise Fixture',email:'exercise@example.test',sex:'female',age,heightCm:165,weightKg:60,goal:'lose_weight',activityLevel:'light',onboarded:true,uid:'qa-legacy'});
async function setup(age=30) {
 const dir=await mkdtemp(join(tmpdir(),'fitlife-exercises-')); profiles.push(dir);
 const context=await chromium.launchPersistentContext(dir,{headless:true,args:['--no-sandbox','--enable-aggressive-domstorage-flushing'],viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});contexts.add(context);
 await context.route(/^https?:\/\//,route=>route.abort());
 const page=context.pages()[0] || await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await installNativeFixture(page,{demoProfile:profile(age)});
 await page.addInitScript(old=>{
  if(!localStorage.getItem('__exercise_seeded')) {
   localStorage.setItem('__exercise_seeded','1');
   localStorage.setItem('fitlife_workouts_v1',JSON.stringify([old]));
   localStorage.setItem('fitlife_meals_v1','[]');localStorage.setItem('fitlife_moods_v1','[]');
   const s=JSON.parse(localStorage.getItem('fitlife_settings_v2')||'{}');s.favoriteExerciseIds=['ex-pushups'];localStorage.setItem('fitlife_settings_v2',JSON.stringify(s));
  }
 },oldWorkout);
 await page.goto(nativeApp,{waitUntil:'domcontentloaded'});await page.getByText("Today's overview").first().waitFor({timeout:20000});
 return {context,page};
}
const goWorkouts=async page=>{await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Workouts',exact:true}).click();await page.getByRole('heading',{name:'Workouts',exact:true}).waitFor();};
const search=(page,text)=>page.getByLabel('Search exercises').fill(text);
const row=(page,id)=>page.getByTestId('exercise-catalog-list').locator(`[data-exercise-id="${id}"]`);
const assertNoOverflow=async page=>{const x=await page.evaluate(()=>({w:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert(x.html<=x.w+1&&x.body<=x.w+1,`horizontal overflow ${JSON.stringify(x)}`);};
try {
 let {context,page}=await setup();
 try {
  await goWorkouts(page);
  assert((await page.getByText('221 exercises · your pace').count())>0);
  const newFilter=page.getByRole('button',{name:'Show new exercises'});
  assert((await newFilter.innerText()).includes('130'));
  await newFilter.click(); assert.equal(await newFilter.getAttribute('aria-pressed'),'true');
  await page.getByLabel('Filter by target muscle').selectOption({label:'Neck'});
  await row(page,'ex-more-neck-front-hold').waitFor();
  await row(page,'ex-more-neck-front-hold').getByRole('button',{name:/Add .* to favorites/}).click();
  await row(page,'ex-more-neck-front-hold').locator('.exercise-open').click();
  let dialog=page.getByRole('dialog',{name:'Isometric Neck Flexion'});await dialog.waitFor();
  assert.equal(await dialog.getByRole('spinbutton',{name:'Seconds'}).inputValue(),'5');
  assert((await dialog.innerText()).includes('Use very light pressure'));
  assert((await dialog.innerText()).includes('Energy not estimated'));
  await dialog.getByRole('spinbutton',{name:'Seconds'}).fill('8');
  await dialog.getByRole('button',{name:/Log Workout Set/}).click();await dialog.waitFor({state:'hidden'});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('fitlife_workouts_v1')||'[]').some(w=>w.exerciseId==='ex-more-neck-front-hold'));
  let data=await page.evaluate(()=>({workouts:JSON.parse(localStorage.getItem('fitlife_workouts_v1')||'[]'),settings:JSON.parse(localStorage.getItem('fitlife_settings_v2')||'{}')}));
  assert.deepEqual(data.workouts.find(w=>w.id==='wk-legacy'),oldWorkout,'existing logged workout remains unchanged');
  let held=data.workouts.find(w=>w.exerciseId==='ex-more-neck-front-hold');
  assert.equal(held.reps,8);assert.equal(held.measurementUnit,'seconds');assert.equal(held.energyEstimateAvailable,false);assert.equal(held.caloriesBurned,0);
  assert(data.settings.favoriteExerciseIds.includes('ex-pushups')&&data.settings.favoriteExerciseIds.includes('ex-more-neck-front-hold'));
  await page.waitForFunction(()=>{const db=JSON.parse(localStorage.getItem('__fixture_cloud')||'{}');const raw=db['qa-user']?.['c'.repeat(32)];if(!raw)return false;return JSON.parse(raw).snapshot.workouts.some(w=>w.exerciseId==='ex-more-neck-front-hold'&&w.measurementUnit==='seconds');},null,{timeout:15000});
  const remote=await page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('__fixture_cloud'))['qa-user']['c'.repeat(32)]).snapshot.workouts);
  assert.deepEqual(remote.find(w=>w.id==='wk-legacy'),oldWorkout,'old workout is preserved in simulated cloud');
  assert((await page.getByText(/1 sets × 8 sec/).count())>0,'history labels seconds, not reps');

  await page.getByLabel('Filter by target muscle').selectOption('all');
  await newFilter.click();
  await search(page,'wall angels');await row(page,'ex-wall-slide').waitFor();
  assert((await row(page,'ex-wall-slide').innerText()).includes('Wall'));
  await search(page,'wall sit');await page.getByLabel('Filter by equipment').selectOption('bodyweight');
  assert.equal(await row(page,'ex-more-wall-sit').count(),0,'a wall is not no-equipment');
  await page.getByLabel('Filter by equipment').selectOption('wall');await row(page,'ex-more-wall-sit').waitFor();
  await search(page,'face pull');await page.getByLabel('Filter by equipment').selectOption('band');await row(page,'ex-more-band-face-pull').waitFor();
  await page.getByLabel('Filter by equipment').selectOption('bodyweight');assert.equal(await row(page,'ex-more-band-face-pull').count(),0,'a band is not no-equipment');
  await page.getByLabel('Filter by equipment').selectOption('any');await search(page,'cycling');
  await row(page,'ex-more-outdoor-cycling').waitFor();await row(page,'ex-more-stationary-cycling').waitFor();
  await row(page,'ex-more-stationary-cycling').locator('.exercise-open').click();
  dialog=page.getByRole('dialog',{name:'Stationary Cycling'});await dialog.waitFor();
  assert.equal(await dialog.getByRole('spinbutton',{name:'Minutes'}).inputValue(),'5');
  assert((await dialog.innerText()).includes('No added load'));
  await dialog.getByRole('button',{name:'Close workout details'}).click();await dialog.waitFor({state:'hidden'});
  await search(page,'running');await row(page,'ex-more-jogging').waitFor();
  await search(page,'prone reverse fly');await row(page,'ex-more-prone-t').waitFor();
  for (const [width,height] of [[320,480],[360,740],[390,844],[768,1024],[1440,900]]) {await page.setViewportSize({width,height});await assertNoOverflow(page);}

  await page.setViewportSize({width:390,height:844});
  // The account partition, not the legacy settings key, is authoritative on
  // restart. Observe its real write before navigating; never seed or restore
  // FitLife data in the reload helper.
  await page.waitForFunction(()=>{
    const uid=localStorage.getItem('fitlife_cloud_owner_v1');
    if(uid!=='qa-user') return false;
    const p=JSON.parse(localStorage.getItem(`fitlife_cloud_partition_v1:${uid}`)||'null');
    return p?.snapshot?.settings?.favoriteExerciseIds?.includes('ex-more-neck-front-hold') &&
      p.snapshot.workouts.some(w=>w.exerciseId==='ex-more-neck-front-hold'&&w.measurementUnit==='seconds');
  },null,{timeout:15000});
  await reloadSimulatedNative(page,'__fixture_');
  // The fixture records the app-owned slot before application startup. If the
  // file: origin loses storage, fail with a useful distinction rather than
  // masking it with fake native data or reporting a missing UI control.
  const beforeApp=await page.evaluate(()=>window.__qaBeforeFixtureReload);
  assert.equal(beforeApp?.owner,'qa-user','account owner must survive the simulated file-origin reload');
  assert(beforeApp?.partition?.snapshot?.settings?.favoriteExerciseIds?.includes('ex-more-neck-front-hold'),
    'favorite must survive in the account partition before app startup');
  assert(beforeApp.partition.snapshot.workouts.some(w=>w.exerciseId==='ex-more-neck-front-hold'&&w.measurementUnit==='seconds'),
    'timed workout must survive in the account partition before app startup');
  await page.getByText("Today's overview").first().waitFor();await goWorkouts(page);
  await search(page,'Isometric Neck Flexion');await row(page,'ex-more-neck-front-hold').waitFor();
  assert.equal(await row(page,'ex-more-neck-front-hold').getByRole('button',{name:/Remove .* from favorites/}).getAttribute('aria-pressed'),'true');
  data=await page.evaluate(()=>({workouts:JSON.parse(localStorage.getItem('fitlife_workouts_v1')||'[]'),settings:JSON.parse(localStorage.getItem('fitlife_settings_v2')||'{}')}));
  assert.deepEqual(data.workouts.find(w=>w.id==='wk-legacy'),oldWorkout);
  held=data.workouts.find(w=>w.exerciseId==='ex-more-neck-front-hold');assert.equal(held.measurementUnit,'seconds');assert.equal(held.reps,8);
  assert(data.settings.favoriteExerciseIds.includes('ex-pushups'));
 } finally {await context.close();}

 ({context,page}=await setup(15));
 try {
  await goWorkouts(page);await search(page,'neck flexion machine');
  await row(page,'ex-more-neck-flexion-machine').locator('.exercise-open').click();
  const dialog=page.getByRole('dialog',{name:'Neck Flexion Machine'});await dialog.waitFor();
  assert((await dialog.innerText()).includes('qualified supervision'));
  assert((await dialog.innerText()).includes('Under 18: train with a qualified adult'));
  assert(!(await dialog.innerText()).includes('Metabolic Density'));
  assert.equal(await dialog.getByRole('spinbutton',{name:'Load in kg'}).inputValue(),'0');
 } finally {await context.close();}
 assert.deepEqual(errors,[],`no uncaught page errors: ${errors.join('; ')}`);
 console.log('PASS browser: new/target/search/equipment discovery, timed logging, safety, existing workouts/favorites, reload and responsive widths (simulated native)');
} finally {
 for(const context of contexts) await context.close().catch(()=>{});
 for(const dir of profiles) await rm(dir,{recursive:true,force:true});
}
