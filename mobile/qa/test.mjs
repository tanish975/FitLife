import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.FITLIFE_URL || 'http://127.0.0.1:3000/';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const click = (name) => page.getByRole('button', { name, exact: true }).click();
const waitText = (name) => page.getByText(name, { exact: false }).first().waitFor();
const load = async () => { await page.goto(base, { waitUntil: 'networkidle' }); await waitText('Welcome to FitLife'); };
const demo = async () => { await click('Quick launch (demo data)'); await waitText("Today's overview"); };
const storage = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
const closeCelebration = async () => {
  const overlay = page.getByText('Achievement Unlocked', { exact: true });
  if (await overlay.count()) await overlay.click().catch(() => {});
};
const noOverflow = async (where) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `horizontal overflow: ${where}`);
const noGradients = async () => assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).backgroundImage.includes('gradient')).map(e => e.tagName + '.' + e.className).slice(0, 3)), []);
const contrast = async (selector) => page.locator(selector).first().evaluate(el => {
  const rgb = x => (x.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const lum = a => a.map(v => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const c = getComputedStyle(el), a = lum(rgb(c.color)), b = lum(rgb(c.backgroundColor));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
});

try {
  await load();
  assert.equal(await page.locator('input[type="password"]').count(), 0, 'no misleading password prompt in local demo');
  assert.equal((await page.locator('meta[name="viewport"]').getAttribute('content')).includes('maximum-scale'), false, 'user zoom not disabled');
  await demo();
  await page.locator('.app-toast').waitFor({ state: 'hidden' });
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.social-feed, .feed-post').count(), 0, 'home is not a social feed');
  assert.equal(await page.locator('.home-training-feature img').count(), 1);
  assert.equal(await page.locator('.home-focus img').count(), 2);
  assert.match(await page.locator('.home-training-feature img').getAttribute('alt'), /man and a woman/);
  assert.match(await page.locator('.home-focus img').nth(0).getAttribute('alt'), /man training/);
  assert.match(await page.locator('.home-focus img').nth(1).getAttribute('alt'), /woman exercising/);
  assert.equal(await page.getByText('Demo data', { exact: true }).count(), 1);
  await noGradients();
  await page.screenshot({ path: 'qa/fitness-mobile.png' });

  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(100);
    await noOverflow(`home ${width}px`);
  }
  await page.screenshot({ path: 'qa/fitness-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });

  await click('Add 250 milliliters of water');
  assert.equal((await storage('fitlife_water_v1')).amountMl, 250);
  await page.reload({ waitUntil: 'networkidle' }); await waitText("Today's overview");
  assert.equal((await storage('fitlife_water_v1')).amountMl, 250, 'hydration persists');
  await click('Remove 250 milliliters of water');
  assert.equal((await storage('fitlife_water_v1')).amountMl, 0);
  await click('Tired');
  assert.equal(await page.getByRole('button', { name: 'Tired', exact: true }).getAttribute('aria-pressed'), 'true');
  await waitText('Make room for recovery');
  assert.ok(await page.getByText('rule-based', { exact: false }).count() > 0);
  await closeCelebration();

  await page.getByRole('button', { name: /Upper body/ }).click();
  await waitText('SHOULDERS EXERCISES');
  assert.equal(await page.getByRole('button', { name: 'Shoulders', exact: true }).getAttribute('aria-pressed'), 'true');
  await click('Home');
  await page.getByRole('button', { name: /Lower body/ }).click();
  await waitText('LEGS EXERCISES');
  assert.equal(await page.getByRole('button', { name: 'Legs', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByText('Barbell Back Squat', { exact: true }).first().click();
  const workoutDialog = page.getByRole('dialog', { name: 'Barbell Back Squat' });
  await workoutDialog.waitFor();
  assert.ok(await workoutDialog.getByText('starts at zero', { exact: false }).count());
  assert.equal(await workoutDialog.getByRole('spinbutton', { name: 'Load in kg' }).inputValue(), '0', 'new exercise load does not assume strength');
  await workoutDialog.getByRole('button', { name: 'Increase sets' }).click();
  await workoutDialog.getByRole('button', { name: 'Log Workout Set (+20 XP)' }).click();
  await page.waitForTimeout(450); await closeCelebration();
  assert.ok((await storage('fitlife_workouts_v1')).some(w => w.exerciseName === 'Barbell Back Squat' && w.id.startsWith('wk-')), 'workout saved locally');

  await click('Meals'); await waitText('Meals & Nutrition');
  const quickMeal = page.getByPlaceholder('Try "2 eggs and a banana" or "150g chicken & rice"');
  assert.equal(await quickMeal.evaluate(e => getComputedStyle(e).fontSize), '16px', 'mobile input is at least 16px');
  await quickMeal.fill('150g grilled chicken and 2 eggs');
  await waitText('248 kcal'); await waitText('144 kcal');
  await page.getByRole('button', { name: 'Add (2)' }).click();
  await page.waitForTimeout(200); await closeCelebration();
  const meals = await storage('fitlife_meals_v1');
  assert.ok(meals.some(m => m.name.includes('150 g Grilled Chicken Breast') && m.calories === 248), 'grams scale to the catalog serving, not a guessed 100g');
  assert.ok(meals.some(m => m.name.includes('Whole Boiled Egg') && m.calories === 144), 'quantity parser');
  await quickMeal.fill('2 mystery soup');
  assert.ok(await page.getByText('(generic estimate)', { exact: false }).count() > 0, 'unmatched food is labelled as an estimate');
  await noOverflow('meals');
  await page.setViewportSize({ width: 320, height: 700 });
  const formFits = await page.locator('form').first().evaluate(form => {
    const bounds = form.getBoundingClientRect();
    return [...form.children].every(child => child.getBoundingClientRect().right <= bounds.right + 1);
  });
  assert.equal(formFits, true, 'meal entry and Add button remain visible at 320px');
  await page.setViewportSize({ width: 390, height: 844 });
  await click('Progress'); await waitText('Progress & Trends');
  await waitText('Body Mass Index');
  await click('Profile'); await waitText('Athlete Profile');
  await click('Home'); await waitText("Today's overview");
  await page.getByRole('button', { name: 'Details', exact: false }).click();
  await waitText('Daily Pulse'); await waitText('not your health');
  await click('Back to home');

  await click('Open settings'); await waitText('Studio & Customization');
  const palettes = [
    ['Matcha & Oat', 'matcha_oat'], ['Coastal Eucalyptus', 'coastal_eucalyptus'],
    ['Terracotta & Olive', 'terracotta_olive'], ['Nordic Fjord & Birch', 'nordic_fjord'], ['Kyoto Cedar & Moss', 'kyoto_cedar'],
  ];
  const accentValues = new Set();
  for (const [label, id] of palettes) {
    await page.getByRole('button', { name: new RegExp('^' + label.replace('&', '&')) }).click();
    assert.equal((await storage('fitlife_settings_v2')).paletteId, id);
    assert.equal(await page.getByRole('button', { name: new RegExp('^' + label.replace('&', '&')) }).getAttribute('aria-pressed'), 'true');
    accentValues.add(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim()));
  }
  assert.equal(accentValues.size, 5, 'five distinct natural palettes');
  await click('Nightfall'); await click('Crisp (14px)'); await click('Spacious'); await click('Minimal');
  await click('4.0L'); await click('90s'); await click('Pounds (lb)');
  await page.getByRole('switch', { name: 'Haptic feedback' }).click();
  for (const widget of ['4 Macro Rings Card', 'Daily Hydration Tracker', '11-State Mood Check-In', 'Daily guidance', 'Today’s Activity Feed']) {
    const sw = page.getByRole('switch', { name: widget });
    assert.equal(await sw.getAttribute('aria-checked'), 'true');
    await sw.click();
    assert.equal(await sw.getAttribute('aria-checked'), 'false');
  }
  const cfg = await storage('fitlife_settings_v2');
  assert.deepEqual([cfg.themeMode, cfg.cornerStyle, cfg.densityStyle, cfg.motionStyle, cfg.waterGoalMl, cfg.defaultRestSeconds, cfg.weightUnit, cfg.hapticsEnabled], ['dark', 'sharp', 'spacious', 'reduced', 4000, 90, 'lb', false]);
  await click('Back'); await waitText("Today's overview");
  for (const heading of ['Your nutrition', 'Stay hydrated', 'How are you feeling?', "Today's activity"]) assert.equal(await page.getByText(heading, { exact: true }).count(), 0, `hidden widget: ${heading}`);
  assert.equal(await page.locator('.home-coach').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.motion), 'reduced');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.density), 'spacious');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--radius-card').trim()), '14px');
  await noGradients();
  assert.ok(await contrast('.home-action.primary') >= 4.5, 'primary action contrast in dark mode');
  assert.ok(await contrast('.home-action.secondary') >= 4.5, 'secondary action contrast in dark mode');
  await page.screenshot({ path: 'qa/fitness-night.png' });

  await click('Open settings');
  for (const widget of ['4 Macro Rings Card', 'Daily Hydration Tracker', '11-State Mood Check-In', 'Daily guidance', 'Today’s Activity Feed']) await page.getByRole('switch', { name: widget }).click();
  await click('QR & Install Guide');
  const install = page.getByRole('dialog', { name: 'Install FitLife on Phone' }); await install.waitFor();
  await install.getByAltText('Scan QR Code to open FitLife on phone').waitFor();
  assert.match(await install.innerText(), /differently signed older APK/i);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0, 'install dialog closes with Escape');
  await click('Back');
  await click('Add 250 milliliters of water');
  assert.equal((await storage('fitlife_water_v1')).amountMl, 250);
  assert.equal(await page.getByRole('progressbar', { name: 'Water towards daily goal' }).getAttribute('aria-valuemax'), '4000');
  await click('Workouts');
  await page.getByText('Barbell Flat Bench Press', { exact: true }).first().click();
  assert.match(await page.getByRole('dialog').innerText(), /90s/);
  assert.ok(await page.getByRole('spinbutton', { name: 'Load in lb' }).count(), 'weight-unit setting reaches workout sheet');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0, 'workout dialog closes with Escape');
  await click('Home'); await click('Open settings');
  await click('Clear All Logs');
  assert.ok((await storage('fitlife_meals_v1')).length > 0, 'clearing requires confirmation');
  await click('Cancel');
  assert.ok((await storage('fitlife_meals_v1')).length > 0, 'cancel preserves logs');
  await click('Clear All Logs'); await click('Confirm clear logs');
  assert.equal((await storage('fitlife_meals_v1')).length, 0);
  await click('Back'); await waitText('No activity logged yet');
  assert.equal(await page.getByText('Demo data', { exact: true }).count(), 0);
  assert.deepEqual(errors, []);

  // Fresh, first-run signup reaches onboarding and retains a usable flow.
  const firstRun = await browser.newPage({ viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true });
  await firstRun.goto(base, { waitUntil: 'networkidle' });
  await firstRun.getByText('Welcome to FitLife').waitFor();
  await firstRun.getByRole('button', { name: 'Create Profile', exact: true }).click();
  await firstRun.getByRole('textbox', { name: 'Full Name' }).fill('Asha Tester');
  await firstRun.getByRole('textbox', { name: 'Email Address' }).fill('example@example.com');
  await firstRun.getByRole('button', { name: 'Continue to Onboarding' }).click();
  await firstRun.getByText('Body & Goal Calibration').waitFor();
  assert.equal(await firstRun.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'onboarding at 320px');
  await firstRun.getByRole('button', { name: 'Complete profile & continue' }).click();
  await firstRun.getByText('Good ', { exact: false }).first().waitFor();
  assert.ok((await firstRun.locator('body').innerText()).includes('Asha'));
  assert.equal(await firstRun.getByText('Demo data', { exact: true }).count(), 0, 'fresh profile starts without sample activity');
  await firstRun.getByRole('button', { name: 'Profile', exact: true }).click();
  await firstRun.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await firstRun.getByRole('button', { name: 'Continue as Asha Tester', exact: true }).click();
  await firstRun.getByText("Today's overview").waitFor();
  assert.equal((await firstRun.evaluate(() => JSON.parse(localStorage.getItem('fitlife_profile_v1')))).name, 'Asha Tester', 'local profile survives sign out and return');
  await firstRun.close();

  console.log('PASS: first-run flow, fitness-first home, balanced photos, all viewports, local logging & hydration, rule-based mood, 5 palettes, themes, widget settings, customization, dialogs, data confirmation, 5 tabs and daily details.');
} catch (e) {
  console.error('FAILED:', e.stack || e.message);
  console.error('PAGE:', page.url());
  console.error('TEXT:', (await page.locator('body').innerText()).slice(0, 3200));
  console.error('PAGE ERRORS:', errors);
  await page.screenshot({ path: 'qa/failure.png' }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
