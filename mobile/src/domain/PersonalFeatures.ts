import type { AppSettings, LoggedMeal } from '../data/types';

/** Each observation is a whole-day total from one source on one installation.
 * Sources are alternatives, not quantities to sum. */
export interface StepObservation {
  deviceId: string;
  dateKey: string;
  source: 'phone' | 'health';
  count: number;
  updatedAt: number;
  partial: boolean;
}
export interface SavedMeal {
  id: string;
  updatedAt: number;
  deleted: boolean;
  meal: LoggedMeal;
}
/** weekday is 0 (Sunday) to 6 (Saturday); an empty session means cleared. */
export interface PlannedDay { weekday: number; sessionId: string; updatedAt: number }

const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e15;
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
const validMeal = (v: unknown): v is LoggedMeal => {
  if (!object(v) || !text(v.id, 300) || !date(v.dateKey) || !num(v.timestamp) || !text(v.name, 500) || !text(v.servingLabel, 300) || !['Breakfast','Lunch','Dinner','Snack'].includes(v.category)) return false;
  if (!['calories','proteinG','carbsG','fatG','fiberG'].every(key => num(v[key]))) return false;
  return (v.sugarG === undefined || num(v.sugarG)) && (v.sodiumMg === undefined || num(v.sodiumMg)) && (v.nutritionNote === undefined || (typeof v.nutritionNote === 'string' && v.nutritionNote.length <= 300));
};
export const validStepObservation = (v: unknown): v is StepObservation => object(v) && /^[a-f0-9]{32}$/.test(v.deviceId) && date(v.dateKey) && ['phone','health'].includes(v.source) && Number.isSafeInteger(v.count) && v.count >= 0 && v.count <= 1_000_000 && num(v.updatedAt) && typeof v.partial === 'boolean';
export const validSavedMeal = (v: unknown): v is SavedMeal => object(v) && text(v.id, 120) && /^[A-Za-z0-9_-]+$/.test(v.id) && num(v.updatedAt) && typeof v.deleted === 'boolean' && validMeal(v.meal);
export const validPlannedDay = (v: unknown): v is PlannedDay => object(v) && Number.isInteger(v.weekday) && v.weekday >= 0 && v.weekday <= 6 && typeof v.sessionId === 'string' && /^[a-z0-9-]{0,80}$/.test(v.sessionId) && num(v.updatedAt);

/** Optional fields preserve compatibility with older snapshots and backups. */
export function validPersonalSettings(s: Record<string, any>): boolean {
  return (s.stepGoal === undefined || (Number.isInteger(s.stepGoal) && s.stepGoal >= 100 && s.stepGoal <= 100_000)) &&
    (s.stepHistory === undefined || (Array.isArray(s.stepHistory) && s.stepHistory.length <= 4000 && s.stepHistory.every(validStepObservation))) &&
    (s.savedMeals === undefined || (Array.isArray(s.savedMeals) && s.savedMeals.length <= 500 && s.savedMeals.every(validSavedMeal))) &&
    (s.weeklyPlan === undefined || (Array.isArray(s.weeklyPlan) && s.weeklyPlan.length <= 70 && s.weeklyPlan.every(validPlannedDay)));
}
function deterministicNewer<T extends {updatedAt:number}>(a: T, b: T): T {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
}
function mergeBy<T extends {updatedAt:number}>(items: T[], key: (x:T) => string): T[] {
  const byKey = new Map<string,T>();
  for (const item of items) {
    const id = key(item), previous = byKey.get(id);
    byKey.set(id, previous ? deterministicNewer(previous,item) : item);
  }
  return [...byKey.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([,v]) => v);
}
export function mergeStepObservations(items: StepObservation[]): StepObservation[] {
  return mergeBy(items, item => `${item.dateKey}:${item.deviceId}:${item.source}`);
}
export function mergePersonalSettings(base: AppSettings, sources: AppSettings[]): AppSettings {
  const steps = mergeStepObservations(sources.flatMap(s => s.stepHistory || []));
  const meals = mergeBy(sources.flatMap(s => s.savedMeals || []), x => x.id);
  const plan = mergeBy(sources.flatMap(s => s.weeklyPlan || []), x => String(x.weekday));
  // Never silently prune user data to fit cloud limits: fail closed instead.
  if (steps.length > 4000 || meals.length > 500 || plan.length > 7) throw new Error('Personal data exceeds the sync limit. Keep an encrypted backup.');
  return { ...base, ...(steps.length ? {stepHistory:steps} : {}), ...(meals.length ? {savedMeals:meals} : {}), ...(plan.length ? {weeklyPlan:plan} : {}) };
}
/** One data source per day; never add overlapping phone/Health Connect totals.
 * Health Connect aggregates its own inputs. Across devices choose the largest
 * single observation, since adding devices may double-count the same walk. */
export function stepsForDay(rows: StepObservation[], day: string): StepObservation | null {
  const matches = rows.filter(x => x.dateKey === day);
  if (!matches.length) return null;
  const health = matches.filter(x => x.source === 'health');
  const candidates = health.length ? health : matches.filter(x => x.source === 'phone');
  return candidates.reduce((best, row) => row.count > best.count || (row.count === best.count && row.updatedAt > best.updatedAt) ? row : best);
}
