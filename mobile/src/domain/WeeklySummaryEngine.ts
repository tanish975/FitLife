import {
  GamificationSummary,
  LoggedMeal,
  LoggedWorkout,
  MacroTargets,
  MoodEntry,
  WeightEntry,
  WeightUnit,
} from '../data/types';
import {
  DEFAULT_HABIT_REMINDERS,
  HabitReminderPreferences,
} from './PersonalFeatures';
import {
  computeWeeklyWeightTrend,
  formatLocalDateKey,
  getDateKeyDaysAgo,
  shiftDateKey,
  shortDateLabel,
  WeeklyWeightTrendSummary,
} from './ProgressAggregator';
import { minuteTime } from './Reminders';
import { formatWeight, toDisplayWeight } from './WeightConverter';

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface ConsistencyDayStatus {
  dateKey: string;
  weekdayShort: string;
  dayOfMonth: number;
  loggedMeal: boolean;
  loggedWorkout: boolean;
  loggedMood: boolean;
  isActive: boolean;
  isToday: boolean;
}

export interface WeeklySummaryDigest {
  weekEndDateKey: string;
  weekStartDateKey: string;
  weekRangeLabel: string;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  mealDaysLogged: number;
  totalMealsLogged: number;
  avgDailyCalories: number | null;
  avgDailyProteinG: number | null;
  workoutsCompleted: number;
  workoutDaysLogged: number;
  weeklyWorkoutGoal: number;
  totalSets: number;
  weightTrend: WeeklyWeightTrendSummary;
  weeklyWeightAvgLabel: string | null;
  weeklyWeightDeltaLabel: string | null;
  focusHeadline: string;
  focusDetail: string;
  notificationTitle: string;
  notificationBody: string;
}

export type HabitNotificationKind =
  | 'workout'
  | 'water'
  | 'meal_breakfast'
  | 'meal_lunch'
  | 'meal_dinner'
  | 'weigh_in'
  | 'weekly_summary';

export interface DueHabitNotification {
  key: string;
  kind: HabitNotificationKind;
  scheduledTimeLabel: string;
  title: string;
  body: string;
  actionTab: 'dashboard' | 'meals' | 'workouts' | 'progress';
}

export function computeConsistencyStrip(
  meals: LoggedMeal[],
  workouts: LoggedWorkout[],
  moods: MoodEntry[],
  days = 7,
  referenceDateKey?: string
): ConsistencyDayStatus[] {
  const ref = referenceDateKey ?? getDateKeyDaysAgo(0);
  const mealDays = new Set(meals.map((m) => m.dateKey));
  const workoutDays = new Set(workouts.map((w) => w.dateKey));
  const moodDays = new Set(moods.map((m) => m.dateKey));

  const out: ConsistencyDayStatus[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dateKey = shiftDateKey(ref, -i);
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const loggedMeal = mealDays.has(dateKey);
    const loggedWorkout = workoutDays.has(dateKey);
    const loggedMood = moodDays.has(dateKey);
    out.push({
      dateKey,
      weekdayShort: WEEKDAY_SHORT[dt.getDay()],
      dayOfMonth: d,
      loggedMeal,
      loggedWorkout,
      loggedMood,
      isActive: loggedMeal || loggedWorkout || loggedMood,
      isToday: dateKey === ref,
    });
  }
  return out;
}

