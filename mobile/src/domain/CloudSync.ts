import { BackupSnapshot, validSnapshot } from './EncryptedBackup';
import { GUIDE_IDS, normalizeGuides } from '../data/types';
import { mergePersonalSettings } from './PersonalFeatures';
import { validRecoveryJournal, type RecoveryJournal } from './RecoveryJournal';

export const GUEST_OWNER = '__fitlife_guest_v1__';
export const CLOUD_OWNER_KEY = 'fitlife_cloud_owner_v1';
export const CLOUD_SLOT_PREFIX = 'fitlife_cloud_partition_v1:';
/** Matches the Android pull limit. This client-side check is not a server transaction. */
export const CLOUD_DEVICE_LIMIT = 10;
export function canWriteDeviceSnapshot(deviceId: string, existingIds: string[]): boolean {
  return existingIds.includes(deviceId) || existingIds.length < CLOUD_DEVICE_LIMIT;
}
export const CLOUD_KINDS = ['meals', 'workouts', 'weights', 'moods'] as const;
export type CloudKind = typeof CLOUD_KINDS[number];
export type CloudDeletions = Record<CloudKind, string[]>;
export interface CloudPayload { schema: 1; snapshot: BackupSnapshot; deleted: CloudDeletions }
export interface CloudPartition { version: 1; snapshot: BackupSnapshot; deleted: CloudDeletions; recovery?: RecoveryJournal }
export interface GoogleAccount { signedIn: true; uid: string; name: string; email: string }
export interface RemoteSnapshot { deviceId: string; payload: string }

export const emptyDeletions = (): CloudDeletions => ({ meals: [], workouts: [], weights: [], moods: [] });
export const isDemoId = (id: string) => id.startsWith('seed-') || id.startsWith('today-meal-') || id.startsWith('today-wk-') || id.startsWith('today-mood-');
const safeUid = (uid: unknown): uid is string => typeof uid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(uid);
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const validDeleted = (value: unknown): value is CloudDeletions => isRecord(value) && CLOUD_KINDS.every(kind =>
  Array.isArray(value[kind]) && (value[kind] as unknown[]).length <= 20_000 && (value[kind] as unknown[]).every(x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)));
export function validCloudPayload(value: unknown): value is CloudPayload {
  return isRecord(value) && value.schema === 1 && validSnapshot(value.snapshot) && validDeleted(value.deleted);
}
export function validCloudPartition(value: unknown): value is CloudPartition {
  return isRecord(value) && value.version === 1 && validSnapshot(value.snapshot) && validDeleted(value.deleted) &&
    (value.recovery === undefined || validRecoveryJournal(value.recovery));
}
export function readActivePartition(storage: Storage): { uid: string | null; partition: CloudPartition | null; damaged: boolean } {
  try {
    const uid = storage.getItem(CLOUD_OWNER_KEY);
    if (!uid) return { uid: null, partition: null, damaged: false };
    if (!safeUid(uid)) return { uid: null, partition: null, damaged: true };
    const text = storage.getItem(CLOUD_SLOT_PREFIX + uid);
    const partition: unknown = text ? JSON.parse(text) : null;
    return { uid, partition: validCloudPartition(partition) ? partition : null, damaged: !validCloudPartition(partition) };
  } catch { return { uid: null, partition: null, damaged: true }; }
}
/** Slot first, active-owner marker last: a crash cannot relabel A's data as B's. */
export function activatePartition(storage: Storage, uid: string, next: CloudPartition): void {
  if (!safeUid(uid) || !validCloudPartition(next)) throw new Error('Account data is invalid; no data was switched.');
  storage.setItem(CLOUD_SLOT_PREFIX + uid, JSON.stringify(next));
  storage.setItem(CLOUD_OWNER_KEY, uid);
}
export function readPartition(storage: Storage, uid: string): CloudPartition | null {
  if (!safeUid(uid)) throw new Error('Invalid account.');
  const raw = storage.getItem(CLOUD_SLOT_PREFIX + uid);
  if (!raw) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('That account’s local data needs recovery; nothing was switched.'); }
  if (!validCloudPartition(value)) throw new Error('That account’s local data needs recovery; nothing was switched.');
  return value;
}
export function savePartition(storage: Storage, uid: string, partition: CloudPartition) {
  if (!safeUid(uid) || !validCloudPartition(partition)) throw new Error('Account data is invalid; it was not saved.');
  storage.setItem(CLOUD_SLOT_PREFIX + uid, JSON.stringify(partition));
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (isRecord(value)) return '{' + Object.keys(value).sort().filter(key => value[key] !== undefined)
    .map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
const encoder = new TextEncoder();
/** Deterministic content-specific tombstones avoid deleting a same-ID conflict. */
export async function rowFingerprint(row: { id: string }): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Secure sync is unavailable on this device.');
  const id = row.id.replace(/-backup-[a-f0-9]{24}$/, '');
  const normalized = { ...row, id };
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(stable(normalized)));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function addDeleted(current: CloudDeletions, kind: CloudKind, rows: { id: string }[]): Promise<CloudDeletions> {
  const additions = await Promise.all(rows.filter(row => !isDemoId(row.id)).map(rowFingerprint));
  return { ...current, [kind]: [...new Set([...current[kind], ...additions])].sort() };
}
function cloudCopy(snapshot: BackupSnapshot): BackupSnapshot {
  return { ...snapshot, createdAt: 0,
    settings: { ...snapshot.settings, ...(snapshot.settings.savedMeals ? { savedMeals: snapshot.settings.savedMeals.filter(row => !isDemoId(row.meal.id)) } : {}) },
    meals: snapshot.meals.filter(row => !isDemoId(row.id)), workouts: snapshot.workouts.filter(row => !isDemoId(row.id)),
    weights: snapshot.weights.filter(row => !isDemoId(row.id)), moods: snapshot.moods.filter(row => !isDemoId(row.id)) };
}
/**
 * Merge immutable activity records and content-specific deletion tombstones.
 * Profile, preferences and today's water deliberately stay device-local; each
 * device's snapshot contains a recovery copy, but concurrent values are not
 * silently guessed. First-visit guide flags alone are merged monotonically so
 * the same account does not repeatedly receive them on another device.
 * This method never deletes a remote document.
 */
