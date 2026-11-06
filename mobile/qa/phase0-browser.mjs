// Offline, fictional-data browser regressions. The native/cloud boundary is a
// Playwright fixture; this does not test Android, Google, Firebase or TalkBack.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { nativeApp, installNativeFixture } from './mock-native.mjs';

const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const errors = [];
const date = n => { const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const profile = (age=15) => ({name:'Fixture Athlete',email:'fixture@example.test',sex:'female',age,heightCm:160,weightKg:50,goal:'lose_weight',activityLevel:'light',onboarded:true,uid:'qa-legacy'});
const meal = (id,dateKey,calories) => ({id,dateKey,timestamp:Date.now(),name:'Fixture meal',servingLabel:'1 bowl',category:'Lunch',calories,proteinG:0,carbsG:0,fatG:0,fiberG:0});
async function setup({age=15,weights=[],meals=[],desktop=false}={}) {
  const context=await browser.newContext({viewport:desktop?{width:1440,height:900}:{width:390,height:844},isMobile:!desktop,hasTouch:!desktop,serviceWorkers:'block'});
  await context.route(/^https?:\/\//,route=>route.abort());
  const page=await context.newPage(); page.on('pageerror',error=>errors.push(error.message));
  await installNativeFixture(page,{demoProfile:profile(age)});
  await page.addInitScript(({weights,meals})=>{
    localStorage.setItem('fitlife_weights_v1',JSON.stringify(weights));
    localStorage.setItem('fitlife_meals_v1',JSON.stringify(meals));
    localStorage.setItem('fitlife_workouts_v1','[]');
    localStorage.setItem('fitlife_moods_v1','[]');
  },{weights,meals});
  await page.goto(nativeApp,{waitUntil:'domcontentloaded'});
  await page.getByText("Today's overview").first().waitFor({timeout:20000});
  return {context,page};
}
const tab = (page,name) => page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true}).click();
const closeCelebration = async page => { const button=page.getByRole('button',{name:'Close celebration'}); if(await button.count() && await button.isVisible()) await button.click(); };
const weight = (id,days,kg) => ({id,dateKey:date(days),timestamp:Date.now()-days*86400000,weightKg:kg});
const navSettings = async page => { await tab(page,'Home'); await page.getByRole('button',{name:'Open settings'}).first().click(); await page.getByRole('heading',{name:'Settings',exact:true}).waitFor(); };
try {
  // A minor never receives the previously observed adult 1,238-kcal plan,
  // calorie-target badge, adult weight-loss goal, macro targets or BMI category.
  let {context,page}=await setup({age:15,weights:[weight('minor-weight',0,50)]});
  try {
    await page.getByText('Adult calorie and macro targets are not provided under 18.',{exact:false}).first().waitFor();
    assert(!(await page.locator('body').innerText()).includes('1,238'));
    assert.equal(await page.getByText('Calories remaining',{exact:true}).count(),0);
    assert((await page.getByText('Food logged',{exact:true}).first().locator('..').innerText()).includes('not logged'), 'an empty day is not represented as zero eaten');
    await page.locator('summary').filter({hasText:'Nutrition breakdown'}).click();
    assert((await page.getByText('logged today',{exact:true}).count())>=1);
    await page.getByRole('button',{name:'Details',exact:false}).click();
    await page.getByRole('heading',{name:'Daily Pulse'}).waitFor();
    assert.equal(await page.getByText('Calories Remaining',{exact:true}).count(),0);
    assert.equal(await page.getByText('Macro Rings',{exact:true}).count(),0);
    await page.getByRole('button',{name:'Back to home'}).click();
    await tab(page,'Meals');
    assert.equal(await page.getByText(/\/ 1,?238 kcal/).count(),0);
    await tab(page,'Progress');
    assert.equal(await page.getByTestId('bmi-marker').count(),0);
    assert((await page.getByLabel('Body mass index').innerText()).includes('below age 20'));
    assert.equal(await page.getByText(/Current: \d+ kcal/).count(),0);
    await tab(page,'Profile');
    assert.equal(await page.getByText('Daily Target',{exact:true}).count(),0);
    assert.equal(await page.getByText('Calorie Sniper',{exact:true}).count(),0);
    assert.equal(await page.getByText('Lose Fat',{exact:true}).count(),0);
    assert((await page.getByText('Adult scale not applicable under 20').count())>0);
    assert((await page.getByText('Meal Rhythm').count())>0);
    await page.getByRole('button',{name:'Edit profile',exact:true}).click();
    const age=page.locator('#onboarding-age');
    assert.equal(await age.inputValue(),'15');
    assert.equal(await page.getByText('Estimated daily target',{exact:true}).count(),0);
    assert.equal(await page.getByText('Lose Fat',{exact:true}).count(),0);
    assert((await page.getByText('Adult weight-loss and calorie goals are not offered under 18.',{exact:false}).count())>0);
    await age.fill('17');
    assert.equal(await page.getByText('Estimated daily target',{exact:true}).count(),0);
    assert.equal(await page.getByText('Lose Fat',{exact:true}).count(),0);
    await age.fill('19');
    assert.equal(await page.getByText('Estimated daily target',{exact:true}).count(),1);
    assert((await page.getByText('adult categories are not used below age 20',{exact:false}).count())>0);
    // Save at 19: adult nutrition estimates can return, but adult BMI category stays hidden.
    await page.getByRole('button',{name:'Complete profile & continue'}).click();
    await page.getByRole('heading',{name:'Athlete Profile'}).waitFor();
    await tab(page,'Progress');
    assert.equal(await page.getByTestId('bmi-marker').count(),0);
    assert((await page.getByLabel('Body mass index').innerText()).includes('below age 20'));
    const state=await page.evaluate(()=>({profile:JSON.parse(localStorage.getItem('fitlife_profile_v1')),weights:JSON.parse(localStorage.getItem('fitlife_weights_v1'))}));
    assert.equal(state.profile.age,19); assert.equal(state.profile.goal,'lose_weight');
    assert(state.weights.some(x=>x.id==='minor-weight'),'historical weights survive the profile edit');
  } finally { await context.close(); }

  // A new minor can complete an optional profile without selecting an adult goal.
  {
    const fresh=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    await fresh.route(/^https?:\/\//,route=>route.abort());
    const newPage=await fresh.newPage(); newPage.on('pageerror',error=>errors.push(error.message));
    try {
      await installNativeFixture(newPage,{signedIn:true,demo:false,uid:'new-minor',name:'Young Fixture',email:'young@example.test'});
      await newPage.goto(nativeApp,{waitUntil:'domcontentloaded'});
      await newPage.getByText("Today's overview").waitFor({timeout:20000});
      let guide=newPage.getByRole('region',{name:'Home guide'}); if(await guide.count()) await guide.getByRole('button',{name:'Skip guide'}).click();
      await tab(newPage,'Profile');
      guide=newPage.getByRole('region',{name:'Profile guide'}); if(await guide.count()) await guide.getByRole('button',{name:'Skip guide'}).click();
      await newPage.getByRole('button',{name:'Add profile details',exact:true}).click();
      guide=newPage.getByRole('region',{name:'Profile details guide'}); if(await guide.count()) await guide.getByRole('button',{name:'Skip guide'}).click();
      await newPage.getByRole('button',{name:/Female/}).click();
      await newPage.getByLabel('Age (yrs)').fill('15'); await newPage.getByLabel('Height (cm)').fill('160'); await newPage.getByLabel('Weight (kg)').fill('50');
      assert.equal(await newPage.getByText('Lose Fat',{exact:true}).count(),0);
      assert.equal(await newPage.getByText('Estimated daily target',{exact:true}).count(),0);
      await newPage.getByRole('button',{name:/Lightly Active/}).click();
      await newPage.getByRole('button',{name:'Complete profile & continue'}).click();
      await newPage.getByRole('heading',{name:'Athlete Profile'}).waitFor();
      const saved=await newPage.evaluate(()=>JSON.parse(localStorage.getItem('fitlife_profile_v1')));
      assert.equal(saved.age,15); assert.equal(saved.goal,'maintain'); assert.equal(saved.onboarded,true);
      assert.equal(await newPage.getByText('Daily Target',{exact:true}).count(),0);
    } finally { await fresh.close(); }
  }
  // 18 and 19 use no adult BMI classification; 20 restores adult classification.
  for (const age of [18,19,20]) {
    ({context,page}=await setup({age,weights:[weight(`w-${age}`,0,50)]}));
    try {
      await tab(page,'Progress');
      assert.equal(await page.getByTestId('bmi-marker').count(),age<20?0:1,`BMI marker at ${age}`);
      const bmi=await page.getByLabel('Body mass index').innerText();
      assert.equal(/Adult BMI reference range/.test(bmi),age>=20,`BMI range at ${age}`);
      assert((await page.getByText(/Current: \d+ kcal/).count())>0,`adult target at ${age}`);
    } finally { await context.close(); }
  }
  // Desktop-only sidebar cannot leak an underage target either.
  ({context,page}=await setup({age:15,desktop:true}));
  try {
    const sidebar=page.getByLabel('Daily wellness summary');
    assert((await sidebar.innerText()).includes('Personal calorie targets are not available'));
    assert(!(await sidebar.innerText()).includes('Daily calorie\ntarget'));
  } finally { await context.close(); }
  console.log('PASS browser: age 15/17/18/19/20, preview, home, daily, meals, profile, desktop sidebar and BMI; prior records retained');

  // 40-day weight delta, same-day zero vs missing days, keyboard data tables,
  // kg/lb conversion, and all specified ambiguous foods.
  ({context,page}=await setup({age:30,weights:[weight('old',40,90),weight('today',0,80)],meals:[meal('zero',date(0),0),meal('older',date(2),250)]}));
  try {
    await tab(page,'Progress');
    const hero=await page.getByLabel('Weight check-in').innerText();
    assert(hero.includes('−10 kg since first log') && hero.includes(date(40)) && hero.includes(date(0)));
    assert(!hero.includes('(14d)'));
    assert((await page.getByText(/past targets may have differed/).count())>0);
    const weightSummary=page.locator('summary').filter({hasText:'View weight trend data table'});
    await weightSummary.focus(); await page.keyboard.press('Enter');
    const weightTable=page.getByRole('table',{name:'Weight trend data'}); await weightTable.waitFor();
    assert((await weightTable.innerText()).includes(`${date(40)}\t90.0 kg`));
    assert((await weightTable.innerText()).includes(`${date(0)}\t80.0 kg`));
    const foodSummary=page.locator('summary').filter({hasText:'View food energy data table'});
    await foodSummary.focus(); await page.keyboard.press('Enter');
    const foodTable=page.getByRole('table',{name:'Food energy data'}); await foodTable.waitFor();
    assert.equal(await foodTable.locator('tbody tr').count(),14);
    assert((await foodTable.innerText()).includes(`${date(0)}\t0 kcal`),'explicitly logged zero remains zero');
    assert((await foodTable.innerText()).includes(`${date(1)}\tNot logged`),'unlogged day remains unknown');
    assert((await foodTable.innerText()).includes(`${date(2)}\t250 kcal`));

    await navSettings(page);
    await page.locator('.settings-fold > summary').filter({hasText:'Units & haptics'}).click();
    await page.getByRole('button',{name:'Pounds (lb)'}).click();
    await tab(page,'Progress');
    assert((await page.getByLabel('Weight check-in').innerText()).includes('−22 lb since first log'));
    await page.locator('summary').filter({hasText:'View weight trend data table'}).click();
    assert((await page.getByRole('table',{name:'Weight trend data'}).innerText()).includes('198.4 lb'));
    await tab(page,'Meals');
    const input=page.getByLabel('Describe a meal');
    for (const q of ['2 idlis','1 cup dahi','150g oats','2 mystery soup','2 eggs','150g grilled chicken']) {
      await input.fill(q);
      const preview=await page.getByLabel('Meal preview').innerText();
      assert(preview.includes('Nutrition details needed'),`${q}: ${preview}`);
      assert(!/Greek Yogurt|Idli with Sambar|575 kcal|450 kcal/i.test(preview),`${q} cannot be renamed or assigned unrelated nutrition`);
      assert(await page.getByRole('button',{name:'Add (1)'}).isDisabled(),`${q} cannot be added before review`);
    }
    await input.fill('1 cup dahi');
    await page.getByRole('button',{name:/Review nutrition for Dahi/}).click();
    const editor=page.getByRole('dialog'); await editor.waitFor();
    assert.equal(await editor.getByLabel('Calories (kcal)').inputValue(),'');
    assert.equal(await editor.getByLabel('Protein (g)',{exact:true}).inputValue(),'');
    await editor.getByLabel('Calories (kcal)').fill('120');
    await editor.getByLabel('Protein (g)',{exact:true}).fill('5');
    await editor.getByLabel('Carbohydrates (g)').fill('8');
    await editor.getByLabel('Fat (g)',{exact:true}).fill('7');
    await editor.getByLabel('Fiber (g)').fill('0');
    await editor.getByRole('button',{name:'Save nutrition details'}).click(); await editor.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Add (1)'}).click();
    await closeCelebration(page);
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('fitlife_meals_v1')||'[]').some(x=>x.name==='Dahi'&&x.calories===120));
    const logged=await page.evaluate(()=>JSON.parse(localStorage.getItem('fitlife_meals_v1')));
    assert(logged.some(x=>x.id==='zero'&&x.calories===0)); assert(logged.some(x=>x.id==='older'&&x.calories===250));
    // Multiple check-ins on the same date are retained, with the latest
    // represented in the chart; entering a weight is not a history deletion.
    await tab(page,'Progress');
    const weightInput=page.getByLabel("Today's weight in lb");
    await weightInput.fill('178.6'); await page.getByRole('button',{name:'Log Today'}).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('fitlife_weights_v1')).length===3);
    await weightInput.fill('180.8'); await page.getByRole('button',{name:'Log Today'}).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('fitlife_weights_v1')).length===4);
    const weightRows=await page.evaluate(()=>JSON.parse(localStorage.getItem('fitlife_weights_v1')));
    assert(weightRows.some(x=>x.id==='today'&&x.weightKg===80));
    assert.equal(new Set(weightRows.map(x=>x.id)).size,4);
    await page.locator('summary').filter({hasText:'View weight trend data table'}).click();
    const table=page.getByRole('table',{name:'Weight trend data'});
    assert.equal(await table.locator('tbody tr').count(),2,'same-day chart uses latest only');
    assert((await table.innerText()).includes('180.8 lb'));
  } finally {await context.close();}
  console.log('PASS browser: truthful 40-day weight change, dates, gaps, logged zero, keyboard tables, kg/lb, food review and unchanged old entries');

  // Ten old snapshots + a fresh simulated installation: no write, no deletion,
  // no merge. Nine old snapshots: recovery and creation of the tenth allowed.
  ({context,page}=await setup({age:30,weights:[weight('local-weight',0,70)],meals:[meal('local-meal',date(0),333)]}));
  try {
    await page.waitForFunction(()=>!!JSON.parse(localStorage.getItem('__fixture_cloud')||'{}')['qa-user']?.['c'.repeat(32)],null,{timeout:20000});
    await page.waitForTimeout(2200); // settle the fixture's automatic initial sync
    const before=await page.evaluate(()=>{
      const cloud=JSON.parse(localStorage.getItem('__fixture_cloud')), payload=JSON.parse(cloud['qa-user']['c'.repeat(32)]);
      const db={};
      for(let i=1;i<=10;i++){
        const value=structuredClone(payload);
        value.snapshot.meals.push({id:`remote-${i}`,dateKey:value.snapshot.water.dateKey,timestamp:1000+i,name:`Remote ${i}`,servingLabel:'1',category:'Lunch',calories:100+i,proteinG:0,carbsG:0,fatG:0,fiberG:0});
        db[i.toString(16).padStart(32,'0')]=JSON.stringify(value);
      }
      localStorage.setItem('__fixture_cloud',JSON.stringify({'qa-user':db}));
      return {db,meals:JSON.parse(localStorage.getItem('fitlife_meals_v1')),weights:JSON.parse(localStorage.getItem('fitlife_weights_v1'))};
    });
    await navSettings(page);
    await page.getByRole('button',{name:/^(Sync now|Retry sync)$/}).click();
    const panel=page.getByLabel('Google account and cloud sync');
    await panel.getByText('Cloud sync paused: 10 device snapshots already exist.',{exact:false}).waitFor({timeout:12000});
    assert((await panel.innerText()).includes('Changes on this device need sync'));
    let after=await page.evaluate(()=>({db:JSON.parse(localStorage.getItem('__fixture_cloud'))['qa-user'],meals:JSON.parse(localStorage.getItem('fitlife_meals_v1')),weights:JSON.parse(localStorage.getItem('fitlife_weights_v1'))}));
    assert.deepEqual(after,before,'the cap neither creates, deletes, merges nor changes any local/remote records');
    assert.equal(Object.keys(after.db).length,10);
    assert.equal(after.db['c'.repeat(32)],undefined);
    // This removal is made by the isolated test fixture, not by app code.
    await page.evaluate(()=>{const all=JSON.parse(localStorage.getItem('__fixture_cloud'));delete all['qa-user']['0000000000000000000000000000000a'];localStorage.setItem('__fixture_cloud',JSON.stringify(all));});
    await page.getByRole('button',{name:'Retry sync'}).click();
    await page.waitForFunction(()=>Object.keys(JSON.parse(localStorage.getItem('__fixture_cloud'))['qa-user']).length===10 && !!JSON.parse(localStorage.getItem('__fixture_cloud'))['qa-user']['c'.repeat(32)],null,{timeout:12000});
    after=await page.evaluate(()=>({db:JSON.parse(localStorage.getItem('__fixture_cloud'))['qa-user'],meals:JSON.parse(localStorage.getItem('fitlife_meals_v1'))}));
    for (const id of Object.keys(before.db).slice(0,9)) assert.equal(after.db[id],before.db[id],`existing slot ${id} remains untouched`);
    assert(after.meals.some(x=>x.id==='local-meal'));
    assert(after.meals.filter(x=>x.id.startsWith('remote-')).length>=9,'nine remote histories were merged');
    // Existing installation remains allowed to update with ten slots.
    await tab(page,'Meals'); await page.getByLabel('Describe a meal').fill('2 boiled eggs');
    await page.getByRole('button',{name:'Add (1)'}).click(); await closeCelebration(page);
    await navSettings(page); await page.getByRole('button',{name:/^(Sync now|Retry sync)$/}).click();
    await page.waitForFunction(()=>JSON.parse(JSON.parse(localStorage.getItem('__fixture_cloud'))['qa-user']['c'.repeat(32)]).snapshot.meals.some(m=>m.name.includes('Whole Boiled Egg')),null,{timeout:12000});
    assert.equal(Object.keys((await page.evaluate(()=>JSON.parse(localStorage.getItem('__fixture_cloud'))['qa-user']))).length,10);
  } finally {await context.close();}
  console.log('PASS browser: 10-slot new-device stop preserves data; nine-to-ten and existing-slot updates work in simulated cloud');
  assert.deepEqual(errors,[],`no uncaught errors: ${errors.join('; ')}`);
} finally { await browser.close(); }
