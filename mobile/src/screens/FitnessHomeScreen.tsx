import React, { useMemo } from 'react';
import {
  Activity, ArrowRight, ChevronRight, Droplets, Dumbbell, Flame, Leaf, Minus, Moon,
  Plus, Settings2, Sparkles, Sun, Utensils,
} from 'lucide-react';
import { AnimatedRing } from '../components/AnimatedRing';
import { StepTracker } from '../components/StepTracker';
import { FitLifeBrand } from '../components/FitnessSidebars';
import { MainTabId } from '../components/GlassBottomNav';
import { useFitLife } from '../data/FitLifeStore';
import { EXERCISE_CATALOG } from '../data/ExerciseCatalog';
import { MuscleGroup } from '../data/types';
import { MOOD_OPTIONS, generateAiCoachMessage } from '../domain/AiCoach';
import { calculateHealthScore } from '../domain/HealthScoreCalculator';
import { formatWeight, toDisplayWeight } from '../domain/WeightConverter';
import { loggedWorkoutUnit } from '../domain/ExerciseDiscovery';
import { computeWeeklyWeightTrend } from '../domain/ProgressAggregator';
import partnerTraining from '../assets/partner-training.jpg';
import maleTraining from '../assets/male-strength.jpg';
import femaleTraining from '../assets/female-strength.jpg';

interface FitnessHomeProps {
  onNavigateTab: (tab: MainTabId) => void;
  onOpenDaily: () => void;
  onOpenSettings: () => void;
  onEditProfile: () => void;
  onOpenWorkouts: (group?: MuscleGroup) => void;
}

const number = (value: number) => Math.round(value).toLocaleString();

