import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base=process.env.FITLIFE_URL || 'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
try {
  await page.goto(base,{waitUntil:'networkidle'}); await page.getByRole('button',{name:'Create Profile'}).waitFor();
  const policy=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  const scriptPolicy=policy.split(';').find(x=>x.trim().startsWith('script-src'));
  assert(!scriptPolicy.includes('unsafe-inline') && !scriptPolicy.includes('unsafe-eval'), 'release policy must not allow arbitrary inline scripts or eval');
  assert(policy.includes("frame-src 'none'") && policy.includes("object-src 'none'"), 'untrusted frames and objects are blocked');
  await page.evaluate(()=>{const script=document.createElement('script');script.textContent='window.__fitlifeCspViolation = true';document.body.appendChild(script);});
  await page.waitForTimeout(100); assert.equal(await page.evaluate(()=>window.__fitlifeCspViolation),undefined,'CSP must block injected inline script');
  await page.getByRole('button',{name:'Create Profile',exact:true}).click();
  await page.getByLabel('Full Name').fill('<img src=x onerror=alert(1)>');
  await page.getByRole('button',{name:'Continue to Onboarding'}).click(); await page.getByRole('button',{name:'Complete profile & continue'}).click();
  assert.equal(await page.locator('img[src=x]').count(),0,'profile text must render as text rather than HTML');
  const html=await readFile('../FitLife-App.html','utf8');
  const match=html.match(/<script>([\s\S]*?)<\/script>/); assert(match,'standalone has an inline bundle');
  const hash=createHash('sha256').update(match[1]).digest('base64');
  assert(html.includes(`'sha256-${hash}'`),'standalone CSP pins the exact bundled script');
  assert(!html.includes("script-src 'self' 'unsafe-inline'"));
  console.log('✓ Production CSP blocks injected scripts/frames; user text is escaped and standalone script hash matches');
} finally { await page.close(); await browser.close(); }
