import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const original=readFileSync(resolve('../FitLife-App.html'),'utf8');
assert.match(original,/Copyright \(c\) Magic UI/,'standalone retains the third-party MIT notice');
const errors=[];
try {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(); page.on('pageerror',error=>errors.push(error.message));
  let requests=0; await page.route(/^https?:/,route=>{requests++;route.abort();});
  await page.goto('about:blank');
  await page.evaluate(html=>{
    const iframe=document.createElement('iframe'); iframe.setAttribute('sandbox','allow-scripts');
    iframe.style.cssText='border:0;width:390px;height:844px'; iframe.srcdoc=html;
    document.body.style.margin='0'; document.body.appendChild(iframe);
  },original);
  const frame=await (await page.locator('iframe').elementHandle()).contentFrame();
  await frame.getByRole('button',{name:'Sign in with Google'}).waitFor();
  assert(await frame.getByRole('button',{name:'Sign in with Google'}).isDisabled());
  assert.equal(await frame.getByText('Available in the Android app').count(),1,'standalone honestly explains native sign-in requirement');
  assert.equal(await frame.evaluate(()=>{try{localStorage.getItem('test');return false;}catch{return true;}}),true,'sandbox blocks storage');
  assert.equal(requests,0,'standalone entry loads no network resources');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS: self-contained entry renders safely without network or storage and does not pretend browser Google sign-in works.');
} finally {await browser.close();}
