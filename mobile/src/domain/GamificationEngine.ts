import {
  BadgeStatus,
  GamificationSummary,
  LoggedMeal,
  LoggedWorkout,
  MoodEntry,
  WeightEntry,
} from '../data/types';
import { getDateKeyDaysAgo } from './ProgressAggregator';

export const XP_PER_MEAL = 10;
export const XP_PER_WORKOUT = 20;
export const XP_PER_MOOD = 5;
export const XP_PER_LEVEL = 100;

/**
 * Recomputes XP, Level, Streak, and all 9 Badges fresh from full history on every change.
 * Streak counts consecutive days with a meal or workout logged (still counts as "current"
 * if you haven't logged today yet but did yesterday — it isn't broken until a full day
 * passes with nothing).
 */
export function computeGamification(
  meals: LoggedMeal[],
  workouts: LoggedWorkout[],
  moods: MoodEntry[],
  weights: WeightEntry[],
  calorieTarget: number
): GamificationSummary {
  const totalXp =
    meals.length * XP_PER_MEAL +
    workouts.length * XP_PER_WORKOUT +
    moods.length * XP_PER_MOOD;

  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = totalXp % XP_PER_LEVEL;
  const xpForNextLevel = XP_PER_LEVEL;
  const levelProgress = xpIntoLevel / XP_PER_LEVEL;

  // Active days set (days with at least one meal or workout)
  const activeDates = new Set<string>();
  for (const m of meals) activeDates.add(m.dateKey);
  for (const w of workouts) activeDates.add(w.dateKey);

  const todayKey = getDateKeyDaysAgo(0);
  const yesterdayKey = getDateKeyDaysAgo(1);
  const activeToday = activeDates.has(todayKey);

  // Compute current streak
  let currentStreak = 0;
  let startOffset = -1;
  if (activeDates.has(todayKey)) {
    startOffset = 0;
  } else if (activeDates.has(yesterdayKey)) {
    startOffset = 1;
  }

  if (startOffset !== -1) {
    let offset = startOffset;
    while (offset < 365) {
      const key = getDateKeyDaysAgo(offset);
      if (activeDates.has(key)) {
        currentStreak++;
        offset++;
      } else {
        break;
      }
    }
  }

  // Compute longest streak across sorted dateKeys
  const sortedDates = Array.from(activeDates).sort();
  let longestStreak = currentStreak;
  let running = 0;
  let prevDate: Date | null = null;
  for (const dKey of sortedDates) {
    const [y, m, d] = dKey.split('-').map(Number);
    const cur = new Date(y, m - 1, d, 12, 0, 0);
    if (!prevDate) {
      running = 1;
    } else {
      const diffDays = Math.round((cur.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        running += 1;
      } else if (diffDays > 1) {
        running = 1;
      }
    }
    if (running > longestStreak) longestStreak = running;
    prevDate = cur;
  }

  // Check if any day hit within 10% of calorieTarget
  const dailyCals = new Map<string, number>();
  for (const m of meals) {
    dailyCals.set(m.dateKey, (dailyCals.get(m.dateKey) ?? 0) + m.calories);
  }
  let targetHitDays = 0;
  for (const cals of dailyCals.values()) {
    if (calorieTarget > 0 && Math.abs(cals - calorieTarget) <= calorieTarget * 0.1) {
      targetHitDays++;
    }
  }

  const totalLogs = meals.length + workouts.length;

  const badges: BadgeStatus[] = [
    {
      id: 'badge_first_step',
      title: 'First Step',
      description: 'Log your first meal or workout in FitLife',
      icon: '🚀',
      unlocked: totalLogs >= 1,
      currentValue: Math.min(1, totalLogs),
      targetValue: 1,
      progress: Math.min(1, totalLogs / 1),
      category: 'milestone',
    },
    {
      id: 'badge_spark_3',
      title: '3-Day Spark',
      description: 'Maintain a 3-day active logging streak',
      icon: '🔥',
      unlocked: longestStreak >= 3,
      currentValue: Math.min(3, longestStreak),
      targetValue: 3,
      progress: Math.min(1, longestStreak / 3),
      category: 'streak',
    },
    {
      id: 'badge_warrior_7',
      title: '7-Day Warrior',
      description: 'Reach a 7-day consecutive fitness streak',
      icon: '⚡',
      unlocked: longestStreak >= 7,
      currentValue: Math.min(7, longestStreak),
      targetValue: 7,
      progress: Math.min(1, longestStreak / 7),
      category: 'streak',
    },
    {
      id: 'badge_nutritionist',
      title: 'Nutritionist',
      description: 'Log 15 nutritious meals across your timeline',
      icon: '🥗',
      unlocked: meals.length >= 15,
      currentValue: Math.min(15, meals.length),
      targetValue: 15,
      progress: Math.min(1, meals.length / 15),
      category: 'nutrition',
    },
    {
      id: 'badge_iron_regular',
      title: 'Iron Regular',
      description: 'Complete and log 6 adaptive workout sets/sessions',
      icon: '🏋️',
      unlocked: workouts.length >= 6,
      currentValue: Math.min(6, workouts.length),
      targetValue: 6,
      progress: Math.min(1, workouts.length / 6),
      category: 'workout',
    },
    {
      id: 'badge_mindful',
      title: 'Mindful Athlete',
      description: 'Record 5 daily mood check-ins to reflect on how you feel',
      icon: '🧘',
      unlocked: moods.length >= 5,
      currentValue: Math.min(5, moods.length),
      targetValue: 5,
      progress: Math.min(1, moods.length / 5),
      category: 'mindset',
    },
    {
      id: 'badge_macro_sniper',
      title: 'Calorie Sniper',
      description: 'Finish 3 days within ±10% of your daily calorie target',
      icon: '🎯',
      unlocked: targetHitDays >= 3,
      currentValue: Math.min(3, targetHitDays),
      targetValue: 3,
      progress: Math.min(1, targetHitDays / 3),
      category: 'nutrition',
    },
    {
      id: 'badge_scale_master',
      title: 'Trend Tracker',
      description: 'Log 7 weight check-ins on the Progress tab',
      icon: '📈',
      unlocked: weights.length >= 7,
      currentValue: Math.min(7, weights.length),
      targetValue: 7,
      progress: Math.min(1, weights.length / 7),
      category: 'milestone',
    },
    {
      id: 'badge_centurion',
      title: 'XP Centurion',
      description: 'Reach 500+ Total XP (Level 6)',
      icon: '👑',
      unlocked: totalXp >= 500,
      currentValue: Math.min(500, totalXp),
      targetValue: 500,
      progress: Math.min(1, totalXp / 500),
      category: 'milestone',
    },
  ];

  return {
    totalXp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    levelProgress,
    currentStreak,
    longestStreak,
    activeToday,
    badges,
  };
}