export function buildWeeklySummaryDigest(params: {
  meals: LoggedMeal[];
  workouts: LoggedWorkout[];
  moods: MoodEntry[];
  weights: WeightEntry[];
  gamification: GamificationSummary;
  macroTargets: MacroTargets | null;
  weeklyWorkoutGoal: number;
  weightUnit: WeightUnit;
  referenceDateKey?: string;
}): WeeklySummaryDigest {
  const ref = params.referenceDateKey ?? getDateKeyDaysAgo(0);
  const weekStartDateKey = shiftDateKey(ref, -6);
  const windowSet = new Set<string>();
  for (let i = 6; i >= 0; i--) {
    windowSet.add(shiftDateKey(ref, -i));
  }

  const weekRangeLabel = `${shortDateLabel(weekStartDateKey)} – ${shortDateLabel(ref)}`;
  const strip = computeConsistencyStrip(
    params.meals,
    params.workouts,
    params.moods,
    7,
    ref
  );
  const activeDays = strip.filter((d) => d.isActive).length;

  const weekMeals = params.meals.filter((m) => windowSet.has(m.dateKey));
  const caloriesByDay = new Map<string, number>();
  const proteinByDay = new Map<string, number>();
  for (const m of weekMeals) {
    caloriesByDay.set(m.dateKey, (caloriesByDay.get(m.dateKey) ?? 0) + m.calories);
    proteinByDay.set(m.dateKey, (proteinByDay.get(m.dateKey) ?? 0) + m.proteinG);
  }
  const mealDaysLogged = caloriesByDay.size;
  const avgDailyCalories =
    mealDaysLogged > 0
      ? Math.round(
          [...caloriesByDay.values()].reduce((s, v) => s + v, 0) / mealDaysLogged
        )
      : null;
  const avgDailyProteinG =
    mealDaysLogged > 0
      ? Math.round(
          ([...proteinByDay.values()].reduce((s, v) => s + v, 0) / mealDaysLogged) * 10
        ) / 10
      : null;

  const weekWorkouts = params.workouts.filter((w) => windowSet.has(w.dateKey));
  const workoutsCompleted = weekWorkouts.length;
  const workoutDaysLogged = new Set(weekWorkouts.map((w) => w.dateKey)).size;
  const totalSets = weekWorkouts.reduce((s, w) => s + w.sets, 0);

  const weightTrend = computeWeeklyWeightTrend(
    params.weights,
    params.weightUnit,
    ref
  );
  const weeklyWeightAvgLabel =
    weightTrend.currentWeekAvgKg !== null
      ? formatWeight(weightTrend.currentWeekAvgKg, params.weightUnit)
      : null;

  let weeklyWeightDeltaLabel: string | null = null;
  if (weightTrend.weeklyTrendDeltaKg !== null) {
    const absDisp = toDisplayWeight(
      Math.abs(weightTrend.weeklyTrendDeltaKg),
      params.weightUnit
    );
    const sign =
      weightTrend.weeklyTrendDeltaKg > 0
        ? '+'
        : weightTrend.weeklyTrendDeltaKg < 0
        ? '−'
        : '';
    weeklyWeightDeltaLabel = `${sign}${absDisp.toFixed(1)} ${params.weightUnit} vs last week`;
  }

  let focusHeadline = 'Steady habits beat perfection';
  let focusDetail =
    'Aim for regular meals, hydration, and planned movement this coming week.';

  if (workoutsCompleted >= params.weeklyWorkoutGoal && activeDays >= 5) {
    focusHeadline = 'Strong training & logging consistency';
    focusDetail = `You hit ${workoutsCompleted}/${params.weeklyWorkoutGoal} workout sessions and stayed active ${activeDays}/7 days. Keep recovery and sleep steady.`;
  } else if (workoutsCompleted < params.weeklyWorkoutGoal) {
    const remaining = params.weeklyWorkoutGoal - workoutsCompleted;
    focusHeadline = 'Protect your training slots next week';
    focusDetail = `You logged ${workoutsCompleted} of ${params.weeklyWorkoutGoal} planned workouts (${remaining} shy of goal). Pre-pick ${params.weeklyWorkoutGoal} days in Workouts.`;
  } else if (
    params.macroTargets &&
    avgDailyProteinG !== null &&
    avgDailyProteinG < params.macroTargets.proteinG * 0.8
  ) {
    focusHeadline = 'Anchor each meal with a protein source';
    focusDetail = `Logged meals averaged ${avgDailyProteinG}g protein vs your ${params.macroTargets.proteinG}g daily target. Adding dal/paneer/curd/eggs/chicken early helps.`;
  } else if (weightTrend.currentWeekDaysLogged < 2) {
    focusHeadline = 'Add 2–3 morning weigh-ins for a true trend';
    focusDetail =
      'Never react to one day’s scale weight — 2–3 morning check-ins smooth out water and sodium noise.';
  }

  const summaryParts: string[] = [
    `${activeDays}/7 active days (${params.gamification.currentStreak}d streak)`,
    `${workoutsCompleted}/${params.weeklyWorkoutGoal} workouts`,
  ];
  if (avgDailyCalories !== null) {
    summaryParts.push(`${avgDailyCalories} kcal/d avg`);
  }
  if (weeklyWeightAvgLabel) {
    summaryParts.push(
      `7d weight avg ${weeklyWeightAvgLabel}${
        weeklyWeightDeltaLabel ? ` (${weeklyWeightDeltaLabel})` : ''
      }`
    );
  }

  return {
    weekEndDateKey: ref,
    weekStartDateKey,
    weekRangeLabel,
    activeDays,
    currentStreak: params.gamification.currentStreak,
    longestStreak: params.gamification.longestStreak,
    mealDaysLogged,
    totalMealsLogged: weekMeals.length,
    avgDailyCalories,
    avgDailyProteinG,
    workoutsCompleted,
    workoutDaysLogged,
    weeklyWorkoutGoal: params.weeklyWorkoutGoal,
    totalSets,
    weightTrend,
    weeklyWeightAvgLabel,
    weeklyWeightDeltaLabel,
    focusHeadline,
    focusDetail,
    notificationTitle: `Weekly Summary · ${weekRangeLabel}`,
    notificationBody: summaryParts.join(' · '),
  };
}

