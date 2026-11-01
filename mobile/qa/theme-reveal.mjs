import { nativeApp, installNativeFixture } from './mock-native.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = nativeApp;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];

// Instrument only the theme reveal: pause its WAAPI animation so screenshots
// and geometry assertions examine real rendered frames rather than timing luck.
async function newApp({ fallback = false, unsupported = false, throwsView = false, throwsPseudo = false,
                        pause = true, inAppReduced = false, inAppMotion = null, osReduced = false,
                        viewport = { width: 390, height: 844 }, deviceScaleFactor = 1 } = {}) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600,
    deviceScaleFactor, reducedMotion: osReduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  const page = await context.newPage();
  await installNativeFixture(page);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ fallback, unsupported, throwsView, throwsPseudo, pause, inAppReduced, inAppMotion }) => {
    try {
      localStorage.setItem('fitlife_auth_v1', 'true');
      if (inAppReduced || inAppMotion) {
        const current = JSON.parse(localStorage.getItem('fitlife_settings_v2') || '{}');
        localStorage.setItem('fitlife_settings_v2', JSON.stringify({ ...current, motionStyle: inAppMotion || 'reduced' }));
      }
    } catch {}
    if (fallback || unsupported) Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true });
    if (throwsView) Object.defineProperty(document, 'startViewTransition', { value: () => { throw new Error('test: start unavailable'); }, configurable: true });
    if (unsupported) {
      const supports = CSS.supports.bind(CSS);
      CSS.supports = (...args) => args[0] === 'clip-path' ? false : supports(...args);
    }
    const original = Element.prototype.animate;
    window.__fitlifeThemeCaptures = [];
    Element.prototype.animate = function(keyframes, options) {
      const isView = options?.pseudoElement === '::view-transition-new(root)';
      const isFallback = this.dataset?.fitlifeThemeFallback === 'true';
      if (isView && throwsPseudo) throw new Error('test: pseudo animation unavailable');
      const animation = original.call(this, keyframes, options);
      if (isView || isFallback) {
        window.__fitlifeThemeCaptures.push({ animation, keyframes, options, type: isView ? 'view' : 'fallback' });
        if (pause) { animation.pause(); animation.currentTime = 0; }
      }
      return animation;
    };
  }, { fallback, unsupported, throwsView, throwsPseudo, pause, inAppReduced, inAppMotion });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByText("Today's overview", { exact: true }).waitFor();
  // Avoid sampling rings while their initial progress animation is running.
  await page.waitForTimeout(850);
  return { page, context };
}

const count = page => page.evaluate(() => window.__fitlifeThemeCaptures.length);
const lastCapture = page => page.evaluate(() => {
  const { keyframes, options, type } = window.__fitlifeThemeCaptures.at(-1);
  return { keyframes, options, type };
});
const mode = page => page.evaluate(() => document.documentElement.style.colorScheme);
const setting = (page, name) => page.evaluate(key => JSON.parse(localStorage.getItem('fitlife_settings_v2'))?.[key], name);

async function startReveal(page, button, { keyboard = false, expectedType = 'view' } = {}) {
  await button.scrollIntoViewIfNeeded();
  const rect = await button.boundingBox();
  assert.ok(rect, 'theme control is visible');
  const previous = await count(page);
  if (keyboard) { await button.focus(); await button.press('Enter'); }
  else await button.click();
  await page.waitForFunction(n => window.__fitlifeThemeCaptures.length > n, previous, { timeout: 4000 });
  const capture = await lastCapture(page);
  assert.equal(capture.type, expectedType);
  const [from, to] = capture.keyframes.clipPath;
  const start = from.match(/^circle\(0% at ([\d.]+)% ([\d.]+)%\)$/);
  const end = to.match(/^circle\(([\d.]+)% at ([\d.]+)% ([\d.]+)%\)$/);
  assert.ok(start && end, `expected a percentage-based expanding circle, got ${from} / ${to}`);
  const size = page.viewportSize();
  const centerX = Number(start[1]) / 100 * size.width;
  const centerY = Number(start[2]) / 100 * size.height;
  assert.ok(Math.abs(centerX - (rect.x + rect.width / 2)) < 2, `x origin ${centerX}, control ${rect.x + rect.width / 2}`);
  assert.ok(Math.abs(centerY - (rect.y + rect.height / 2)) < 2, `y origin ${centerY}, control ${rect.y + rect.height / 2}`);
  assert.equal(start[1], end[2]); assert.equal(start[2], end[3]);
  const radius = Number(end[1]) / 100 * Math.hypot(size.width, size.height) / Math.SQRT2;
  const farthest = Math.hypot(Math.max(centerX, size.width - centerX), Math.max(centerY, size.height - centerY));
  assert.ok(radius >= farthest, 'final circle covers every corner');
  return capture;
}

