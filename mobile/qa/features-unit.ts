import assert from 'node:assert/strict';
import {
  computeWeeklyWeightTrend,
  aggregateDailyCalories,
  aggregateDailyProtein,
  aggregateWeightSeries,
  aggregateRolling7DayWeightSeries,
  computeWaistToHeightRatio,
  chartDateFractions,
  getDateKeyDaysAgo,
  shiftDateKey,
  formatLocalDateKey,
} from '../src/domain/ProgressAggregator';
import {
  analyzeNaturalLanguageMeal,
  evaluateNaturalLanguageItem,
} from '../src/domain/NaturalLanguageMealLogger';
import {
  buildWeeklySummaryDigest,
  computeConsistencyStrip,
  evaluateDueHabitNotifications,
} from '../src/domain/WeeklySummaryEngine';
import { DEFAULT_HABIT_REMINDERS, type HabitReminderPreferences } from '../src/domain/PersonalFeatures';
import type { LoggedMeal, LoggedWorkout, WeightEntry, MoodEntry, MacroTargets } from '../data/types';
import { toDisplayWeight } from '../src/domain/WeightConverter';

// ---------- Weekly weight trend ----------
const weights: WeightEntry[] = [
  { id: 'w1', dateKey: '2026-10-19', timestamp: 1, weightKg: 70.0 },
  { id: 'w2', dateKey: '2026-10-20', timestamp: 2, weightKg: 70.0 },
  { id: 'w3', dateKey: '2026-10-21', timestamp: 3, weightKg: 70.0 },
  { id: 'w4', dateKey: '2026-10-22', timestamp: 4, weightKg: 70.0 },
  { id: 'w5', dateKey: '2026-10-23', timestamp: 5, weightKg: 70.0 },
  { id: 'w6', dateKey: '2026-10-24', timestamp: 6, weightKg: 70.0 },
  { id: 'w7', dateKey: '2026-10-25', timestamp: 7, weightKg: 70.0 },
  { id: 'w8', dateKey: '2026-10-26', timestamp: 8, weightKg: 70.0 },
  { id: 'w9', dateKey: '2026-10-27', timestamp: 9, weightKg: 70.0 },
  { id: 'w10', dateKey: '2026-10-28', timestamp: 10, weightKg: 70.0 },
  { id: 'w11', dateKey: '2026-10-29', timestamp: 11, weightKg: 70.0 },
  { id: 'w12', dateKey: '2026-10-30', timestamp: 12, weightKg: 70.0 },
  { id: 'w13', dateKey: '2026-10-31', timestamp: 13, weightKg: 70.0 },
  { id: 'w14', dateKey: '2026-11-01', timestamp: 14, weightKg: 70.0 },
];

const trend = computeWeeklyWeightTrend(weights, 'kg', '2026-11-01');
assert.equal(trend.referenceDateKey, '2026-11-01');
assert.equal(trend.currentWeekDaysLogged, 7);
assert(trend.currentWeekAvgKg !== null && trend.currentWeekAvgKg > 0, '7-day average exists');
assert.equal(trend.trendDirection, 'steady', 'steady trend for flat week');
assert.equal(trend.coachingHeadline, '7-day weight trend is holding steady', 'steady coaching headline');
assert(trend.coachingBody.includes('Ignore'), 'coaching mentions not reacting to one day');

// No weights: insufficient data
const emptyTrend = computeWeeklyWeightTrend([], 'kg', '2026-11-01');
assert.equal(emptyTrend.trendDirection, 'insufficient_data');
assert.equal(emptyTrend.currentWeekAvgKg, null);

// ---------- Daily aggregates ----------
const meals: LoggedMeal[] = [
  { id: 'm1', dateKey: '2026-10-30', timestamp: 1, name: 'Breakfast', servingLabel: '1 bowl', calories: 300, proteinG: 15, carbsG: 40, fatG: 10, fiberG: 5, category: 'Breakfast' },
  { id: 'm2', dateKey: '2026-10-30', timestamp: 2, name: 'Lunch', servingLabel: '1 plate', calories: 500, proteinG: 25, carbsG: 60, fatG: 15, fiberG: 8, category: 'Lunch' },
  { id: 'm3', dateKey: '2026-11-01', timestamp: 8, name: 'Dinner', servingLabel: '1 plate', calories: 400, proteinG: 20, carbsG: 45, fatG: 12, fiberG: 6, category: 'Dinner' },
];

