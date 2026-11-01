import { chromium } from 'playwright';
import assert from 'node:assert/strict';

// Browser emulation: this does not replace testing the splash on an Android phone.
const base = process.env.FITLIFE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];

async function openSplash({ width = 390, height = 844, settings = {}, systemMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: systemMotion, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(saved => localStorage.setItem('fitlife_settings_v2', JSON.stringify(saved)), settings);
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByRole('status', { name: 'Opening FitLife' }).waitFor();
  await page.locator('.kettlebell-art').waitFor();
  return { context, page };
}

try {
  // Small, landscape, phone and tablet must all show a complete fitness image.
  for (const [width, height] of [[320, 480], [390, 844], [640, 360], [768, 1024]]) {
    const { context, page } = await openSplash({ width, height });
    const result = await page.locator('.lift-loader-stage').evaluate(stage => {
      const r = stage.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom,
        htmlWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, viewportHeight: innerHeight,
        backgroundImage: getComputedStyle(stage).backgroundImage };
    });
    assert(result.left >= 0 && result.right <= width && result.top >= 0 && result.bottom <= height, `loader clipped at ${width}x${height}: ${JSON.stringify(result)}`);
    assert(result.htmlWidth <= width, `horizontal overflow at ${width}x${height}`);
    assert.equal(result.backgroundImage, 'none', 'solid-color loader only');
    assert.equal(await page.locator('.runner-art').count(), 0, 'old runner removed');
    assert.equal(await page.locator('.kettlebell-body').count(), 1, 'visible fitness illustration');
    assert.equal(await page.locator('.lift-loader-stage').getAttribute('aria-hidden'), 'true', 'illustration is decorative to screen readers');
    assert(await page.getByText('Getting FitLife ready', { exact: false }).isVisible(), 'text describes startup without fabricated progress');
    await context.close();
  }
  console.log('PASS: visible fitness loader, accessible status and solid layouts from small phones to tablet.');

  // Probe the CSS timeline deterministically, not a screenshot at an arbitrary frame.
  {
    const { context, page } = await openSplash();
    const motion = await page.locator('.kettlebell-lift').evaluate(el => {
      const a = el.getAnimations().find(a => a.animationName === 'kettlebell-rep');
      if (!a) return null;
      a.pause(); a.currentTime = 0;
      const start = getComputedStyle(el).transform;
      a.currentTime = 650;
      const lifted = getComputedStyle(el).transform;
      return { start, lifted };
    });
    assert(motion && motion.start !== motion.lifted, `kettlebell must visibly lift: ${JSON.stringify(motion)}`);
    await context.close();
  }
  for (const opts of [
    { systemMotion: 'reduce', settings: { motionStyle: 'spring' } },
    { systemMotion: 'no-preference', settings: { motionStyle: 'reduced' } },
  ]) {
    const { context, page } = await openSplash(opts);
    const names = await page.locator('.fitlife-splash').evaluate(el => [...el.querySelectorAll('.kettlebell-lift, .lift-shadow, .loading-dots i')].map(n => getComputedStyle(n).animationName));
    assert(names.length === 5 && names.every(name => name === 'none'), `reduced motion must keep the graphic still: ${names}`);
    await context.close();
  }
  console.log('PASS: lift animation runs and both system/app reduced-motion settings keep it still.');

  // The loader uses the existing palette tokens, with contrast checked against
  // the composited halo behind the kettlebell and against the splash surface.
  for (const themeMode of ['light', 'dark']) {
    for (const paletteId of ['matcha_oat', 'coastal_eucalyptus', 'terracotta_olive', 'nordic_fjord', 'kyoto_cedar']) {
      const { context, page } = await openSplash({ settings: { themeMode, paletteId } });
      const colors = await page.locator('.fitlife-splash').evaluate(el => {
        const rgb = value => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const stage = el.querySelector('.lift-loader-stage');
        const halo = el.querySelector('.lift-halo');
        const body = el.querySelector('.kettlebell-body');
        const label = el.querySelector('.splash-loading-label');
        const bg = rgb(getComputedStyle(stage).backgroundColor), haloColor = rgb(getComputedStyle(halo).fill);
        const opacity = Number(getComputedStyle(halo).opacity);
        const behind = bg.map((value, i) => value * (1 - opacity) + haloColor[i] * opacity);
        const luminance = c => c.map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((s, n, i) => s + n * [.2126, .7152, .0722][i], 0);
        const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
        return { icon: contrast(rgb(getComputedStyle(body).fill), behind), label: contrast(rgb(getComputedStyle(label).color), rgb(getComputedStyle(el).backgroundColor)) };
      });
      assert(colors.icon >= 3, `${paletteId} ${themeMode} kettlebell contrast: ${colors.icon}`);
      assert(colors.label >= 4.5, `${paletteId} ${themeMode} loading text contrast: ${colors.label}`);
      await context.close();
    }
  }
  console.log('PASS: loader illustration and label contrast across all five Daylight/Nightfall palettes.');

  {
    const { context, page } = await openSplash();
    await page.getByRole('button', { name: 'Sign in with Google' }).waitFor({ timeout: 6000 });
    assert.equal(await page.locator('.fitlife-splash').count(), 0, 'startup finishes normally');
    await context.close();
  }
  assert.deepEqual(errors, [], `loader browser errors: ${errors.join('; ')}`);
  console.log('PASS: loader clears automatically and hands control to the app.');
} finally {
  await browser.close();
}