/**
 * Pure, deterministic evaluator for local daily reminders + weekly summary notifications.
 * Uses bounded delivery windows (90 min for daily slots, 6 hours for weekly digest)
 * and idempotent keys so missed slots never replay in bursts.
 */
export function evaluateDueHabitNotifications(params: {
  prefs?: HabitReminderPreferences;
  now: Date;
  alreadyDeliveredKeys: ReadonlySet<string>;
  hasNativeWorkoutWater?: boolean;
  loggedWorkoutToday: boolean;
  loggedBreakfastToday: boolean;
  loggedLunchToday: boolean;
  loggedDinnerToday: boolean;
  loggedWeightToday: boolean;
  waterTodayMl: number;
  waterGoalMl: number;
  weeklyDigest: WeeklySummaryDigest;
}): DueHabitNotification[] {
  const prefs = params.prefs ?? DEFAULT_HABIT_REMINDERS;
  const dateKey = formatLocalDateKey(params.now);
  const nowMin = params.now.getHours() * 60 + params.now.getMinutes();
  const weekday = params.now.getDay();
  const due: DueHabitNotification[] = [];

  const inDailyWindow = (slotMin: number) => nowMin >= slotMin && nowMin <= slotMin + 90;

  // 1. Weekly Summary Notification (delivered on configured weekday at/after configured minute, within 6h window)
  if (
    prefs.weeklySummaryEnabled &&
    weekday === prefs.weeklySummaryWeekday &&
    nowMin >= prefs.weeklySummaryMinute &&
    nowMin <= Math.min(1439, prefs.weeklySummaryMinute + 360)
  ) {
    const key = `weekly_summary:${dateKey}`;
    if (!params.alreadyDeliveredKeys.has(key)) {
      due.push({
        key,
        kind: 'weekly_summary',
        scheduledTimeLabel: `${WEEKDAY_SHORT[weekday]} ${minuteTime(prefs.weeklySummaryMinute)}`,
        title: params.weeklyDigest.notificationTitle,
        body: params.weeklyDigest.notificationBody,
        actionTab: 'progress',
      });
    }
  }

  // 2. Daily Workout Reminder (skip on Android when native AlarmManager owns workout reminders, or if already worked out)
  if (
    !params.hasNativeWorkoutWater &&
    prefs.workoutEnabled &&
    !params.loggedWorkoutToday &&
    inDailyWindow(prefs.workoutMinute)
  ) {
    const key = `workout:${dateKey}`;
    if (!params.alreadyDeliveredKeys.has(key)) {
      due.push({
        key,
        kind: 'workout',
        scheduledTimeLabel: minuteTime(prefs.workoutMinute),
        title: 'Time to move',
        body: 'Ready for today’s training session? Even 15 minutes keeps your streak alive.',
        actionTab: 'workouts',
      });
    }
  }

  // 3. Daily Water Check-in (interval slots within start..end window, skipped if goal met or native owns water)
  if (
    !params.hasNativeWorkoutWater &&
    prefs.waterEnabled &&
    (params.waterGoalMl <= 0 || params.waterTodayMl < params.waterGoalMl) &&
    nowMin >= prefs.waterStartMinute &&
    nowMin <= prefs.waterEndMinute
  ) {
    const elapsed = nowMin - prefs.waterStartMinute;
    const slotIndex = Math.floor(elapsed / prefs.waterIntervalMinutes);
    const slotMinute = prefs.waterStartMinute + slotIndex * prefs.waterIntervalMinutes;
    if (nowMin - slotMinute <= 30) {
      const key = `water:${dateKey}:${slotMinute}`;
      if (!params.alreadyDeliveredKeys.has(key)) {
        due.push({
          key,
          kind: 'water',
          scheduledTimeLabel: minuteTime(slotMinute),
          title: 'Hydration check-in',
          body:
            params.waterGoalMl > 0
              ? `${params.waterTodayMl} / ${params.waterGoalMl} ml logged today — grab a glass of water.`
              : 'Grab a glass of water and log it when ready.',
          actionTab: 'dashboard',
        });
      }
    }
  }

  // 4. Daily Meal Logging Reminders (Breakfast / Lunch / Dinner)
  if (prefs.mealsEnabled) {
    const mealSlots: {
      kind: 'meal_breakfast' | 'meal_lunch' | 'meal_dinner';
      minute: number;
      done: boolean;
      label: string;
    }[] = [
      {
        kind: 'meal_breakfast',
        minute: prefs.breakfastMinute,
        done: params.loggedBreakfastToday,
        label: 'Breakfast',
      },
      {
        kind: 'meal_lunch',
        minute: prefs.lunchMinute,
        done: params.loggedLunchToday,
        label: 'Lunch',
      },
      {
        kind: 'meal_dinner',
        minute: prefs.dinnerMinute,
        done: params.loggedDinnerToday,
        label: 'Dinner',
      },
    ];
    for (const slot of mealSlots) {
      if (!slot.done && inDailyWindow(slot.minute)) {
        const key = `${slot.kind}:${dateKey}`;
        if (!params.alreadyDeliveredKeys.has(key)) {
          due.push({
            key,
            kind: slot.kind,
            scheduledTimeLabel: minuteTime(slot.minute),
            title: `${slot.label} check-in`,
            body: `Log your ${slot.label.toLowerCase()} (try natural language like "2 roti, 1 katori dal").`,
            actionTab: 'meals',
          });
        }
      }
    }
  }

  // 5. Morning Weigh-in Reminder (always reinforces weekly trend mindset!)
  if (
    prefs.weighInEnabled &&
    !params.loggedWeightToday &&
    inDailyWindow(prefs.weighInMinute)
  ) {
    const key = `weigh_in:${dateKey}`;
    if (!params.alreadyDeliveredKeys.has(key)) {
      due.push({
        key,
        kind: 'weigh_in',
        scheduledTimeLabel: minuteTime(prefs.weighInMinute),
        title: 'Morning weigh-in check',
        body: 'Log one calm morning reading — FitLife tracks your 7-day weekly average, never single-day noise.',
        actionTab: 'progress',
      });
    }
  }

  return due;
}
