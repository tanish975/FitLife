import { chromium } from 'playwright';
import { reloadSimulatedNative } from './native-reload.mjs';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Simulates only the native boundary. It does not claim to test Credential Manager,
// Firebase authentication, Android WebView, or the deployed Firestore rules.
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-aggressive-domstorage-flushing'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => {
  // Recover only fake native session/cloud keys. Capture the app-owned account
  // slot first so this test still fails if its actual persisted data is lost.
  const marker='__fitlife_qa_native_v1:';
  if (window.name.startsWith(marker)) {
    const saved=JSON.parse(window.name.slice(marker.length)); window.name='';
    if (saved.prefix === '__qa_') {
      const owner=localStorage.getItem('fitlife_cloud_owner_v1');
      const raw=localStorage.getItem('fitlife_cloud_partition_v1:alice');
      window.__qaBeforeReload={owner,alice:raw ? JSON.parse(raw) : null};
      for (const [key,value] of Object.entries(saved.fake || {})) {
        if (key.startsWith('__qa_') && typeof value === 'string') localStorage.setItem(key,value);
      }
    }
  }
  const account = uid => ({ signedIn: true, uid, name: uid === 'alice' ? 'Alice Athlete' : 'Bob Athlete', email: uid + '@example.test' });
  if (!localStorage.getItem('__qa_seeded')) {
    const now = new Date(), key = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
    const profile = { name:'Alice Local', email:'local@example.test', sex:'female', age:30, heightCm:170, weightKg:65, goal:'maintain', activityLevel:'moderate', onboarded:true, uid:'local' };
    const meal = { id:'alice-real-meal', dateKey:key, timestamp:Date.now(), name:'Alice private oats', servingLabel:'1 bowl', category:'Breakfast', calories:400, proteinG:20, carbsG:50, fatG:10, fiberG:5 };
    localStorage.setItem('fitlife_profile_v1', JSON.stringify(profile));
    localStorage.setItem('fitlife_meals_v1', JSON.stringify([meal]));
    localStorage.setItem('fitlife_workouts_v1','[]'); localStorage.setItem('fitlife_weights_v1','[]'); localStorage.setItem('fitlife_moods_v1','[]');
    localStorage.setItem('fitlife_water_v1', JSON.stringify({dateKey:key, amountMl:0}));
    localStorage.setItem('fitlife_auth_v1','false'); localStorage.setItem('__qa_seeded','1');
    localStorage.setItem('fitlife_rest_timer_v1', JSON.stringify({status:'paused',endAt:Date.now(),remainingMs:30000,totalMs:75000}));
    localStorage.setItem('__qa_cloud','{}'); localStorage.setItem('__qa_next','alice');
  }
  const read = () => JSON.parse(localStorage.getItem('__qa_cloud') || '{}');
  const respond = (requestId, ok, result, error) => setTimeout(() => window.dispatchEvent(new CustomEvent('fitlife-cloud-result', { detail: { requestId, ok, result, error } })), 0);
  const current = () => localStorage.getItem('__qa_current');
  const uidMatches = (id, expected) => {
    if (current() !== expected) { respond(id, false, null, 'Account changed; sync was stopped.'); return false; }
    if (localStorage.getItem('__qa_offline') === '1') { respond(id, false, null, 'Cloud sync is offline. Your data stays on this device.'); return false; }
    return true;
  };
  window.FitLifeCloud = {
    session(id) { const uid = current(); respond(id, true, uid ? account(uid) : { signedIn:false }); },
    signIn(id) { const uid = localStorage.getItem('__qa_next') || 'alice'; localStorage.setItem('__qa_current', uid); respond(id, true, account(uid)); },
    signOut(id) { localStorage.removeItem('__qa_current'); respond(id, true, {}); },
    pull(id, expected) {
      if (!uidMatches(id, expected)) return;
      const cloud = read(), docs = cloud[expected] || {};
      respond(id, true, { uid: expected, deviceId:'a'.repeat(32), snapshots: Object.entries(docs).map(([deviceId, payload]) => ({deviceId, payload})) });
    },
    push(id, expected, payload) {
      if (!uidMatches(id, expected)) return;
      const cloud = read(); cloud[expected] ||= {}; cloud[expected]['a'.repeat(32)] = payload;
      localStorage.setItem('__qa_cloud', JSON.stringify(cloud)); respond(id, true, {uid:expected});
    },
  };
});
const storage = key => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), key);
const cloudRows = uid => page.evaluate(u => { const cloud = JSON.parse(localStorage.getItem('__qa_cloud') || '{}'); const raw = cloud[u]?.['a'.repeat(32)]; return raw ? JSON.parse(raw).snapshot.meals : null; }, uid);
const waitCloudRows = (uid, count) => page.waitForFunction(({uid,count}) => { const raw=JSON.parse(localStorage.getItem('__qa_cloud')||'{}')[uid]?.['a'.repeat(32)]; return raw && JSON.parse(raw).snapshot.meals.length === count; }, {uid,count}, {timeout:15000});
const settings = () => page.getByRole('button', { name:'Open settings' }).first();

