// Start the production preview on port 4173 before running this test.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const standalone = pathToFileURL(resolve(root, '../FitLife-App.html')).href;
const prod = process.env.FITLIFE_PROD_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

try {
  const fileContext = await browser.newContext({ viewport: { width: 320, height: 700 }, reducedMotion: 'reduce' });
  await fileContext.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked for QA'); } });
  });
  await fileContext.route('http**://**', route => route.abort());
  const filePage = await fileContext.newPage();
  const fileErrors = [];
  filePage.on('pageerror', e => fileErrors.push(e.message));
  await filePage.goto(standalone);
  await filePage.getByRole('button', { name: 'Quick launch (demo data)' }).click();
  await filePage.getByText("Today's overview").waitFor();
  assert.equal(await filePage.locator('.home-training-feature img, .home-focus img').count(), 3);
  assert.equal(await filePage.locator('.home-training-feature img').evaluate(img => img.complete && img.naturalWidth > 0), true);
  await filePage.getByRole('button', { name: 'Add 250 milliliters of water' }).click();
  assert.equal(await filePage.getByRole('progressbar', { name: 'Water towards daily goal' }).getAttribute('aria-valuenow'), '250');
  await filePage.getByRole('button', { name: 'Open settings' }).click();
  await filePage.getByRole('button', { name: 'QR & Install Guide' }).click();
  await filePage.getByText('A QR link is available when FitLife is hosted', { exact: false }).waitFor();
  assert.deepEqual(fileErrors, []);
  await fileContext.close();

  const pwaContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
  const page = await pwaContext.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(prod, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Quick launch (demo data)' }).click();
  await page.getByText("Today's overview").waitFor();
  await page.waitForFunction(() => navigator.serviceWorker?.controller, { timeout: 15000 });
  const assets = await page.evaluate(async () => {
    const names = await caches.keys();
    const cacheName = names.find(name => name.startsWith('fitlife-fitness-'));
    if (!cacheName) return [];
    return (await (await caches.open(cacheName)).keys()).map(r => r.url);
  });
  assert.ok(assets.some(url => url.includes('/assets/index-') && url.endsWith('.js')));
  assert.ok(assets.some(url => url.includes('/assets/index-') && url.endsWith('.css')));
  await page.waitForTimeout(500);
  await pwaContext.setOffline(true);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText("Today's overview").waitFor({ timeout: 10000 });
  assert.equal(await page.locator('.home-training-feature img').evaluate(img => img.complete && img.naturalWidth > 0), true);
  await page.getByRole('button', { name: 'Add 250 milliliters of water' }).click();
  assert.equal(await page.getByRole('progressbar', { name: 'Water towards daily goal' }).getAttribute('aria-valuenow'), '250');
  assert.deepEqual(errors, []);
  await pwaContext.close();
  console.log('PASS: standalone works with network/storage blocked and reduced motion; PWA loads immediately offline after first install.');
} catch (error) {
  console.error('FAILED:', error.stack || error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
