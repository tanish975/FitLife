import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.FITLIFE_URL || 'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for(const [width,height] of [[320,480],[360,640],[390,844],[640,360],[768,1024]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<700,hasTouch:width<700});
  await page.goto(base,{waitUntil:'networkidle'}); await page.getByRole('button',{name:'Quick launch (demo data)'}).click();
  await page.getByRole('button',{name:'Workouts',exact:true}).click(); await page.getByText('Rest timer').waitFor(); await page.waitForTimeout(450);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`workout overflows at ${width}x${height}`);
  const controls=page.getByRole('region',{name:'Rest timer'}).getByRole('button');
  for(let i=0;i<await controls.count();i++){const b=await controls.nth(i).boundingBox();assert(b.width>=44 && b.height>=44,`timer touch target too small at ${width}x${height}`);}
  if(width<=650){
   const nav=page.getByRole('navigation',{name:'Main navigation'});const box=await nav.boundingBox();assert(box.x>=0 && box.x+box.width<=width+1 && box.y>=0 && box.y+box.height<=height+1,`nav outside ${width}x${height}`);
   for(const name of ['Home','Meals','Workouts','Progress','Profile']) {const button=nav.getByRole('button',{name,exact:true});const b=await button.boundingBox();assert(b.width>=44 && b.height>=44,`${name} touch target at ${width}x${height}`);}
   await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(100);
   const last=await page.locator('.legacy-screen .space-y-4 > *').last().boundingBox();const navBox=await nav.boundingBox();
   assert(last.y+last.height<=navBox.y+3,`last workout content is obscured at ${width}x${height}`);
  }
  await page.close();
 }
 console.log('✓ New workout controls and floating navigation fit phone, landscape and tablet viewports');
} finally {await browser.close();}
