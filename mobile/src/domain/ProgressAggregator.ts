import { LoggedMeal, LoggedWorkout, WeightEntry, WeightUnit } from '../data/types';
import type { BodyMeasurementEntry } from './PersonalFeatures';
import { canUseAdultBmiCategories } from './AgeSafety';
import { LengthUnit, toDisplayLength, toDisplayWeight } from './WeightConverter';

export interface DailyDataPoint {
  dateKey: string;
  label: string;
  value: number | null;
}

export interface WeeklyWeightTrendSummary {
  referenceDateKey: string;
  currentWeekAvgKg: number | null;
  currentWeekDaysLogged: number;
  currentWeekMinKg: number | null;
  currentWeekMaxKg: number | null;
  previousWeekAvgKg: number | null;
  previousWeekDaysLogged: number;
  /** Difference: currentWeekAvgKg - previousWeekAvgKg (null unless both 7d windows have >=1 log). */
  weeklyTrendDeltaKg: number | null;
  /** Latest single-day weight minus currentWeekAvgKg when >=2 days logged this week. */
  latestVsWeeklyAvgKg: number | null;
  latestEntryDateKey: string | null;
  latestEntryWeightKg: number | null;
  trendDirection: 'down' | 'up' | 'steady' | 'insufficient_data';
  coachingHeadline: string;
  coachingBody: string;
}

export type BodyMeasurementMetricKey =
  | 'waistCm'
  | 'hipsCm'
  | 'chestCm'
  | 'neckCm'
  | 'armCm'
  | 'thighCm'
  | 'bodyFatPct';

export function formatLocalDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function shiftDateKey(baseDateKey: string, deltaDays: number): string {
  const [y, m, d] = baseDateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  return formatLocalDateKey(dt);
}

/**
 * Generates YYYY-MM-DD string for N days ago in local timezone.
 */
export function getDateKeyDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return formatLocalDateKey(d);
}

export function shortDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Backwards-compatible alias: returns { shortDay } for a date key. */
export function formatShortDateLabel(dateKey: string): { shortDay: string } {
  return { shortDay: shortDateLabel(dateKey) };
}

/** Converts a Date object to a YYYY-MM-DD date key. */
export function formatDateKey(date: Date): string {
  return formatLocalDateKey(date);
}

function buildDateWindow(days: number, referenceDateKey?: string): string[] {
  const ref = referenceDateKey ?? getDateKeyDaysAgo(0);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(shiftDateKey(ref, -i));
  }
  return keys;
}

/**
 * Latest weigh-in per calendar day, sorted chronologically.
 * Multiple weigh-ins on one day are retained in storage; daily aggregation uses the latest timestamp.
 */
export function groupLatestDailyWeights(weights: WeightEntry[]): Map<string, WeightEntry> {
  const byDate = new Map<string, WeightEntry>();
  for (const w of weights) {
    if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(w.dateKey) || !Number.isFinite(w.weightKg) || w.weightKg <= 0) {
      continue;
    }
    const existing = byDate.get(w.dateKey);
    if (!existing || w.timestamp >= existing.timestamp) {
      byDate.set(w.dateKey, w);
    }
  }
  return byDate;
}

/**
 * Computes the 7-day Weekly Weight-Trend Average and week-over-week change.
 * Core principle: NEVER react to a single day's scale reading — hydration, glycogen,
 * dietary sodium, and gut transit routinely move daily body weight by 0.5–1.5 kg.
 */