export async function mergeCloud(local: CloudPayload, remotes: CloudPayload[]): Promise<CloudPayload> {
  if (!validCloudPayload(local) || !remotes.every(validCloudPayload)) throw new Error('Cloud data is invalid; nothing was overwritten.');
  const sources = [cloudCopy(local.snapshot), ...remotes.map(value => cloudCopy(value.snapshot))];
  const deleted = emptyDeletions();
  for (const kind of CLOUD_KINDS) deleted[kind] = [...new Set([local, ...remotes].flatMap(value => value.deleted[kind]))].sort();
  // A snapshot from a release before the guide feature belongs to an existing
  // user, so do not interrupt them with first-run tips after an upgrade.
  const wasLegacyAccount = sources.some(source => source.settings.guidesSeen === undefined && source.profile.onboarded);
  const completed = wasLegacyAccount ? [...GUIDE_IDS] : normalizeGuides(sources.flatMap(source => source.settings.guidesSeen || []));
  const snapshot = { ...sources[0], settings: { ...mergePersonalSettings(sources[0].settings, sources.map(s => s.settings)), guidesSeen: completed } };
  for (const kind of CLOUD_KINDS) {
    const tombstones = new Set(deleted[kind]);
    const all = sources.flatMap(source => source[kind] as { id: string }[]);
    const fingerprints = await Promise.all(all.map(rowFingerprint));
    const groups = new Map<string, Map<string, { id: string }>>();
    for (let i = 0; i < all.length; i++) {
      const row = all[i], fingerprint = fingerprints[i];
      if (tombstones.has(fingerprint)) continue;
      const baseId = row.id.replace(/-backup-[a-f0-9]{24}$/, '');
      const versions = groups.get(baseId) || new Map<string, { id: string }>();
      versions.set(fingerprint, { ...row, id: baseId }); groups.set(baseId, versions);
    }
    const merged: { id: string }[] = [];
    for (const [baseId, versions] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const sorted = [...versions.entries()].sort(([a], [b]) => a.localeCompare(b));
      if (baseId.length > 260 && sorted.length > 1) throw new Error('An activity ID conflict needs manual backup recovery; nothing was overwritten.');
      sorted.forEach(([hash, row], index) => merged.push({ ...row, id: index === 0 ? baseId : `${baseId}-backup-${hash.slice(0, 24)}` }));
    }
    (snapshot as any)[kind] = merged;
  }
  return { schema: 1, snapshot, deleted };
}

interface NativeCloud {
  session(id: string): void;
  signIn(id: string): void;
  signOut(id: string): void;
  pull(id: string, expectedUid: string): void;
  push(id: string, expectedUid: string, payload: string): void;
}
declare global { interface Window { FitLifeCloud?: NativeCloud } }
export function hasNativeCloud(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'file:' && !!window.FitLifeCloud;
}
let nextRequest = 0;
export function nativeCloudRequest<T>(method: keyof NativeCloud, payload?: string, expectedUid?: string): Promise<T> {
  const bridge = window.FitLifeCloud;
  if (!bridge) return Promise.reject(new Error('Google sign-in is available in the Android app.'));
  const requestId = `r_${Date.now()}_${++nextRequest}`;
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error('Cloud request timed out. Your data stays on this device.')), method === 'session' ? 5000 : 35000);
    function onResult(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (!detail || detail.requestId !== requestId) return;
      if (detail.ok) finish(null, detail.result as T);
      else finish(new Error(typeof detail.error === 'string' ? detail.error : 'Cloud request failed.'));
    }
    function finish(error: Error | null, result?: T) {
      window.clearTimeout(timeout); window.removeEventListener('fitlife-cloud-result', onResult);
      if (error) reject(error); else resolve(result as T);
    }
    window.addEventListener('fitlife-cloud-result', onResult);
    try {
      if (method === 'push') bridge.push(requestId, expectedUid || '', payload || '');
      else if (method === 'pull') bridge.pull(requestId, expectedUid || '');
      else bridge[method](requestId);
    } catch { finish(new Error('Cloud service is unavailable on this device.')); }
  });
}
