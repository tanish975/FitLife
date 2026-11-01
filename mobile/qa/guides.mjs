import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { installNativeFixture, nativeApp } from './mock-native.mjs';

// QA-only bridge protocol simulation. It does not test real Google/Firebase sign-in.
const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
const errors = [];
const newPage = async (opts = {}, viewport = { width:390, height:844 }, extra = {}) => {
  const context = await browser.newContext({ viewport, isMobile:viewport.width < 700, hasTouch:viewport.width < 700, serviceWorkers:'block', ...extra });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  await installNativeFixture(page, { signedIn:false, demo:false, uid:'alice', name:'Asha Athlete', email:'asha@example.test', ...opts });
  await page.goto(nativeApp, { waitUntil:'domcontentloaded' });
  return { context, page };
};
const guide = (page, name) => page.getByRole('region', { name:`${name} guide`, exact:true });
const tab = (page, name) => page.getByRole('navigation', { name:'Main navigation' }).getByRole('button', { name, exact:true });
const skip = page => page.getByRole('button', { name:'Skip guide' }).click();
const slot = (page, uid) => page.evaluate(uid => JSON.parse(localStorage.getItem(`fitlife_cloud_partition_v1:${uid}`)), uid);
const waitHome = page => page.getByText("Today's overview", { exact:true }).waitFor({ timeout:12000 });

