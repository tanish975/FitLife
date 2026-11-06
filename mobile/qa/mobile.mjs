import { nativeApp, installNativeFixture } from './mock-native.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = nativeApp;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];

async function freshPage(width, height, extra = {}, initSettings = null, signedIn = true) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 1000, hasTouch: width < 1000,
    ...extra,
  });
  const page = await context.newPage();
  await installNativeFixture(page, { signedIn });
  if (initSettings) await page.addInitScript(settings => localStorage.setItem('fitlife_settings_v2', JSON.stringify(settings)), initSettings);
  page.on('pageerror', error => errors.push(`${width}x${height}: ${error.message}`));
  await page.goto(base, { waitUntil: 'networkidle' });
  if (signedIn) await page.getByText("Today's overview").waitFor();
  else await page.getByRole('button', { name:'Sign in with Google', exact:true }).waitFor();
  return { context, page };
}

// Evaluate geometry and hit-testing directly. A locator click/scrollIntoView would
// auto-scroll an off-screen button and conceal the regression this suite targets.
async function assertActionInViewport(page, name, visibleBottom = null) {
  const action = page.getByRole('button', { name, exact: true });
  const metrics = await action.evaluate((element, limit) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
      height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight,
      limit: limit ?? innerHeight, isTarget: !!hit && (hit === element || element.contains(hit)),
      barPosition: getComputedStyle(element.closest('.entry-action-bar')).position,
    };
  }, visibleBottom);
  assert.equal(metrics.barPosition, 'fixed', `${name}: action bar is not fixed`);
  assert(metrics.height >= 44 && metrics.top >= 0 && metrics.bottom <= metrics.limit + 1 &&
         metrics.left >= 0 && metrics.right <= metrics.viewportWidth + 1 && metrics.isTarget,
    `${name} is off-screen or obscured: ${JSON.stringify(metrics)}`);
}

async function assertActionContrast(page, name) {
  const ratio = await page.getByRole('button', { name, exact: true }).evaluate(el => {
    const style = getComputedStyle(el);
    const luminance = value => {
      const rgb = value.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    };
    const [low, high] = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => a - b);
    return (high + 0.05) / (low + 0.05);
  });
  assert(ratio >= 4.5, `${name} does not have 4.5:1 text contrast (${ratio.toFixed(2)}:1)`);
}

async function assertNoHorizontalOverflow(page, label) {
  const values = await page.evaluate(() => ({
    width: innerWidth, html: document.documentElement.scrollWidth, body: document.body.scrollWidth,
  }));
  assert(values.html <= values.width + 1 && values.body <= values.width + 1,
    `${label} has horizontal overflow: ${JSON.stringify(values)}`);
}

async function tapSignup(page, name = null) {
  await page.getByRole('button', { name: 'Profile', exact: true }).first().click();
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByRole('heading', { name: 'Complete your profile' }).waitFor();
  if (name) await page.getByLabel('Athlete Name').fill(name);
  await assertActionInViewport(page, 'Complete profile & continue');
}

async function swipeUp(page, context, x, startY, endY) {
  const cdp = await context.newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] });
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x, y: startY + (endY - startY) * i / 8 }],
      });
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
  } finally { await cdp.detach(); }
}

async function assertSwipeFromCardScrolls(page, context, testId) {
  const list = page.getByTestId(testId);
  assert.equal(await list.evaluate(el => getComputedStyle(el).overflowY), 'visible', `${testId} has a nested vertical scroller`);
  const card = list.getByRole('button').first();
  // Center the actual card, rather than accepting the browser's definition of
  // "visible" when its bottom is covered by the persistent navigation bar.
  await card.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await page.waitForTimeout(250);
  const point = await card.evaluate(el => {
    const r = el.getBoundingClientRect();
    const x = Math.max(25, Math.min(innerWidth - 25, r.left + r.width / 2));
    const y = Math.max(70, Math.min(innerHeight - 105, r.top + r.height / 2));
    const hit = document.elementFromPoint(x, y);
    return { x, y, hitsCard: !!hit && (hit === el || el.contains(hit)), hit: hit ? `${hit.tagName}.${hit.className}` : null, card: { top:r.top, bottom:r.bottom }, viewport:innerHeight };
  });
  assert(point.hitsCard, `Swipe did not begin over a visible ${testId} card: ${JSON.stringify(point)}`);
  const before = await page.evaluate(() => scrollY);
  await swipeUp(page, context, point.x, point.y, Math.max(40, point.y - 280));
  const after = await page.evaluate(() => scrollY);
  assert(after > before + 40, `Swiping a ${testId} card did not scroll the page (${before} → ${after})`);
  assert.equal(await page.getByRole('dialog').count(), 0, 'A scroll gesture accidentally opened an item');
}

