import type { AppSettings, LoggedMeal, MealCategory } from '../data/types';

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
export interface RecipeIngredient {
  id: string;
  name: string;
  foodId?: string;
  amountLabel: string;
  grams?: number;
  basis?: 'raw' | 'cooked' | 'as_served';
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG?: number;
  sodiumMg?: number;
}
export interface CustomRecipe {
  id: string;
  updatedAt: number;
  deleted: boolean;
  name: string;
  defaultCategory: MealCategory;
  servingsYield: number;
  servingUnitLabel: string;
  cookedWeightG?: number;
  cookingFatType?: 'none' | 'oil' | 'ghee';
  cookingFatGrams?: number;
  notes?: string;
  ingredients: RecipeIngredient[];
}
/** weekday is 0 (Sunday) to 6 (Saturday); an empty session means cleared. */
export interface PlannedDay { weekday: number; sessionId: string; updatedAt: number }

/** Canonical metric body circumference & composition log (converted to cm/in in UI). */
export interface BodyMeasurementEntry {
  id: string;
  dateKey: string; // YYYY-MM-DD
  updatedAt: number;
  deleted: boolean;
  waistCm?: number;
  hipsCm?: number;
  chestCm?: number;
  neckCm?: number;
  armCm?: number;
  thighCm?: number;
  bodyFatPct?: number;
  notes?: string;
}

/** Local-first daily check-in & weekly summary reminder schedule. */
export interface HabitReminderPreferences {
  updatedAt: number;
  workoutEnabled: boolean;
  workoutMinute: number; // 0..1439
  waterEnabled: boolean;
  waterIntervalMinutes: 60 | 120 | 180;
  waterStartMinute: number; // 0..1439
  waterEndMinute: number; // 1..1439 (> waterStartMinute)
  mealsEnabled: boolean;
  breakfastMinute: number;
  lunchMinute: number;
  dinnerMinute: number;
  weighInEnabled: boolean;
  weighInMinute: number;
  weeklySummaryEnabled: boolean;
  weeklySummaryWeekday: number; // 0 (Sunday) .. 6 (Saturday)
  weeklySummaryMinute: number; // 0..1439
}

export const DEFAULT_HABIT_REMINDERS: HabitReminderPreferences = {
  updatedAt: 0,
  workoutEnabled: false,
  workoutMinute: 8 * 60, // 08:00
  waterEnabled: false,
  waterIntervalMinutes: 120,
  waterStartMinute: 9 * 60, // 09:00
  waterEndMinute: 19 * 60, // 19:00
  mealsEnabled: false,
  breakfastMinute: 8 * 60 + 30, // 08:30
  lunchMinute: 13 * 60, // 13:00
  dinnerMinute: 20 * 60, // 20:00
  weighInEnabled: false,
  weighInMinute: 7 * 60 + 30, // 07:30
  weeklySummaryEnabled: false,
  weeklySummaryWeekday: 0, // Sunday
  weeklySummaryMinute: 19 * 60, // 19:00
};

