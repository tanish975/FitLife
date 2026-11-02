import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { nativeApp, installNativeFixture } from './mock-native.mjs';

// Fresh account, simulated Android bridge. Real Android/TalkBack still needs testing.
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const area=name=>page.getByRole('region',{name:`${name} guide`,exact:true});
const nav=name=>page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true});
const next=name=>area(name).getByRole('button',{name:'Next',exact:true}).click();
const prev=name=>area(name).getByRole('button',{name:'Previous tip'}).click();
const show=async(name,target)=>{
  assert.equal(await page.locator(`[data-guide-target="${target}"]`).count(),1,`${target} is a unique real control/section`);
  await area(name).getByRole('button',{name:'Show me'}).click();
  await area(name).waitFor({state:'detached'});
  await page.waitForFunction(id=>document.activeElement?.getAttribute('data-guide-target')===id,target);
};
try {
 await installNativeFixture(page,{signedIn:false,demo:false,uid:'new-user',name:'New Athlete',email:'new@example.test',steps:true,reminders:true});
 await page.goto(nativeApp);await page.getByRole('button',{name:'Sign in with Google'}).click();
 await area('Home').waitFor({timeout:15000});
 assert(await area('Home').getByText('Tip 1 of 4').isVisible());
 await next('Home');await area('Home').getByText('Log in a tap').waitFor();await next('Home');
 await area('Home').getByText('Connect your steps').waitFor();
 assert(await area('Home').getByText(/Health Connect or your phone sensor/).isVisible());
 assert(await area('Home').getByText(/Counts are not added together/).isVisible());
 await next('Home');await area('Home').getByText('Explore at your own pace').waitFor();await prev('Home');
 await show('Home','home-steps');
 assert.equal(await page.locator('.step-sheet').count(),0,'the guide never turns on a source or opens a permission dialog');

 await nav('Meals').click();await area('Meals').waitFor();await next('Meals');await area('Meals').getByText('Describe and review').waitFor();await next('Meals');
 await area('Meals').getByText('Favorite and repeat').waitFor();assert(await area('Meals').getByText(/adjust the portion and review/).isVisible());
 await next('Meals');await area('Meals').getByText('Browse or add your own').waitFor();await prev('Meals');await show('Meals','meals-shortcuts');
 await nav('Workouts').click();await area('Workouts').waitFor();await area('Workouts').getByText('Start a guided workout').waitFor();
 assert(await area('Workouts').getByText(/step-by-step sets, form cues and rest/).isVisible());
 assert.equal(await page.locator('[data-guide-target="workouts-guided"]').count(),1);
 await next('Workouts');await area('Workouts').getByText('Plan your week').waitFor();
 await next('Workouts');await area('Workouts').getByText('Find home movements').waitFor();await next('Workouts');await area('Workouts').getByText('Log and save exercises').waitFor();
 await prev('Workouts');await prev('Workouts');await show('Workouts','workouts-plan');
 assert.equal(await page.locator('.weekly-planner').evaluate(x=>x.open),false,'guidance does not change the weekly plan');
 await nav('Home').click();assert.equal(await area('Home').count(),0,'new-user guide is once per area');
 await nav('Workouts').click();assert.equal(await area('Workouts').count(),0,'returning to a visited area does not repeat its guide');
 await nav('Home').click();await page.getByRole('button',{name:'Open settings',exact:true}).click();await area('Settings').waitFor();
 await area('Settings').getByText('Sync and backup').waitFor();assert(await area('Settings').getByText(/last sync, retry changes/).isVisible());
 await next('Settings');await area('Settings').getByText('Reminders on this phone').waitFor();
 await next('Settings');await area('Settings').getByText('Comfort and appearance').waitFor();
 assert(await area('Settings').getByText(/larger text or reduce motion/).isVisible());
 assert.equal(await page.locator('[data-guide-target="settings-accessibility"]').count(),1);
 assert.equal(await page.getByRole('switch',{name:'Reduce motion'}).getAttribute('aria-checked'),'false','guidance does not change motion settings');
 await next('Settings');await area('Settings').getByText('Replay these tips').waitFor();
 assert.equal(await page.locator('[data-guide-target="settings-guide-replay"]').count(),1);
 await prev('Settings');await prev('Settings');await show('Settings','settings-reminders');
 assert.equal(await page.locator('.reminder-settings').evaluate(x=>x.open),false,'guide does not schedule reminders');
 await page.getByRole('button',{name:'Review app tips'}).click();await page.getByRole('button',{name:'Workouts guide',exact:true}).click();
 await area('Workouts').waitFor();await area('Workouts').getByText('Start a guided workout').waitFor();await show('Workouts','workouts-guided');
 await nav('Home').click();await page.getByRole('button',{name:'Open settings',exact:true}).click();
 assert.equal(await area('Settings').count(),0,'settings guide does not automatically repeat');
 await page.getByRole('button',{name:'Review app tips'}).click();await page.getByRole('button',{name:'Settings guide',exact:true}).click();await area('Settings').waitFor();
 await next('Settings');await next('Settings');await show('Settings','settings-accessibility');
 assert.equal(await page.getByRole('switch',{name:'Larger text'}).getAttribute('aria-checked'),'false','guide does not change settings');
 assert.deepEqual(errors,[]);
 console.log('PASS: first-visit guides cover steps, guided workouts, weekly plans, meal favorites, sync/backup, reminders and larger text; targets, replay and once-only behavior work (simulated Android).');
} finally {await browser.close();}