export function computeWeeklyWeightTrend(
  weights: WeightEntry[],
  unit: WeightUnit = 'kg',
  referenceDateKey?: string
): WeeklyWeightTrendSummary {
  const ref = referenceDateKey ?? getDateKeyDaysAgo(0);
  const daily = groupLatestDailyWeights(weights);

  const currentWindowKeys = buildDateWindow(7, ref); // [ref-6 .. ref]
  const prevRef = shiftDateKey(ref, -7);
  const previousWindowKeys = buildDateWindow(7, prevRef); // [ref-13 .. ref-7]

  const currentValues = currentWindowKeys
    .map((k) => daily.get(k)?.weightKg)
    .filter((v): v is number => v !== undefined);

  const previousValues = previousWindowKeys
    .map((k) => daily.get(k)?.weightKg)
    .filter((v): v is number => v !== undefined);

  const mean = (arr: number[]): number | null =>
    arr.length > 0
      ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100
      : null;

  const currentWeekAvgKg = mean(currentValues);
  const previousWeekAvgKg = mean(previousValues);

  const weeklyTrendDeltaKg =
    currentWeekAvgKg !== null && previousWeekAvgKg !== null
      ? Math.round((currentWeekAvgKg - previousWeekAvgKg) * 100) / 100
      : null;

  const sortedEntries = [...daily.values()].sort((a, b) =>
    a.dateKey !== b.dateKey ? a.dateKey.localeCompare(b.dateKey) : a.timestamp - b.timestamp
  );
  const latestEntry = sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1] : null;

  const latestVsWeeklyAvgKg =
    latestEntry &&
    currentWeekAvgKg !== null &&
    currentValues.length >= 2 &&
    currentWindowKeys.includes(latestEntry.dateKey)
      ? Math.round((latestEntry.weightKg - currentWeekAvgKg) * 100) / 100
      : null;

  let trendDirection: WeeklyWeightTrendSummary['trendDirection'] = 'insufficient_data';
  if (weeklyTrendDeltaKg !== null) {
    if (Math.abs(weeklyTrendDeltaKg) < 0.15) {
      trendDirection = 'steady';
    } else {
      trendDirection = weeklyTrendDeltaKg < 0 ? 'down' : 'up';
    }
  }

  const fmtSigned = (deltaKg: number) => {
    const disp = toDisplayWeight(Math.abs(deltaKg), unit);
    const sign = deltaKg > 0 ? '+' : deltaKg < 0 ? '−' : '';
    return `${sign}${disp.toFixed(1)} ${unit}`;
  };

  let coachingHeadline = 'Never react to one day’s weight';
  let coachingBody =
    'Water, glycogen, sodium, and digestion shift single-day scale readings overnight. Log 2–4 morning weigh-ins per week and judge your 7-day average.';

  if (currentWeekAvgKg !== null && currentValues.length >= 2 && weeklyTrendDeltaKg !== null) {
    if (
      latestVsWeeklyAvgKg !== null &&
      Math.abs(latestVsWeeklyAvgKg) >= 0.25 &&
      Math.sign(latestVsWeeklyAvgKg) !== Math.sign(weeklyTrendDeltaKg) &&
      trendDirection !== 'steady'
    ) {
      coachingHeadline = 'Daily bounce vs steady weekly trend';
      coachingBody = `Your latest weigh-in sits ${fmtSigned(
        latestVsWeeklyAvgKg
      )} from this week’s 7-day average — normal fluid/glycogen noise. Week-over-week your 7-day average is ${fmtSigned(
        weeklyTrendDeltaKg
      )}.`;
    } else if (trendDirection === 'steady') {
      coachingHeadline = '7-day weight trend is holding steady';
      coachingBody = `Your 7-day average changed by just ${fmtSigned(
        weeklyTrendDeltaKg
      )} vs last week across ${currentValues.length} check-ins. Ignore day-to-day bumps.`;
    } else {
      coachingHeadline = `7-day trend: ${fmtSigned(weeklyTrendDeltaKg)} vs prior week`;
      coachingBody = `Averaged across ${currentValues.length} check-in${
        currentValues.length === 1 ? '' : 's'
      } this week vs ${previousValues.length} last week — smoothing out single-day water fluctuations.`;
    }
  } else if (currentWeekAvgKg !== null && currentValues.length === 1) {
    coachingHeadline = 'One weigh-in logged in the last 7 days';
    coachingBody =
      'One day is just a snapshot, not a trend. Add 1–2 more morning weigh-ins this week before drawing any nutrition conclusions.';
  }

  return {
    referenceDateKey: ref,
    currentWeekAvgKg,
    currentWeekDaysLogged: currentValues.length,
    currentWeekMinKg: currentValues.length > 0 ? Math.min(...currentValues) : null,
    currentWeekMaxKg: currentValues.length > 0 ? Math.max(...currentValues) : null,
    previousWeekAvgKg,
    previousWeekDaysLogged: previousValues.length,
    weeklyTrendDeltaKg,
    latestVsWeeklyAvgKg,
    latestEntryDateKey: latestEntry?.dateKey ?? null,
    latestEntryWeightKg: latestEntry?.weightKg ?? null,
    trendDirection,
    coachingHeadline,
    coachingBody,
  };
}

/**
 * Aggregates daily calorie intake for the past N days.
 * Unlogged days remain null (never fabricated as 0 kcal).
 */
export function aggregateDailyCalories(
  meals: LoggedMeal[],
  days = 14,
  referenceDateKey?: string
): DailyDataPoint[] {
  const byDate = new Map<string, number>();
  for (const m of meals) {
    byDate.set(m.dateKey, (byDate.get(m.dateKey) ?? 0) + m.calories);
  }

  return buildDateWindow(days, referenceDateKey).map((dateKey) => ({
    dateKey,
    label: shortDateLabel(dateKey),
    value: byDate.has(dateKey) ? Math.round(byDate.get(dateKey)!) : null,
  }));
}

/**
 * Aggregates daily protein intake (g) for the past N days.
 * Unlogged meal days remain null.
 */
export function aggregateDailyProtein(
  meals: LoggedMeal[],
  days = 14,
  referenceDateKey?: string
): DailyDataPoint[] {
  const byDate = new Map<string, number>();
  for (const m of meals) {
    byDate.set(m.dateKey, (byDate.get(m.dateKey) ?? 0) + m.proteinG);
  }

  return buildDateWindow(days, referenceDateKey).map((dateKey) => ({
    dateKey,
    label: shortDateLabel(dateKey),
    value: byDate.has(dateKey) ? Math.round(byDate.get(dateKey)! * 10) / 10 : null,
  }));
}

/**
 * Aggregates daily workout sets for the past N days.
 * Days without logged workouts remain null so rest days aren't misread as zero-effort failures.
 */
