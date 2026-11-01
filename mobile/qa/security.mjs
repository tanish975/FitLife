import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { nativeApp, installNativeFixture } from './mock-native.mjs';

const base=process.env.FITLIFE_URL || 'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
try {
  // An old local flag or a JS object cannot turn an HTTP page into native Google sign-in.
  await page.addInitScript(() => { localStorage.setItem('fitlife_auth_v1','true'); window.FitLifeCloud={ session(){}, signIn(){}, signOut(){}, pull(){}, push(){} }; });
  await page.goto(base,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Sign in with Google'}).waitFor();
  assert(await page.getByRole('button',{name:'Sign in with Google'}).isDisabled());
  assert.equal(await page.getByRole('navigation',{name:'Main navigation'}).count(), 0, 'legacy UI flag and fake HTTP bridge cannot bypass Google entry');
  assert.equal(await page.getByText('Available in the Android app').count(), 1);
  const policy=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  const scriptPolicy=policy.split(';').find(x=>x.trim().startsWith('script-src'));
  assert(!scriptPolicy.includes('unsafe-inline') && !scriptPolicy.includes('unsafe-eval'), 'release policy must not allow arbitrary inline scripts or eval');
  assert(policy.includes("frame-src 'none'") && policy.includes("object-src 'none'"), 'untrusted frames and objects are blocked');
  await page.evaluate(()=>{const script=document.createElement('script');script.textContent='window.__fitlifeCspViolation = true';document.body.appendChild(script);});
  await page.waitForTimeout(100); assert.equal(await page.evaluate(()=>window.__fitlifeCspViolation),undefined,'CSP must block injected inline script');

  // The account name is rendered as React text, not executable HTML. QA bridge only.
  const namePage=await browser.newPage({viewport:{width:390,height:844}});
  await installNativeFixture(namePage,{signedIn:false,demo:false,uid:'escape',name:'<img src=x onerror=alert(1)>',email:'escape@example.test'});
  await namePage.goto(nativeApp); await namePage.getByRole('button',{name:'Sign in with Google'}).click();
  await namePage.getByText("Today's overview").waitFor();
  assert.equal(await namePage.locator('img[src=x]').count(),0,'account text must render as text rather than HTML');
  await namePage.close();

  const html=await readFile('../FitLife-App.html','utf8');
  const match=html.match(/<script>([\s\S]*?)<\/script>/); assert(match,'standalone has an inline bundle');
  const hash=createHash('sha256').update(match[1]).digest('base64');
  assert(html.includes(`'sha256-${hash}'`),'standalone CSP pins the exact bundled script');
  assert(!html.includes("script-src 'self' 'unsafe-inline'"));
  console.log('PASS: production CSP, HTTP/native boundary, legacy-auth rejection, escaped account text and standalone script hash.');
} finally { await page.close(); await browser.close(); }
