import { nativeApp, installNativeFixture } from './mock-native.mjs';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Exercises the same JS entry point called by Android, not an actual Android
// system gesture or a physical phone. The Java adapter is compiled separately.
const base = nativeApp;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await context.newPage();
await installNativeFixture(page);
const errors = []; page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => { const s=JSON.parse(localStorage.getItem('fitlife_settings_v2') || '{}'); localStorage.setItem('fitlife_settings_v2', JSON.stringify({ ...s, navStyle:'solid' })); });
const clickTab = name => page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: true }).click();
const back = () => page.evaluate(() => window.__fitlifeHandleBack?.());
const storage = key => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), key);
const noOverflow = async label => {
  const sizes = await page.evaluate(() => ({ viewport: innerWidth, html: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert(sizes.html <= sizes.viewport + 1 && sizes.body <= sizes.viewport + 1, `${label} overflow: ${JSON.stringify(sizes)}`);
};
const fillNutrition = async (dialog, { calories='240', protein='12', carbs='30', fat='6', fiber='4', sugar='', sodium='', note='' } = {}) => {
  await dialog.getByLabel('Calories (kcal)').fill(calories);
  await dialog.getByLabel('Protein (g)', { exact: true }).fill(protein);
  await dialog.getByLabel('Carbohydrates (g)').fill(carbs);
  await dialog.getByLabel('Fat (g)', { exact: true }).fill(fat);
  await dialog.getByLabel('Fiber (g)').fill(fiber);
  if (sugar) await dialog.getByLabel('Sugar (g) · optional').fill(sugar);
  if (sodium) await dialog.getByLabel('Sodium (mg) · optional').fill(sodium);
  if (note) await dialog.getByLabel('Nutrition source or notes · optional').fill(note);
};

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('.kettlebell-art').waitFor();
  assert.equal(await page.locator('.kettlebell-body').count(), 1, 'splash includes the fitness-themed kettlebell');
  assert.equal(await page.locator('.runner-art').count(), 0, 'the previous runner loader is removed');
  assert.equal(await page.locator('.splash-logo .fitlife-logo-accent rect').count(), 5, 'splash uses fitness mark');
  await page.getByText("Today's overview").waitFor();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  assert.equal((await storage('fitlife_settings_v2')).navStyle, 'solid', 'legacy settings remain intact');
  assert.equal(await nav.getAttribute('data-nav-style'), 'glass', 'legacy solid preference cannot defeat requested glass');
  const glass = await nav.evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, filter: getComputedStyle(el).backdropFilter }));
  assert.match(glass.filter, /blur\(20px\)/, `navigation should visibly frost the content: ${JSON.stringify(glass)}`);
  assert.match(glass.bg, /0\.5[234]/, `glass should remain translucent: ${JSON.stringify(glass)}`);

  // Frequent switches must not unmount, hide, or intercept the fixed tab bar.
  for (const name of ['Meals','Workouts','Progress','Profile','Home','Workouts','Meals','Profile','Progress','Home','Meals','Workouts','Home']) {
    await clickTab(name);
    assert.equal(await nav.getByRole('button', { name, exact: true }).getAttribute('aria-current'), 'page', `${name} selected`);
    assert(await nav.isVisible(), `nav disappeared after ${name}`);
    const hit = await nav.getByRole('button', { name, exact: true }).evaluate(el => {
      const r = el.getBoundingClientRect(), found = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
      return r.top >= 0 && r.bottom <= innerHeight && !!found && (found === el || el.contains(found));
    });
    assert(hit, `${name} tab must stay visible and tappable`);
  }
  for (const [width,height] of [[320,640],[360,740],[390,844],[640,360]]) {
    await page.setViewportSize({ width, height });
    await clickTab('Workouts'); await noOverflow(`workouts ${width}x${height}`);
    assert(await nav.isVisible());
    await clickTab('Meals'); await noOverflow(`meals ${width}x${height}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await clickTab('Home');

  // Home -> Meals -> Workouts -> Progress -> Profile; sheets and inline
  // confirmations consume Back before the previous screen/tab.
  assert.equal(await back(), false, 'Home requests normal Android exit');
  await clickTab('Meals'); await clickTab('Workouts'); await clickTab('Progress'); await clickTab('Profile');
  await page.getByRole('button', { name: 'Install on Phone' }).click();
  await page.getByRole('dialog', { name: 'Install FitLife on Phone' }).waitFor();
  assert.equal(await back(), true); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Open Settings', exact: true }).click();
  await page.getByRole('heading', { name: 'Settings' }).waitFor();
  assert.equal(await page.getByText('Shape, Density & Motion Feel', { exact: true }).count(), 0);
  assert.equal(await page.getByText('Install FitLife on Your Phone', { exact: true }).count(), 0);
  await page.locator('.settings-fold > summary').filter({hasText:'Data controls'}).click();
  await page.getByRole('button', { name: 'Clear activity logs' }).click();
  await page.getByRole('alert').waitFor(); assert.equal(await back(), true); await page.getByRole('alert').waitFor({ state: 'hidden' });
  assert((await storage('fitlife_meals_v1')).length > 0, 'Back cancels destructive confirmation');
  await page.locator('.settings-fold > summary').filter({hasText:'Encrypted backup'}).click();
  await page.getByRole('button', { name: 'Create backup', exact: true }).click();
  await page.getByRole('button', { name: 'Close backup' }).waitFor(); assert.equal(await back(), true);
  await page.getByRole('button', { name: 'Close backup' }).waitFor({ state: 'hidden' });
  assert.equal(await back(), true); await page.getByRole('heading', { name: 'Athlete Profile' }).waitFor();
  assert.equal(await back(), true); await page.getByRole('heading', { name: 'Progress & Trends' }).waitFor();
  assert.equal(await back(), true); await page.getByRole('heading', { name: 'Workouts', exact:true }).waitFor();
  await page.getByTestId('exercise-catalog-list').locator('.exercise-open').first().click();
  await page.getByRole('dialog').waitFor(); assert.equal(await back(), true); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await nav.getByRole('button', { name: 'Workouts' }).getAttribute('aria-current'), 'page');
  assert.equal(await back(), true); await page.getByRole('heading', { name: 'Meals', exact:true }).waitFor();
  assert.equal(await back(), true); await page.getByText("Today's overview").waitFor();
  assert.equal(await back(), false);

  // Home entry point exposes all equipment-free choices, with new ones first.
  await clickTab('Workouts');
  const shortcut = page.getByRole('region', { name: 'No-equipment workouts at home' });
  await shortcut.getByText('39 movements', { exact: false }).waitFor();
  await shortcut.getByRole('button', { name: 'Explore no-equipment home exercises' }).click();
  await page.getByRole('heading', { name: 'No-equipment exercises (39)' }).waitFor();
  assert.equal(await page.getByLabel('Filter by equipment').inputValue(), 'bodyweight');
  const catalog = page.getByTestId('exercise-catalog-list');
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: /Show more exercises/ }).click();
  assert.equal(await catalog.locator('.exercise-row').count(), 39);
  const ids = await catalog.locator('.exercise-row').evaluateAll(rows => rows.map(row => row.getAttribute('data-exercise-id')));
  assert.equal(ids.filter(id => id.startsWith('ex-home-')).length, 30);
  assert(ids.slice(0,30).every(id => id.startsWith('ex-home-')), 'the 30 new home movements are easy to find');
  assert.equal(await catalog.locator('.exercise-row').filter({ hasText: 'Bodyweight' }).count(), 39);
  await catalog.locator('.exercise-open').first().click();
  let workout = page.getByRole('dialog', { name: 'Kneeling Push-Up' }); await workout.waitFor();
  assert.ok(await workout.getByText('Bodyweight').count()); assert.equal(await back(), true); await workout.waitFor({ state: 'hidden' });

  // A home idea is an ordered list, not an equipment-dependent workout.
  await page.locator('.training-disclosure > summary').filter({hasText:'Browse session ideas'}).click();
  await page.getByRole('button', { name: /Home full body/ }).click();
  await page.getByRole('button', { name: /Show more exercises/ }).click();
  assert.equal(await page.getByLabel('Filter by equipment').inputValue(), 'bodyweight');
  assert.deepEqual(await catalog.locator('.exercise-row').evaluateAll(rows => rows.map(row => row.getAttribute('data-exercise-id'))), [
    'ex-home-march-in-place','ex-home-air-squat','ex-home-kneeling-pushup','ex-glute-bridge','ex-bird-dog','ex-home-calf-raise',
  ]);
  await catalog.locator('.exercise-open').first().click();
  workout = page.getByRole('dialog', { name: 'March in Place' }); await workout.waitFor();
  assert.equal(await workout.getByRole('spinbutton', { name: 'Sets' }).inputValue(), '1');
  assert.equal(await workout.getByRole('spinbutton', { name: 'Minutes' }).inputValue(), '1');
  await workout.getByRole('button', { name: /Log Workout Set/ }).click(); await workout.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('fitlife_workouts_v1') || '[]').some(w => w.exerciseId === 'ex-home-march-in-place'));
  assert.equal((await storage('fitlife_workouts_v1')).find(w => w.exerciseId === 'ex-home-march-in-place').reps, 1);
  await page.getByRole('button', { name: /Low-impact home cardio/ }).click();
  assert.equal(await catalog.locator('.exercise-row').count(), 5);
  assert.equal(await page.getByLabel('Filter by equipment').inputValue(), 'bodyweight');
  await page.getByRole('button', { name: /Home core & back/ }).click();
  await page.getByRole('button', { name: /Show more exercises/ }).click();
  assert.equal(await catalog.locator('.exercise-row').count(), 6);
  await page.getByRole('button', { name: /Full-body foundations/ }).click();
  assert.equal(await catalog.locator('.exercise-row').count(), 5);
  await page.getByLabel('Filter by equipment').selectOption('bodyweight');
  assert.equal(await catalog.locator('.exercise-row').count(), 3);
  await page.getByRole('button', { name: 'View all', exact: true }).click();

  // Unmatched/ambiguous foods cannot be saved until values are explicitly supplied.
  await clickTab('Meals');
  const quick = page.getByPlaceholder('Try "2 eggs and a banana" or "150g chicken & rice"');
  await quick.fill('2 mystery soup');
  assert(await page.getByRole('button', { name: 'Add (1)' }).isDisabled());
  assert.equal(await page.getByText('Nutrition details needed').count(), 1);
  await page.getByRole('button', { name: /Review nutrition for 2× Mystery Soup/ }).click();
  let dialog = page.getByRole('dialog', { name: 'Review meal details' }); await dialog.waitFor();
  assert.equal(await dialog.getByLabel('Calories (kcal)').inputValue(), '', 'unknown energy is not fabricated');
  await fillNutrition(dialog, { sugar: '3.5', sodium: '340', note: 'Recipe estimate' });
  await dialog.getByRole('button', { name: 'Save nutrition details' }).click(); await dialog.waitFor({ state: 'hidden' });
  assert(await page.getByRole('button', { name: 'Add (1)' }).isEnabled());
  await page.getByRole('button', { name: 'Add (1)' }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('fitlife_meals_v1') || '[]').some(m => m.name.includes('Mystery Soup')));
  let meal = (await storage('fitlife_meals_v1')).find(m => m.name.includes('Mystery Soup'));
  assert.deepEqual([meal.calories, meal.proteinG, meal.carbsG, meal.fatG, meal.fiberG, meal.sugarG, meal.sodiumMg, meal.nutritionNote], [240,12,30,6,4,3.5,340,'Recipe estimate']);
  await page.getByRole('button', { name: /Edit 2× Mystery Soup/ }).click();
  dialog = page.getByRole('dialog', { name: 'Review meal details' });
  await dialog.getByLabel('Amount eaten').fill('1 large bowl'); await dialog.getByLabel('Calories (kcal)').fill('260');
  await dialog.getByRole('button', { name: 'Save nutrition details' }).click(); await dialog.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('fitlife_meals_v1') || '[]').some(m => m.name.includes('Mystery Soup') && m.calories === 260));
  meal = (await storage('fitlife_meals_v1')).find(m => m.name.includes('Mystery Soup'));
  assert.equal(meal.servingLabel, '1 large bowl'); assert.equal(meal.sodiumMg, 340);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole('button', { name: 'Custom meal' }).click(); dialog = page.getByRole('dialog', { name: 'Add a custom meal' }); await dialog.waitFor();
  await noOverflow('custom meal editor at 320px');
  assert.equal(await dialog.getByLabel('Food or meal name').inputValue(), '');
  assert.equal(await back(), true); await dialog.waitFor({ state: 'hidden' });
  assert.equal(await nav.getByRole('button', { name: 'Meals' }).getAttribute('aria-current'), 'page');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await clickTab('Workouts');
  assert.equal(await nav.locator('.is-active .mobile-nav-icon').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // Check each BMI on the first Progress render in a fresh, explicitly seeded
  // account. This is a visual fixture, not a data-persistence test: changing
  // localStorage in a running app races its own account/cloud persistence.
  // Isolated contexts also avoid Chromium's intermittent file: reload storage
  // loss from silently replacing the intended profile with the legacy fixture.
  for (const bmi of [12,15,18.5,25,30,35,39]) {
    const bmiContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    try {
      const bmiPage = await bmiContext.newPage();
      bmiPage.on('pageerror', error => errors.push(error.message));
      const profile = { name:'Tanish Patel', email:'tanish@fitlife.app', sex:'male', age:30, heightCm:170,
        weightKg:Number((bmi * 1.7 * 1.7).toFixed(3)), goal:'lose_weight', activityLevel:'moderate', onboarded:true, uid:'qa-legacy' };
      await installNativeFixture(bmiPage, { demoProfile:profile, emptyWeights:true });
      await bmiPage.goto(base, { waitUntil: 'domcontentloaded' });
      await bmiPage.getByText("Today's overview").waitFor();
      const saved = await bmiPage.evaluate(() => ({ profile:JSON.parse(localStorage.getItem('fitlife_profile_v1') || '{}'), weights:JSON.parse(localStorage.getItem('fitlife_weights_v1') || '[]') }));
      assert.equal(saved.profile.heightCm, 170, `BMI ${bmi} fixture height`);
      assert.equal(saved.profile.weightKg, profile.weightKg, `BMI ${bmi} fixture weight`);
      assert.equal(saved.weights.length, 0, `BMI ${bmi} fixture has no weight history`);
      await bmiPage.getByRole('navigation', { name:'Main navigation' }).getByRole('button', { name:'Progress', exact:true }).click();
      const marker = bmiPage.getByTestId('bmi-marker'); await marker.waitFor();
      const result = await marker.evaluate(el => ({ left: parseFloat(el.style.left), transition: getComputedStyle(el).transitionProperty, duration: getComputedStyle(el).transitionDuration }));
      assert(Math.abs(result.left - Math.max(0, Math.min(100, (bmi - 15) / 20 * 100))) < .03, `BMI ${bmi} marker: ${JSON.stringify(result)}`);
      assert.equal(parseFloat(result.duration), 0, 'BMI marker must not transition from a stale position');
    } finally { await bmiContext.close(); }
  }
  const native = await readFile('android/src/com/tanish/fitlife/MainActivity.java', 'utf8');
  assert.match(native, /evaluateJavascript\(.*__fitlifeHandleBack/); assert.doesNotMatch(native, /canGoBack\(\)/);
  assert.deepEqual(errors, []);
  console.log('PASS: frosted persistent tab bar, JS Back/sheet history, 91-exercise discovery and 30 no-equipment home additions, reviewed nutrition, BMI first-paint position, reduced motion and responsive layouts');
} finally { await context.close(); await browser.close(); }