try {
  const { context, page } = await newPage();
  await page.getByRole('button', { name:'Sign in with Google', exact:true }).waitFor();
  assert.equal(await page.getByText('Local access', { exact:true }).count(), 0);
  assert.equal(await page.getByText(/Quick launch/).count(), 0);
  assert.equal(await page.getByRole('textbox').count(), 0, 'no fake local-email sign-in');
  await page.evaluate(() => localStorage.setItem('__fixture_signin_error','1'));
  await page.getByRole('button', { name:'Sign in with Google', exact:true }).click();
  await page.getByRole('status').getByText('Google sign-in was cancelled.').waitFor();
  assert.equal(await page.getByRole('navigation', { name:'Main navigation' }).count(), 0, 'a cancelled sign-in cannot enter Home');
  await page.evaluate(() => localStorage.removeItem('__fixture_signin_error'));
  // A fresh install may be closed on the sign-in screen and opened later.
  // The persisted demo defaults must not become the new user's real history.
  await page.reload();
  await page.getByRole('button', { name:'Sign in with Google', exact:true }).waitFor();
  await page.getByRole('button', { name:'Sign in with Google', exact:true }).click();
  await waitHome(page);
  await guide(page, 'Home').waitFor({ timeout:12000 });
  assert.equal(await page.getByRole('heading', { name:'Complete your profile' }).count(), 0, 'profile setup is optional');
  assert.equal(await page.getByText('Demo data', { exact:true }).count(), 0, 'new account does not inherit sample history');
  let alice = await slot(page, 'alice');
  assert.equal(alice.snapshot.profile.onboarded, false);
  for (const kind of ['meals','workouts','weights','moods']) assert.equal(alice.snapshot[kind].length, 0, `fresh ${kind} is empty`);
  let body = await page.locator('body').innerText();
  assert(!body.includes('73.4') && !body.includes('176 cm') && !body.includes('Calories remaining'), 'placeholder demographics and targets do not appear as facts');
  assert.equal(await guide(page,'Home').getByText('Tip 1 of 3').count(), 1);
  await guide(page,'Home').getByRole('button', { name:'Next' }).click();
  assert.equal(await guide(page,'Home').getByText('Log in a tap').count(), 1);
  await guide(page,'Home').getByRole('button', { name:'Previous tip' }).click();
  await guide(page,'Home').getByRole('button', { name:'Show me' }).click();
  await guide(page,'Home').waitFor({ state:'hidden' });
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-guide-target') === 'home-overview');

  await tab(page,'Meals').click(); await guide(page,'Meals').waitFor();
  await guide(page,'Meals').getByRole('button', { name:'Next' }).click();
  assert.equal(await guide(page,'Meals').getByText('Describe and review').count(), 1);
  await skip(page);
  assert.match(await page.getByText('Today’s Intake').locator('..').innerText(), /0 kcal logged/);
  await tab(page,'Home').click(); await waitHome(page);
  assert.equal(await guide(page,'Home').count(), 0, 'visited Home does not repeat');
  await tab(page,'Meals').click();
  assert.equal(await guide(page,'Meals').count(), 0, 'skipped Meals does not repeat');

  await tab(page,'Workouts').click(); await guide(page,'Workouts').waitFor();
  await guide(page,'Workouts').getByRole('button', { name:'Skip guide' }).focus();
  await page.keyboard.press('Escape');
  await guide(page,'Workouts').waitFor({ state:'hidden' });
  await page.getByRole('button', { name:'Show no-equipment home exercises' }).click();
  await page.getByPlaceholder(/Search .*exercise/i).fill('March in Place');
  await page.getByText('March in Place', { exact:true }).first().click();
  const workout = page.getByRole('dialog', { name:'March in Place' }); await workout.waitFor();
  assert.equal(await workout.getByText('Add weight for an estimate').count(), 1, 'no placeholder body weight is used for calorie estimate');
  assert.equal(await workout.getByText(/BMI is/).count(), 0, 'no placeholder BMI advice');
  await workout.getByRole('button', { name:/Log Workout Set/ }).click();
  await workout.waitFor({ state:'hidden' });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('fitlife_workouts_v1') || '[]').length === 1);
  alice = await slot(page, 'alice');
  assert.equal(alice.snapshot.workouts[0].energyEstimateAvailable, false);
  assert(await page.getByText(/Energy not estimated/).count(), 'unavailable energy is not presented as zero calories');

  await tab(page,'Progress').click(); await guide(page,'Progress').waitFor(); await skip(page);
  assert.equal(await page.getByText('No weight logged yet.').count(), 1);
  assert.equal(await page.getByText('BMI is not available yet').count(), 1);
  assert.equal(await page.getByPlaceholder(/Enter today's weight/).inputValue(), '');
  assert.equal(await page.getByTestId('bmi-marker').count(), 0);
  body = await page.locator('body').innerText(); assert(!body.includes('73.4') && !body.includes('176 cm'));

  await tab(page,'Profile').click(); await guide(page,'Profile').waitFor();
  if (await page.getByRole('button',{name:'Dismiss achievement'}).count()) await page.getByRole('button',{name:'Dismiss achievement'}).click();
  assert.equal(await page.evaluate(() => window.__fitlifeHandleBack()), true, 'Android Back follows tab history even with a non-modal guide');
  await page.getByRole('heading', { name:'Progress & Trends' }).waitFor();
  assert.equal(await guide(page,'Progress').count(), 0);
  await tab(page,'Profile').click();
  assert.equal(await guide(page,'Profile').count(), 0, 'leaving a guide marks that first visit complete');
  assert.equal(await page.getByText('Profile details are optional').count(), 1);
  assert.equal(await page.getByText('Biometrics & Daily Targets').count(), 0);
  await page.getByRole('button', { name:'Add profile details', exact:true }).click();
  await guide(page,'Profile details').waitFor(); await skip(page);
  assert.equal(await page.getByLabel('Age (yrs)').inputValue(), '');
  assert.equal(await page.getByLabel('Height (cm)').inputValue(), '');
  assert.equal(await page.getByLabel('Weight (kg)').inputValue(), '');
  assert.equal(await page.getByText('Estimates will appear here').count(), 1);
  await page.getByRole('button', { name:'Complete profile & continue' }).click();
  assert.match(await page.getByRole('alert').innerText(), /choose a biological sex/i);
  await page.getByRole('button', { name:/Female/ }).click();
  await page.getByLabel('Age (yrs)').fill('29'); await page.getByLabel('Height (cm)').fill('170'); await page.getByLabel('Weight (kg)').fill('66.2');
  assert.equal(await page.getByText('Estimates will appear here').count(), 1, 'a goal and activity must also be selected');
  await page.getByRole('button', { name:'Complete profile & continue' }).click();
  assert.match(await page.getByRole('alert').innerText(), /choose a fitness goal/i);
  await page.getByRole('button', { name:/Maintain & Tone/ }).click();
  await page.getByRole('button', { name:'Complete profile & continue' }).click();
  assert.match(await page.getByRole('alert').innerText(), /choose your usual activity/i);
  await page.getByRole('button', { name:/Lightly Active/ }).click();
  assert.equal(await page.getByText('Estimated daily target').count(), 1, 'preview uses explicit inputs only');
  await page.getByRole('button', { name:'Complete profile & continue' }).click();
  await page.getByRole('heading', { name:'Athlete Profile' }).waitFor();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('fitlife_profile_v1') || '{}').onboarded === true);
  assert.equal((await slot(page,'alice')).snapshot.profile.heightCm, 170);

  await tab(page,'Home').click(); await page.getByRole('button', { name:'Details' }).click();
  await guide(page,'Daily dashboard').waitFor(); await skip(page);
  await page.getByRole('button', { name:'Back to home' }).click();
  await page.getByRole('button', { name:'Open settings', exact:true }).click();
  await guide(page,'Settings').waitFor(); await skip(page);
  await page.getByRole('button', { name:'Review app tips' }).click();
  await page.getByRole('button', { name:'Meals guide', exact:true }).click();
  await guide(page,'Meals').waitFor(); await skip(page);
  await tab(page,'Home').click();
  await page.getByRole('button', { name:'Open settings', exact:true }).click();
  assert.equal(await guide(page,'Settings').count(), 0, 'Settings does not repeat after first visit');
  await page.getByRole('button', { name:'Sync now', exact:true }).click();
  await page.waitForFunction(() => {
    const raw=JSON.parse(localStorage.getItem('__fixture_cloud') || '{}').alice?.['c'.repeat(32)];
    const seen=raw && JSON.parse(raw).snapshot.settings.guidesSeen;
    return seen && ['dashboard','meals','workouts','progress','profile','settings','daily','onboarding'].every(id => seen.includes(id));
  }, null, { timeout:15000 });
  const cloud = await page.evaluate(() => JSON.parse(localStorage.getItem('__fixture_cloud')));
  await page.getByRole('button', { name:'Sign out of Google', exact:true }).click();
  await page.getByRole('button', { name:'Sign in with Google', exact:true }).waitFor();
  await page.evaluate(() => localStorage.setItem('__fixture_next','bob'));
  await page.getByRole('button', { name:'Sign in with Google', exact:true }).click();
  await guide(page,'Home').waitFor({ timeout:12000 });
  assert.equal((await slot(page,'bob')).snapshot.meals.length, 0, 'Bob does not receive Alice activity');
  assert.equal((await slot(page,'bob')).snapshot.settings.guidesSeen.includes('meals'), false, 'first-visit flags are isolated per account');
  await skip(page);
  await page.getByRole('button', { name:'Open settings', exact:true }).click();
  await guide(page,'Settings').waitFor(); await skip(page);
  await page.getByRole('button', { name:'Sign out of Google', exact:true }).click();
  await page.getByRole('button', { name:'Sign in with Google', exact:true }).waitFor();
  await page.evaluate(() => localStorage.setItem('__fixture_next','alice'));
  await page.getByRole('button', { name:'Sign in with Google', exact:true }).click(); await waitHome(page);
  await page.waitForTimeout(2200);
  assert.equal(await guide(page,'Home').count(), 0, 'returning account retains its own guide state');
  assert.equal((await slot(page,'alice')).snapshot.profile.name, 'Asha Athlete');
  const beforeReload=await page.evaluate(()=>({url:location.href,cur:localStorage.getItem('__fixture_current'),owner:localStorage.getItem('fitlife_cloud_owner_v1'),keys:Object.keys(localStorage)}));
  await page.reload(); try { await waitHome(page); } catch (e) { console.log('RELOAD DEBUG', beforeReload, await page.url(), await page.locator('body').innerText(), await page.evaluate(()=>({cur:localStorage.getItem('__fixture_current'),owner:localStorage.getItem('fitlife_cloud_owner_v1'),auth:localStorage.getItem('fitlife_auth_v1'),keys:Object.keys(localStorage)})), errors); throw e; } await page.waitForTimeout(2200);
  assert.equal(await guide(page,'Home').count(), 0, 'native session and guide state restore on reload');
  await context.close();

  // An existing unclaimed profile must not lose rows just because their IDs
  // look like seeded samples. Preferences, the display name and real activity
  // are retained on first claim; only explicitly non-sample rows upload.
  const legacyContext = await browser.newContext({ viewport:{width:390,height:844}, serviceWorkers:'block', reducedMotion:'reduce' });
  const legacyPage = await legacyContext.newPage(); legacyPage.on('pageerror', error => errors.push(error.message));
  await legacyPage.addInitScript(() => {
    if (localStorage.getItem('__legacy_seeded')) return;
    const now = new Date(); const day = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
    const sample = { id:'today-meal-1', dateKey:day, timestamp:Date.now()-60000, name:'A locally retained sample', servingLabel:'1 plate', category:'Breakfast', calories:300, proteinG:15, carbsG:40, fatG:8, fiberG:5 };
    const personal = { ...sample, id:'legacy-real-meal', name:'My previously logged meal' };
    localStorage.setItem('fitlife_profile_v1', JSON.stringify({ name:'Tanish Patel', email:'tanish@fitlife.app', sex:'male', age:24, heightCm:176, weightKg:73.4, goal:'lose_weight', activityLevel:'moderate', onboarded:true, uid:'fitlife-b038b-uid-01' }));
    localStorage.setItem('fitlife_settings_v2', JSON.stringify({ themeMode:'dark', paletteId:'nordic_fjord', weightUnit:'lb', weeklyWorkoutGoal:5 }));
    localStorage.setItem('fitlife_meals_v1', JSON.stringify([sample,personal]));
    for (const key of ['fitlife_workouts_v1','fitlife_weights_v1','fitlife_moods_v1']) localStorage.setItem(key,'[]');
    localStorage.setItem('fitlife_water_v1', JSON.stringify({dateKey:day,amountMl:350}));
    localStorage.setItem('__legacy_seeded','1');
  });
  await installNativeFixture(legacyPage, { signedIn:false, demo:false, uid:'legacy', name:'Google Name', email:'legacy@example.test' });
  await legacyPage.goto(nativeApp); await legacyPage.getByRole('button', {name:'Sign in with Google'}).click(); await waitHome(legacyPage);
  await legacyPage.waitForFunction(() => {
    const raw=JSON.parse(localStorage.getItem('__fixture_cloud') || '{}').legacy?.['c'.repeat(32)];
    return raw && JSON.parse(raw).snapshot.meals.some(row => row.id === 'legacy-real-meal');
  }, null, { timeout:15000 });
  const legacy = await slot(legacyPage,'legacy');
  assert.equal(legacy.snapshot.profile.name, 'Tanish Patel', 'legacy display name is not silently replaced');
  assert.equal(legacy.snapshot.settings.themeMode, 'dark'); assert.equal(legacy.snapshot.settings.paletteId, 'nordic_fjord');
  assert.equal(legacy.snapshot.settings.weightUnit, 'lb'); assert.equal(legacy.snapshot.settings.weeklyWorkoutGoal, 5);
  assert.equal(legacy.snapshot.water.amountMl, 350);
  assert.deepEqual(legacy.snapshot.meals.map(row => row.name).sort(), ['A locally retained sample','My previously logged meal'].sort());
  const legacyCloud = await legacyPage.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('__fixture_cloud')).legacy['c'.repeat(32)]));
  assert.deepEqual(legacyCloud.snapshot.meals.map(row => row.id), ['legacy-real-meal'], 'personal activity merges, sample stays local');
  assert.equal(await guide(legacyPage,'Home').count(), 0, 'pre-guide existing users are not forced into tips');
  await legacyContext.close();

  // Even a legacy snapshot containing *only* sample-ID rows is persisted data;
  // a customized row must not be thrown away as an untouched fresh install.
  const sampleContext = await browser.newContext({ viewport:{width:390,height:844}, serviceWorkers:'block', reducedMotion:'reduce' });
  const samplePage = await sampleContext.newPage(); samplePage.on('pageerror', error => errors.push(error.message));
  await samplePage.addInitScript(() => {
    if (localStorage.getItem('__sample_seeded')) return;
    const now=new Date(), day=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    localStorage.setItem('fitlife_profile_v1',JSON.stringify({name:'Tanish Patel',email:'tanish@fitlife.app',sex:'male',age:24,heightCm:176,weightKg:73.4,goal:'lose_weight',activityLevel:'moderate',onboarded:true,uid:'fitlife-b038b-uid-01'}));
    localStorage.setItem('fitlife_settings_v2',JSON.stringify({themeMode:'dark',paletteId:'kyoto_cedar',weightUnit:'lb'}));
    localStorage.setItem('fitlife_meals_v1',JSON.stringify([{id:'today-meal-1',dateKey:day,timestamp:Date.now(),name:'Customized legacy row',servingLabel:'1 plate',category:'Breakfast',calories:321,proteinG:15,carbsG:40,fatG:8,fiberG:5}]));
    for (const key of ['fitlife_workouts_v1','fitlife_weights_v1','fitlife_moods_v1']) localStorage.setItem(key,'[]');
    localStorage.setItem('fitlife_water_v1',JSON.stringify({dateKey:day,amountMl:0})); localStorage.setItem('__sample_seeded','1');
  });
  await installNativeFixture(samplePage,{signedIn:false,demo:false,uid:'sample-legacy',name:'Another Name',email:'legacy@example.test'});
  await samplePage.goto(nativeApp); await samplePage.getByRole('button',{name:'Sign in with Google'}).click(); await waitHome(samplePage);
  await samplePage.waitForFunction(() => localStorage.getItem('fitlife_cloud_partition_v1:sample-legacy') !== null);
  let sampleLegacy=await slot(samplePage,'sample-legacy');
  assert.equal(sampleLegacy.snapshot.meals[0]?.name,'Customized legacy row', 'sample-ID legacy row is preserved locally');
  assert.equal(sampleLegacy.snapshot.settings.paletteId,'kyoto_cedar');
  await samplePage.waitForTimeout(1200); sampleLegacy=await slot(samplePage,'sample-legacy');
  assert.equal(sampleLegacy.snapshot.meals[0]?.name,'Customized legacy row', 'sync does not remove the local row');
  await sampleContext.close();

  // Transfer the mock remote snapshot to a clean second device and verify the
  // account's first-visit flags are merged before showing automatic guides.
  const second = await browser.newContext({ viewport:{width:390,height:844}, serviceWorkers:'block' });
  const secondPage = await second.newPage(); secondPage.on('pageerror', error => errors.push(error.message));
  await secondPage.addInitScript(data => localStorage.setItem('__fixture_cloud', JSON.stringify(data)), cloud);
  await installNativeFixture(secondPage, { signedIn:true, demo:false, uid:'alice', name:'Asha Athlete', email:'asha@example.test' });
  await secondPage.goto(nativeApp); await waitHome(secondPage);
  await secondPage.waitForFunction(() => JSON.parse(localStorage.getItem('fitlife_settings_v2') || '{}').guidesSeen?.includes('settings'), null, {timeout:15000});
  assert.equal(await guide(secondPage,'Home').count(), 0, 'synced account does not replay Home on a second device');
  await tab(secondPage,'Meals').click(); await secondPage.waitForTimeout(100);
  assert.equal(await guide(secondPage,'Meals').count(), 0, 'synced area is not repeated on a second device');
  await second.close();

  // Offline restore is local-first: a valid native session still opens and the
  // same device does not repeat a skipped guide if cloud requests fail.
  const offline = await newPage({ uid:'offline', name:'Offline Athlete' });
  await offline.page.getByRole('button', { name:'Sign in with Google' }).click();
  await offline.page.evaluate(() => localStorage.setItem('__fixture_offline','1'));
  await guide(offline.page,'Home').waitFor({timeout:12000}); await skip(offline.page);
  await offline.page.reload(); await waitHome(offline.page); await offline.page.waitForTimeout(2300);
  assert.equal(await guide(offline.page,'Home').count(), 0, 'skipped guide survives offline session restoration');
  await offline.context.close();

  // Customized preferences on an otherwise fresh device survive first claim.
  // Check guide text and keyboard focus across every palette, in both modes.
  for (const mode of ['light','dark']) for (const paletteId of ['matcha_oat','coastal_eucalyptus','terracotta_olive','nordic_fjord','kyoto_cedar']) {
    const themeContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
    const themePage=await themeContext.newPage(); themePage.on('pageerror', error => errors.push(error.message));
    await themePage.addInitScript(({mode,paletteId}) => {
      if (!localStorage.getItem('__theme_seeded')) {
        localStorage.setItem('fitlife_settings_v2',JSON.stringify({themeMode:mode,paletteId,weightUnit:'lb',weeklyWorkoutGoal:5}));
        localStorage.setItem('__theme_seeded','1');
      }
    }, {mode,paletteId});
    await installNativeFixture(themePage,{signedIn:false,demo:false,uid:`palette-${mode}-${paletteId}`,name:'Athlete',email:'athlete@example.test'});
    await themePage.goto(nativeApp); await themePage.getByRole('button',{name:'Sign in with Google'}).click();
    const tip=guide(themePage,'Home'); await tip.waitFor({timeout:12000});
    const saved=await slot(themePage,`palette-${mode}-${paletteId}`);
    assert.equal(saved.snapshot.settings.paletteId,paletteId); assert.equal(saved.snapshot.settings.themeMode,mode);
    assert.equal(saved.snapshot.settings.weightUnit,'lb'); assert.equal(saved.snapshot.settings.weeklyWorkoutGoal,5);
    const ratios=await tip.evaluate(node => {
      const parse = value => { const nums=value.match(/[\d.]+/g)?.map(Number) || []; return [nums[0]||0,nums[1]||0,nums[2]||0,nums.length>3?nums[3]:1]; };
      const bgFor = el => { let cur=el, color; while (cur) { color=parse(getComputedStyle(cur).backgroundColor); if(color[3]>=0.999) return color; cur=cur.parentElement; } return [255,255,255,1]; };
      const lum = rgb => { const c=rgb.slice(0,3).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
      const selectors=['.guide-heading p','.guide-heading strong','.guide-copy h2','.guide-copy p','.guide-progress','.guide-skip','.guide-show','.guide-next'];
      return selectors.map(selector=>{const el=node.querySelector(selector);const a=lum(parse(getComputedStyle(el).color)),b=lum(bgFor(el));return {selector,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)};});
    });
    for (const item of ratios) assert(item.ratio>=4.5, `${mode}/${paletteId} ${item.selector} contrast ${item.ratio.toFixed(2)}:1`);
    await themePage.keyboard.press('Tab'); await tip.getByRole('button',{name:'Next'}).focus();
    const focused=await tip.getByRole('button',{name:'Next'}).evaluate(el=>({visible:el.matches(':focus-visible'),outline:getComputedStyle(el).outlineStyle,width:parseFloat(getComputedStyle(el).outlineWidth)}));
    assert(focused.visible && focused.outline!=='none' && focused.width>=2, `${mode}/${paletteId} keyboard focus is visible`);
    await themeContext.close();
  }

  // Small and landscape viewports: guide controls remain usable and nav is not covered.
  for (const [width,height] of [[320,480],[360,640],[640,360],[768,1024]]) {
    const x = await newPage({ uid:`v${width}`, name:'Fit Athlete' }, {width,height}, { reducedMotion:'reduce' });
    await x.page.getByRole('button', { name:'Sign in with Google' }).click();
    const tip = guide(x.page,'Home'); await tip.waitFor({timeout:12000});
    const metrics = await x.page.evaluate(() => ({ width:innerWidth, scroll:document.documentElement.scrollWidth }));
    assert(metrics.scroll <= metrics.width + 1, `guide horizontal overflow ${width}x${height}`);
    for (const names of [['Skip guide','Show me','Next'],['Skip guide','Previous tip','Show me','Next']]) {
      for (const name of names) {
        const box=await tip.getByRole('button',{name,exact:true}).boundingBox();
        assert(box && box.width>=44 && box.height>=44 && box.x>=0 && box.x+box.width<=width+1, `${name} touch target at ${width}x${height}`);
      }
      if (names.length===3) await tip.getByRole('button',{name:'Next'}).click();
    }
    if (width < 651) {
      const n=await x.page.getByRole('navigation',{name:'Main navigation'}).boundingBox();
      const g=await tip.boundingBox(); assert(g.y+g.height <= n.y+1, `guide covers nav at ${width}x${height}`);
    }
    await x.context.close();
  }
  assert.deepEqual(errors, [], `uncaught errors: ${errors.join('; ')}`);
  console.log('PASS: Google-only entry and failure handling; fresh-account data safety; optional profile; first-visit, skip, replay, Back/keyboard, account isolation, cloud guide union, offline restore and responsive reduced-motion guides (simulated native bridge).');
} finally { await browser.close(); }