export function aggregateDailyWorkoutSets(
  workouts: LoggedWorkout[],
  days = 14,
  referenceDateKey?: string
): DailyDataPoint[] {
  const byDate = new Map<string, number>();
  for (const w of workouts) {
    byDate.set(w.dateKey, (byDate.get(w.dateKey) ?? 0) + w.sets);
  }

  return buildDateWindow(days, referenceDateKey).map((dateKey) => ({
    dateKey,
    label: shortDateLabel(dateKey),
    value: byDate.has(dateKey) ? byDate.get(dateKey)! : null,
  }));
}

/**
 * Aggregates daily weight entries over a calendar-day window, converted to the active display unit.
 * Unlogged days remain null so spacing reflects real calendar days without fabricated readings.
 */
export function aggregateWeightSeries(
  weights: WeightEntry[],
  unit: WeightUnit,
  days = 14,
  referenceDateKey?: string
): DailyDataPoint[] {
  const byDate = groupLatestDailyWeights(weights);
  return buildDateWindow(days, referenceDateKey).map((dateKey) => {
    const entry = byDate.get(dateKey);
    return {
      dateKey,
      label: shortDateLabel(dateKey),
      value: entry ? toDisplayWeight(entry.weightKg, unit) : null,
    };
  });
}

/**
 * Trailing 7-day rolling weight average across a calendar-day window.
 * A point is emitted for day D when at least one real weigh-in occurred inside [D-6 .. D];
 * otherwise null (never extrapolated from stale history >7 days old).
 */
export function aggregateRolling7DayWeightSeries(
  weights: WeightEntry[],
  unit: WeightUnit,
  days = 14,
  referenceDateKey?: string
): DailyDataPoint[] {
  const byDate = groupLatestDailyWeights(weights);
  return buildDateWindow(days, referenceDateKey).map((dateKey) => {
    const samples: number[] = [];
    for (let k = 0; k < 7; k++) {
      const entry = byDate.get(shiftDateKey(dateKey, -k));
      if (entry) samples.push(entry.weightKg);
    }
    if (samples.length === 0) {
      return { dateKey, label: shortDateLabel(dateKey), value: null };
    }
    const avgKg = samples.reduce((s, v) => s + v, 0) / samples.length;
    return {
      dateKey,
      label: shortDateLabel(dateKey),
      value: toDisplayWeight(avgKg, unit),
    };
  });
}

/**
 * Aggregates a body measurement metric (e.g. waist, hips, chest, arm, thigh, bodyFatPct)
 * across a calendar-day window, converting length metrics to cm or in.
 */
export function aggregateBodyMeasurementSeries(
  entries: BodyMeasurementEntry[],
  metric: BodyMeasurementMetricKey,
  lengthUnit: LengthUnit,
  days = 28,
  referenceDateKey?: string
): DailyDataPoint[] {
  const active = entries.filter((e) => !e.deleted && e[metric] !== undefined);
  const byDate = new Map<string, BodyMeasurementEntry>();
  for (const e of active) {
    const prev = byDate.get(e.dateKey);
    if (!prev || e.updatedAt >= prev.updatedAt) {
      byDate.set(e.dateKey, e);
    }
  }

  return buildDateWindow(days, referenceDateKey).map((dateKey) => {
    const entry = byDate.get(dateKey);
    const raw = entry?.[metric];
    if (raw === undefined || !Number.isFinite(raw)) {
      return { dateKey, label: shortDateLabel(dateKey), value: null };
    }
    const value =
      metric === 'bodyFatPct'
        ? Math.round(raw * 10) / 10
        : toDisplayLength(raw, lengthUnit);
    return {
      dateKey,
      label: shortDateLabel(dateKey),
      value,
    };
  });
}

/**
 * Evenly spaced x-axis fractions for N calendar-date keys, used by LineChart
 * so unlogged days still occupy their correct calendar position.
 */
export function chartDateFractions(dateKeys: string[]): number[] {
  if (dateKeys.length === 0) return [];
  if (dateKeys.length === 1) return [0.5];
  return dateKeys.map((_, i) => i / (dateKeys.length - 1));
}

/**
 * Adult Waist-to-Height Ratio (WHtR = waistCm / heightCm).
 * Adult category guidance is gated to ages >= 20, matching adult BMI safety policy.
 */
export function computeWaistToHeightRatio(
  waistCm: number | undefined,
  heightCm: number,
  age: number
): { ratio: number; adultCategory: string | null } | null {
  if (
    waistCm === undefined ||
    !Number.isFinite(waistCm) ||
    !Number.isFinite(heightCm) ||
    waistCm <= 0 ||
    heightCm <= 0
  ) {
    return null;
  }
  const ratio = Math.round((waistCm / heightCm) * 100) / 100;
  if (!canUseAdultBmiCategories(age)) {
    return { ratio, adultCategory: null };
  }
  const adultCategory =
    ratio < 0.4
      ? 'Slender range (<0.40)'
      : ratio < 0.5
      ? 'Healthy central range (0.40–0.49)'
      : ratio < 0.6
      ? 'Elevated central range (0.50–0.59)'
      : 'High central range (≥0.60)';
  return { ratio, adultCategory };
}