try {
  // Sizes include a small phone, normal phones, and landscape. Check before any
  // automated scroll, then ensure the final activity choice is not under the bar.
  for (const [width, height] of [[320, 480], [360, 640], [390, 844], [640, 360], [768, 1024]]) {
    const { context, page } = await freshPage(width, height);
    await tapSignup(page);
    await assertNoHorizontalOverflow(page, `onboarding ${width}x${height}`);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(50);
    await assertActionInViewport(page, 'Complete profile & continue');
    const lastChoice = page.getByRole('heading', { name: 'Weekly Activity Multiplier' }).locator('..').getByRole('button').last();
    const lastMetrics = await lastChoice.evaluate(el => ({ bottom: el.getBoundingClientRect().bottom, footerTop: document.querySelector('.entry-action-bar').getBoundingClientRect().top }));
    assert(lastMetrics.bottom <= lastMetrics.footerTop + 1, `Last activity choice is covered at ${width}x${height}: ${JSON.stringify(lastMetrics)}`);
    await context.close();
    console.log(`✓ Entry action, content and horizontal fit: ${width}×${height}`);
  }

  const { context, page } = await freshPage(360, 640);
  await tapSignup(page, 'Mira Tester');
  // Emulate VisualViewport shrink without changing the layout viewport (a common
  // soft-keyboard mode). This validates our response; it is not a real IME test.
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 300 });
    Object.defineProperty(window.visualViewport, 'offsetTop', { configurable: true, value: 60 });
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(60);
  await assertActionInViewport(page, 'Complete profile & continue', 360);
  await page.evaluate(() => {
    delete window.visualViewport.height;
    delete window.visualViewport.offsetTop;
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(60);
  await assertActionInViewport(page, 'Complete profile & continue');

  const age = page.getByLabel('Age (yrs)');
  await age.fill('');
  assert.equal(await age.inputValue(), '', 'Age cannot be cleared for editing');
  await age.fill('13');
  await page.getByRole('button', { name: 'Complete profile & continue' }).click();
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /age from 14 to 99/i);
  assert.equal(await age.getAttribute('aria-invalid'), 'true');
  await page.waitForFunction(() => document.activeElement?.id === 'onboarding-age');
  await age.fill('32');
  const height = page.getByLabel('Height (cm)');
  await height.fill('0');
  await page.getByRole('button', { name: 'Complete profile & continue' }).click();
  assert.match(await page.getByRole('alert').innerText(), /height from 120 to 230/i);
  await page.waitForFunction(() => document.activeElement?.id === 'onboarding-height');
  await height.fill('170');
  const weight = page.getByLabel('Weight (kg)');
  await weight.fill('');
  assert.equal(await weight.inputValue(), '', 'Weight cannot be cleared for editing');
  await page.getByRole('button', { name: 'Complete profile & continue' }).click();
  assert.match(await page.getByRole('alert').innerText(), /weight from 30 to 250 kg/i);
  await page.waitForFunction(() => document.activeElement?.id === 'onboarding-weight');
  await weight.fill('68.2');
  await assertActionInViewport(page, 'Complete profile & continue');
  await page.getByRole('button', { name: 'Complete profile & continue' }).click();
  await page.getByRole('heading', { name:'Athlete Profile' }).waitFor();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('fitlife_profile_v1') || '{}').age === 32);
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('fitlife_profile_v1')));
  assert.equal(profile.name, 'Mira Tester');
  assert.equal(profile.heightCm, 170);
  assert.equal(profile.weightKg, 68.2);
  assert.equal(profile.onboarded, true);
  assert.equal(await page.locator('.desktop-navigation, .wellness-aside').count(), 0, 'Hidden desktop-only UI mounted on a phone');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText("Today's overview").waitFor();
  console.log('✓ Keyboard viewport emulation, validation, editing, completion and persistence');

  await page.getByRole('button', { name: 'Workouts', exact: true }).click();
  await page.getByRole('heading',{name:'Workouts',exact:true}).waitFor();
  await page.waitForTimeout(250);
  await assertNoHorizontalOverflow(page, 'workouts');
  const exerciseList = page.getByTestId('exercise-catalog-list');
  assert.equal(await exerciseList.locator('.exercise-open').count(), 5);
  await assertSwipeFromCardScrolls(page, context, 'exercise-catalog-list');
  await page.getByRole('button', { name: /Show more exercises/ }).click();
  assert.equal(await exerciseList.locator('.exercise-open').count(), 10);
  await page.getByPlaceholder(/Search .*exercise/i).fill('a name that cannot match');
  await page.getByText('No exercises found').waitFor();
  await page.getByPlaceholder(/Search .*exercise/i).fill('');
  assert.equal(await exerciseList.locator('.exercise-open').count(), 5, 'Search did not reset progressive disclosure');
  const previousWorkoutCount = await page.evaluate(() => JSON.parse(localStorage.getItem('fitlife_workouts_v1') || '[]').length);
  await exerciseList.getByRole('button').first().click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  // Let the sheet's entrance transition finish before measuring its final position.
  await page.waitForFunction(() => {
    const sheet = document.querySelector('.workout-sheet');
    return !!sheet && sheet.getBoundingClientRect().bottom <= innerHeight + 1;
  }, null, { timeout: 1500 });
  const sheetRect = await dialog.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, overlayTop: parent.top, overlayBottom: parent.bottom, height: innerHeight };
  });
  assert(sheetRect.bottom <= sheetRect.height + 1 && sheetRect.overlayTop === 0 && sheetRect.overlayBottom === sheetRect.height,
    `Workout sheet is not anchored to the viewport: ${JSON.stringify(sheetRect)}`);
  const sets = dialog.getByRole('spinbutton', { name: 'Sets' });
  await sets.fill('');
  assert.equal(await sets.inputValue(), '', 'Workout sets cannot be cleared');
  await sets.fill('3');
  const reps = dialog.getByRole('spinbutton', { name: /Reps|Minutes/ });
  await reps.fill('10');
  await dialog.getByRole('button', { name: /Log Workout Set/ }).click();
  try {
    await page.waitForFunction(count => JSON.parse(localStorage.getItem('fitlife_workouts_v1') || '[]').length > count, previousWorkoutCount);
  } catch (error) {
    console.error('Workout save diagnostics:', { previousWorkoutCount, currentCount: await page.evaluate(() => JSON.parse(localStorage.getItem('fitlife_workouts_v1') || '[]').length), dialogPresent: await dialog.count(), errors });
    throw error;
  }
  assert.equal(await dialog.count(), 0, 'Workout did not close after saving');
  const logged = await page.evaluate(() => JSON.parse(localStorage.getItem('fitlife_workouts_v1'))[0]);
  assert.equal(logged.sets, 3);
  assert.equal(logged.reps, 10);
  console.log('✓ Touch scrolling over exercise cards, pagination, search and workout save');

  await page.getByRole('button', { name: 'Meals', exact: true }).click();
  await page.getByRole('heading',{name:'Meals',exact:true}).waitFor();
  await page.waitForTimeout(250);
  await assertNoHorizontalOverflow(page, 'meals');
  const foodList = page.getByTestId('food-catalog-list');
  assert.equal(await foodList.getByRole('button').count(), 5);
  await assertSwipeFromCardScrolls(page, context, 'food-catalog-list');
  await page.getByRole('button', { name: /Show more foods/ }).click();
  assert.equal(await foodList.getByRole('button').count(), 10);
  await page.getByPlaceholder(/Search \d+ foods/).fill('paneer');
  assert.equal(await foodList.getByRole('button').count(), 3);
  assert.equal(await page.locator('.shimmer-pulse').count(), 0, 'Search still inserts an artificial loading state');
  const previousMealCount = await page.evaluate(() => JSON.parse(localStorage.getItem('fitlife_meals_v1') || '[]').length);
  await foodList.getByRole('button').first().click();
  await page.waitForFunction(count => JSON.parse(localStorage.getItem('fitlife_meals_v1') || '[]').length > count, previousMealCount);
  console.log('✓ Touch scrolling over food cards, pagination, immediate search and meal logging');

  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Burst', exact: true }).click();
  const celebration = page.locator('.celebration-layer');
  await celebration.waitFor();
  assert.equal(await celebration.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
  await page.evaluate(() => window.scrollTo(0, 0));
  const before = await page.evaluate(() => scrollY);
  await swipeUp(page, context, 190, 520, 180);
  const after = await page.evaluate(() => scrollY);
  assert(after > before + 40, `Celebration blocked page scrolling (${before} → ${after})`);
  // If a particularly slow runner outlives the auto-dismiss timer, reopen the
  // notice to exercise its close button rather than failing on timing alone.
  if (await celebration.count() === 0) await page.getByRole('button', { name: 'Burst', exact: true }).click();
  await page.getByRole('button', { name: 'Dismiss achievement' }).click();
  assert.equal(await celebration.count(), 0);
  await context.close();
  console.log('✓ Celebration permits scrolling and has an accessible close action');

  const reduced = await freshPage(360, 640, { reducedMotion: 'reduce' });
  await reduced.page.getByRole('button', { name: 'Workouts', exact: true }).click();
  await reduced.page.getByTestId('exercise-catalog-list').getByRole('button').first().click();
  await reduced.page.getByRole('button', { name: 'Close workout details' }).click();
  assert.equal(await reduced.page.getByRole('dialog').count(), 0, 'Reduced-motion sheet did not close promptly');
  await reduced.page.getByRole('button', { name: 'Profile', exact: true }).click();
  await reduced.page.getByRole('button', { name: 'Burst', exact: true }).click();
  await reduced.page.locator('.celebration-banner').waitFor();
  assert.equal(await reduced.page.locator('.celebration-canvas').count(), 0, 'Reduced motion still runs particles');
  await reduced.context.close();
  console.log('✓ Reduced-motion celebration');

  for (const mode of ['light', 'dark']) {
    for (const palette of ['matcha_oat', 'coastal_eucalyptus', 'terracotta_olive', 'nordic_fjord', 'kyoto_cedar']) {
      const colors = await freshPage(320, 480, {}, { themeMode: mode, paletteId: palette }, false);
      await assertActionInViewport(colors.page, 'Sign in with Google');
      await assertActionContrast(colors.page, 'Sign in with Google');
      await colors.context.close();
    }
  }
  console.log('✓ Entry-action contrast across five palettes in both themes');

  // Restore an existing Nightfall preference and pound units as a returning
  // user would. Profile completion must remain legible and save kilograms.
  const nightContext = await browser.newContext({ viewport: { width: 320, height: 480 }, isMobile: true, hasTouch: true });
  const nightPage = await nightContext.newPage();
  await installNativeFixture(nightPage);
  nightPage.on('pageerror', error => errors.push(`nightfall: ${error.message}`));
  await nightPage.addInitScript(() => localStorage.setItem('fitlife_settings_v2', JSON.stringify({ themeMode: 'dark', weightUnit: 'lb' })));
  await nightPage.goto(base, { waitUntil: 'networkidle' });
  await nightPage.getByText("Today's overview").waitFor();
  assert.equal(await nightPage.evaluate(() => document.documentElement.dataset.themeMode), 'dark');
  await tapSignup(nightPage);
  await nightPage.getByLabel('Weight (lb)').fill('150');
  await assertActionInViewport(nightPage, 'Complete profile & continue');
  await nightPage.getByRole('button', { name: 'Complete profile & continue' }).click();
  await nightPage.getByRole('heading', { name:'Athlete Profile' }).waitFor();
  await nightPage.waitForFunction(() => JSON.parse(localStorage.getItem('fitlife_profile_v1') || '{}').weightKg === 68.04);
  await nightContext.close();
  console.log('✓ Nightfall entry and pound-to-kilogram profile saving');

  const desktop = await freshPage(1280, 800, { isMobile: false, hasTouch: false });
  await desktop.page.getByText("Today's overview").waitFor();
  assert.equal(await desktop.page.locator('.desktop-navigation').count(), 1);
  assert.equal(await desktop.page.locator('.wellness-aside').count(), 1);
  await desktop.page.locator('.desktop-navigation').getByRole('button', { name: 'Progress', exact: true }).click();
  await desktop.page.getByText('Weight Trend (Last 14 Check-in Days)').waitFor();
  const chart = desktop.page.locator('canvas').first();
  await desktop.page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    return c && c.width > 400 && c.width === Math.round(c.parentElement.clientWidth * Math.min(devicePixelRatio || 1, 2));
  });
  const wideChartWidth = await chart.evaluate(el => el.width);
  await desktop.page.setViewportSize({ width: 360, height: 640 });
  await desktop.page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    return !document.querySelector('.desktop-navigation, .wellness-aside') && c &&
      c.width === Math.round(c.parentElement.clientWidth * Math.min(devicePixelRatio || 1, 2));
  });
  const narrowChartWidth = await chart.evaluate(el => el.width);
  assert(narrowChartWidth < wideChartWidth, 'Canvas did not resize when the viewport narrowed');
  await desktop.page.setViewportSize({ width: 1280, height: 800 });
  await desktop.page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    return !!document.querySelector('.desktop-navigation') && !!document.querySelector('.wellness-aside') && c &&
      c.width === Math.round(c.parentElement.clientWidth * Math.min(devicePixelRatio || 1, 2));
  });
  await desktop.context.close();
  console.log('✓ Desktop sidebars and progress charts respond to viewport resizing');

  assert.deepEqual(errors, [], `Unexpected browser errors: ${errors.join('; ')}`);
  console.log('Mobile regression checks passed (Chromium emulation; physical phones still need testing).');
} finally {
  await browser.close();
}
