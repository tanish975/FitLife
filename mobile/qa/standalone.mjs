import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const original = readFileSync(resolve('../FitLife-App.html'), 'utf8');
assert.match(original, /Copyright \(c\) Magic UI/, 'standalone retains the third-party MIT notice');
const errors = [];

try {
  for (const fallback of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    let requests = 0;
    await page.route(/^https?:/, route => { requests += 1; route.abort(); });
    const hook = `<script>
      ${fallback ? "Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true });" : ''}
      const orig = Element.prototype.animate;
      Element.prototype.animate = function(frames, options) {
        const anim = orig.call(this, frames, options);
        if (options?.pseudoElement === '::view-transition-new(root)' || this.dataset?.fitlifeThemeFallback) {
          window.__reveal = { anim, frames, options }; anim.pause(); anim.currentTime = 0;
        }
        return anim;
      };
    <\/script>`;
    const html = original.replace('<head>', `<head>${hook}`);
    await page.goto('about:blank');
    await page.evaluate(html => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.style.cssText = 'border:0;width:390px;height:844px';
      iframe.srcdoc = html;
      document.body.style.margin = '0'; document.body.appendChild(iframe);
    }, html);
    const handle = await page.locator('iframe').elementHandle();
    const frame = await handle.contentFrame();
    await frame.getByRole('button', { name: 'Quick launch (demo data)' }).click();
    await frame.getByText("Today's overview", { exact: true }).waitFor();
    assert.equal(await frame.evaluate(() => { try { localStorage.getItem('test'); return false; } catch { return true; } }), true, 'sandbox blocks storage');
    const button = frame.getByRole('button', { name: 'Switch to nightfall theme' });
    await button.scrollIntoViewIfNeeded();
    const box = await button.evaluate(element => { const r = element.getBoundingClientRect(); return { x: r.x, width: r.width }; });
    await button.click();
    await frame.waitForFunction(() => window.__reveal, null, { timeout: 4000 });
    const capture = await frame.evaluate(() => ({ frames: window.__reveal.frames, options: window.__reveal.options }));
    const match = capture.frames.clipPath[0].match(/^circle\(0% at ([\d.]+)% ([\d.]+)%\)$/);
    assert.ok(match, 'standalone uses the requested circular reveal');
    assert.ok(Math.abs(Number(match[1]) / 100 * 390 - (box.x + box.width / 2)) < 3, 'standalone starts at the control');
    if (fallback) assert.equal(capture.options.pseudoElement, undefined);
    else assert.equal(capture.options.pseudoElement, '::view-transition-new(root)');
    await frame.evaluate(() => window.__reveal.anim.finish());
    await frame.waitForFunction(() => !document.documentElement.hasAttribute('data-fitlife-theme-reveal'), null, { timeout: 4000 });
    assert.equal(await frame.evaluate(() => document.documentElement.style.colorScheme), 'dark');
    assert.equal(requests, 0, 'standalone loads no network resources');
    await context.close();
  }
  assert.deepEqual(errors, [], 'standalone has no uncaught errors');
  console.log('PASS: self-contained app runs in a networkless, storage-blocked sandbox; theme reveal works with View Transitions and the WebView fallback.');
} finally { await browser.close(); }
