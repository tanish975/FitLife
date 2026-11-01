import { LoggedMeal, WeightEntry } from '../data/types';

export interface DailyCaloriePoint {
  dateKey: string;
  label: string; // e.g. "Oct 19"
  shortDay: string; // e.g. "Mon"
  calories: number;
}

export interface WeightChartPoint {
  dateKey: string;
  label: string;
  weightKg: number;
}

export function getDateKeyDaysAgo(daysAgo: number, baseDate = new Date()): string {
  const d = new Date(baseDate);
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

export function formatShortDateLabel(dateKey: string): { label: string; shortDay: string } {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const shortDay = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  return { label, shortDay };
}

/**
 * Aggregates the last 14 days of daily calorie totals for the Progress trend chart.
 */
export function aggregateDailyCalories(meals: LoggedMeal[], days = 14): DailyCaloriePoint[] {
  const byDate = new Map<string, number>();
  for (const m of meals) {
    byDate.set(m.dateKey, (byDate.get(m.dateKey) ?? 0) + m.calories);
  }

  const points: DailyCaloriePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dateKey = getDateKeyDaysAgo(i);
    const { label, shortDay } = formatShortDateLabel(dateKey);
    points.push({
      dateKey,
      label,
      shortDay,
      calories: byDate.get(dateKey) ?? 0,
    });
  }
  return points;
}

/**
 * Returns the last 14 logged weight entries in chronological order.
 */
export function aggregateWeightTrend(entries: WeightEntry[], limit = 14): WeightChartPoint[] {
  // Deduplicate by dateKey (latest entry per day wins)
  const latestPerDay = new Map<string, WeightEntry>();
  for (const entry of entries) {
    const existing = latestPerDay.get(entry.dateKey);
    if (!existing || entry.timestamp >= existing.timestamp) {
      latestPerDay.set(entry.dateKey, entry);
    }
  }

  const sorted = Array.from(latestPerDay.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const sliced = sorted.slice(-limit);

  return sliced.map((e) => ({
    dateKey: e.dateKey,
    label: formatShortDateLabel(e.dateKey).label,
    weightKg: e.weightKg,
  }));
}
