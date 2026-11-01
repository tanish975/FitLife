import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  Dumbbell,
  Flame,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { EXERCISE_CATALOG } from '../data/ExerciseCatalog';
import { ExerciseItem, MuscleGroup } from '../data/types';
import { getWorkoutPrescription } from '../domain/AdaptiveWorkoutEngine';
import { displayWeight, formatWeight, parseInputToKg } from '../domain/WeightConverter';
import { SegmentedSelector } from '../components/SegmentedSelector';
import { PressScale } from '../components/PressScale';
import { EmptyState } from '../components/EmptyState';
import { useReducedMotion } from '../hooks/useReducedMotion';
import partnerTraining from '../assets/partner-training.jpg';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Cardio',
  'Full Body',
];
const CATALOG_PAGE_SIZE = 10;

export const WorkoutsScreen: React.FC<{ initialGroup?: MuscleGroup }> = ({ initialGroup = 'All' }) => {
  const { profile, settings, latestWeightKg, workouts, todayWorkouts, logWorkout, removeWorkout } =
    useFitLife();
  const unit = settings.weightUnit;
  const reducedMotion = useReducedMotion();

  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup>(initialGroup);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(CATALOG_PAGE_SIZE);
  const updateGroup = (value: MuscleGroup) => { setSelectedGroup(value); setVisibleCount(CATALOG_PAGE_SIZE); };
  const updateSearch = (value: string) => { setSearchQuery(value); setVisibleCount(CATALOG_PAGE_SIZE); };

  // Modal Bottom Sheet state for Adaptive Workout Engine set entry
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(null);
  const [isSheetClosing, setIsSheetClosing] = useState(false);
  const [setsInput, setSetsInput] = useState('3');
  const [repsInput, setRepsInput] = useState('10');
  const [weightInput, setWeightInput] = useState('0');
  const sets = Math.max(1, Math.min(20, Math.floor(Number(setsInput) || 1)));
  const reps = Math.max(1, Math.min(100, Math.floor(Number(repsInput) || 1)));
  const [restSeconds, setRestSeconds] = useState(75);

  useEffect(() => {
    if (!selectedExercise) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => document.getElementById('close-workout-sheet')?.focus(), 50);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSelectedExercise(null); setIsSheetClosing(false); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { window.clearTimeout(timer); document.removeEventListener('keydown', handleKey); if (previous?.isConnected) previous.focus(); };
  }, [selectedExercise]);

  const prescription = useMemo(() => {
    if (!selectedExercise) return null;
    return getWorkoutPrescription(
      selectedExercise,
      profile.goal,
      latestWeightKg,
      profile.heightCm,
      profile.age
    );
  }, [selectedExercise, profile.goal, latestWeightKg, profile.heightCm, profile.age]);

  const openExerciseSheet = (ex: ExerciseItem) => {
    const presc = getWorkoutPrescription(ex, profile.goal, latestWeightKg, profile.heightCm, profile.age);
    setSetsInput(String(presc.suggestedSets));
    setRepsInput(String(presc.suggestedReps));
    // Catalog loads do not establish a person's strength. Reuse only a real prior
    // entry, otherwise start at zero so the user chooses a comfortable load.
    const previousLog = workouts
      .filter((entry) => entry.exerciseId === ex.id && entry.id.startsWith('wk-'))
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    setWeightInput(String(ex.isBodyweight || !previousLog ? 0 : displayWeight(previousLog.weightKg, unit, 1)));
    setRestSeconds(settings.defaultRestSeconds || presc.suggestedRestSeconds);
    setIsSheetClosing(false);
    setSelectedExercise(ex);
  };

  const closeSheetSmoothly = () => {
    if (isSheetClosing) return;
    if (reducedMotion) { setSelectedExercise(null); return; }
    setIsSheetClosing(true);
    setTimeout(() => {
      setSelectedExercise(null);
      setIsSheetClosing(false);
    }, 150);
  };

  const handleConfirmLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExercise || isSheetClosing) return;
    const weightKg = selectedExercise.isBodyweight ? 0 : parseInputToKg(Number(weightInput), unit);
    const burned = Math.round(selectedExercise.caloriesPerSet * sets * (1 + reps / 35));

    // Confirm immediately; do not delay the actual save behind an exit animation.
    const entry = {
      exerciseId: selectedExercise.id,
      exerciseName: selectedExercise.name,
      muscleGroup: selectedExercise.muscleGroup,
      sets,
      reps,
      weightKg,
      caloriesBurned: burned,
      restSeconds,
    };
    setSelectedExercise(null);
    setIsSheetClosing(false);
    logWorkout(entry);
  };

  const filteredExercises = useMemo(() => {
    return EXERCISE_CATALOG.filter((ex) => {
      const matchesGroup = selectedGroup === 'All' || ex.muscleGroup === selectedGroup;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.muscleGroup.toLowerCase().includes(q) ||
        ex.secondaryMuscles.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [selectedGroup, searchQuery]);

  const totalBurnedToday = useMemo(
    () => todayWorkouts.reduce((s, w) => s + w.caloriesBurned, 0),
    [todayWorkouts]
  );

  return (
    <div className="space-y-4 px-4 pb-28 pt-2 animate-screen-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-[#F4F1EA]">Adaptive Workouts</h1>
          <p className="text-xs text-[#84877F]">
            42-exercise catalog across 8 muscle groups · Goal-calibrated
          </p>
        </div>
        <div className="rounded-2xl border border-[#6E4433] bg-[#33241E] px-3 py-1.5 text-right">
          <div className="text-[10px] font-medium text-[#DE9473]">Burned Today</div>
          <div className="font-heading text-xs font-bold text-[#F4F1EA]">{totalBurnedToday} kcal</div>
        </div>
      </div>

      {/* A training-first feature that keeps both athletes equally represented. */}
      <section className="workout-feature" aria-label="Find your next workout">
        <div className="workout-feature-copy"><span>YOUR NEXT SESSION</span><h2>Stronger,<br />every day.</h2><p>Find a workout that moves you.</p><button onClick={() => document.getElementById('exercise-search')?.focus()}>Find an exercise <span aria-hidden="true">→</span></button></div>
        <img src={partnerTraining} alt="A man and woman training together with dumbbells" />
      </section>

      {/* 8 Muscle Group Filter Chips */}
      <SegmentedSelector<MuscleGroup>
        scrollable
        size="sm"
        options={MUSCLE_GROUPS.map((g) => ({
          value: g,
          label: g,
        }))}
        selected={selectedGroup}
        onChange={updateGroup}
      />

      {/* Search Box */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#84877F]" />
        <input
          id="exercise-search"
          type="text"
          value={searchQuery}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder="Search 42 exercises (bench, squat, pull-ups, HIIT, deadlift...)"
          className="w-full rounded-2xl border border-[#2F3A33] bg-[#1E2520] py-2.5 pl-10 pr-9 text-xs text-[#F4F1EA] outline-none placeholder:text-[#636961] focus:border-[#6BA37E]"
        />
        {searchQuery && (
          <button
            onClick={() => updateSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#84877F] hover:text-[#F4F1EA]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Exercise Catalog List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-xs font-semibold uppercase tracking-wider text-[#84877F]">
            {selectedGroup} Exercises ({filteredExercises.length})
          </h2>
          <span className="text-[11px] text-[#D8C39E]">Tap for Adaptive Sheet →</span>
        </div>

        {filteredExercises.length === 0 && <EmptyState title="No exercises found" subtitle="Try a different search or muscle group." />}
        <div className="space-y-2 pr-0.5" data-testid="exercise-catalog-list">
          {filteredExercises.slice(0, visibleCount).map((ex) => (
            <PressScale
              key={ex.id}
              onClick={() => openExerciseSheet(ex)}
              className="flex items-center justify-between rounded-[22px] border border-[#2F3A33] bg-[#1E2520] p-3.5 hover:border-[#528B67]"
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <h4 className="truncate font-heading text-xs font-semibold text-[#F4F1EA]">
                    {ex.name}
                  </h4>
                  <span className="rounded-md bg-[#2B271F] border border-[#4A4232] px-1.5 py-0.5 text-[9px] font-semibold text-[#D8C39E]">
                    {ex.muscleGroup}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-[#84877F]">
                  {ex.equipment} · {ex.secondaryMuscles}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                  <div className="font-heading text-xs font-bold text-[#F4F1EA]">
                    ~{ex.caloriesPerSet * 3} kcal
                  </div>
                  <div className="text-[10px] font-semibold text-[#7BB38F]">+20 XP</div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#528B67] text-[#F4F1EA]">
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                </div>
              </div>
            </PressScale>
          ))}
        </div>
        <p className="catalog-count" aria-live="polite">Showing {Math.min(visibleCount, filteredExercises.length)} of {filteredExercises.length} exercises</p>
        {visibleCount < filteredExercises.length && (
          <button type="button" className="catalog-more" onClick={() => setVisibleCount((count) => count + CATALOG_PAGE_SIZE)}>
            Show more exercises ({filteredExercises.length - visibleCount} remaining)
          </button>
        )}
      </div>

      {/* Logged Workouts Today */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">
            Logged Sessions Today ({todayWorkouts.length})
          </h2>
          <span className="text-xs text-[#84877F]">{totalBurnedToday} kcal burned</span>
        </div>

        {todayWorkouts.length === 0 ? (
          <EmptyState
            title="No Workouts Logged Today"
            subtitle="Select any exercise above to launch the Adaptive Workout Engine bottom sheet."
          />
        ) : (
          <div className="space-y-2">
            {todayWorkouts.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-[22px] border border-[#2F3A33] bg-[#141916] p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#33241E] text-[#DE9473] border border-[#6E4433]">
                    <Dumbbell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate font-heading text-xs font-semibold text-[#F4F1EA]">
                      {w.exerciseName}
                    </h4>
                    <p className="truncate text-[11px] text-[#84877F]">
                      {w.sets} sets × {w.reps} reps ·{' '}
                      {w.weightKg > 0 ? formatWeight(w.weightKg, unit) : 'Bodyweight'} ·{' '}
                      <span className="text-[#7BB38F]">{w.caloriesBurned} kcal</span>
                    </p>
                  </div>
                </div>

                <PressScale
                  onClick={() => removeWorkout(w.id)}
                  ariaLabel={`Remove ${w.exerciseName}`}
                  className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#33241E] text-[#DE9473] hover:bg-[#422D25]"
                >
                  <Trash2 className="h-4 w-4" />
                </PressScale>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL BOTTOM SHEET — Adaptive Workout Engine Set Entry */}
      {selectedExercise && prescription && (
        <div
          onClick={() => closeSheetSmoothly()}
          className={`fixed inset-0 z-50 !m-0 flex items-end justify-center bg-[#0E120F]/80 transition-opacity duration-150 ${
            isSheetClosing ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="workout-sheet-title"
            onClick={(e) => e.stopPropagation()}
            className={`workout-sheet w-full max-h-[92dvh] overflow-y-auto max-w-[430px] rounded-t-[30px] border-t border-[#2F3A33] bg-[#181E1A] p-5 shadow-2xl transition-transform duration-150 ${
              isSheetClosing ? 'translate-y-full' : 'translate-y-0 animate-slide-up'
            }`}
          >
            {/* Drag handle */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#323D36]" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-[#213026] border border-[#3E634B] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7BB38F]">
                  <Sparkles className="h-3 w-3" /> {prescription.protocolName}
                </div>
                <h3 id="workout-sheet-title" className="mt-1.5 font-heading text-base font-bold text-[#F4F1EA]">
                  {selectedExercise.name}
                </h3>
                <p className="text-xs text-[#84877F]">
                  {selectedExercise.muscleGroup} · {selectedExercise.equipment}
                </p>
              </div>

              <button
                id="close-workout-sheet"
                aria-label="Close workout details"
                onClick={() => closeSheetSmoothly()}
                className="rounded-full bg-[#242E27] p-2 text-[#B8B5AD] hover:text-[#F4F1EA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Adaptive Engine Rationale & Form Tip */}
            <div className="mt-3 rounded-2xl border border-[#2F3A33] bg-[#1E2520] p-3 text-xs space-y-1.5">
              <p className="text-[#F4F1EA]">{prescription.goalRationale}</p>
              <p className="text-[11px] text-[#D8C39E]">💡 Coach Cue: {selectedExercise.tip}</p>
              <p className="text-[11px] text-[#B8B5AD]">Load starts at zero or your previous entry. Choose an amount that suits your ability; start light and adjust as needed.</p>
            </div>

            {/* Light BMI Caution Note (if applicable) */}
            {prescription.bmiCautionNote && (
              <div className="mt-2.5 flex items-start gap-2 rounded-2xl border border-[#6E532B] bg-[#2E2418] p-3 text-[11px] text-[#E0B467]">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#E0B467] mt-0.5" />
                <span>{prescription.bmiCautionNote}</span>
              </div>
            )}

            {/* Editable Sets / Reps / Weight / Rest Form */}
            <form onSubmit={handleConfirmLog} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-[#2F3A33] bg-[#1E2520] p-2 text-center">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#84877F]">
                    Sets
                  </label>
                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      aria-label="Decrease sets"
                      onClick={() => setSetsInput(String(Math.max(1, sets - 1)))}
                      className="h-11 w-11 shrink-0 rounded-lg bg-[#2A332D] text-sm font-bold text-[#F4F1EA]"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      aria-label="Sets"
                      min={1}
                      max={20}
                      value={setsInput}
                      onChange={(e) => setSetsInput(e.target.value)}
                      className="w-7 min-w-0 bg-transparent text-center font-heading text-base font-bold text-[#F4F1EA] outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Increase sets"
                      onClick={() => setSetsInput(String(Math.min(20, sets + 1)))}
                      className="h-11 w-11 shrink-0 rounded-lg bg-[#2A332D] text-sm font-bold text-[#F4F1EA]"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#2F3A33] bg-[#1E2520] p-2 text-center">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#84877F]">
                    {selectedExercise.muscleGroup === 'Cardio' ? 'Minutes' : 'Reps'}
                  </label>
                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      aria-label="Decrease reps or minutes"
                      onClick={() => setRepsInput(String(Math.max(1, reps - 1)))}
                      className="h-11 w-11 shrink-0 rounded-lg bg-[#2A332D] text-sm font-bold text-[#F4F1EA]"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      aria-label={selectedExercise.muscleGroup === 'Cardio' ? 'Minutes' : 'Reps'}
                      min={1}
                      max={100}
                      value={repsInput}
                      onChange={(e) => setRepsInput(e.target.value)}
                      className="w-7 min-w-0 bg-transparent text-center font-heading text-base font-bold text-[#F4F1EA] outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Increase reps or minutes"
                      onClick={() => setRepsInput(String(Math.min(100, reps + 1)))}
                      className="h-11 w-11 shrink-0 rounded-lg bg-[#2A332D] text-sm font-bold text-[#F4F1EA]"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="col-span-2 rounded-2xl border border-[#2F3A33] bg-[#1E2520] p-2.5 text-center">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#84877F]">
                    Load ({unit})
                  </label>
                  {selectedExercise.isBodyweight ? (
                    <div className="mt-2 font-heading text-xs font-bold text-[#D8C39E]">
                      Bodyweight
                    </div>
                  ) : (
                    <input
                      type="number"
                      aria-label={`Load in ${unit}`}
                      step="0.5"
                      min={0}
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className="mt-1 w-full rounded-lg bg-[#141916] py-1 text-center font-heading text-base font-bold text-[#7BB38F] outline-none"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-[#1E2520] border border-[#2F3A33] px-3.5 py-2 text-xs text-[#B8B5AD]">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#D8C39E]" />
                  Target Rest: <strong>{restSeconds}s</strong> between sets
                </span>
                <span className="flex items-center gap-1 font-semibold text-[#7BB38F]">
                  <Flame className="h-3.5 w-3.5" />~
                  {Math.round(selectedExercise.caloriesPerSet * sets * (1 + reps / 35))} kcal
                </span>
              </div>

              <PressScale scaleDown={0.97}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#528B67] hover:bg-[#5E9A74] py-3.5 font-heading text-sm font-bold text-[#F4F1EA] shadow-lg"
                >
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>Log Workout Set (+20 XP)</span>
                </button>
              </PressScale>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