async function seek(page, time) {
  await page.evaluate(t => { window.__fitlifeThemeCaptures.at(-1).animation.currentTime = t; }, time);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function finishReveal(page) {
  await page.evaluate(() => window.__fitlifeThemeCaptures.at(-1).animation.finish());
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-fitlife-theme-reveal'), null, { timeout: 4000 });
  assert.equal(await page.locator('[data-fitlife-theme-fallback]').count(), 0, 'temporary layer removed');
}

async function screenshotPixels(page, png, points) {
  return page.evaluate(async ({ data, points }) => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    return points.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data).slice(0, 3));
  }, { data: png.toString('base64'), points });
}
const difference = (a, b) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0);

async function verifyRenderedCircle(page, expectedType) {
  const before = await page.screenshot({ scale: 'css' });
  const capture = await startReveal(page, page.getByRole('button', { name: 'Switch to nightfall theme' }), { expectedType });
  assert.equal(capture.options.duration, 620, 'full motion uses a clearly visible reveal');
  if (expectedType === 'fallback') {
    assert.equal(await mode(page), 'light', 'fallback keeps the original below its layer until covered');
    const layer = page.locator('[data-fitlife-theme-fallback]');
    assert.equal(await layer.getAttribute('aria-hidden'), 'true');
    assert.notEqual(await layer.getAttribute('inert'), null);
    assert.equal(await layer.evaluate(element => getComputedStyle(element).pointerEvents), 'none');
    assert.equal(await layer.locator('[id]').count(), 0, 'fallback does not duplicate IDs');
    assert.equal(await layer.locator('.home-icon-button .theme-visible-dark').evaluate(e => getComputedStyle(e).display), 'block', 'incoming theme icon is already present');
    assert.equal(await layer.locator('.home-icon-button .theme-visible-light').evaluate(e => getComputedStyle(e).display), 'none');
  }
  await seek(page, 310);
  const mid = await page.screenshot({ scale: 'css', path: `qa/theme-${expectedType}-mid.png` });
  const clip = await page.evaluate(type => type === 'view'
    ? getComputedStyle(document.documentElement, '::view-transition-new(root)').clipPath
    : getComputedStyle(document.querySelector('[data-fitlife-theme-fallback]')).clipPath, expectedType);
  const radius = Number(clip.match(/^circle\(([\d.]+)%/)?.[1]);
  assert.ok(radius > 1 && radius < 130, `real intermediate clip-path expands: ${clip}`);
  await seek(page, 619);
  const end = await page.screenshot({ scale: 'css' });
  const points = [[380, 100], [7, 740]]; // near the button / opposite corner, both plain background
  const [beforePixels, midPixels, endPixels] = await Promise.all([before, mid, end].map(png => screenshotPixels(page, png, points)));
  assert.ok(difference(beforePixels[0], midPixels[0]) > 120, 'near the control is already the new theme');
  assert.ok(difference(beforePixels[1], midPixels[1]) < 20, 'opposite corner still shows the old theme midway');
  assert.ok(difference(beforePixels[1], endPixels[1]) > 120, 'the reveal reaches the opposite corner');
  await finishReveal(page);
  assert.equal(await mode(page), 'dark');
  assert.equal(await setting(page, 'themeMode'), 'dark');
}

try {
  // Mobile: inspect actual rendered pixels and both directions, including keyboard.
  {
    const { page, context } = await newApp({ deviceScaleFactor: 1.25 });
    assert.equal(await page.evaluate(() => typeof document.startViewTransition), 'function');
    await verifyRenderedCircle(page, 'view');
    const back = await startReveal(page, page.getByRole('button', { name: 'Switch to daylight theme' }), { keyboard: true });
    assert.equal(back.options.duration, 620); await seek(page, 300); await finishReveal(page);
    assert.equal(await mode(page), 'light'); assert.equal(await setting(page, 'themeMode'), 'light');

    // Settings segments each originate at the actually activated segment.
    await page.getByRole('button', { name: 'Open settings', exact: true }).click();
    await page.getByText('Appearance Mode', { exact: true }).waitFor();
    await startReveal(page, page.getByRole('button', { name: 'Nightfall', exact: true })); await finishReveal(page);
    assert.equal(await page.getByRole('button', { name: 'Nightfall', exact: true }).getAttribute('aria-pressed'), 'true');
    const beforeSame = await count(page);
    await page.getByRole('button', { name: 'Nightfall', exact: true }).click();
    await page.waitForTimeout(120); assert.equal(await count(page), beforeSame, 'selecting the current mode does not replay');
    await startReveal(page, page.getByRole('button', { name: 'Daylight', exact: true }), { keyboard: true }); await finishReveal(page);
    // Legacy in-app motion settings remain compatible and are tested below.
    // Daily Dashboard's own accessible toggle has an independent origin.
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Details', exact: true }).click();
    const dailyToggle = page.getByRole('button', { name: 'Toggle Daylight or Nightfall Theme' });
    await page.waitForTimeout(650); // let the dashboard's entrance transform settle
    const box = await dailyToggle.boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44, 'daily theme target is touch-sized');
    await startReveal(page, dailyToggle); await finishReveal(page);
    assert.equal(await dailyToggle.getAttribute('aria-pressed'), 'true');
    assert.equal(await setting(page, 'themeMode'), 'dark');
    await page.reload({ waitUntil: 'networkidle' }); await page.getByText("Today's overview", { exact: true }).waitFor();
    assert.equal(await mode(page), 'dark', 'theme persists across reload');
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).backgroundImage.includes('gradient')).map(e => e.tagName)), [], 'no gradients');
    await context.close();
  }

  // Fallback: actual pixels, both directions, cleanup, and an interruption.
  {
    const { page, context } = await newApp({ fallback: true });
    await verifyRenderedCircle(page, 'fallback');
    await startReveal(page, page.getByRole('button', { name: 'Switch to daylight theme' }), { expectedType: 'fallback' });
    await seek(page, 310); await finishReveal(page); assert.equal(await mode(page), 'light');
    await page.evaluate(() => {
      const button = document.querySelector('[aria-label="Switch to nightfall theme"]');
      button.click(); button.click();
    });
    await page.waitForTimeout(250);
    assert.equal(await mode(page), 'light', 'rapid double tap cancels fallback cleanly');
    assert.equal(await page.locator('[data-fitlife-theme-fallback]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-fitlife-theme-reveal')), false);
    await context.close();
  }

  // Rapid taps must use the latest intent, not a stale React closure or old callback.
  {
    const { page, context } = await newApp({ pause: false });
    await page.evaluate(() => { const b = document.querySelector('[aria-label="Switch to nightfall theme"]'); b.click(); b.click(); });
    await page.waitForTimeout(900); assert.equal(await mode(page), 'light');
    await page.evaluate(() => { const b = document.querySelector('[aria-label="Switch to nightfall theme"]'); b.click(); b.click(); b.click(); });
    await page.waitForTimeout(1100); assert.equal(await mode(page), 'dark'); assert.equal(await setting(page, 'themeMode'), 'dark');
    await page.getByRole('button', { name: 'Switch to daylight theme' }).click();
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: 'Switch to nightfall theme' }).click();
    await page.waitForTimeout(1100); assert.equal(await mode(page), 'dark', 'second tap interrupts an active transition');
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-fitlife-theme-reveal')), false);
    await context.close();
  }

  // A newly enabled OS preference interrupts a reveal already in progress.
  for (const fallback of [false, true]) {
    const { page, context } = await newApp({ fallback });
    await startReveal(page, page.getByRole('button', { name: 'Switch to nightfall theme' }), { expectedType: fallback ? 'fallback' : 'view' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-fitlife-theme-reveal'));
    assert.equal(await mode(page), 'dark', 'enabling reduced motion finishes the selected theme immediately');
    assert.equal(await page.locator('[data-fitlife-theme-fallback]').count(), 0);
    await context.close();
  }

  // Selecting an appearance setting while the older-WebView fallback is
  // paused commits the user's pending theme rather than losing it.
  {
    const { page, context } = await newApp({ fallback: true });
    await page.getByRole('button', { name: 'Open settings', exact: true }).click();
    await startReveal(page, page.getByRole('button', { name: 'Nightfall', exact: true }), { expectedType: 'fallback' });
    const layer = page.locator('[data-fitlife-theme-fallback]');
    assert.equal(await layer.locator('[data-fitlife-theme-choice=light]').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.notEqual(await layer.locator('[data-fitlife-theme-choice=dark]').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)', 'incoming theme segment appears selected');
    await page.getByRole('button', { name: 'Coastal Eucalyptus', exact: true }).click();
    assert.equal(await mode(page), 'dark'); assert.equal(await setting(page, 'paletteId'), 'coastal_eucalyptus');
    assert.equal(await page.locator('[data-fitlife-theme-fallback]').count(), 0);
    await context.close();
  }

  // A saved legacy Gentle preference still changes duration after its UI removal.
  {
    const { page, context } = await newApp({ inAppMotion: 'gentle' });
    const gentle = await startReveal(page, page.getByRole('button', { name: 'Switch to nightfall theme' }));
    assert.equal(gentle.options.duration, 420); await finishReveal(page); await context.close();
  }

  // Honor operating-system reduced motion; older engines must still switch.
  for (const options of [{ osReduced: true }, { inAppReduced: true }, { unsupported: true }, { throwsPseudo: true }]) {
    const { page, context } = await newApp(options);
    await page.getByRole('button', { name: 'Switch to nightfall theme' }).click();
    await page.waitForFunction(() => document.documentElement.style.colorScheme === 'dark');
    await page.waitForTimeout(350);
    assert.equal(await count(page), 0, `immediate fallback or reduced motion: ${JSON.stringify(options)}`);
    assert.equal(await setting(page, 'themeMode'), 'dark');
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-fitlife-theme-reveal')), false);
    if (options.osReduced || options.inAppReduced) {
      assert.equal(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).transitionDuration)), 0.00001);
    }
    await context.close();
  }
  {
    const { page, context } = await newApp({ throwsView: true });
    await startReveal(page, page.getByRole('button', { name: 'Switch to nightfall theme' }), { expectedType: 'fallback' });
    await finishReveal(page); assert.equal(await mode(page), 'dark'); await context.close();
  }

  // Desktop origin and corner coverage, independent of mobile screen dimensions.
  {
    const { page, context } = await newApp({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 });
    await startReveal(page, page.getByRole('button', { name: 'Switch to nightfall theme' }));
    await finishReveal(page); assert.equal(await mode(page), 'dark'); await context.close();
  }
  assert.deepEqual(errors, [], `no uncaught browser errors: ${errors.join('; ')}`);
  console.log('PASS: circular theme reveal pixels and origin, all three controls, both directions, keyboard, fractional scaling, desktop, persistence, interruption, reduced motion, older-WebView fallback and unsupported APIs.');
} finally {
  await browser.close();
}
