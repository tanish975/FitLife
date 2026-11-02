import { chromium } from 'playwright';
import { nativeApp,installNativeFixture } from './mock-native.mjs';
import assert from 'node:assert/strict';

// Automated contrast checks for representative settings/profile screens only.
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce',bypassCSP:true});
try {
 await installNativeFixture(page,{steps:true});await page.goto(nativeApp);await page.getByText("Today's overview").waitFor();await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
 const palettes=['Matcha & Oat','Coastal Eucalyptus','Terracotta & Olive','Nordic Fjord & Birch','Kyoto Cedar & Moss'];
 async function check(label) {
  const r=await page.evaluate(()=>axe.run(document,{runOnly:{type:'rule',values:['color-contrast']}}));
  const nodes=r.violations.flatMap(v=>v.nodes.map(n=>n.target.join(' ')+' '+n.failureSummary));
  assert.equal(nodes.length,0,`${label}: ${nodes.join(' | ')}`);
 }
 for(const mode of ['Daylight','Nightfall']) for(const palette of palettes) {
  await page.getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('button',{name:'Open settings'}).first().click();
  const s=page.locator('.settings-fold').filter({hasText:'Appearance'}).first();if(!await s.evaluate(x=>x.open))await s.locator('summary').click();
  await page.getByRole('button',{name:mode,exact:true}).click();await page.getByRole('button',{name:palette,exact:true}).click();
  await page.waitForTimeout(80);await check(`${mode} ${palette} Settings`);
  await page.getByRole('button',{name:'Profile',exact:true}).click();await check(`${mode} ${palette} Profile`);
 }
 console.log('PASS: automated contrast checks on Settings and Profile for five palettes in Daylight and Nightfall.');
} finally {await browser.close();}