export const FitnessHomeScreen: React.FC<FitnessHomeProps> = ({ onNavigateTab, onOpenDaily, onOpenSettings, onEditProfile, onOpenWorkouts }) => {
  const {
    profile, settings, themeColors, meals, workouts, weights, moods, todayMeals, todayWorkouts, todayMood,
    waterTodayMl, macroTargets, gamification, addWaterMl, logMood, toggleThemeMode,
    weeklyWeightTrend, consistencyStrip, weeklySummaryDigest,
  } = useFitLife();

  const unit = settings.weightUnit;

  const totals = useMemo(() => todayMeals.reduce((sum, meal) => ({
    calories: sum.calories + meal.calories,
    proteinG: sum.proteinG + meal.proteinG,
    carbsG: sum.carbsG + meal.carbsG,
    fatG: sum.fatG + meal.fatG,
    fiberG: sum.fiberG + meal.fiberG,
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }), [todayMeals]);

  const caloriesRemaining = macroTargets ? macroTargets.calories - totals.calories : 0;
  const caloriePercent = macroTargets ? Math.max(0, Math.min(100, Math.round(totals.calories / Math.max(1, macroTargets.calories) * 100))) : 0;
  const burnedToday = todayWorkouts.reduce((sum, workout) => sum + workout.caloriesBurned, 0);
  const burnUnavailable = todayWorkouts.some(workout => workout.energyEstimateAvailable === false);
  const workoutSets = todayWorkouts.reduce((sum, workout) => sum + workout.sets, 0);
  const health = macroTargets ? calculateHealthScore({
    caloriesConsumed: totals.calories, calorieTarget: macroTargets.calories,
    proteinConsumed: totals.proteinG, proteinTarget: macroTargets.proteinG,
    workedOutToday: todayWorkouts.length > 0, workoutSetsToday: workoutSets,
    moodLoggedToday: todayMood !== null,
  }) : null;
  const coach = generateAiCoachMessage({
    healthScore: health?.score ?? null, moodId: todayMood, goal: profile.goal,
    caloriesRemaining: macroTargets ? caloriesRemaining : null, proteinRemainingG: macroTargets ? Math.max(0, Math.round(macroTargets.proteinG - totals.proteinG)) : null,
    workedOutToday: todayWorkouts.length > 0, streakDays: gamification.currentStreak,
  });
  const macros = [
    { label: 'Protein', amount: totals.proteinG, target: macroTargets?.proteinG ?? 0, color: themeColors.accentPrimary },
    { label: 'Carbs', amount: totals.carbsG, target: macroTargets?.carbsG ?? 0, color: themeColors.accentWarm },
    { label: 'Fat', amount: totals.fatG, target: macroTargets?.fatG ?? 0, color: themeColors.accentSecondary },
    { label: 'Fiber', amount: totals.fiberG, target: macroTargets?.fiberG ?? 0, color: themeColors.accentCool },
  ];
  const waterPercent = Math.min(100, Math.round(waterTodayMl / Math.max(1, settings.waterGoalMl) * 100));
  const firstName = profile.name.trim().split(/\s+/)[0] || 'there';
  const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date());
  const dayPart = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';
  const usingDemoData = [...meals, ...workouts, ...weights, ...moods].some(item => item.id.startsWith('seed-') || item.id.startsWith('today-meal-') || item.id.startsWith('today-wk-') || item.id.startsWith('today-mood-'));

  const recentActivity = useMemo(() => [
    ...todayMeals.map(meal => ({
      id: meal.id, timestamp: meal.timestamp, type: 'meal' as const, title: meal.name,
      detail: `${meal.category || 'Meal'} · ${number(meal.calories)} kcal`,
    })),
    ...todayWorkouts.map(workout => ({
      id: workout.id, timestamp: workout.timestamp, type: 'workout' as const, title: workout.exerciseName,
      detail: `${workout.sets} sets · ${workout.reps} ${loggedWorkoutUnit(workout)}${workout.weightKg > 0 ? ` · ${formatWeight(workout.weightKg, settings.weightUnit)}` : ''}`,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3), [todayMeals, todayWorkouts, settings.weightUnit]);

  return (
    <div className="fitness-home">
      <header className="fitness-home-bar" data-guide-target="home-settings" aria-label="Home settings and appearance">
        <div className="home-mobile-brand"><FitLifeBrand /></div>
        <div className="home-desktop-label"><strong>Dashboard</strong></div>
        <div className="home-header-actions">
          <button className="home-icon-button" onClick={(event) => toggleThemeMode(event.currentTarget)} aria-label={settings.themeMode === 'light' ? 'Switch to nightfall theme' : 'Switch to daylight theme'}>
            <Moon size={21} className="theme-visible-light" aria-hidden="true" />
            <Sun size={21} className="theme-visible-dark" aria-hidden="true" />
          </button>
          <button className="home-icon-button" onClick={onOpenSettings} aria-label="Open settings"><Settings2 size={21} /></button>
        </div>
      </header>

      <div className="fitness-home-content">
        <section className="home-greeting">
          <div><p>{date}</p><h1>Good {dayPart}, {firstName}.</h1></div>
          <button className="home-streak" onClick={() => onNavigateTab('profile')} aria-label={`View your ${gamification.currentStreak} day streak`}><Flame size={16} /><strong>{gamification.currentStreak}</strong>{' '}<span>day streak</span></button>
        </section>

        <div className="home-quick-actions" data-guide-target="home-actions" aria-label="Quick actions">
          <button className="home-action primary" onClick={() => onOpenWorkouts()}><span className="home-action-icon"><Dumbbell size={20} /></span><span><strong>Log workout</strong></span><Plus size={19} /></button>
          <button className="home-action secondary" onClick={() => onNavigateTab('meals')}><span className="home-action-icon"><Utensils size={20} /></span><span><strong>Log a meal</strong></span><Plus size={19} /></button>
        </div>

        {/* Quick natural-language meal input bar */}
        <section className="rounded-[26px] border border-[#3E634B] bg-[#213026] p-4" data-guide-target="home-nl-meal" aria-label="Quick natural-language meal logging">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">Quick Meal Log</h2>
            </div>
            <button onClick={() => onNavigateTab('meals')} className="text-xs font-semibold text-[#7BB38F] hover:underline">Full log →</button>
          </div>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder='Try "2 roti, 1 katori dal"'
              className="flex-1 rounded-xl border border-[#2F3A33] bg-[#141916] px-3.5 py-2.5 text-xs text-[#F4F1EA] outline-none focus:border-[#6BA37E]"
            />
            <button
              type="button"
              className="rounded-xl bg-[#528B67] hover:bg-[#5E9A74] px-4 py-2.5 text-xs font-bold text-[#F4F1EA]"
              onClick={() => onNavigateTab('meals')}
            >
              Confirm & log
            </button>
          </form>
        </section>

        <StepTracker />

        {/* Weekly streak consistency strip */}
        {settings.dashboardWidgets.showActivityFeed && (
          <section className="home-streak-strip rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4" aria-label="Weekly streak consistency">
            <div className="flex items-center justify-between mb-3">
              <div>
              <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">7-Day Streak</h2>
              </div>
              <span className="text-xs font-semibold text-[#7BB38F]">
                {consistencyStrip.filter(d => d.isActive).length}/7 active
              </span>
            </div>
            <div className="flex items-end gap-1.5 h-16">
              {consistencyStrip.map((day) => (
                <div key={day.dateKey} className="flex flex-col items-center gap-1" title={`${day.weekdayShort} ${day.dayOfMonth}: ${day.isActive ? 'Active' : 'No activity logged'}`}>
                  <div className={`w-6 rounded-t-md ${day.isActive ? 'bg-[#528B67]' : 'bg-[#2F3A33]'}`}>
                    {day.isToday && <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#D8C39E]" />}
                  </div>
                  <span className="text-[0.5625rem] text-[#84877F]">{day.weekdayShort}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Weekly weight trend card */}
        <section className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4" data-guide-target="home-weekly-trend" aria-label="Weekly weight trend">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">7-Day Weight Trend</h2>
            </div>
            <span className="text-xs font-semibold text-[#7BB38F]">
              {weeklyWeightTrend.currentWeekDaysLogged}/7 logged
            </span>
          </div>
          {weeklyWeightTrend.currentWeekAvgKg !== null ? (
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="rounded-2xl border border-[#344A3C] bg-[#151F19] p-3">
                <div className="text-[0.625rem] font-semibold text-[#84877F] uppercase tracking-wider">This 7d average</div>
                <div className="font-heading text-2xl font-extrabold text-[#F4F1EA]">
                  {toDisplayWeight(weeklyWeightTrend.currentWeekAvgKg, unit).toFixed(1)} {unit}
                </div>
              </div>
              <div className="rounded-2xl border border-[#344A3C] bg-[#151F19] p-3">
                <div className="text-[0.625rem] font-semibold text-[#84877F] uppercase tracking-wider">Week-over-week</div>
                <div className="font-heading text-2xl font-extrabold">
                  {weeklyWeightTrend.weeklyTrendDeltaKg !== null ? (
                    <>
                      {weeklyWeightTrend.weeklyTrendDeltaKg < 0 ? <Flame className="h-4 w-4 text-[#DE9473]" /> : weeklyWeightTrend.weeklyTrendDeltaKg > 0 ? <Flame className="h-4 w-4 text-[#7BB38F]" /> : null}
                      {weeklyWeightTrend.weeklyTrendDeltaKg >= 0 ? '+' : ''}{weeklyWeightTrend.weeklyTrendDeltaKg.toFixed(1)} {unit}
                    </>
                  ) : (
                    <span className="text-[#B8B5AD]">Insufficient data</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#344A3C] bg-[#151F19] p-4 text-center">
              <p className="text-xs text-[#B8B5AD]">Log 2+ morning weigh-ins this week for your 7-day trend average.</p>
            </div>
          )}
        </section>

        {/* Weekly summary digest card */}
        <section className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4" data-guide-target="home-weekly-digest" aria-label="Weekly summary digest">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">Weekly Summary</h2>
              <p className="text-[0.6875rem] text-[#84877F]">{weeklySummaryDigest.weekRangeLabel}</p>
            </div>
            <button onClick={() => onNavigateTab('progress')} className="text-xs font-semibold text-[#7BB38F] hover:underline">View details →</button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="rounded-xl bg-[#141916] p-2 text-center border border-[#26302A]">
              <div className="text-[0.625rem] text-[#84877F]">Active days</div>
              <div className="font-heading text-sm font-bold text-[#F4F1EA]">{weeklySummaryDigest.activeDays}/7</div>
            </div>
            <div className="rounded-xl bg-[#141916] p-2 text-center border border-[#26302A]">
              <div className="text-[0.625rem] text-[#84877F]">Workouts</div>
              <div className="font-heading text-sm font-bold text-[#7BB38F]">{weeklySummaryDigest.workoutsCompleted}/{weeklySummaryDigest.weeklyWorkoutGoal}</div>
            </div>
            <div className="rounded-xl bg-[#141916] p-2 text-center border border-[#26302A]">
              <div className="text-[0.625rem] text-[#84877F]">Streak</div>
              <div className="font-heading text-sm font-bold text-[#E0B467]">{weeklySummaryDigest.currentStreak}d</div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#151F19] border border-[#344A3C] p-3">
            <div>
              <div className="text-[0.625rem] text-[#84877F]">Focus this week</div>
              <div className="font-heading text-xs font-bold text-[#F4F1EA]">{weeklySummaryDigest.focusHeadline}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#84877F]" />
          </div>
          <p className="mt-2 text-xs text-[#B8B5AD]">{weeklySummaryDigest.focusDetail}</p>
        </section>

        <section className="home-overview" data-guide-target="home-overview" aria-labelledby="overview-title">
          <div className="home-card-heading"><div><h2 id="overview-title">Today's overview</h2>{usingDemoData && <span className="home-demo-label">Demo data</span>}</div><button onClick={onOpenDaily}>Details <ArrowRight size={15} /></button></div>
          {macroTargets ? <div className="overview-main">
            <div className="overview-primary"><span>{caloriesRemaining >= 0 ? 'Calories remaining' : 'Calories over target'}</span><div><strong>{number(Math.abs(caloriesRemaining))}</strong><small>kcal</small></div></div>
            <div className="overview-ring" aria-label={`${caloriePercent}% of your daily calorie target logged`}>
              <AnimatedRing progress={totals.calories / Math.max(1, macroTargets.calories)} size={104} strokeWidth={8} startColor={themeColors.accentPrimary}>
                <strong>{caloriePercent}%</strong>
              </AnimatedRing>
            </div>
          </div> : profile.onboarded ? <div className="profile-needed"><div><strong>Personal targets unavailable</strong><p>Adult calorie and macro targets are not provided under 18. Ask a qualified health professional for individual guidance.</p></div></div> : <div className="profile-needed"><div><strong>See your estimates</strong><p>Add profile details whenever you’re ready.</p></div><button type="button" onClick={onEditProfile}>Add profile details</button></div>}
          <div className="overview-stats">
            <div><span>Food logged</span><strong>{todayMeals.length ? number(totals.calories) : '—'} <small>{todayMeals.length ? 'kcal' : 'not logged'}</small></strong></div>
            <div><span>Est. burned</span><strong>{burnUnavailable ? '—' : number(burnedToday)} <small>{burnUnavailable ? 'not estimated' : 'kcal'}</small></strong></div>
            <div><span>Exercise logs</span><strong>{todayWorkouts.length} <small>today</small></strong></div>
          </div>
        </section>

        {settings.dashboardWidgets.showMacros && <details className="home-disclosure"><summary><span>Nutrition breakdown</span><ChevronRight size={18} /></summary>
        {settings.dashboardWidgets.showMacros && <section className="home-section" aria-labelledby="macros-title">
          <div className="home-section-heading"><div><h2 id="macros-title">Your nutrition</h2></div><button onClick={() => onNavigateTab('meals')}>Log meal <Plus size={16} /></button></div>
          <div className="home-macro-grid">{macros.map(macro => {
            if (!macroTargets) return <button key={macro.label} className="home-macro" onClick={() => onNavigateTab('meals')} aria-label={`${macro.label}, ${number(macro.amount)} grams logged. Open meals.`}><strong>{number(macro.amount)} g</strong><span>{macro.label}</span><small>logged today</small></button>;
            const fraction = macro.amount / Math.max(1, macro.target);
            const pct = Math.min(100, Math.round(fraction * 100));
            return <button key={macro.label} className="home-macro" onClick={() => onNavigateTab('meals')} aria-label={`${macro.label}, ${number(macro.amount)} of ${macro.target} grams. Open meals.`}>
              <AnimatedRing size={60} strokeWidth={5.5} progress={fraction} startColor={macro.color}><strong>{pct}%</strong></AnimatedRing>
              <span>{macro.label}</span><small>{number(macro.amount)} / {macro.target} g</small>
            </button>;
          })}</div>
        </section>}

        </details>}

        {settings.dashboardWidgets.showHydration && <section className="home-water" aria-labelledby="water-title">
          <div className="home-water-top"><span className="home-water-icon"><Droplets size={20} /></span><div><h2 id="water-title">Stay hydrated</h2></div><strong aria-live="polite">{(waterTodayMl / 1000).toFixed(2).replace(/0$/, '')} <small>/ {(settings.waterGoalMl / 1000).toFixed(1)} L</small></strong></div>
          <div className="home-water-track" role="progressbar" aria-label="Water towards daily goal" aria-valuemin={0} aria-valuemax={settings.waterGoalMl} aria-valuenow={Math.min(waterTodayMl, settings.waterGoalMl)}><span style={{ transform: `scaleX(${waterPercent / 100})` }} /></div>
          <div className="home-water-bottom"><span>{waterPercent}% of daily goal</span><div><button onClick={() => addWaterMl(-250)} aria-label="Remove 250 milliliters of water" disabled={waterTodayMl === 0}><Minus size={16} /></button><button onClick={() => addWaterMl(250)} aria-label="Add 250 ml of water"><Plus size={16} /> 250 ml</button></div></div>
        </section>}

        <details className="home-disclosure"><summary><span>Workout ideas</span><ChevronRight size={18} /></summary>
        <section className="home-section" aria-labelledby="training-title">
          <div className="home-section-heading"><div><h2 id="training-title">Your next workout</h2></div><button onClick={() => onOpenWorkouts()}>See all <ChevronRight size={16} /></button></div>
          <div className="home-training-feature">
            <div className="home-training-copy"><span><Dumbbell size={15} /> ADAPTIVE WORKOUTS</span><h3>Stronger,<br />one day at a time.</h3><button onClick={() => onOpenWorkouts()}>Browse workouts <ArrowRight size={16} /></button></div>
            <img src={partnerTraining} alt="A man and a woman exercising with dumbbells together" />
          </div>
        </section>

        <section className="home-section" aria-labelledby="explore-title">
          <div className="home-section-heading"><div><h2 id="explore-title">Explore by focus</h2></div></div>
          <div className="home-focus-grid">
            <button className="home-focus" onClick={() => onOpenWorkouts('Shoulders')}><img src={maleTraining} alt="A man training with dumbbells" loading="lazy" /><span><strong>Upper body</strong></span><ChevronRight size={17} /></button>
            <button className="home-focus" onClick={() => onOpenWorkouts('Legs')}><img src={femaleTraining} alt="A woman exercising with a kettlebell" loading="lazy" /><span><strong>Lower body</strong></span><ChevronRight size={17} /></button>
          </div>
        </section>

        </details>

        {(settings.dashboardWidgets.showMood || (settings.dashboardWidgets.showAiCoach && profile.onboarded) || settings.dashboardWidgets.showActivityFeed) && <details className="home-disclosure"><summary><span>Check-in & activity</span><ChevronRight size={18} /></summary>
        {settings.dashboardWidgets.showMood && <section className="home-mood" aria-labelledby="mood-title">
          <div className="home-section-heading"><div><h2 id="mood-title">How are you feeling?</h2></div>{todayMood && <span className="home-checked">Checked in</span>}</div>
          <div className="home-mood-list no-scrollbar">{MOOD_OPTIONS.map(mood => <button key={mood.id} aria-pressed={todayMood === mood.id} onClick={() => logMood(mood.id)} className={todayMood === mood.id ? 'is-selected' : ''}><span aria-hidden="true">{mood.emoji}</span><strong>{mood.label}</strong></button>)}</div>
        </section>}

        {settings.dashboardWidgets.showAiCoach && profile.onboarded && <section className="home-coach" aria-labelledby="coach-title">
          <span className="home-coach-icon"><Sparkles size={20} /></span><div><h2 id="coach-title">{coach.headline}</h2><p>{coach.body}</p><button onClick={() => onNavigateTab(todayWorkouts.length ? 'meals' : 'workouts')}>{todayWorkouts.length ? 'View nutrition' : 'Find a workout'} <ArrowRight size={15} /></button></div>
        </section>}

        {settings.dashboardWidgets.showActivityFeed && <section className="home-section home-recent" aria-labelledby="activity-title">
          <div className="home-section-heading"><div><h2 id="activity-title">Today's activity</h2></div><button onClick={() => onNavigateTab('progress')}>Progress <ChevronRight size={16} /></button></div>
          {recentActivity.length ? <div className="home-activity-list">{recentActivity.map(item => <button key={item.id} onClick={() => onNavigateTab(item.type === 'meal' ? 'meals' : 'workouts')}><span>{item.type === 'meal' ? <Utensils size={17} /> : <Dumbbell size={17} />}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><ChevronRight size={17} /></button>)}</div> : <div className="home-empty"><Activity size={20} /><p>No activity yet.</p></div>}
        </section>}

        </details>}

        <div className="home-footer"><Leaf size={14} /><span>{usingDemoData ? 'Demo activity is shown. Clear it in Settings when you are ready.' : 'Your progress is saved on this device.'}</span><button onClick={onOpenSettings}>{usingDemoData ? 'Settings' : 'Manage data'}</button></div>
      </div>
    </div>
  );
};
