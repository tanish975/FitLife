import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { nativeApp, installNativeFixture } from './mock-native.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Browser-level motion and interaction checks only: Android WebView and
// TalkBack still require real-device validation. Native bridges are fixtures.
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];
const nav = (page, name) => page.getByRole('navigation', {name:'Main navigation'}).getByRole('button', {name, exact:true});
const openApp = async ({reduced = false, width = 390} = {}) => {
  const context = await browser.newContext({viewport:{width, height:844}, isMobile:true, hasTouch:true,
    reducedMotion:reduced ? 'reduce' : 'no-preference', timezoneId:'Asia/Kolkata'});
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await installNativeFixture(page, {steps:true, reminders:true});
  await page.goto(nativeApp, {waitUntil:'networkidle'});
  await page.getByText("Today's overview").waitFor();
  return {page, context};
};
const css = (locator, property) => locator.evaluate((element, name) => getComputedStyle(element)[name], property);
const noOverflow = async (page, label) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${label} must not overflow horizontally`);
const noGradient = async (page) => assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('*')].filter(element => getComputedStyle(element).backgroundImage.includes('gradient')).map(element => element.className).slice(0,5)), []);

try {
  // Pointer motion, interruption, focus restoration, and meaningful bars.
  {
    const {page, context} = await openApp();
    const stepButton = page.getByRole('button',{name:'Set up step tracking'});
    const box = await stepButton.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.waitForTimeout(120);
    assert(parseFloat(await css(stepButton,'scale')) < 1,'pointer press gives bounded visual feedback');
    await page.mouse.up();
    const dialog = page.getByRole('dialog',{name:'Your steps'});
    await dialog.waitFor();
    assert.equal(await css(dialog,'animationName'),'fitlife-sheet-in','phone sheet has a bounded entrance');
    assert.equal(await css(dialog,'opacity'),'1','sheet text never fades to low contrast');
    assert.equal(await css(dialog.locator('..'),'opacity'),'1','only the scrim fades, not the sheet contents');
    assert.equal(await css(dialog.locator('.step-bar-track i').first(),'animationName'),'fitlife-step-bar-in');
    assert.equal(await dialog.locator('.step-bar-track i').count(),7);
    assert.equal(await css(dialog.locator('.step-bar-track i').last(),'animationDelay'),'0.06s','history stagger stays bounded');
    const opening = await dialog.evaluate(element => {
      const animation = element.getAnimations().find(a => a.animationName === 'fitlife-sheet-in');
      if (!animation) return null;
      animation.pause(); animation.currentTime = 100;
      const transform = getComputedStyle(element).transform;
      animation.finish();
      return transform;
    });
    assert(opening && opening !== 'none',`sheet has a real intermediate transform: ${opening}`);
    const phone = dialog.locator('.step-source').filter({hasText:'Phone sensor'});
    const health = dialog.locator('.step-source').filter({hasText:'Health Connect'});
    await phone.getByRole('button',{name:'Start'}).tap();
    await dialog.getByText('6,200',{exact:false}).first().waitFor();
    await page.waitForFunction(() => document.querySelector('.step-ring strong')?.textContent?.includes('6,200'));
    // Record actual text changes while switching source. The ring's accessible
    // name always contains the exact source total, even while numbers tween.
    await page.evaluate(() => {
      window.__stepFrames = [];
      const el = document.querySelector('.step-ring strong');
      const record = () => window.__stepFrames.push(el.textContent);
      window.__stepObserver = new MutationObserver(record);
      window.__stepObserver.observe(el,{subtree:true,childList:true,characterData:true});
    });
    await health.getByRole('button',{name:'Connect'}).evaluate(button => button.click());
    await health.getByText('Connected',{exact:true}).waitFor();
    await page.waitForFunction(() => document.querySelector('.step-ring strong')?.textContent?.includes('4,500'));
    const frames = await page.evaluate(() => window.__stepFrames);
    assert(frames.length >= 3,`Anime.js animates changing step totals; frames=${frames.join(', ')}`);
    assert.equal(await page.locator('.step-ring').getAttribute('aria-label'),'4,500 steps, 75 percent of the 6,000 step goal');
    // Two rapid reversals retarget the counter and never sum two sources.
    await health.getByRole('button',{name:'Disconnect'}).evaluate(button => button.click());
    await health.getByText('Not connected').waitFor();
    await health.getByRole('button',{name:'Connect'}).evaluate(button => button.click());
    await health.getByText('Connected',{exact:true}).waitFor();
    await page.waitForFunction(() => document.querySelector('.step-ring strong')?.textContent?.includes('4,500'));
    assert.equal(await dialog.locator('.step-sheet-summary strong').innerText(),'4,500 steps');
    assert.equal(await page.evaluate(() => window.__fitlifeHandleBack()), true, 'Back consumes the open sheet');
    await dialog.waitFor({state:'detached'});
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'View step details and sources');
    // Rapid taps leave the last route selected and do not duplicate content.
    await page.evaluate(() => {
      const root = document.querySelector('nav[aria-label="Main navigation"]');
      for (const label of ['Meals','Workouts','Progress','Home','Workouts']) root.querySelector(`button[aria-label="${label}"]`).click();
    });
    assert.equal(await nav(page,'Workouts').getAttribute('aria-current'),'page');
    assert.equal(await page.locator('.guided-picker').count(),1);
    assert.equal(await css(page.locator('.animate-tab-right, .animate-tab-left').first(),'animationName'),'fitlife-route-arrive');
    await page.locator('.exercise-open').first().tap();
    const pointerSheet = page.getByRole('dialog',{name:'Barbell Flat Bench Press'}); await pointerSheet.waitFor();
    await page.emulateMedia({reducedMotion:'reduce'}); await page.emulateMedia({reducedMotion:'no-preference'});
    const save = pointerSheet.getByRole('button',{name:/Log Workout Set/});
    await save.scrollIntoViewIfNeeded();
    assert(await save.evaluate(button => {
      const rect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width/2, Math.min(innerHeight-2,rect.top + rect.height/2));
      return !!hit && (hit === button || button.contains(hit));
    }), 'the workout sheet stays above navigation when the OS motion preference changes');
    assert.equal(await page.evaluate(() => window.__fitlifeHandleBack()), true);
    await pointerSheet.waitFor({state:'detached'});
    await page.locator('.weekly-planner > summary').tap();
    assert.equal(await css(page.locator('.weekly-planner-body'),'animationName'),'fitlife-content-in');
    assert.equal(await css(page.locator('.planner-progress i'),'transformOrigin'),'0px 2px');
    await page.locator('.guided-picker').getByRole('button',{name:'Start',exact:true}).tap();
    const workout = page.getByRole('dialog',{name:'Home full body'});
    await workout.waitFor();
    assert.equal(await css(workout,'animationName'),'fitlife-sheet-in');
    assert.equal(await css(workout,'opacity'),'1','guided sheet retains full text contrast during its entrance');
    assert.equal(await css(workout.locator('.guided-phase'),'animationName'),'fitlife-content-in');
    assert.equal(await css(workout.locator('.guided-phase'),'opacity'),'1','work/rest content retains full text contrast');
    await workout.getByRole('button',{name:'Skip exercise'}).tap();
    assert.equal(await workout.getByRole('progressbar',{name:'Workout exercises completed'}).getAttribute('aria-valuenow'),'1');
    assert.match(await workout.locator('.guided-progress-track span').getAttribute('style'),/scaleX\(/);
    await workout.getByRole('button',{name:'Pause',exact:true}).tap();
    assert(await workout.getByText('Workout paused').isVisible());
    await workout.getByRole('button',{name:'Resume workout'}).tap();
    assert(await workout.getByText('Form cue').isVisible());
    assert.equal(await page.evaluate(() => window.__fitlifeHandleBack()), true);
    await workout.waitFor({state:'detached'});
    await noGradient(page); await noOverflow(page,'animated Workouts');
    // Keyboard navigation is immediately visible with no route animation.
    await nav(page,'Meals').focus();
    await page.keyboard.press('Enter');
    assert.equal(await nav(page,'Meals').getAttribute('aria-current'),'page');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.fitlifeInput),'keyboard');
    assert.equal(await css(page.locator('.animate-tab-right, .animate-tab-left').first(),'animationName'),'none');
    assert.equal(await css(page.locator('.mobile-nav-selection'),'transitionDuration'),'0s');
    // Switching from keyboard to touch while an exercise sheet is open must
    // not restart the route animation or move the sheet behind bottom nav.
    await nav(page,'Workouts').focus(); await page.keyboard.press('Enter');
    const route = page.locator('.animate-tab-right, .animate-tab-left').first();
    assert.equal(await css(route,'animationName'),'none');
    await page.locator('.exercise-open').first().focus(); await page.keyboard.press('Enter');
    const entry = page.getByRole('dialog',{name:'Barbell Flat Bench Press'}); await entry.waitFor();
    assert.equal(await css(entry,'animationName'),'none','keyboard-opened workout details are immediate');
    await entry.getByRole('spinbutton',{name:'Reps'}).focus();
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowDown');
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('fitlife_workouts_v1') || '[]').length);
    await entry.getByRole('button',{name:/Log Workout Set/}).tap();
    await entry.waitFor({state:'detached'});
    await page.waitForFunction(count => JSON.parse(localStorage.getItem('fitlife_workouts_v1') || '[]').length === count + 1, before);
    assert.equal(await css(route,'animationName'),'none','pointerdown did not restart the keyboard route');
    // The app override also works without an OS-level reduced-motion request.
    await nav(page,'Home').tap();
    await page.getByRole('button',{name:'Open settings',exact:true}).tap();
    await page.getByRole('switch',{name:'Reduce motion'}).tap();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.motion),'reduced');
    assert(parseFloat(await css(page.locator('.accessibility-setting i').first(),'transitionDuration')) < .001);
    await nav(page,'Home').tap();
    await page.getByRole('button',{name:'View step details and sources'}).tap();
    const still = page.getByRole('dialog',{name:'Your steps'}); await still.waitFor();
    assert.equal(await css(still.locator('.step-bar-track i').first(),'animationName'),'none');
    assert(parseFloat(await css(still,'animationDuration')) < .001);
    assert.equal(await page.evaluate(() => window.__fitlifeHandleBack()), true);
    await still.waitFor({state:'detached'});
    await page.getByRole('button',{name:'Open settings',exact:true}).tap();
    await page.getByRole('switch',{name:'Reduce motion'}).tap();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.motion),'spring');
    await page.waitForTimeout(1000);
    assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length),0,'no ambient CSS animation remains when idle');
    await context.close();
  }
  // OS-level reduced motion, app override and local persistence at 320px.
  // A disk-backed Chromium profile is closer to a WebView's persistent data
  // directory. In-memory file: contexts occasionally lose *all* storage before
  // any app script runs; this test must never copy application data to mask it.
  {
    const profileDir = await mkdtemp(join(tmpdir(),'fitlife-motion-'));
    const options = {headless:true, args:['--no-sandbox'], viewport:{width:320,height:844}, isMobile:true,
      hasTouch:true, reducedMotion:'reduce', timezoneId:'Asia/Kolkata'};
    let context;
    try {
      context = await chromium.launchPersistentContext(profileDir, options);
      let page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await installNativeFixture(page,{steps:true,reminders:true});
      await page.goto(nativeApp,{waitUntil:'networkidle'});
      await page.getByText("Today's overview").waitFor();
      // Ensure recovery cannot mask missing local preferences.
      await page.evaluate(() => localStorage.setItem('__fixture_offline','1'));
      await page.getByRole('button',{name:'Set up step tracking'}).tap();
      const dialog = page.getByRole('dialog',{name:'Your steps'}); await dialog.waitFor();
      assert.equal(await css(dialog.locator('.step-bar-track i').first(),'animationName'),'none');
      assert(parseFloat(await css(dialog,'animationDuration')) < .001);
      await dialog.getByRole('button',{name:'Close step details'}).tap();
      await page.getByRole('button',{name:'Open settings',exact:true}).tap();
      const reduce = page.getByRole('switch',{name:'Reduce motion'});
      assert.equal(await reduce.getAttribute('aria-checked'),'false','system preference is independent of app override');
      await reduce.tap();
      assert.equal(await reduce.getAttribute('aria-checked'),'true');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.motion),'reduced');
      await page.getByRole('switch',{name:'Larger text'}).tap();
      assert.equal(await page.getByRole('switch',{name:'Larger text'}).getAttribute('aria-checked'),'true');
      await noOverflow(page,'320px Settings with larger text');
      // The account slot is authoritative on restart; verify it synchronously
      // after the committed interaction. The fixture never repopulates it.
      const saved = await page.evaluate(() => ({
        owner:localStorage.getItem('fitlife_cloud_owner_v1'),
        slot:JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:qa-user') || '{}'),
      }));
      assert.equal(saved.owner,'qa-user','the expected account owns the device');
      assert.equal(saved.slot.snapshot?.settings?.motionStyle,'reduced','reduced motion is saved before reload');
      assert.equal(saved.slot.snapshot?.settings?.largeText,true,'larger text is saved before reload');
      await page.reload({waitUntil:'networkidle'});
      await page.getByText("Today's overview").waitFor();
      await page.getByRole('button',{name:'Open settings',exact:true}).tap();
      assert.equal(await page.getByRole('switch',{name:'Reduce motion'}).getAttribute('aria-checked'),'true','app reduced motion persists immediately');
      assert.equal(await page.getByRole('switch',{name:'Larger text'}).getAttribute('aria-checked'),'true','larger text persists');
      assert.equal(await page.evaluate(() => localStorage.getItem('__fixture_offline')),'1','local test remains offline');
      const resumeFixture = await page.evaluate(() => Object.fromEntries(
        ['__fixture_seeded','__fixture_current','__fixture_next','__fixture_cloud','__fixture_offline']
          .map(key => [key,localStorage.getItem(key)])));
      // Close and relaunch Chromium on the same profile, preserving only the
      // simulated native/remote fixture keys outside that profile.
      await context.close(); context = undefined;
      context = await chromium.launchPersistentContext(profileDir, options);
      page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await installNativeFixture(page,{steps:true,reminders:true,resumeFixture});
      await page.goto(nativeApp,{waitUntil:'networkidle'});
      await page.getByText("Today's overview").waitFor();
      await page.getByRole('button',{name:'Open settings',exact:true}).tap();
      assert.equal(await page.getByRole('switch',{name:'Reduce motion'}).getAttribute('aria-checked'),'true','reduced motion survives an offline browser restart');
      assert.equal(await page.getByRole('switch',{name:'Larger text'}).getAttribute('aria-checked'),'true','larger text survives an offline browser restart');
      await page.getByRole('switch',{name:'Reduce motion'}).tap();
      assert.equal(await page.evaluate(() => document.documentElement.dataset.motion),'spring');
      assert(parseFloat(await css(page.getByRole('switch',{name:'Larger text'}).locator('i'),'transitionDuration')) < .001,'system preference still wins when app override is off');
      await noGradient(page);
    } finally {
      await context?.close();
      await rm(profileDir,{recursive:true,force:true});
    }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: bounded phone motion, Anime.js value changes/reversals, progress, focus/Back, rapid taps, keyboard, reduced motion, persistence, 320px and solid colors (simulated browser).');
} finally { await browser.close(); }