const cals = aggregateDailyCalories(meals, 14, '2026-11-01');
assert.equal(cals.length, 14);
const nov1 = cals.find(p => p.dateKey === '2026-11-01');
assert.equal(nov1?.calories, 400, 'Nov 1 has 400 kcal');
const nov2 = cals.find(p => p.dateKey === '2026-10-30');
assert.equal(nov2?.calories, 800, 'Oct 30 has 800 kcal');
const unlogged = cals.find(p => p.dateKey === '2026-10-29');
assert.equal(unlogged?.calories, null, 'unlogged days are null, not zero');

const prots = aggregateDailyProtein(meals, 14, '2026-11-01');
const nov1Prot = prots.find(p => p.dateKey === '2026-11-01');
assert.equal(nov1Prot?.calories, 20, 'Nov 1 has 20g protein');

// ---------- Weight series ----------
const ws = aggregateWeightSeries(weights, 'kg', 14, '2026-11-01');
const wsNov1 = ws.find(p => p.dateKey === '2026-11-01');
assert.equal(wsNov1?.calories, 70, 'Nov 1 weight is 70 kg');


// ---------- Rolling 7-day ----------
const roll7 = aggregateRolling7DayWeightSeries(weights, 'kg', 14, '2026-11-01');
const rollNov1 = roll7.find(p => p.dateKey === '2026-11-01');
assert(rollNov1!.calories !== null && rollNov1!.calories > 0, 'rolling 7-day average exists for Nov 1');

// ---------- Waist-to-height ----------
const whtr = computeWaistToHeightRatio(80, 170, 30);
assert(whtr !== null, 'WHtR computed for adult');
assert(Math.abs(whtr!.ratio - 0.47) < 0.01, 'WHtR ≈ 0.47');
assert(whtr!.adultCategory !== null, 'adult category for age 30');

const whtrTeen = computeWaistToHeightRatio(80, 170, 16);
assert(whtrTeen !== null, 'WHtR computed for teen');
assert.equal(whtrTeen!.adultCategory, null, 'no adult category under 20');

// ---------- Date helpers ----------
assert.equal(shiftDateKey('2026-11-01', -7), '2026-10-25', 'shift back 7 days');
assert.equal(shiftDateKey('2026-01-01', -1), '2025-12-31', 'year boundary');
assert.equal(formatLocalDateKey(new Date('2026-11-09T00:00:00')), '2026-11-09', 'format date key');

const fractions = chartDateFractions(['2026-10-25', '2026-10-26', '2026-10-27']);
assert.deepEqual(fractions, [0, 0.5, 1], 'evenly spaced fractions');

// ---------- Natural language meal logger ----------
const nlResult = analyzeNaturalLanguageMeal('2 roti, 1 katori dal', 'Lunch');
assert.equal(nlResult.rawText, '2 roti, 1 katori dal');
assert.equal(nlResult.items.length, 2, 'two segments');
assert.equal(nlResult.items[0].needsDisambiguation, false, 'roti is exact match');
assert.equal(nlResult.items[0].selectedFoodId, 'food-roti', 'roti matched');
assert.equal(nlResult.items[1].needsDisambiguation, true, 'dal needs disambiguation');
assert.equal(nlResult.items[1].disambiguationPrompt, 'Which dal preparation did you have?', 'dal prompt');

const dalEval = evaluateNaturalLanguageItem(nlResult.items[1], 'Lunch');
assert.equal(dalEval.isReadyToLog, false, 'dal not ready until selected');

const rotiEval = evaluateNaturalLanguageItem(nlResult.items[0], 'Lunch');
assert.equal(rotiEval.isReadyToLog, true, 'roti ready to log');
assert(rotiEval.resolvedDraft!.calories > 0, 'roti has calories');

