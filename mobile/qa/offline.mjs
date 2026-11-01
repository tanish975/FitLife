// Start the production preview on port 4173 before running this test.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { nativeApp, installNativeFixture } from './mock-native.mjs';

const prod=process.env.FITLIFE_PROD_URL || 'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  // A storage-blocked standalone must fail closed and explain the real limit.
  const blocked=await browser.newContext({viewport:{width:320,height:700},reducedMotion:'reduce'});
  await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new Error('Storage blocked for QA');}}));
  await blocked.route('http**://**',route=>route.abort());
  const blockedPage=await blocked.newPage(); const errors=[]; blockedPage.on('pageerror',e=>errors.push(e.message));
  await blockedPage.goto(nativeApp);
  await blockedPage.getByRole('button',{name:'Sign in with Google'}).waitFor();
  assert(await blockedPage.getByRole('button',{name:'Sign in with Google'}).isDisabled());
  assert.equal(await blockedPage.getByText('Available in the Android app').count(),1);
  assert.deepEqual(errors,[]); await blocked.close();

  // A previously authenticated native session is restored locally and saved
  // activity remains usable while the simulated cloud is unavailable.
  const native=await browser.newContext({viewport:{width:320,height:700},reducedMotion:'reduce'});
  const filePage=await native.newPage(); await installNativeFixture(filePage,{signedIn:true});
  const fileErrors=[]; filePage.on('pageerror',e=>fileErrors.push(e.message));
  await filePage.goto(nativeApp); await filePage.getByText("Today's overview").waitFor();
  await filePage.evaluate(()=>localStorage.setItem('__fixture_offline','1'));
  await filePage.getByRole('button',{name:'Add 250 milliliters of water'}).click();
  await filePage.reload(); await filePage.getByText("Today's overview").waitFor();
  assert.equal(await filePage.getByRole('progressbar',{name:'Water towards daily goal'}).getAttribute('aria-valuenow'),'250');
  assert.equal(await filePage.locator('.home-training-feature img').evaluate(img=>img.complete && img.naturalWidth>0),true);
  assert.deepEqual(fileErrors,[]); await native.close();

  // The hosted web/PWA shell caches and opens offline, but it cannot perform
  // the Android-only authentication and must not claim otherwise.
  const pwa=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
  const page=await pwa.newPage(); const webErrors=[]; page.on('pageerror',e=>webErrors.push(e.message));
  await page.goto(prod,{waitUntil:'networkidle'}); await page.getByRole('button',{name:'Sign in with Google'}).waitFor();
  await page.waitForFunction(()=>navigator.serviceWorker?.controller,{timeout:15000});
  const assets=await page.evaluate(async()=>{const names=await caches.keys();const name=names.find(x=>x.startsWith('fitlife-fitness-'));return name?(await(await caches.open(name)).keys()).map(r=>r.url):[];});
  assert(assets.some(url=>url.includes('/assets/index-')&&url.endsWith('.js')));
  assert(assets.some(url=>url.includes('/assets/index-')&&url.endsWith('.css')));
  await pwa.setOffline(true); await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Sign in with Google'}).waitFor({timeout:10000});
  assert(await page.getByRole('button',{name:'Sign in with Google'}).isDisabled());
  assert.equal(await page.getByText('Available in the Android app').count(),1);
  assert.deepEqual(webErrors,[]); await pwa.close();
  console.log('PASS: blocked storage fails closed; simulated native session restores offline; PWA caches the honest Android-only entry offline.');
} finally {await browser.close();}