const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e15;
const minuteOfDay = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1440;
const boundedCm = (v: unknown, min: number, max: number) =>
  v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max);
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
const validMeal = (v: unknown): v is LoggedMeal => {
  if (!object(v) || !text(v.id, 300) || !date(v.dateKey) || !num(v.timestamp) || !text(v.name, 500) || !text(v.servingLabel, 300) || !['Breakfast','Lunch','Dinner','Snack'].includes(v.category)) return false;
  if (!['calories','proteinG','carbsG','fatG','fiberG'].every(key => num(v[key]))) return false;
  return (v.sugarG === undefined || num(v.sugarG)) && (v.sodiumMg === undefined || num(v.sodiumMg)) && (v.nutritionNote === undefined || (typeof v.nutritionNote === 'string' && v.nutritionNote.length <= 300));
};
export const validStepObservation = (v: unknown): v is StepObservation => object(v) && /^[a-f0-9]{32}$/.test(v.deviceId) && date(v.dateKey) && ['phone','health'].includes(v.source) && Number.isSafeInteger(v.count) && v.count >= 0 && v.count <= 1_000_000 && num(v.updatedAt) && typeof v.partial === 'boolean';
export const validSavedMeal = (v: unknown): v is SavedMeal => object(v) && text(v.id, 120) && /^[A-Za-z0-9_-]+$/.test(v.id) && num(v.updatedAt) && typeof v.deleted === 'boolean' && validMeal(v.meal);
export const validRecipeIngredient = (v: unknown): v is RecipeIngredient => {
  if (!object(v) || !text(v.id, 120) || !/^[A-Za-z0-9_-]+$/.test(v.id) || !text(v.name, 300) || !text(v.amountLabel, 200)) return false;
  if (!['calories','proteinG','carbsG','fatG','fiberG'].every(key => num(v[key]))) return false;
  if (v.foodId !== undefined && (!text(v.foodId, 160) || !/^[A-Za-z0-9_-]+$/.test(v.foodId))) return false;
  if (v.grams !== undefined && (!num(v.grams) || v.grams > 50_000)) return false;
  if (v.basis !== undefined && !['raw', 'cooked', 'as_served'].includes(v.basis)) return false;
  return (v.sugarG === undefined || (num(v.sugarG) && v.sugarG <= 5000)) &&
    (v.sodiumMg === undefined || (num(v.sodiumMg) && v.sodiumMg <= 200_000));
};
export const validCustomRecipe = (v: unknown): v is CustomRecipe => {
  if (!object(v) || !text(v.id, 120) || !/^[A-Za-z0-9_-]+$/.test(v.id) || !num(v.updatedAt) || typeof v.deleted !== 'boolean') return false;
  if (!text(v.name, 300) || !['Breakfast','Lunch','Dinner','Snack'].includes(v.defaultCategory)) return false;
  if (!num(v.servingsYield) || v.servingsYield < 0.1 || v.servingsYield > 200 || !text(v.servingUnitLabel, 80)) return false;
  if (v.cookedWeightG !== undefined && (!num(v.cookedWeightG) || v.cookedWeightG < 1 || v.cookedWeightG > 50_000)) return false;
  if (v.cookingFatType !== undefined && !['none', 'oil', 'ghee'].includes(v.cookingFatType)) return false;
  if (v.cookingFatGrams !== undefined && (!num(v.cookingFatGrams) || v.cookingFatGrams > 1000)) return false;
  if (v.notes !== undefined && (typeof v.notes !== 'string' || v.notes.length > 300)) return false;
  return Array.isArray(v.ingredients) && v.ingredients.length >= 1 && v.ingredients.length <= 40 && v.ingredients.every(validRecipeIngredient);
};
export const validPlannedDay = (v: unknown): v is PlannedDay => object(v) && Number.isInteger(v.weekday) && v.weekday >= 0 && v.weekday <= 6 && typeof v.sessionId === 'string' && /^[a-z0-9-]{0,80}$/.test(v.sessionId) && num(v.updatedAt);

export const validBodyMeasurement = (v: unknown): v is BodyMeasurementEntry => {
  if (!object(v) || !text(v.id, 120) || !/^[A-Za-z0-9_-]+$/.test(v.id) || !date(v.dateKey) || !num(v.updatedAt) || typeof v.deleted !== 'boolean') {
    return false;
  }
  if (
    !boundedCm(v.waistCm, 30, 250) ||
    !boundedCm(v.hipsCm, 30, 250) ||
    !boundedCm(v.chestCm, 30, 250) ||
    !boundedCm(v.neckCm, 15, 100) ||
    !boundedCm(v.armCm, 12, 100) ||
    !boundedCm(v.thighCm, 20, 150) ||
    !boundedCm(v.bodyFatPct, 2, 70)
  ) {
    return false;
  }
  if (v.notes !== undefined && (typeof v.notes !== 'string' || v.notes.length > 200)) {
    return false;
  }
  const hasAnyMetric =
    v.deleted ||
    v.waistCm !== undefined ||
    v.hipsCm !== undefined ||
    v.chestCm !== undefined ||
    v.neckCm !== undefined ||
    v.armCm !== undefined ||
    v.thighCm !== undefined ||
    v.bodyFatPct !== undefined;
  return hasAnyMetric;
};

