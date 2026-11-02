import { nativeApp, installNativeFixture } from './mock-native.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
// Two isolated simulated Android devices with a mock native session/Firestore.
// Device B uses a disk-backed profile; only fake bridge state is seeded by QA.
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const first=await browser.newContext({viewport:{width:390,height:844}}), a=await first.newPage();
await installNativeFixture(a,{uid:'qa-user',demo:true});
const profileDir=await mkdtemp(join(tmpdir(),'fitlife-recovery-'));
const options={headless:true,args:['--no-sandbox','--enable-aggressive-domstorage-flushing'],viewport:{width:390,height:844}};
let second=await chromium.launchPersistentContext(profileDir,options), b=await second.newPage();
const openSettings=page=>page.getByRole('button',{name:'Open settings'}).first().click();
try {
 await a.goto(nativeApp); await a.getByText("Today's overview").waitFor();
 await a.waitForFunction(()=>JSON.parse(localStorage.getItem('__fixture_cloud')||'{}')['qa-user']?.['c'.repeat(32)],null,{timeout:15000});
 const remote=await a.evaluate(()=>JSON.parse(localStorage.getItem('__fixture_cloud'))['qa-user']['c'.repeat(32)]);
 // A valid older device copy. Some fields conflict with deliberate local edits;
 // an untouched unit preference and profile should still be recovered.
 const old=JSON.parse(remote); old.snapshot.settings.weightUnit='lb'; old.snapshot.settings.autoStartRest=true;
 old.snapshot.water.amountMl=750;
 Object.assign(old.snapshot.profile,{name:'Cloud Athlete',sex:'female',age:51,heightCm:165,weightKg:61,goal:'maintain',activityLevel:'light'});
 const remoteCopy=JSON.stringify(old);
 const installB=async page=>{
   await installNativeFixture(page,{uid:'qa-user',demo:false,steps:true});
   await page.addInitScript(raw=>{
     localStorage.setItem('__fixture_offline','1');
     localStorage.setItem('__fixture_steps_qa-user',JSON.stringify({phone:true,health:false}));
     localStorage.setItem('__fixture_cloud',JSON.stringify({'qa-user':{['e'.repeat(32)]:raw}}));
   },remoteCopy);
 };
 await installB(b);
 await b.goto(nativeApp); await b.getByText("Today's overview").waitFor();
 await b.waitForFunction(()=>(JSON.parse(localStorage.getItem('fitlife_settings_v2')||'{}').stepHistory||[]).length>0);
 await b.getByRole('button',{name:'Add 250 ml of water'}).click();
 await b.getByRole('button',{name:'Remove 250 milliliters of water'}).click();
 await b.getByRole('button',{name:'Workouts',exact:true}).click(); await b.locator('.weekly-planner > summary').click();
 await b.getByRole('button',{name:/Mon/}).click(); await b.getByLabel('Mon plan').selectOption('home-core');
 await b.getByRole('button',{name:'Home',exact:true}).click(); await openSettings(b);
 // Accessibility choices made while the first cloud read is offline must not
 // be silently reset by the older copy from another device.
 await b.getByRole('switch',{name:'Reduce motion'}).click();
 await b.getByRole('switch',{name:'Larger text'}).click();
 await b.locator('.settings-fold > summary').filter({hasText:'Goals & rest'}).click();
 const autoRest=b.getByRole('switch',{name:'Auto-start rest timer'});
 await autoRest.click(); await autoRest.click(); // explicitly choose the local default
 let part=await b.evaluate(()=>JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:qa-user')));
 assert(part.recovery.settings.includes('motionStyle') && part.recovery.settings.includes('largeText') && part.recovery.settings.includes('autoStartRest'));
 assert.equal(part.recovery.water,true,'a local change back to zero is remembered');
 assert.equal(part.snapshot.water.amountMl,0);

 // Account switching must keep the journal isolated and durable for its owner.
 await b.getByRole('button',{name:'Sign out',exact:true}).click();
 await b.getByRole('button',{name:'Sign in with Google',exact:true}).waitFor();
 await b.evaluate(()=>localStorage.setItem('__fixture_next','other-user'));
 await b.getByRole('button',{name:'Sign in with Google',exact:true}).click();
 await b.getByText("Today's overview").waitFor();
 const other=await b.evaluate(()=>JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:other-user')));
 assert.equal(other.snapshot.settings.motionStyle,'spring'); assert.equal(!!other.snapshot.settings.largeText,false);
 assert(!other.recovery.settings.includes('motionStyle'),'other account does not inherit pending preferences');
 await openSettings(b); await b.getByRole('button',{name:'Sign out',exact:true}).click();
 await b.getByRole('button',{name:'Sign in with Google',exact:true}).waitFor();
 await b.evaluate(()=>localStorage.setItem('__fixture_next','qa-user'));
 await b.getByRole('button',{name:'Sign in with Google',exact:true}).click();
 await b.getByText("Today's overview").waitFor();
 part=await b.evaluate(()=>JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:qa-user')));
 assert.equal(part.snapshot.settings.motionStyle,'reduced');
 assert(part.recovery.settings.includes('autoStartRest') && part.recovery.settings.includes('motionStyle') && part.recovery.settings.includes('largeText'), `account-switch recovery journal: ${JSON.stringify(part.recovery)}`);
 const beforeRestartRecovery=part.recovery;

 // Also survive a full browser restart while cloud is offline. The fixture
 // never restores application data. A test-only sentinel distinguishes a
 // Chromium profile-relaunch/storage-service race from an app regression.
 const sentinel=randomUUID();
 await b.evaluate(async value=>{
   const frame=document.createElement('iframe'); frame.style.display='none'; document.body.appendChild(frame);
   let listener, timer;
   try {
     const acknowledgement=new Promise((resolve,reject)=>{
       listener=event=>{if(event.key==='__qa_restart_sentinel'&&event.newValue===value)resolve();};
       window.addEventListener('storage',listener); timer=setTimeout(()=>reject(new Error('Storage acknowledgement timed out')),5000);
     });
     frame.contentWindow.localStorage.setItem('__qa_restart_sentinel',value);
     await acknowledgement;
   } finally { clearTimeout(timer); window.removeEventListener('storage',listener); frame.remove(); }
 },sentinel);
 await second.close(); second=undefined;
 // A too-fast relaunch can find the entire file: origin empty before any app
 // code runs. Retry only that browser startup, without recreating app data.
 // If the sentinel exists but the account data does not, fail immediately.
 let startup, cdp;
 for(let attempt=0;attempt<3;attempt++){
   await new Promise(resolve=>setTimeout(resolve,1000));
   second=await chromium.launchPersistentContext(profileDir,options); b=await second.newPage();
   cdp=await second.newCDPSession(b); await cdp.send('Emulation.setScriptExecutionDisabled',{value:true});
   await b.goto(nativeApp,{waitUntil:'domcontentloaded'});
   startup=await b.evaluate(()=>{const slot=JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:qa-user')||'null');return {sentinel:localStorage.getItem('__qa_restart_sentinel'),owner:localStorage.getItem('fitlife_cloud_owner_v1'),recovery:slot?.recovery};});
   if(startup.sentinel===sentinel) break;
   await second.close(); second=undefined;
 }
 assert.equal(startup?.sentinel,sentinel,'Chromium did not reopen the test storage sentinel before application startup');
 assert.equal(startup.owner,'qa-user',`account slot must survive before app startup: ${JSON.stringify(startup)}`);
 assert.deepEqual(startup.recovery,beforeRestartRecovery,'the app-owned recovery journal survives a full browser restart before app startup');
 await cdp.send('Emulation.setScriptExecutionDisabled',{value:false}); await cdp.detach();
 await installB(b); await b.reload({waitUntil:'domcontentloaded'}); await b.getByText("Today's overview").waitFor();
 part=await b.evaluate(()=>JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:qa-user')));
 assert(part.recovery.settings.includes('motionStyle') && part.recovery.settings.includes('largeText'), `restart journal: ${JSON.stringify(part.recovery)}; pre-app state: ${JSON.stringify(startup)}`);
 assert.equal(part.snapshot.settings.motionStyle,'reduced'); assert.equal(part.snapshot.settings.largeText,true);
 await openSettings(b); await b.evaluate(()=>localStorage.removeItem('__fixture_offline'));
 await b.getByRole('button',{name:/^(Retry sync|Sync now)$/}).click();
 await b.waitForFunction(()=>{const x=JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:qa-user')||'{}').snapshot;return x?.profile?.onboarded===true;},null,{timeout:15000});
 part=await b.evaluate(()=>JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:qa-user')));
 const recovered=part.snapshot;
 assert(recovered.settings.stepHistory.length>=1,'offline step observations survive first remote recovery');
 assert.equal(recovered.settings.weeklyPlan.find(x=>x.weekday===1).sessionId,'home-core','offline plan survives first remote recovery');
 assert.equal(recovered.water.amountMl,0,'an explicit local zero is not overwritten by the other device');
 assert.equal(recovered.settings.motionStyle,'reduced','offline reduced-motion choice is not overwritten by recovery');
 assert.equal(recovered.settings.largeText,true,'offline larger-text choice is not overwritten by recovery');
 assert.equal(recovered.settings.autoStartRest,false,'a local choice back to default wins over the older copy');
 assert.equal(recovered.settings.weightUnit,'lb','untouched preferences still recover from the old device');
 assert.equal(recovered.profile.name,'Cloud Athlete','untouched profile still recovers from the old device');
 assert.equal(part.recovery,undefined,'completed recovery clears its local journal');

 // A separate new device completes its profile while the first cloud read is
 // offline. Several explicitly entered values equal hidden defaults; they are
 // still user choices, not permission to restore different remote values.
 const third=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try {
   const c=await third.newPage(); await installB(c); await c.goto(nativeApp); await c.getByText("Today's overview").waitFor();
   await c.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Profile',exact:true}).click();
   if (await c.getByRole('button',{name:'Skip guide'}).isVisible()) await c.getByRole('button',{name:'Skip guide'}).click();
   await c.getByRole('button',{name:'Add profile details',exact:true}).click();
   if (await c.getByRole('button',{name:'Skip guide'}).isVisible()) await c.getByRole('button',{name:'Skip guide'}).click();
   await c.getByLabel('Athlete Name').fill('Local Athlete');
   await c.getByRole('button',{name:/Male \(\+5 BMR\)/}).click();
   await c.getByLabel('Age (yrs)').fill('24'); await c.getByLabel('Height (cm)').fill('176'); await c.getByLabel('Weight (kg)').fill('73.4');
   await c.getByRole('button',{name:/Lose Fat/}).click(); await c.getByRole('button',{name:/Moderately Active/}).click();
   await c.getByRole('button',{name:'Complete profile & continue'}).click();
   await c.getByRole('heading',{name:'Athlete Profile'}).waitFor();
   const pending=await c.evaluate(()=>JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:qa-user')));
   assert(pending.recovery.profile.includes('sex') && pending.recovery.profile.includes('age') && pending.recovery.profile.includes('weightKg'), 'profile submission records equal-to-default choices');
   await c.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Home',exact:true}).click();
   await openSettings(c); await c.evaluate(()=>localStorage.removeItem('__fixture_offline'));
   await c.getByRole('button',{name:/^(Retry sync|Sync now)$/}).click();
   await c.waitForFunction(()=>{const p=JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:qa-user')||'{}');return p.snapshot && !p.recovery;},null,{timeout:15000});
   const profile=await c.evaluate(()=>JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:qa-user')).snapshot.profile);
   assert.equal(profile.name,'Local Athlete'); assert.equal(profile.sex,'male'); assert.equal(profile.age,24);
   assert.equal(profile.heightCm,176); assert.equal(profile.weightKg,73.4); assert.equal(profile.goal,'lose_weight'); assert.equal(profile.activityLevel,'moderate');
 } finally { await third.close(); }
 console.log('PASS: first cloud recovery keeps offline activity, accessibility and explicit profile choices across restart/account switches (simulated native bridge).');
} finally {await first.close(); await second?.close(); await browser.close(); await rm(profileDir,{recursive:true,force:true});}
