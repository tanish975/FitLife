import { LoggedMeal, WeightEntry } from '../data/types';

export interface DailyCaloriePoint {
  dateKey: string;
  label: string;
  shortDay: string;
  /** Null means no meals logged; 0 is retained when a zero-energy meal was logged. */
  calories: number | null;
}

export interface WeightChartPoint {
  dateKey: string;
  label: string;
  weightKg: number;
}

export function getDateKeyDaysAgo(daysAgo: number, baseDate = new Date()): string {
  const d = new Date(baseDate);
  // Local noon avoids moving to a neighboring date during DST transitions.
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return formatDateKey(d);
}

export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Calendar-day positions, not 24-hour intervals: no timezone/DST distortion. */
export function calendarDayNumber(dateKey: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) return null;
  return utc.getTime() / 86_400_000;
}

export function chartDateFractions(dateKeys: string[]): number[] {
  const dates = dateKeys.map(calendarDayNumber);
  if (dates.some(day => day === null)) throw new Error('A chart date is invalid.');
  if (!dates.length) return [];
  const numeric = dates as number[];
  const first = Math.min(...numeric), last = Math.max(...numeric);
  return numeric.map(day => first === last ? 0.5 : (day - first) / (last - first));
}

export function formatShortDateLabel(dateKey: string): { label: string; shortDay: string } {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const shortDay = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  return { label, shortDay };
}

/** Missing logging days are not evidence of zero food intake. */
export function aggregateDailyCalories(meals: LoggedMeal[], days = 14, baseDate = new Date()): DailyCaloriePoint[] {
  const byDate = new Map<string, number>();
  for (const meal of meals) {
    if (calendarDayNumber(meal.dateKey) !== null && Number.isFinite(meal.calories)) {
      byDate.set(meal.dateKey, (byDate.get(meal.dateKey) ?? 0) + meal.calories);
    }
  }
  const points: DailyCaloriePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dateKey = getDateKeyDaysAgo(i, baseDate);
    const { label, shortDay } = formatShortDateLabel(dateKey);
    points.push({ dateKey, label, shortDay, calories: byDate.has(dateKey) ? byDate.get(dateKey)! : null });
  }
  return points;
}

/** Last 14 distinct check-in days; latest timestamp on the same day wins. */
export function aggregateWeightTrend(entries: WeightEntry[], limit = 14): WeightChartPoint[] {
  const latestPerDay = new Map<string, WeightEntry>();
  for (const entry of entries) {
    if (calendarDayNumber(entry.dateKey) === null || !Number.isFinite(entry.weightKg) || !Number.isFinite(entry.timestamp)) continue;
    const existing = latestPerDay.get(entry.dateKey);
    if (!existing || entry.timestamp > existing.timestamp || (entry.timestamp === existing.timestamp && entry.id > existing.id)) {
      latestPerDay.set(entry.dateKey, entry);
    }
  }
  return Array.from(latestPerDay.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey)).slice(-limit)
    .map(entry => ({ dateKey: entry.dateKey, label: formatShortDateLabel(entry.dateKey).label, weightKg: entry.weightKg }));
}

/** Actual first and latest logs, never implied to be a 14-day change. */
export function weightLogComparison(entries: WeightEntry[]): { first: WeightEntry; latest: WeightEntry } | null {
  const valid = entries.filter(entry => calendarDayNumber(entry.dateKey) !== null && Number.isFinite(entry.weightKg) && Number.isFinite(entry.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp || a.dateKey.localeCompare(b.dateKey) || a.id.localeCompare(b.id));
  return valid.length >= 2 ? { first: valid[0], latest: valid[valid.length - 1] } : null;
}
