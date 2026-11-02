import type { AppSettings, UserProfile } from '../data/types';

/**
 * Per-device, per-account bookkeeping while a first cloud read is pending.
 * It is stored atomically beside the local snapshot, never uploaded or exported.
 * Mergeable activity/plan/favorites/step data have their own merge rules; these
 * fields instead record an explicit local choice that must beat an older copy.
 */
export const RECOVERY_SETTING_KEYS = [
  'weightUnit','hapticsEnabled','themeMode','paletteId','cornerStyle','motionStyle','densityStyle',
  'defaultRestSeconds','autoStartRest','weeklyWorkoutGoal','favoriteExerciseIds','navStyle','waterGoalMl',
  'dashboardWidgets','largeText','stepGoal',
] as const satisfies readonly (keyof AppSettings)[];
export const RECOVERY_PROFILE_KEYS = [
  'name','sex','age','heightCm','weightKg','goal','activityLevel','onboarded',
] as const satisfies readonly (keyof UserProfile)[];
export type RecoverySettingKey = typeof RECOVERY_SETTING_KEYS[number];
export type RecoveryProfileKey = typeof RECOVERY_PROFILE_KEYS[number];
export interface RecoveryJournal { settings: RecoverySettingKey[]; profile: RecoveryProfileKey[]; water: boolean }
export interface RecoveryValues { settings: AppSettings; profile: UserProfile; water: {dateKey:string; amountMl:number} }

export const emptyRecoveryJournal = (): RecoveryJournal => ({settings:[],profile:[],water:false});
export const allRecoveryChanges = (): RecoveryJournal => ({settings:[...RECOVERY_SETTING_KEYS],profile:[...RECOVERY_PROFILE_KEYS],water:true});
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function validRecoveryJournal(value: unknown): value is RecoveryJournal {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const j = value as Record<string, unknown>;
  if (Object.keys(j).some(key => !['settings','profile','water'].includes(key))) return false;
  return Array.isArray(j.settings) && j.settings.length <= RECOVERY_SETTING_KEYS.length &&
    j.settings.every(key => RECOVERY_SETTING_KEYS.includes(key as RecoverySettingKey)) && new Set(j.settings).size === j.settings.length &&
    Array.isArray(j.profile) && j.profile.length <= RECOVERY_PROFILE_KEYS.length &&
    j.profile.every(key => RECOVERY_PROFILE_KEYS.includes(key as RecoveryProfileKey)) && new Set(j.profile).size === j.profile.length &&
    typeof j.water === 'boolean';
}

/** Record even a change back to the default; the user's latest local value wins. */
export function noteRecoveryChanges(journal: RecoveryJournal, before: RecoveryValues, after: RecoveryValues): RecoveryJournal {
  const settings = new Set(journal.settings), profile = new Set(journal.profile);
  for (const key of RECOVERY_SETTING_KEYS) if (!same(before.settings[key],after.settings[key])) settings.add(key);
  for (const key of RECOVERY_PROFILE_KEYS) if (!same(before.profile[key],after.profile[key])) profile.add(key);
  return {settings:RECOVERY_SETTING_KEYS.filter(key => settings.has(key)), profile:RECOVERY_PROFILE_KEYS.filter(key => profile.has(key)),
    water:journal.water || !same(before.water,after.water)};
}

/** Overlay only explicitly edited local fields over recovered device defaults. */
export function applyRecoveryChoices<T extends AppSettings | UserProfile>(remote: T, local: T, keys: readonly (keyof T)[]): T {
  const result = {...remote};
  for (const key of keys) result[key] = local[key];
  return result;
}