try {
  await page.goto(pathToFileURL(resolve('../FitLife-App.html')).href);
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).waitFor();
  for (const size of [{width:320,height:480},{width:390,height:844},{width:640,height:360}]) {
    await page.setViewportSize(size);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `native entry fits ${size.width}x${size.height}`);
    const action = page.getByRole('button', { name: 'Sign in with Google', exact:true });
    const box = await action.boundingBox(); assert.ok(box && box.y >= 0 && box.y + box.height <= size.height + 1, 'entry action remains visible');
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button', { name: 'Sign in with Google', exact: true }).click();
  await page.getByText("Today's overview").waitFor();
  await waitCloudRows('alice', 1);
  assert.equal((await cloudRows('alice'))[0].name, 'Alice private oats', 'first account claims existing personal activity');
  assert.equal(await page.evaluate(() => localStorage.getItem('fitlife_cloud_owner_v1')), 'alice');
  assert.equal((await storage('fitlife_rest_timer_v1:alice')).remainingMs, 30000, 'first account retains the unclaimed timer');

  await page.evaluate(() => localStorage.setItem('__qa_offline','1'));
  await page.getByRole('button', { name:'Meals', exact:true }).click();
  await page.getByPlaceholder('Try "2 boiled eggs and a banana"').fill('2 boiled eggs');
  await page.getByRole('button', { name:'Add (1)' }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:alice') || '{}').snapshot?.meals.length === 2);
  await reloadSimulatedNative(page, '__qa_');
  const beforeApp = await page.evaluate(() => window.__qaBeforeReload);
  assert.equal(beforeApp?.owner, 'alice', 'the owner survives before application startup');
  assert.equal(beforeApp.alice?.snapshot.meals.length, 2, 'the offline edit survives before application startup');
  await page.getByText("Today's overview").waitFor();
  assert.equal((await storage('fitlife_cloud_partition_v1:alice')).snapshot.meals.length, 2, 'offline edit survives restart');
  assert.equal((await cloudRows('alice')).length, 1, 'offline edit has not been falsely uploaded');
  await page.evaluate(() => localStorage.removeItem('__qa_offline'));
  await settings().click();
  await page.getByRole('button', { name:/^(Sync now|Retry sync)$/ }).click();
  await waitCloudRows('alice', 2);

  // Editing the same logical meal must tombstone its exact previous content.
  // A stale second-device snapshot must not resurrect it on the next merge.
  await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('__qa_cloud')); c.alice['b'.repeat(32)] = c.alice['a'.repeat(32)]; localStorage.setItem('__qa_cloud', JSON.stringify(c)); });
  await page.getByRole('button', { name:'Meals', exact:true }).click();
  await page.getByRole('button', { name:'Edit Alice private oats' }).click();
  let editor = page.getByRole('dialog', { name:'Review meal details' });
  await editor.getByRole('button', { name:'Save nutrition details' }).click();
  await editor.waitFor({ state:'hidden' });
  assert.equal((await storage('fitlife_cloud_partition_v1:alice')).deleted.meals.length, 0, 'no-op edit never tombstones a live record');
  await page.getByRole('button', { name:'Edit Alice private oats' }).click();
  editor = page.getByRole('dialog', { name:'Review meal details' });
  await editor.getByLabel('Calories (kcal)').fill('410');
  await editor.getByLabel('Sugar (g) · optional').fill('4.5');
  await editor.getByLabel('Sodium (mg) · optional').fill('95');
  await editor.getByLabel('Nutrition source or notes · optional').fill('Package label');
  await editor.getByRole('button', { name:'Save nutrition details' }).click();
  await editor.waitFor({ state:'hidden' });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('fitlife_cloud_partition_v1:alice') || '{}').deleted?.meals?.length === 1);
  await page.getByRole('button', { name:'Home', exact:true }).click(); await settings().click();
  await page.getByRole('button', { name:/^(Sync now|Retry sync)$/ }).click();
  await page.waitForFunction(() => {
    const c = JSON.parse(localStorage.getItem('__qa_cloud') || '{}'); const raw = c.alice?.['a'.repeat(32)];
    if (!raw) return false; const p = JSON.parse(raw);
    return p.deleted.meals.length === 1 && p.snapshot.meals.some(m => m.name === 'Alice private oats' && m.calories === 410 && m.sugarG === 4.5 && m.sodiumMg === 95);
  }, null, { timeout:15000 });
  const edited = await cloudRows('alice');
  assert.equal(edited.length, 2, 'stale snapshot does not duplicate the edited meal');
  assert.equal(edited.filter(m => m.name === 'Alice private oats').length, 1);
  assert.equal(edited.find(m => m.name === 'Alice private oats').nutritionNote, 'Package label');

  await page.getByRole('button', { name:'Sign out' }).click();
  await page.waitForFunction(() => localStorage.getItem('fitlife_cloud_owner_v1') === '__fitlife_guest_v1__');
  assert.equal((await storage('fitlife_cloud_partition_v1:__fitlife_guest_v1__')).snapshot.meals.length, 0, 'sign-out must show an isolated guest rather than Alice');
  await page.evaluate(() => localStorage.setItem('__qa_next','bob'));
  await page.getByRole('button', { name:'Sign in with Google', exact:true }).click();
  await page.waitForFunction(() => localStorage.getItem('fitlife_cloud_owner_v1') === 'bob');
  await waitCloudRows('bob', 0);
  const bob = await storage('fitlife_cloud_partition_v1:bob');
  assert.equal(bob.snapshot.meals.length, 0, 'a new account must not inherit Alice’s local activity');
  assert.equal(await page.evaluate(() => localStorage.getItem('fitlife_rest_timer_v1:bob')), null, 'a new account must not inherit Alice’s rest timer');
  assert.equal(JSON.stringify(await cloudRows('bob')).includes('Alice private oats'), false, 'Alice data must never upload to Bob');
  assert.equal((await storage('fitlife_cloud_partition_v1:alice')).snapshot.meals.length, 2, 'Alice data remains recoverable on device');

  await page.evaluate(() => localStorage.setItem('__qa_current','alice'));
  await reloadSimulatedNative(page, '__qa_');
  const beforeReturn = await page.evaluate(() => window.__qaBeforeReload);
  assert.equal(beforeReturn?.owner, 'bob', 'the prior account survives before application startup');
  assert.equal(beforeReturn.alice?.snapshot.meals.length, 2, 'Alice’s separate account slot survives before application startup');
  await page.waitForFunction(() => localStorage.getItem('fitlife_cloud_owner_v1') === 'alice');
  await page.getByText("Today's overview").waitFor();
  assert.equal((await storage('fitlife_cloud_partition_v1:alice')).snapshot.meals.length, 2, 'returning account restores its own partition');
  await settings().click();
  const before = await storage('fitlife_cloud_partition_v1:alice');
  await page.evaluate(() => { const cloud=JSON.parse(localStorage.getItem('__qa_cloud')); cloud.alice['a'.repeat(32)]='{invalid'; localStorage.setItem('__qa_cloud',JSON.stringify(cloud)); });
  await page.getByRole('button', { name:/^(Sync now|Retry sync)$/ }).click();
  await page.getByText('Cloud data is invalid; nothing was overwritten.').waitFor();
  assert.deepEqual((await storage('fitlife_cloud_partition_v1:alice')).snapshot.meals, before.snapshot.meals, 'malformed cloud snapshot must not overwrite local data');
  assert.deepEqual(errors, []);
  console.log('PASS: simulated native boundary: first-claim merge, offline persistence/retry, cross-account isolation, meal edit tombstones against stale devices, account return and malformed-cloud protection');
} finally { await context.close(); await browser.close(); }
