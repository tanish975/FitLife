import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { activatePartition, addDeleted, CLOUD_OWNER_KEY, CLOUD_SLOT_PREFIX, emptyDeletions, mergeCloud,
  readActivePartition, readPartition, rowFingerprint, savePartition, validCloudPayload } from '../src/domain/CloudSync';
if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });

const profile: any = { name: 'Athlete', email: 'athlete@example.test', sex: 'female', age: 30, heightCm: 170, weightKg: 65,
  goal: 'maintain', activityLevel: 'moderate', onboarded: true, uid: 'alice' };
const settings: any = { weightUnit: 'kg', hapticsEnabled: true, firebaseProjectId: 'fitlife-b038b', themeMode: 'light', paletteId: 'matcha_oat',
  cornerStyle: 'organic', motionStyle: 'spring', densityStyle: 'comfortable', defaultRestSeconds: 75,
  autoStartRest: false, weeklyWorkoutGoal: 3, favoriteExerciseIds: [], navStyle: 'glass', waterGoalMl: 2500,
  dashboardWidgets: { showMacros: true, showHydration: true, showMood: true, showAiCoach: true, showActivityFeed: true } };
const meal = (id: string, name: string) => ({ id, name, dateKey: '2026-11-01', timestamp: 1760000000000,
  servingLabel: '1 plate', category: 'Lunch' as const, calories: 400, proteinG: 20, carbsG: 50, fatG: 10, fiberG: 5 });
const a = meal('same-id', 'Oats'), b = meal('same-id', 'Rice');
const snap = (meals: any[] = [], name = 'Athlete', amountMl = 0): any => ({ schema: 1, createdAt: 123, profile: { ...profile, name }, settings,
  meals, workouts: [], weights: [], moods: [], water: { dateKey: '2026-11-01', amountMl } });
const payload = (meals: any[] = [], name = 'Athlete', water = 0): any => ({ schema: 1, snapshot: snap(meals, name, water), deleted: emptyDeletions() });

assert.equal(validCloudPayload(payload([a])), true);
assert.equal(validCloudPayload({ ...payload(), deleted: { ...emptyDeletions(), meals: ['bad'] } }), false);
const first = await mergeCloud(payload([a, meal('seed-meal-1', 'sample')], 'A', 250), [payload([b], 'B', 500)]);
const reversed = await mergeCloud(payload([b], 'B', 500), [payload([a], 'A', 250)]);
assert.equal(first.snapshot.meals.length, 2, 'same-ID conflicting activity must preserve both entries');
assert.deepEqual(first.snapshot.meals, reversed.snapshot.meals, 'conflict choice must be deterministic');
assert.equal(first.snapshot.profile.name, 'A', 'local profile must not be silently replaced');
assert.equal(first.snapshot.water.amountMl, 250, 'local hydration must not be guessed from other devices');
assert.equal(first.snapshot.meals.some(x => x.id.startsWith('seed-')), false, 'sample data must stay out of cloud');
const again = await mergeCloud(first, [payload([b, a])]);
assert.deepEqual(again.snapshot.meals, first.snapshot.meals, 'repeated merges must be idempotent');
const deleted = await addDeleted(emptyDeletions(), 'meals', [a]);
const afterDelete = await mergeCloud({ ...payload([]), deleted }, [payload([a, b]), first]);
assert.deepEqual(afterDelete.snapshot.meals.map(x => x.name), ['Rice'], 'only the explicitly deleted conflicting version is removed');
const noResurrection = await mergeCloud(afterDelete, [payload([a])]);
assert.deepEqual(noResurrection.snapshot.meals.map(x => x.name), ['Rice'], 'stale device cannot resurrect a deleted entry');
assert.equal((await rowFingerprint(a)).length, 64);
await assert.rejects(() => mergeCloud(payload(), [{ ...payload(), snapshot: { ...snap(), water: { dateKey: 'bad', amountMl: 1 } } }]), /invalid/);

class MemoryStorage implements Storage {
  data = new Map<string,string>(); failKey: string | null = null;
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { if (this.failKey === key) throw new Error('quota'); this.data.set(key, String(value)); }
}
const storage = new MemoryStorage();
const partA: any = { version: 1, snapshot: snap([a], 'Alice'), deleted: emptyDeletions() };
const partB: any = { version: 1, snapshot: snap([b], 'Bob'), deleted: emptyDeletions() };
activatePartition(storage, 'alice', partA);
assert.equal(readActivePartition(storage).partition?.snapshot.profile.name, 'Alice');
storage.failKey = CLOUD_OWNER_KEY;
assert.throws(() => activatePartition(storage, 'bob', partB), /quota/);
assert.equal(readActivePartition(storage).uid, 'alice', 'failure before owner marker must leave A active');
assert.equal(readActivePartition(storage).partition?.snapshot.profile.name, 'Alice', 'B data must not overwrite A');
storage.failKey = null;
activatePartition(storage, 'bob', partB);
assert.equal(readActivePartition(storage).uid, 'bob');
assert.equal(readPartition(storage, 'alice')?.snapshot.meals[0].name, 'Oats');
assert.equal(readPartition(storage, 'bob')?.snapshot.meals[0].name, 'Rice');
assert.throws(() => activatePartition(storage, '../alice', partA), /invalid/);
storage.setItem(CLOUD_OWNER_KEY, 'alice'); storage.removeItem(CLOUD_SLOT_PREFIX + 'alice');
assert.equal(readActivePartition(storage).damaged, true, 'a missing slot must fail closed, never load another account');
assert.throws(() => savePartition(storage, 'alice', { ...partA, snapshot: null } as any), /invalid/);
console.log('PASS: cloud merge, conflict preservation, deletion, idempotence, sample filtering, partition crash safety and account isolation');
