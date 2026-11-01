import React, { useMemo } from 'react';
import {
  Activity, ArrowRight, ChevronRight, Droplets, Dumbbell, Flame, Leaf, Minus, Moon,
  Plus, Settings2, Sparkles, Sun, Utensils,
} from 'lucide-react';
import { AnimatedRing } from '../components/AnimatedRing';
import { FitLifeBrand } from '../components/FitnessSidebars';
import { MainTabId } from '../components/GlassBottomNav';
import { useFitLife } from '../data/FitLifeStore';
import { MuscleGroup } from '../data/types';
import { MOOD_OPTIONS, generateAiCoachMessage } from '../domain/AiCoach';
import { calculateHealthScore } from '../domain/HealthScoreCalculator';
import { formatWeight } from '../domain/WeightConverter';
import partnerTraining from '../assets/partner-training.jpg';
import maleTraining from '../assets/male-strength.jpg';
import femaleTraining from '../assets/female-strength.jpg';

interface FitnessHomeProps {
  onNavigateTab: (tab: MainTabId) => void;
  onOpenDaily: () => void;
  onOpenSettings: () => void;
  onOpenWorkouts: (group?: MuscleGroup) => void;
}

const number = (value: number) => Math.round(value).toLocaleString();

export const FitnessHomeScreen: React.FC<FitnessHomeProps> = ({ onNavigateTab, onOpenDaily, onOpenSettings, onOpenWorkouts }) => {
  const {
    profile, settings, themeColors, meals, workouts, weights, moods, todayMeals, todayWorkouts, todayMood,
    waterTodayMl, macroTargets, gamification, addWaterMl, logMood, toggleThemeMode,
  } = useFitLife();

  const totals = useMemo(() => todayMeals.reduce((sum, meal) => ({
    calories: sum.calories + meal.calories,
    proteinG: sum.proteinG + meal.proteinG,
    carbsG: sum.carbsG + meal.carbsG,
    fatG: sum.fatG + meal.fatG,
    fiberG: sum.fiberG + meal.fiberG,
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }), [todayMeals]);

  const caloriesRemaining = macroTargets.calories - totals.calories;
  const caloriePercent = Math.max(0, Math.min(100, Math.round(totals.calories / Math.max(1, macroTargets.calories) * 100)));
  const burnedToday = todayWorkouts.reduce((sum, workout) => sum + workout.caloriesBurned, 0);
  const workoutSets = todayWorkouts.reduce((sum, workout) => sum + workout.sets, 0);
  const health = calculateHealthScore({
    caloriesConsumed: totals.calories, calorieTarget: macroTargets.calories,
    proteinConsumed: totals.proteinG, proteinTarget: macroTargets.proteinG,
    workedOutToday: todayWorkouts.length > 0, workoutSetsToday: workoutSets,
    moodLoggedToday: todayMood !== null,
  });
  const coach = generateAiCoachMessage({
    healthScore: health.score, moodId: todayMood, goal: profile.goal,
    caloriesRemaining, proteinRemainingG: Math.max(0, Math.round(macroTargets.proteinG - totals.proteinG)),
    workedOutToday: todayWorkouts.length > 0, streakDays: gamification.currentStreak,
  });
  const macros = [
    { label: 'Protein', amount: totals.proteinG, target: macroTargets.proteinG, color: themeColors.accentPrimary },
    { label: 'Carbs', amount: totals.carbsG, target: macroTargets.carbsG, color: themeColors.accentWarm },
    { label: 'Fat', amount: totals.fatG, target: macroTargets.fatG, color: themeColors.accentSecondary },
    { label: 'Fiber', amount: totals.fiberG, target: macroTargets.fiberG, color: themeColors.accentCool },
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
      detail: `${workout.sets} sets · ${workout.reps} reps${workout.weightKg > 0 ? ` · ${formatWeight(workout.weightKg, settings.weightUnit)}` : ''}`,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3), [todayMeals, todayWorkouts, settings.weightUnit]);

  return (
    <div className="fitness-home">
      <header className="fitness-home-bar">
        <div className="home-mobile-brand"><FitLifeBrand /></div>
        <div className="home-desktop-label"><strong>Dashboard</strong><span>Your fitness, all in one place.</span></div>
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
          <div><p>{date}</p><h1>Good {dayPart}, {firstName}.</h1><span>Every bit of progress counts.</span></div>
          <button className="home-streak" onClick={() => onNavigateTab('profile')} aria-label={`View your ${gamification.currentStreak} day streak`}><Flame size={16} /><strong>{gamification.currentStreak}</strong><span>day streak</span></button>
        </section>

        <section className="home-overview" aria-labelledby="overview-title">
          <div className="home-card-heading"><div><h2 id="overview-title">Today's overview</h2>{usingDemoData && <span className="home-demo-label">Demo data</span>}</div><button onClick={onOpenDaily}>Details <ArrowRight size={15} /></button></div>
          <div className="overview-main">
            <div className="overview-primary"><span>{caloriesRemaining >= 0 ? 'Calories remaining' : 'Calories over target'}</span><div><strong>{number(Math.abs(caloriesRemaining))}</strong><small>kcal</small></div><p>Daily target: {number(macroTargets.calories)} kcal</p></div>
            <div className="overview-ring" aria-label={`${caloriePercent}% of your daily calorie target logged`}>
              <AnimatedRing progress={totals.calories / Math.max(1, macroTargets.calories)} size={104} strokeWidth={8} startColor={themeColors.accentPrimary}>
                <strong>{caloriePercent}%</strong><span>of target</span>
              </AnimatedRing>
            </div>
          </div>
          <div className="overview-stats">
            <div><span>Eaten</span><strong>{number(totals.calories)} <small>kcal</small></strong></div>
            <div><span>Est. burned</span><strong>{number(burnedToday)} <small>kcal</small></strong></div>
            <div><span>Exercise logs</span><strong>{todayWorkouts.length} <small>today</small></strong></div>
          </div>
          <p className="overview-note">Targets are estimates. Remaining = target minus food; exercise calories are separate.</p>
        </section>

        <div className="home-quick-actions" aria-label="Quick actions">
          <button className="home-action primary" onClick={() => onOpenWorkouts()}><span className="home-action-icon"><Dumbbell size={20} /></span><span><strong>Log workout</strong><small>Move your way</small></span><Plus size={19} /></button>
          <button className="home-action secondary" onClick={() => onNavigateTab('meals')}><span className="home-action-icon"><Utensils size={20} /></span><span><strong>Log a meal</strong><small>Fuel your day</small></span><Plus size={19} /></button>
        </div>

        <section className="home-section" aria-labelledby="training-title">
          <div className="home-section-heading"><div><h2 id="training-title">Your next workout</h2><p>Find a session that works for you.</p></div><button onClick={() => onOpenWorkouts()}>See all <ChevronRight size={16} /></button></div>
          <div className="home-training-feature">
            <div className="home-training-copy"><span><Dumbbell size={15} /> ADAPTIVE WORKOUTS</span><h3>Stronger,<br />one day at a time.</h3><p>Explore 42 exercises for every fitness level.</p><button onClick={() => onOpenWorkouts()}>Browse workouts <ArrowRight size={16} /></button></div>
            <img src={partnerTraining} alt="A man and a woman exercising with dumbbells together" />
          </div>
        </section>

        {settings.dashboardWidgets.showMacros && <section className="home-section" aria-labelledby="macros-title">
          <div className="home-section-heading"><div><h2 id="macros-title">Your nutrition</h2><p>Today's progress towards your targets.</p></div><button onClick={() => onNavigateTab('meals')}>Log meal <Plus size={16} /></button></div>
          <div className="home-macro-grid">{macros.map(macro => {
            const fraction = macro.amount / Math.max(1, macro.target);
            const pct = Math.min(100, Math.round(fraction * 100));
            return <button key={macro.label} className="home-macro" onClick={() => onNavigateTab('meals')} aria-label={`${macro.label}, ${number(macro.amount)} of ${macro.target} grams. Open meals.`}>
              <AnimatedRing size={60} strokeWidth={5.5} progress={fraction} startColor={macro.color}><strong>{pct}%</strong></AnimatedRing>
              <span>{macro.label}</span><small>{number(macro.amount)} / {macro.target} g</small>
            </button>;
          })}</div>
        </section>}

        {settings.dashboardWidgets.showHydration && <section className="home-water" aria-labelledby="water-title">
          <div className="home-water-top"><span className="home-water-icon"><Droplets size={20} /></span><div><h2 id="water-title">Stay hydrated</h2><p>Keep water close through the day.</p></div><strong aria-live="polite">{(waterTodayMl / 1000).toFixed(2).replace(/0$/, '')} <small>/ {(settings.waterGoalMl / 1000).toFixed(1)} L</small></strong></div>
          <div className="home-water-track" role="progressbar" aria-label="Water towards daily goal" aria-valuemin={0} aria-valuemax={settings.waterGoalMl} aria-valuenow={Math.min(waterTodayMl, settings.waterGoalMl)}><span style={{ transform: `scaleX(${waterPercent / 100})` }} /></div>
          <div className="home-water-bottom"><span>{waterPercent}% of daily goal</span><div><button onClick={() => addWaterMl(-250)} aria-label="Remove 250 milliliters of water" disabled={waterTodayMl === 0}><Minus size={16} /></button><button onClick={() => addWaterMl(250)} aria-label="Add 250 milliliters of water"><Plus size={16} /> 250 ml</button></div></div>
        </section>}

        <section className="home-section" aria-labelledby="explore-title">
          <div className="home-section-heading"><div><h2 id="explore-title">Explore by focus</h2><p>Choose the kind of movement you enjoy.</p></div></div>
          <div className="home-focus-grid">
            <button className="home-focus" onClick={() => onOpenWorkouts('Shoulders')}><img src={maleTraining} alt="A man training with dumbbells" loading="lazy" /><span><strong>Upper body</strong><small>Explore shoulder exercises</small></span><ChevronRight size={17} /></button>
            <button className="home-focus" onClick={() => onOpenWorkouts('Legs')}><img src={femaleTraining} alt="A woman exercising with a kettlebell" loading="lazy" /><span><strong>Lower body</strong><small>Explore leg exercises</small></span><ChevronRight size={17} /></button>
          </div>
        </section>

        {settings.dashboardWidgets.showMood && <section className="home-mood" aria-labelledby="mood-title">
          <div className="home-section-heading"><div><h2 id="mood-title">How are you feeling?</h2><p>A quick check-in can help guide your day.</p></div>{todayMood && <span className="home-checked">Checked in</span>}</div>
          <div className="home-mood-list no-scrollbar">{MOOD_OPTIONS.map(mood => <button key={mood.id} aria-pressed={todayMood === mood.id} onClick={() => logMood(mood.id)} className={todayMood === mood.id ? 'is-selected' : ''}><span aria-hidden="true">{mood.emoji}</span><strong>{mood.label}</strong></button>)}</div>
        </section>}

        {settings.dashboardWidgets.showAiCoach && <section className="home-coach" aria-labelledby="coach-title">
          <span className="home-coach-icon"><Sparkles size={20} /></span><div><p>DAILY GUIDANCE <span>· rule-based</span></p><h2 id="coach-title">{coach.headline}</h2><p>{coach.body}</p><button onClick={() => onNavigateTab(todayWorkouts.length ? 'meals' : 'workouts')}>{todayWorkouts.length ? 'View nutrition' : 'Find a workout'} <ArrowRight size={15} /></button></div>
        </section>}

        {settings.dashboardWidgets.showActivityFeed && <section className="home-section home-recent" aria-labelledby="activity-title">
          <div className="home-section-heading"><div><h2 id="activity-title">Today's activity</h2><p>Your recent meals and workouts.</p></div><button onClick={() => onNavigateTab('progress')}>Progress <ChevronRight size={16} /></button></div>
          {recentActivity.length ? <div className="home-activity-list">{recentActivity.map(item => <button key={item.id} onClick={() => onNavigateTab(item.type === 'meal' ? 'meals' : 'workouts')}><span>{item.type === 'meal' ? <Utensils size={17} /> : <Dumbbell size={17} />}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><ChevronRight size={17} /></button>)}</div> : <div className="home-empty"><Activity size={20} /><p>No activity logged yet. Start with a meal or a workout.</p></div>}
        </section>}

        <div className="home-footer"><Leaf size={14} /><span>{usingDemoData ? 'Demo activity is shown. Clear it in Settings when you are ready.' : 'Your progress is saved on this device.'}</span><button onClick={onOpenSettings}>{usingDemoData ? 'Settings' : 'Manage data'}</button></div>
      </div>
    </div>
  );
};
