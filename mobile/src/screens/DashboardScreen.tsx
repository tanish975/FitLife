import React, { useMemo } from 'react';
import {
  Activity,
  Bot,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  Minus,
  Moon,
  Plus,
  Sliders,
  Smartphone,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { calculateHealthScore } from '../domain/HealthScoreCalculator';
import { generateAiCoachMessage, MOOD_OPTIONS } from '../domain/AiCoach';
import { AnimatedRing } from '../components/AnimatedRing';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { PressScale } from '../components/PressScale';
import { EmptyState } from '../components/EmptyState';
import { MainTabId } from '../components/GlassBottomNav';
import { formatWeight } from '../domain/WeightConverter';

interface DashboardScreenProps {
  onNavigateTab: (tab: MainTabId) => void;
  onOpenInstall: () => void;
  onOpenSettings: () => void;
  onEditProfile: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateTab,
  onOpenInstall,
  onOpenSettings,
  onEditProfile,
}) => {
  const {
    profile,
    settings,
    themeColors,
    todayMeals,
    todayWorkouts,
    todayMood,
    waterTodayMl,
    macroTargets,
    gamification,
    logMood,
    addWaterMl,
    toggleThemeMode,
  } = useFitLife();

  // Compute today's consumed macros
  const totals = useMemo(() => {
    return todayMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        proteinG: acc.proteinG + m.proteinG,
        carbsG: acc.carbsG + m.carbsG,
        fatG: acc.fatG + m.fatG,
        fiberG: acc.fiberG + m.fiberG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
    );
  }, [todayMeals]);

  const burnedToday = useMemo(
    () => todayWorkouts.reduce((sum, w) => sum + w.caloriesBurned, 0),
    [todayWorkouts]
  );

  const workoutSetsToday = useMemo(
    () => todayWorkouts.reduce((sum, w) => sum + w.sets, 0),
    [todayWorkouts]
  );

  const caloriesRemaining = macroTargets.calories - totals.calories;

  const healthBreakdown = useMemo(
    () =>
      calculateHealthScore({
        caloriesConsumed: totals.calories,
        calorieTarget: macroTargets.calories,
        proteinConsumed: totals.proteinG,
        proteinTarget: macroTargets.proteinG,
        workedOutToday: todayWorkouts.length > 0,
        workoutSetsToday,
        moodLoggedToday: todayMood !== null,
      }),
    [
      totals.calories,
      totals.proteinG,
      macroTargets.calories,
      macroTargets.proteinG,
      todayWorkouts.length,
      workoutSetsToday,
      todayMood,
    ]
  );

  const coachMessage = useMemo(
    () =>
      generateAiCoachMessage({
        healthScore: healthBreakdown.score,
        moodId: todayMood,
        goal: profile.goal,
        caloriesRemaining,
        proteinRemainingG: Math.max(0, Math.round(macroTargets.proteinG - totals.proteinG)),
        workedOutToday: todayWorkouts.length > 0,
        streakDays: gamification.currentStreak,
      }),
    [
      healthBreakdown.score,
      todayMood,
      profile.goal,
      caloriesRemaining,
      macroTargets.proteinG,
      totals.proteinG,
      todayWorkouts.length,
      gamification.currentStreak,
    ]
  );

  // Natural solid colors from the active palette for the 4 macro rings
  const macros = [
    {
      label: 'Protein',
      consumed: Math.round(totals.proteinG),
      target: macroTargets.proteinG,
      unit: 'g',
      color: themeColors.accentPrimary,
    },
    {
      label: 'Carbs',
      consumed: Math.round(totals.carbsG),
      target: macroTargets.carbsG,
      unit: 'g',
      color: themeColors.accentWarm,
    },
    {
      label: 'Fats',
      consumed: Math.round(totals.fatG),
      target: macroTargets.fatG,
      unit: 'g',
      color: themeColors.accentSecondary,
    },
    {
      label: 'Fiber',
      consumed: Math.round(totals.fiberG),
      target: macroTargets.fiberG,
      unit: 'g',
      color: themeColors.accentCool,
    },
  ];

  // Combine today's meals & workouts into chronological activity feed
  const activityFeed = useMemo(() => {
    const items: {
      id: string;
      type: 'meal' | 'workout';
      title: string;
      subtitle: string;
      xp: number;
      timestamp: number;
      badge: string;
    }[] = [];

    for (const m of todayMeals) {
      items.push({
        id: m.id,
        type: 'meal',
        title: m.name,
        subtitle: `${m.category} · ${m.servingLabel} · P:${Math.round(m.proteinG)}g C:${Math.round(m.carbsG)}g F:${Math.round(m.fatG)}g`,
        xp: 10,
        timestamp: m.timestamp,
        badge: `${m.calories} kcal`,
      });
    }

    for (const w of todayWorkouts) {
      items.push({
        id: w.id,
        type: 'workout',
        title: w.exerciseName,
        subtitle: `${w.muscleGroup} · ${w.sets} sets × ${w.reps} reps ${
          w.weightKg > 0 ? `@ ${formatWeight(w.weightKg, settings.weightUnit)}` : '(Bodyweight)'
        }`,
        xp: 20,
        timestamp: w.timestamp,
        badge: w.energyEstimateAvailable === false ? 'Not estimated' : `${w.caloriesBurned} kcal`,
      });
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [todayMeals, todayWorkouts, settings.weightUnit]);

  const waterProgressPct = Math.min(
    100,
    Math.round((waterTodayMl / Math.max(500, settings.waterGoalMl)) * 100)
  );

  return (
    <div className="space-y-4 px-4 pb-28 pt-2">
      {/* Top Greeting Bar with 1-Tap Theme Toggle & Customize Studio Button */}
      <div className="dashboard-topbar flex items-center justify-between animate-stagger-1">
        <div>
          <p className="text-xs font-medium text-[#84877F]">
            Welcome back, <span className="text-[#7BB38F] font-semibold">{profile.name.split(' ')[0]}</span>
          </p>
          <h1 className="font-heading text-xl font-bold tracking-tight text-[#F4F1EA]">
            Daily Pulse
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Streak Pill */}
          <PressScale
            onClick={() => onNavigateTab('profile')}
            className="flex items-center gap-1 rounded-full border border-[#6E532B] bg-[#2E2418] px-2.5 py-1.5 text-xs font-bold text-[#E0B467]"
          >
            <span>🔥</span>
            <AnimatedCounter value={gamification.currentStreak} />
            <span className="text-[10px] font-semibold uppercase">d</span>
          </PressScale>

          {/* Level Pill */}
          <PressScale
            onClick={() => onNavigateTab('profile')}
            className="flex items-center gap-1 rounded-full border border-[#3E634B] bg-[#213026] px-2.5 py-1.5 text-xs font-bold text-[#7BB38F]"
          >
            <Zap className="h-3.5 w-3.5 fill-[#7BB38F] text-[#7BB38F]" />
            <span>Lv.{gamification.level}</span>
          </PressScale>

          {/* 1-Tap Daylight / Nightfall Theme Toggle */}
          <PressScale
            onClick={(event) => toggleThemeMode(event.currentTarget)}
            ariaLabel="Toggle Daylight or Nightfall Theme"
            ariaPressed={settings.themeMode === 'dark'}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2F3A33] bg-[#1E2520] text-[#F4F1EA]"
          >
            <Moon className="h-4 w-4 text-[#7BB38F] theme-visible-light" aria-hidden="true" />
            <Sun className="h-4 w-4 text-[#E0B467] theme-visible-dark" aria-hidden="true" />
          </PressScale>

          {/* Customize Studio / Settings Button */}
          <PressScale
            onClick={onOpenSettings}
            ariaLabel="Customize Theme & Widgets"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#3E634B] bg-[#213026] text-[#7BB38F]"
          >
            <Sliders className="h-4 w-4" />
          </PressScale>

          {/* Install on Phone Quick Button */}
          <PressScale
            onClick={onOpenInstall}
            ariaLabel="Install on Phone"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#4A4333] bg-[#29251D] text-[#D8C39E]"
          >
            <Smartphone className="h-4 w-4" />
          </PressScale>
        </div>
      </div>

      {/* Personalized numbers are only shown after the user supplies details. */}
      {profile.onboarded ? <div className="relative overflow-hidden rounded-[26px] border border-[#3E634B] bg-[#213026] p-5 shadow-md animate-stagger-2" data-guide-target="daily-overview" aria-label="Daily overview">
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#151F19] border border-[#355440] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#7BB38F]">
              <Flame className="h-3 w-3 text-[#7BB38F]" />
              <span>{healthBreakdown.statusLabel}</span>
            </div>

            <div>
              <div className="text-xs font-medium text-[#B8B5AD]">
                {caloriesRemaining >= 0 ? 'Calories Remaining' : 'Calories Over Target'}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <AnimatedCounter
                  value={Math.abs(caloriesRemaining)}
                  className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F4F1EA]"
                />
                <span className="text-xs font-semibold text-[#7BB38F]">kcal</span>
              </div>
            </div>


          </div>

          {/* Health Score Ring */}
          <div className="shrink-0 flex flex-col items-center">
            <AnimatedRing
              progress={healthBreakdown.score / 100}
              size={112}
              strokeWidth={10}
              startColor={themeColors.accentPrimary}
            >
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#7BB38F]">
                Tracking
              </span>
              <AnimatedCounter
                value={healthBreakdown.score}
                className="font-heading text-2xl font-extrabold text-[#F4F1EA] leading-tight"
              />
              <span className="text-[10px] text-[#84877F]">/ 100</span>
            </AnimatedRing>
          </div>
        </div>
        <p className="pt-3 text-[11px] text-[#B8B5AD]">Tracking score reflects logs, not your health. Targets and exercise calories are estimates.</p>
        <div className="grid grid-cols-3 gap-2 pt-4">
              <div className="rounded-xl bg-[#151F19] px-2.5 py-1.5 border border-[#2F4536]">
                <div className="text-[10px] text-[#84877F]">Target</div>
                <div className="font-heading text-xs font-bold text-[#F4F1EA]">
                  {macroTargets.calories}
                </div>
              </div>
              <div className="rounded-xl bg-[#151F19] px-2.5 py-1.5 border border-[#2F4536]">
                <div className="text-[10px] text-[#84877F]">Eaten</div>
                <div className="font-heading text-xs font-bold text-[#7BB38F]">
                  <AnimatedCounter value={totals.calories} />
                </div>
              </div>
              <div className="rounded-xl bg-[#151F19] px-2.5 py-1.5 border border-[#2F4536]">
                <div className="text-[10px] text-[#84877F]">Burned</div>
                <div className="font-heading text-xs font-bold text-[#DE9473]">
                  {todayWorkouts.some(w => w.energyEstimateAvailable === false) ? 'Not estimated' : <AnimatedCounter value={burnedToday} />}
                </div>
              </div>
            </div>
      </div> : <section className="profile-needed profile-needed-card" data-guide-target="daily-overview" aria-label="Daily overview"><div><strong>{Math.round(totals.calories)} kcal logged today</strong><p>Add your own profile details to see estimated targets. It is optional.</p></div><button type="button" onClick={onEditProfile}>Add profile details</button></section>}

      {/* FOUR ANIMATED MACRO RINGS (Customizable Visibility) */}
      {settings.dashboardWidgets.showMacros && profile.onboarded && (
        <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 animate-stagger-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">Macro Rings</h2>
            <PressScale
              onClick={() => onNavigateTab('meals')}
              className="flex items-center gap-1 text-xs font-semibold text-[#7BB38F]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Meal</span>
            </PressScale>
          </div>

          <div className="macro-ring-grid grid grid-cols-4 gap-2">
            {macros.map((m) => {
              const pct = m.target > 0 ? Math.min(100, Math.round((m.consumed / m.target) * 100)) : 0;
              return (
                <PressScale
                  key={m.label}
                  onClick={() => onNavigateTab('meals')}
                  className="flex flex-col items-center rounded-2xl bg-[#141916] p-2.5 border border-[#26302A]"
                >
                  <AnimatedRing
                    progress={m.target > 0 ? m.consumed / m.target : 0}
                    size={64}
                    strokeWidth={6}
                    startColor={m.color}
                  >
                    <AnimatedCounter
                      value={pct}
                      suffix="%"
                      className="font-heading text-xs font-bold text-[#F4F1EA]"
                    />
                  </AnimatedRing>
                  <span className="mt-1.5 text-[11px] font-semibold text-[#F4F1EA]">{m.label}</span>
                  <span className="text-[10px] text-[#84877F]">
                    <AnimatedCounter value={m.consumed} />/{m.target}
                    {m.unit}
                  </span>
                </PressScale>
              );
            })}
          </div>
        </div>
      )}

      {/* DAILY HYDRATION TRACKER WIDGET (Customizable in Settings) */}
      {settings.dashboardWidgets.showHydration && (
        <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 animate-stagger-3" data-guide-target="daily-hydration" aria-label="Hydration and water">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#213026] border border-[#3E634B] text-[#7BB38F]">
                <Droplets className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">
                  Hydration & Water
                </h2>
                <p className="text-[11px] text-[#84877F]">
                  <AnimatedCounter value={waterTodayMl} /> ml / {settings.waterGoalMl} ml (
                  {waterProgressPct}%)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <PressScale
                scaleDown={0.9}
                onClick={() => addWaterMl(-250)}
                ariaLabel="Remove 250ml water"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#2F3A33] bg-[#141916] text-[#B8B5AD]"
              >
                <Minus className="h-3.5 w-3.5" />
              </PressScale>
              <PressScale
                scaleDown={0.92}
                onClick={() => addWaterMl(250)}
                className="flex items-center gap-1 rounded-xl bg-[#528B67] px-3 py-1.5 text-xs font-bold text-[#F4F1EA]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>250ml</span>
              </PressScale>
            </div>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#141916]">
            <div
              className="h-full rounded-full bg-[#528B67] transition-all duration-500"
              style={{ width: `${waterProgressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* 11-STATE MOOD CHECK-IN */}
      {settings.dashboardWidgets.showMood && (
        <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 animate-stagger-4">
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">11-State Mood Check-In</h2>
              <p className="text-[11px] text-[#84877F]">Informs daily guidance & awards +5 XP</p>
            </div>
            {todayMood && (
              <span className="rounded-full bg-[#213026] border border-[#3E634B] px-2.5 py-0.5 text-[10px] font-semibold text-[#7BB38F]">
                Checked In ✓
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
            {MOOD_OPTIONS.map((m) => {
              const isSelected = todayMood === m.id;
              return (
                <PressScale
                  key={m.id}
                  scaleDown={0.9}
                  onClick={() => logMood(m.id)}
                  className="shrink-0"
                >
                  <div
                    className={`flex flex-col items-center justify-center rounded-2xl border px-3 py-2 min-w-[68px] transition-all duration-200 ${
                      isSelected
                        ? 'border-[#6BA37E] bg-[#213026] scale-105'
                        : 'border-[#2F3A33] bg-[#141916]'
                    }`}
                  >
                    <span className="text-xl leading-none">{m.emoji}</span>
                    <span
                      className={`mt-1 text-[10px] font-semibold ${
                        isSelected ? 'text-[#F4F1EA]' : 'text-[#84877F]'
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                </PressScale>
              );
            })}
          </div>
        </div>
      )}

      {/* RULE-BASED AI COACH CARD */}
      {settings.dashboardWidgets.showAiCoach && profile.onboarded && (
        <div className="rounded-[26px] border border-[#3E5245] bg-[#1E2520] p-4 shadow-sm animate-stagger-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#213026] border border-[#3E634B] text-[#7BB38F]">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#7BB38F]">
                  <Sparkles className="h-3 w-3" /> Daily guidance · rule-based
                </span>
                <span className="rounded-full bg-[#141916] border border-[#2F3A33] px-2.5 py-0.5 text-[10px] font-semibold text-[#7BB38F]">
                  {coachMessage.actionTag}
                </span>
              </div>
              <h3 className="mt-1 font-heading text-sm font-bold text-[#F4F1EA]">
                {coachMessage.headline}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#B8B5AD]">{coachMessage.body}</p>
              <div className="mt-3 flex items-center gap-2">
                <PressScale
                  onClick={() => onNavigateTab(todayWorkouts.length === 0 ? 'workouts' : 'meals')}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#141916] border border-[#2F3A33] px-3 py-1.5 text-xs font-semibold text-[#7BB38F]"
                >
                  <span>{todayWorkouts.length === 0 ? 'Open Adaptive Workouts' : 'Adjust Today’s Meals'}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </PressScale>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TODAY'S ACTIVITY FEED */}
      {settings.dashboardWidgets.showActivityFeed && (
        <div className="space-y-2.5 animate-stagger-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">Today’s Activity Feed</h2>
            <span className="text-xs text-[#84877F]">{activityFeed.length} logged today</span>
          </div>

          {activityFeed.length === 0 ? (
            <EmptyState
              title="No Activity Logged Yet Today"
              subtitle="Log your first meal (+10 XP) or adaptive workout (+20 XP) to update your daily tracking score."
              actionLabel="Log First Meal"
              onAction={() => onNavigateTab('meals')}
            />
          ) : (
            <div className="space-y-2">
              {activityFeed.map((item) => (
                <PressScale
                  key={item.id}
                  onClick={() => onNavigateTab(item.type === 'meal' ? 'meals' : 'workouts')}
                  className="flex items-center justify-between rounded-[22px] border border-[#2F3A33] bg-[#1E2520] p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        item.type === 'meal'
                          ? 'bg-[#213026] text-[#7BB38F] border border-[#3E634B]'
                          : 'bg-[#33241E] text-[#DE9473] border border-[#6E4433]'
                      }`}
                    >
                      {item.type === 'meal' ? (
                        <Activity className="h-5 w-5" />
                      ) : (
                        <Dumbbell className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate font-heading text-xs font-semibold text-[#F4F1EA]">
                        {item.title}
                      </h4>
                      <p className="truncate text-[11px] text-[#84877F]">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right pl-2">
                    <div className="font-heading text-xs font-bold text-[#F4F1EA]">{item.badge}</div>
                    <div className="text-[10px] font-semibold text-[#7BB38F]">+{item.xp} XP</div>
                  </div>
                </PressScale>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
