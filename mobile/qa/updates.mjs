import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.FITLIFE_URL || 'http://127.0.0.1:3000/';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('fitlife_auth_v1', 'true');
    window.__nativeUpdateState = { auto: true, checks: 0 };
    window.FitLifeAndroid = {
      versionName: () => '1.0.17',
      automaticUpdateChecksEnabled: () => window.__nativeUpdateState.auto,
      setAutomaticUpdateChecks: value => { window.__nativeUpdateState.auto = value; },
      checkForUpdates: () => { window.__nativeUpdateState.checks += 1; },
    };
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByText("Today's overview", { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await page.getByText('Android version 1.0.17.', { exact: false }).waitFor();
  const automatic = page.getByRole('switch', { name: 'Automatic update checks' });
  assert.equal(await automatic.getAttribute('aria-checked'), 'true');
  const dimensions = await automatic.evaluate(e => ({ width: getComputedStyle(e).width, height: getComputedStyle(e).height }));
  assert.equal(dimensions.width, '44px'); assert.equal(dimensions.height, '44px');
  await automatic.click();
  assert.equal(await automatic.getAttribute('aria-checked'), 'false');
  assert.equal(await page.evaluate(() => window.__nativeUpdateState.auto), false);
  await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
  assert.equal(await page.evaluate(() => window.__nativeUpdateState.checks), 1, 'manual check uses the native bridge');
  assert.ok(await page.getByText('no fitness data is sent', { exact: false }).count(), 'privacy disclosure shown');
  assert.deepEqual(errors, []);
  await context.close();

  const browserPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await browserPage.addInitScript(() => localStorage.setItem('fitlife_auth_v1', 'true'));
  await browserPage.goto(base, { waitUntil: 'networkidle' });
  await browserPage.getByRole('button', { name: 'Open settings', exact: true }).click();
  const link = browserPage.getByRole('link', { name: 'View latest release', exact: true });
  assert.equal(await link.getAttribute('href'), 'https://github.com/tanish975/FitLife/releases/latest');
  assert.equal(await browserPage.getByRole('link', { name: 'Get FitLife.apk', exact: true }).getAttribute('href'), 'https://github.com/tanish975/FitLife/releases/latest/download/FitLife.apk');
  assert.equal(await browserPage.getByRole('switch', { name: 'Automatic update checks' }).count(), 0);
  await browserPage.close();
  console.log('PASS: update settings, native bridge, privacy disclosure, touch target and GitHub release/download links.');
} finally { await browser.close(); }