// ---------- Weekly summary digest ----------
const workouts: LoggedWorkout[] = [
  { id: 'wk1', dateKey: '2026-10-30', timestamp: 1, exerciseName: 'Push-ups', sets: 3, reps: 10, weightKg: 0, caloriesBurned: 60, muscleGroup: 'Chest' },
  { id: 'wk2', dateKey: '2026-11-01', timestamp: 8, exerciseName: 'Squats', sets: 3, reps: 12, weightKg: 0, caloriesBurned: 80, muscleGroup: 'Legs' },
];
const moods: MoodEntry[] = [
  { id: 'mo1', dateKey: '2026-10-30', timestamp: 1, moodId: 'energetic' },
];

const gamification = { currentStreak: 3, longestStreak: 5, level: 2, totalXp: 150, xpIntoLevel: 40, xpForNextLevel: 100, badges: [] };
const macroTargets: MacroTargets = { calories: 2200, bmr: 1400, tdee: 2100, proteinG: 110, carbsG: 275, fatG: 73, fiberG: 25 };

const digest = buildWeeklySummaryDigest({
  meals,
  workouts,
  moods,
  weights,
  gamification,
  macroTargets,
  weeklyWorkoutGoal: 4,
  weightUnit: 'kg',
  referenceDateKey: '2026-11-01',
});
assert.equal(digest.weekEndDateKey, '2026-11-01');
assert.equal(digest.activeDays, 2, '2 active days');
assert.equal(digest.workoutsCompleted, 2, '2 workouts');
assert.equal(digest.mealDaysLogged, 2, '2 meal days');
assert(digest.avgDailyCalories !== null && digest.avgDailyCalories! > 0, 'avg daily calories');
assert.equal(digest.currentStreak, 3);
assert(digest.notificationTitle.includes('Weekly Summary'), 'notification title');
assert(digest.notificationBody.length > 0, 'notification body');

// ---------- Consistency strip ----------
const strip = computeConsistencyStrip(meals, workouts, moods, 7, '2026-11-01');
assert.equal(strip.length, 7);
const today = strip.find(d => d.isToday);
assert(today !== undefined, 'today is in the strip');
assert.equal(today!.isActive, true, 'today is active (meal + workout + mood)');

// ---------- Habit notification evaluator ----------
const weeklyPrefs: HabitReminderPreferences = {
  ...DEFAULT_HABIT_REMINDERS,
  weeklySummaryEnabled: true,
};
const due = evaluateDueHabitNotifications({
  prefs: weeklyPrefs,
  now: new Date('2026-11-01T19:00:00'), // Sunday 19:00 = weekly summary slot
  alreadyDeliveredKeys: new Set(),
  hasNativeWorkoutWater: false,
  loggedWorkoutToday: true,
  loggedBreakfastToday: true,
  loggedLunchToday: true,
  loggedDinnerToday: true,
  loggedWeightToday: true,
  waterTodayMl: 2000,
  waterGoalMl: 2500,
  weeklyDigest: digest,
});
const weeklyDue = due.find(n => n.kind === 'weekly_summary');
assert(weeklyDue !== undefined, 'weekly summary due on Sunday at 19:00');

// Idempotency: same key not delivered twice
const dueAgain = evaluateDueHabitNotifications({
  prefs: weeklyPrefs,
  now: new Date('2026-11-01T19:00:00'),
  alreadyDeliveredKeys: new Set(['weekly_summary:2026-11-01']),
  hasNativeWorkoutWater: false,
  loggedWorkoutToday: true,
  loggedBreakfastToday: true,
  loggedLunchToday: true,
  loggedDinnerToday: true,
  loggedWeightToday: true,
  waterTodayMl: 2000,
  waterGoalMl: 2500,
  weeklyDigest: digest,
});
assert.equal(dueAgain.length, 0, 'no duplicate weekly summary when already delivered');

// ---------- Defaults ----------
assert.equal(DEFAULT_HABIT_REMINDERS.weeklySummaryEnabled, false, 'weekly summary off by default');
assert.equal(DEFAULT_HABIT_REMINDERS.weeklySummaryWeekday, 0, 'Sunday default');
assert.equal(DEFAULT_HABIT_REMINDERS.weeklySummaryMinute, 19 * 60, '19:00 default');

console.log('PASS: weekly weight trend, daily aggregates, rolling average, WHtR, date helpers, NL meal logger, weekly summary digest, consistency strip, habit notification evaluator');
