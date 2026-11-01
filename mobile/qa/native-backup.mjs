import { nativeApp, installNativeFixture } from './mock-native.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

// A JS-level simulation of the bridge protocol. Android's real picker remains
// a physical/emulator test; native chunk boundaries are separately unit tested.
const base = nativeApp;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage(); await installNativeFixture(page); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(() => {
  let expected=0, data='';
  const emit=(type,value='') => window.dispatchEvent(new CustomEvent('fitlife-backup-part',{detail:{type,value}}));
  window.FitLifeBackup = {
    beginExport: length => { expected=length; data=''; return length>0 && length<=4000000; },
    appendExport: part => { if (part.length>65536 || data.length+part.length>expected) return false; data+=part; return true; },
    finishExport: () => { if(data.length!==expected)return false; window.__encryptedForTest=data; setTimeout(()=>emit('saved','Encrypted backup saved.'),1); return true; },
    abortExport: () => { expected=0; data=''; },
    chooseImport: () => { setTimeout(()=>{emit('start'); for(let i=0;i<window.__encryptedForTest.length;i+=32000)emit('chunk',window.__encryptedForTest.slice(i,i+32000)); emit('done');},1); },
  };
});
try {
  await page.goto(base,{waitUntil:'networkidle'}); await page.getByText("Today's overview").waitFor();
  await page.getByRole('button',{name:'Open settings'}).first().click(); await page.getByRole('button',{name:'Create backup'}).click();
  const pass='fitlife-test-passphrase-123'; await page.getByLabel('Backup passphrase',{exact:true}).fill(pass); await page.getByLabel('Confirm passphrase').fill(pass);
  await page.getByRole('button',{name:'Encrypt and save'}).click(); await page.getByText('Encrypted backup saved.').waitFor();
  const exported=await page.evaluate(()=>window.__encryptedForTest); assert.equal(JSON.parse(exported).cipher,'AES-256-GCM');
  assert(!exported.includes(pass) && !exported.includes('tanish@fitlife.app'), 'only ciphertext, not passphrase or profile, crosses bridge');
  await page.getByRole('button',{name:'Close backup'}).click(); await page.getByRole('button',{name:'Import backup'}).click();
  await page.getByRole('button',{name:'Choose backup file'}).click(); await page.getByText('Backup selected. Enter its passphrase.').waitFor();
  await page.getByLabel('Backup passphrase',{exact:true}).fill(pass); await page.getByRole('button',{name:'Decrypt and restore'}).click();
  await page.getByText(/Activity merged\. Your current profile/).waitFor(); assert.deepEqual(errors,[]);
  console.log('✓ Native bridge protocol simulation exchanges only encrypted chunks and can round-trip them');
} finally { await context.close(); await browser.close(); }
