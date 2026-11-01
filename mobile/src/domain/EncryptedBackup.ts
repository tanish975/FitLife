import { AppSettings, LoggedMeal, LoggedWorkout, MoodEntry, UserProfile, WeightEntry } from '../data/types';

/** A local encrypted export. This is not cloud sync or an account. */
export interface BackupSnapshot {
  schema: 1;
  createdAt: number;
  profile: UserProfile;
  settings: AppSettings;
  meals: LoggedMeal[];
  workouts: LoggedWorkout[];
  weights: WeightEntry[];
  moods: MoodEntry[];
  water: { dateKey: string; amountMl: number };
}
const MAGIC = 'fitlife-encrypted-backup';
const ITERATIONS = 600_000;
const MAX_FILE_BYTES = 4_000_000;
const MAX_ROWS = 20_000;
const encoder = new TextEncoder();
const b64 = (data: Uint8Array) => {
  let s = '';
  for (let i = 0; i < data.length; i += 0x8000) s += String.fromCharCode(...data.subarray(i, i + 0x8000));
  return btoa(s);
};
function bytes(value: unknown, maxBytes: number) {
  if (typeof value !== 'string' || value.length > Math.ceil(maxBytes * 4 / 3) + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('Invalid backup file.');
  const decoded = atob(value);
  if (decoded.length > maxBytes) throw new Error('Backup file is too large.');
  return Uint8Array.from(decoded, c => c.charCodeAt(0));
}
function ensureCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) throw new Error('Encrypted backups are not supported by this browser.');
  return globalThis.crypto;
}
async function derive(passphrase: string, salt: Uint8Array, usage: KeyUsage[]) {
  const crypto = ensureCrypto();
  const base = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS }, base, { name: 'AES-GCM', length: 256 }, false, usage);
}
const isRecord = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 500) => typeof v === 'string' && v.length <= max;
const dateKey = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e15;
const record = (v: unknown) => isRecord(v) && str(v.id, 300) && !!v.id && dateKey(v.dateKey) && finite(v.timestamp);
const oneOf = (v: unknown, options: string[]) => typeof v === 'string' && options.includes(v);
export function validSnapshot(value: unknown): value is BackupSnapshot {
  if (!isRecord(value) || value.schema !== 1 || !finite(value.createdAt) || !isRecord(value.profile) || !isRecord(value.settings) || !isRecord(value.water)) return false;
  const p = value.profile, s = value.settings, w = value.water;
  if (!str(p.name, 200) || !str(p.email, 320) || !oneOf(p.sex, ['male','female']) || !finite(p.age) || !finite(p.heightCm) || !finite(p.weightKg) || !oneOf(p.goal, ['lose_weight','maintain','gain_muscle','endurance']) || !oneOf(p.activityLevel, ['sedentary','light','moderate','active','athlete']) || typeof p.onboarded !== 'boolean') return false;
  if (!oneOf(s.weightUnit, ['kg','lb']) || typeof s.hapticsEnabled !== 'boolean' || !oneOf(s.themeMode, ['light','dark']) || !oneOf(s.paletteId, ['matcha_oat','coastal_eucalyptus','terracotta_olive','nordic_fjord','kyoto_cedar']) || !oneOf(s.cornerStyle, ['sharp','organic','pebble']) || !oneOf(s.motionStyle, ['spring','gentle','reduced']) || !oneOf(s.densityStyle, ['compact','comfortable','spacious']) || !finite(s.defaultRestSeconds) || s.defaultRestSeconds < 1 || s.defaultRestSeconds > 3600 || !finite(s.waterGoalMl) || s.waterGoalMl < 0 || s.waterGoalMl > 8000 || !isRecord(s.dashboardWidgets) || !['showMacros','showHydration','showMood','showAiCoach','showActivityFeed'].every(key => typeof s.dashboardWidgets[key] === 'boolean')) return false;
  // New preferences are optional in older exports; normalize them before loading.
  if (s.autoStartRest !== undefined && typeof s.autoStartRest !== 'boolean') return false;
  if (s.weeklyWorkoutGoal !== undefined && (!finite(s.weeklyWorkoutGoal) || s.weeklyWorkoutGoal < 1 || s.weeklyWorkoutGoal > 7)) return false;
  if (s.navStyle !== undefined && !oneOf(s.navStyle, ['glass','solid'])) return false;
  if (s.favoriteExerciseIds !== undefined && (!Array.isArray(s.favoriteExerciseIds) || s.favoriteExerciseIds.length > 500 || !s.favoriteExerciseIds.every((id: unknown) => str(id, 200)))) return false;
  if (!dateKey(w.dateKey) || !finite(w.amountMl) || w.amountMl < 0 || w.amountMl > 8000) return false;
  const arrays = [value.meals, value.workouts, value.weights, value.moods];
  if (!arrays.every(a => Array.isArray(a) && a.length <= MAX_ROWS && a.every(record))) return false;
  return value.meals.every((x: any) => str(x.name, 500) && str(x.servingLabel, 300) && oneOf(x.category, ['Breakfast','Lunch','Dinner','Snack']) && ['calories','proteinG','carbsG','fatG','fiberG'].every(k => finite(x[k]))) &&
    value.workouts.every((x: any) => str(x.exerciseId, 300) && str(x.exerciseName, 500) && oneOf(x.muscleGroup, ['Chest','Back','Legs','Shoulders','Arms','Core','Cardio','Full Body']) && ['sets','reps','weightKg','caloriesBurned','restSeconds'].every(k => finite(x[k]))) &&
    value.weights.every((x: any) => finite(x.weightKg)) && value.moods.every((x: any) => oneOf(x.moodId, ['energized','focused','happy','calm','motivated','neutral','tired','stressed','sore','anxious','exhausted']));
}
export async function encryptBackup(snapshot: BackupSnapshot, passphrase: string): Promise<string> {
  if (passphrase.length < 12 || passphrase.length > 1024) throw new Error('Use a passphrase of 12 to 1,024 characters.');
  if (!validSnapshot(snapshot)) throw new Error('Some data cannot be exported safely.');
  const json = encoder.encode(JSON.stringify(snapshot));
  if (json.byteLength > MAX_FILE_BYTES / 2) throw new Error('This backup is too large to export.');
  const crypto = ensureCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const header = { format: MAGIC, version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: b64(salt), cipher: 'AES-256-GCM', iv: b64(iv) };
  const key = await derive(passphrase, salt, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(JSON.stringify(header)) }, key, json);
  return JSON.stringify({ ...header, data: b64(new Uint8Array(ciphertext)) });
}
export async function decryptBackup(file: string, passphrase: string): Promise<BackupSnapshot> {
  if (file.length > MAX_FILE_BYTES || !passphrase || passphrase.length > 1024) throw new Error('Invalid backup or passphrase.');
  let parsed: any;
  try { parsed = JSON.parse(file); } catch { throw new Error('Invalid backup file.'); }
  if (!isRecord(parsed) || Object.keys(parsed).length !== 8 || parsed.format !== MAGIC || parsed.version !== 1 || parsed.kdf !== 'PBKDF2-SHA256' || parsed.iterations !== ITERATIONS || parsed.cipher !== 'AES-256-GCM') throw new Error('Unsupported backup file.');
  const salt = bytes(parsed.salt, 16), iv = bytes(parsed.iv, 12), ciphertext = bytes(parsed.data, MAX_FILE_BYTES);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16) throw new Error('Invalid backup file.');
  const header = { format: MAGIC, version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: parsed.salt, cipher: 'AES-256-GCM', iv: parsed.iv };
  let plain: ArrayBuffer;
  try {
    const key = await derive(passphrase, salt, ['decrypt']);
    plain = await ensureCrypto().subtle.decrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(JSON.stringify(header)) }, key, ciphertext);
  } catch { throw new Error('Wrong passphrase or the backup was changed.'); }
  let snapshot: unknown;
  try { snapshot = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plain)); } catch { throw new Error('The decrypted backup is invalid.'); }
  if (!validSnapshot(snapshot)) throw new Error('The decrypted backup has invalid data.');
  return snapshot;
}

// Keep both versions on a same-ID conflict; a deterministic fingerprint makes
// repeat imports idempotent. The encrypted backup itself remains local.
export async function mergeBackupRows<T extends { id: string }>(current: T[], incoming: T[]): Promise<T[]> {
  const result = [...current];
  const byId = new Map(current.map(item => [item.id, item]));
  for (const item of incoming) {
    const existing = byId.get(item.id);
    if (!existing) { result.push(item); byId.set(item.id, item); continue; }
    if (JSON.stringify(existing) === JSON.stringify(item)) continue;
    const digest = await ensureCrypto().subtle.digest('SHA-256', encoder.encode(JSON.stringify(item)));
    const suffix = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 24);
    const id = `${item.id.slice(0, 260)}-backup-${suffix}`;
    if (!byId.has(id)) { const copy = { ...item, id }; result.push(copy); byId.set(id, copy); }
  }
  return result;
}
