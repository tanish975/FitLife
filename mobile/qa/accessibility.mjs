import { chromium } from 'playwright';
import { nativeApp, installNativeFixture } from './mock-native.mjs';
import assert from 'node:assert/strict';

// Automated checks are incomplete by design: they do not replace TalkBack,
// physical-device touch, user research, or a full accessibility assessment.
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for(const width of [320,390,768]) {
  // CSP bypass is test-only so axe's own local audit script can be injected;
  // qa/security.mjs separately checks the production CSP without bypass.
  const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce',bypassCSP:true});
  await installNativeFixture(page,{steps:true});
  await page.goto(nativeApp);await page.getByText("Today's overview").waitFor();
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  async function audit(name) {
    const r=await page.evaluate(async()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
    const failures=r.violations.map(v=>`${v.id} (${v.impact}): ${v.nodes.map(n=>n.target.join(' ')+' '+n.html+' '+(n.failureSummary||'')).join('; ')}`);
    assert.equal(failures.length,0,`${width}px ${name}: ${failures.join(' | ')}`);
    const size=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,document:document.documentElement.scrollWidth}));
    assert(size.document<=size.viewport+1,`${width}px ${name}: horizontal document overflow ${JSON.stringify(size)}`);
  }
  await audit('Home');
  await page.getByRole('button',{name:'Set up step tracking'}).click();
  await page.waitForFunction(()=>document.querySelector('.step-sheet')?.contains(document.activeElement));
  await audit('Step details');
  await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Your steps'}).waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Set up step tracking','focus returns to step trigger');
  await page.getByRole('button',{name:'Workouts',exact:true}).click();await audit('Workouts');
  await page.locator('.guided-picker').getByRole('button',{name:'Start',exact:true}).click();await page.getByRole('dialog',{name:'Home full body'}).waitFor();
  await audit('Guided workout');await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Home full body'}).waitFor({state:'detached'});
  for(const tab of ['Meals','Progress','Profile']) {await page.getByRole('button',{name:tab,exact:true}).click();await audit(tab);}
  await page.getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('button',{name:'Open settings'}).first().click();await audit('Settings');
  await page.getByRole('switch',{name:'Larger text'}).click();await audit('Larger text Settings');
  await page.getByRole('button',{name:'Home',exact:true}).click();await audit('Larger text Home');
  for(const tab of ['Workouts','Meals','Progress','Profile']) {await page.getByRole('button',{name:tab,exact:true}).click();await audit(`Larger text ${tab}`);}
  await page.close();console.log(`PASS: automated WCAG A/AA, keyboard focus and horizontal fit at ${width}px (normal and larger text).`);
 }
} finally {await browser.close();}
console.log('NOTE: automated axe checks and Chromium emulation do not prove TalkBack or physical-device accessibility.');