export const validHabitReminders = (v: unknown): v is HabitReminderPreferences => {
  if (!object(v) || !num(v.updatedAt)) return false;
  if (
    typeof v.workoutEnabled !== 'boolean' ||
    !minuteOfDay(v.workoutMinute) ||
    typeof v.waterEnabled !== 'boolean' ||
    ![60, 120, 180].includes(v.waterIntervalMinutes) ||
    !minuteOfDay(v.waterStartMinute) ||
    !minuteOfDay(v.waterEndMinute) ||
    v.waterEndMinute <= v.waterStartMinute ||
    typeof v.mealsEnabled !== 'boolean' ||
    !minuteOfDay(v.breakfastMinute) ||
    !minuteOfDay(v.lunchMinute) ||
    !minuteOfDay(v.dinnerMinute) ||
    typeof v.weighInEnabled !== 'boolean' ||
    !minuteOfDay(v.weighInMinute) ||
    typeof v.weeklySummaryEnabled !== 'boolean' ||
    !Number.isInteger(v.weeklySummaryWeekday) ||
    v.weeklySummaryWeekday < 0 ||
    v.weeklySummaryWeekday > 6 ||
    !minuteOfDay(v.weeklySummaryMinute)
  ) {
    return false;
  }
  return true;
};

/** Optional fields preserve compatibility with older snapshots and backups. */
export function validPersonalSettings(s: Record<string, any>): boolean {
  return (s.stepGoal === undefined || (Number.isInteger(s.stepGoal) && s.stepGoal >= 100 && s.stepGoal <= 100_000)) &&
    (s.stepHistory === undefined || (Array.isArray(s.stepHistory) && s.stepHistory.length <= 4000 && s.stepHistory.every(validStepObservation))) &&
    (s.savedMeals === undefined || (Array.isArray(s.savedMeals) && s.savedMeals.length <= 500 && s.savedMeals.every(validSavedMeal))) &&
    (s.customRecipes === undefined || (Array.isArray(s.customRecipes) && s.customRecipes.length <= 200 && s.customRecipes.every(validCustomRecipe))) &&
    (s.weeklyPlan === undefined || (Array.isArray(s.weeklyPlan) && s.weeklyPlan.length <= 70 && s.weeklyPlan.every(validPlannedDay))) &&
    (s.bodyMeasurements === undefined || (Array.isArray(s.bodyMeasurements) && s.bodyMeasurements.length <= 1000 && s.bodyMeasurements.every(validBodyMeasurement))) &&
    (s.habitReminders === undefined || validHabitReminders(s.habitReminders));
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
export function mergeBodyMeasurements(items: BodyMeasurementEntry[]): BodyMeasurementEntry[] {
  return mergeBy(items, item => item.id);
}
export function mergePersonalSettings(base: AppSettings, sources: AppSettings[]): AppSettings {
  const steps = mergeStepObservations(sources.flatMap(s => s.stepHistory || []));
  const meals = mergeBy(sources.flatMap(s => s.savedMeals || []), x => x.id);
  const recipes = mergeBy(sources.flatMap(s => s.customRecipes || []), x => x.id);
  const plan = mergeBy(sources.flatMap(s => s.weeklyPlan || []), x => String(x.weekday));
  const measurements = mergeBodyMeasurements(sources.flatMap(s => s.bodyMeasurements || []));
  const remindersList = sources
    .map(s => s.habitReminders)
    .filter((r): r is HabitReminderPreferences => !!r && validHabitReminders(r));
  const mergedReminders = remindersList.length
    ? remindersList.reduce((best, r) => deterministicNewer(best, r))
    : undefined;
  // Never silently prune user data to fit cloud limits: fail closed instead.
  if (steps.length > 4000 || meals.length > 500 || recipes.length > 200 || plan.length > 7 || measurements.length > 1000) {
    throw new Error('Personal data exceeds the sync limit. Keep an encrypted backup.');
  }
  return {
    ...base,
    ...(steps.length ? { stepHistory: steps } : {}),
    ...(meals.length ? { savedMeals: meals } : {}),
    ...(recipes.length ? { customRecipes: recipes } : {}),
    ...(plan.length ? { weeklyPlan: plan } : {}),
    ...(measurements.length ? { bodyMeasurements: measurements } : {}),
    ...(mergedReminders ? { habitReminders: mergedReminders } : {}),
  };
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
