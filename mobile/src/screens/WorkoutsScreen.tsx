import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  Dumbbell,
  Flame,
  Heart,
  Home,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { EXERCISE_CATALOG } from '../data/ExerciseCatalog';
import { WORKOUT_SESSION_IDEAS, type WorkoutSessionIdea } from '../data/WorkoutSessions';
import { GuidedWorkout, loadGuided } from '../components/GuidedWorkout';
import { WeeklyPlanner } from '../components/WeeklyPlanner';
import { easierOption } from '../domain/ExerciseGuidance';
import { ExerciseItem, MuscleGroup } from '../data/types';
import { estimateWorkoutCalories, getWorkoutPrescription } from '../domain/AdaptiveWorkoutEngine';
import { displayWeight, formatWeight, parseInputToKg } from '../domain/WeightConverter';
import { SegmentedSelector } from '../components/SegmentedSelector';
import { PressScale } from '../components/PressScale';
import { MotionEntry } from '../components/MotionEntry';
import { EmptyState } from '../components/EmptyState';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { RestTimer } from '../components/RestTimer';


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
const CATALOG_PAGE_SIZE = 5;
type EquipmentFilter = 'any' | 'bodyweight' | 'dumbbells' | 'band' | 'machine';
const NO_EQUIPMENT_COUNT = EXERCISE_CATALOG.filter((exercise) => exercise.equipment === 'Bodyweight').length;


export const WorkoutsScreen: React.FC<{ initialGroup?: MuscleGroup }> = ({ initialGroup = 'All' }) => {
  const { localOwnerId, profile, settings, latestWeightKg, weights, workouts, todayWorkouts, logWorkout, removeWorkout, toggleFavoriteExercise } =
    useFitLife();
  const unit = settings.weightUnit;
  const hasUserWeight = profile.onboarded || weights.length > 0;
  const reducedMotion = useReducedMotion();

  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup>(initialGroup);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>('any');
  const [sessionId, setSessionId] = useState<string>('');
  const [pickerId, setPickerId] = useState(WORKOUT_SESSION_IDEAS[0].id);
  const [savedSession, setSavedSession] = useState(() => loadGuided(localOwnerId));
  const [guided, setGuided] = useState<{ session: WorkoutSessionIdea; resume: boolean } | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  useEffect(() => { setGuided(null); setConfirmReplace(false); setSavedSession(loadGuided(localOwnerId)); }, [localOwnerId]);
  const openGuided = (session: WorkoutSessionIdea, resume = false) => {
    if (savedSession && !resume) { setConfirmReplace(true); return; }
    setConfirmReplace(false); setGuided({session, resume});
  };
  const [restStart, setRestStart] = useState<{ seconds: number; id: number } | null>(null);
  const [visibleCount, setVisibleCount] = useState(CATALOG_PAGE_SIZE);
  const updateGroup = (value: MuscleGroup) => { setSelectedGroup(value); setVisibleCount(CATALOG_PAGE_SIZE); };
  const updateSearch = (value: string) => { setSearchQuery(value); setVisibleCount(CATALOG_PAGE_SIZE); };
  const revealExerciseCatalog = () => requestAnimationFrame(() => {
    const target = document.getElementById('exercise-catalog-heading');
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'start', behavior: 'auto' });
  });

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

  useEffect(() => {
    if (!selectedExercise) return;
    const onBack = (event: Event) => { if (event.defaultPrevented) return; event.preventDefault(); setSelectedExercise(null); setIsSheetClosing(false); };
    window.addEventListener('fitlife-back', onBack);
    return () => window.removeEventListener('fitlife-back', onBack);
  }, [selectedExercise]);

  const prescription = useMemo(() => {
    if (!selectedExercise) return null;
    return getWorkoutPrescription(
      selectedExercise,
      profile.onboarded ? profile.goal : 'maintain',
      latestWeightKg,
      profile.heightCm,
      profile.age,
      profile.onboarded
    );
  }, [selectedExercise, profile.goal, latestWeightKg, profile.heightCm, profile.age, profile.onboarded]);

  const openExerciseSheet = (ex: ExerciseItem) => {
    const presc = getWorkoutPrescription(ex, profile.onboarded ? profile.goal : 'maintain', latestWeightKg, profile.heightCm, profile.age, profile.onboarded);
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
    const burned = hasUserWeight ? estimateWorkoutCalories(selectedExercise, sets, reps, latestWeightKg) : 0;

    // Confirm immediately; do not delay the actual save behind an exit animation.
    const entry = {
      exerciseId: selectedExercise.id,
      exerciseName: selectedExercise.name,
      muscleGroup: selectedExercise.muscleGroup,
      sets,
      reps,
      weightKg,
      caloriesBurned: burned,
      energyEstimateAvailable: hasUserWeight,
      restSeconds,
    };
    setSelectedExercise(null);
    setIsSheetClosing(false);
    logWorkout(entry);
    if (settings.autoStartRest) { setRestOpen(true); setRestStart({ seconds: restSeconds, id: Date.now() }); }
  };

  const lastSelectedWorkout = selectedExercise ? workouts.filter((entry) => entry.exerciseId === selectedExercise.id && entry.id.startsWith('wk-')).sort((a, b) => b.timestamp - a.timestamp)[0] : undefined;
  const selectedSession = WORKOUT_SESSION_IDEAS.find((session) => session.id === sessionId);
  const filteredExercises = useMemo(() => {
    const matches = EXERCISE_CATALOG.filter((ex) => {
      const matchesGroup = selectedGroup === 'All' || ex.muscleGroup === selectedGroup;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.muscleGroup.toLowerCase().includes(q) ||
        ex.secondaryMuscles.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q);
      const equipment = ex.equipment.toLowerCase();
      const matchesEquipment = equipmentFilter === 'any' ||
        (equipmentFilter === 'bodyweight' && equipment === 'bodyweight') ||
        (equipmentFilter === 'dumbbells' && equipment.includes('dumbbell')) ||
        (equipmentFilter === 'band' && equipment.includes('band')) ||
        (equipmentFilter === 'machine' && /machine|cable|sled|elliptical|bike|treadmill|ergometer/i.test(equipment));
      return matchesGroup && matchesQuery && matchesEquipment && (!selectedSession || selectedSession.ids.includes(ex.id)) && (!favoritesOnly || settings.favoriteExerciseIds.includes(ex.id));
    });
    // Preserve the suggested sequence for a session; otherwise put the new
    // home movements first when the no-equipment filter is active.
    if (selectedSession) return matches.sort((a, b) => selectedSession.ids.indexOf(a.id) - selectedSession.ids.indexOf(b.id));
    if (equipmentFilter === 'bodyweight') return matches.sort((a, b) => Number(b.id.startsWith('ex-home-')) - Number(a.id.startsWith('ex-home-')));
    return matches;
  }, [selectedGroup, searchQuery, favoritesOnly, equipmentFilter, selectedSession, settings.favoriteExerciseIds]);

  const totalBurnedToday = useMemo(
    () => todayWorkouts.reduce((s, w) => s + w.caloriesBurned, 0),
    [todayWorkouts]
  );

  return (
    <div className="space-y-4 px-4 pb-28 pt-2 animate-screen-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-[#F4F1EA]">Workouts</h1>
          <p className="text-xs text-[#84877F]">
            {EXERCISE_CATALOG.length} exercises · your pace
          </p>
        </div>
        <div className="rounded-2xl border border-[#6E4433] bg-[#33241E] px-3 py-1.5 text-right">
          <div className="text-[0.625rem] font-medium text-[#DE9473]">Est. burn today</div>
          <div className="font-heading text-xs font-bold text-[#F4F1EA]">{todayWorkouts.some(w => w.energyEstimateAvailable === false) ? 'Not estimated' : `~${totalBurnedToday} kcal`}</div>
        </div>
      </div>

      <section className="guided-picker" aria-labelledby="guided-picker-title" data-guide-target="workouts-guided">
        <div className="guided-picker-heading"><span><Dumbbell size={21}/></span><div><p>TRAIN WITH A PLAN</p><h2 id="guided-picker-title">Guided workout</h2><small>One set at a time, at your pace.</small></div></div>
        {savedSession && <button type="button" className="guided-resume" onClick={() => { const session=WORKOUT_SESSION_IDEAS.find(x => x.id === savedSession.sessionId); if (session) openGuided(session,true); }}>Resume {WORKOUT_SESSION_IDEAS.find(x => x.id === savedSession.sessionId)?.title} <ArrowRight size={16}/></button>}
        <label htmlFor="guided-session-select">Choose a session</label><div className="guided-picker-controls"><select id="guided-session-select" value={pickerId} onChange={e => {setPickerId(e.target.value);setConfirmReplace(false);}}>{WORKOUT_SESSION_IDEAS.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select><button type="button" onClick={() => { const session=WORKOUT_SESSION_IDEAS.find(x => x.id === pickerId); if (session) openGuided(session); }}>Start</button></div>
        {confirmReplace && <div className="guided-replace" role="alert"><p>Start a new session? Your logged sets stay saved, but the paused session will be replaced.</p><button type="button" onClick={() => { const session=WORKOUT_SESSION_IDEAS.find(x => x.id === pickerId); if (session) {setConfirmReplace(false);setGuided({session,resume:false});} }}>Start new session</button><button type="button" onClick={() => setConfirmReplace(false)}>Cancel</button></div>}
      </section>
      <WeeklyPlanner />
      <section className="home-workout-shortcut" data-guide-target="workouts-home" aria-label="No-equipment workouts at home">
        <div className="home-workout-shortcut-icon"><Home size={19} aria-hidden="true" /></div>
        <div className="home-workout-shortcut-copy"><span className="training-eyebrow">TRAIN AT HOME</span><h2>No equipment needed</h2><p>{NO_EQUIPMENT_COUNT} movements · strength, core & cardio</p></div>
        <button type="button" aria-label="Explore no-equipment home exercises" onClick={() => {
          setSessionId(''); setSelectedGroup('All'); setSearchQuery(''); setEquipmentFilter('bodyweight'); setFavoritesOnly(false); setVisibleCount(CATALOG_PAGE_SIZE);
          revealExerciseCatalog();
        }}>Explore <ArrowRight size={15} aria-hidden="true" /></button>
      </section>

      <details className="training-disclosure" open={restOpen} onToggle={e => setRestOpen(e.currentTarget.open)}><summary>Rest timer <span aria-hidden="true">⌄</span></summary><RestTimer key={localOwnerId || 'unclaimed'} defaultSeconds={settings.defaultRestSeconds} startRequest={restStart} /></details>

      <details className="training-disclosure"><summary>Browse session ideas <span aria-hidden="true">⌄</span></summary>
      <section className="session-ideas" aria-label="Workout session ideas">
        <div className="session-heading"><div><span className="training-eyebrow">NEED A STARTING POINT?</span><h2>Try a session idea</h2></div>{sessionId && <button type="button" onClick={() => { setSessionId(''); setSelectedGroup('All'); setSearchQuery(''); setEquipmentFilter('any'); setFavoritesOnly(false); setVisibleCount(CATALOG_PAGE_SIZE); }}>View all</button>}</div>
        <p>Choose movements that feel right, make space and adjust sets and rest. Stop if you feel pain.</p>
        <div className="session-list">
          {WORKOUT_SESSION_IDEAS.map((session) => <button key={session.id} type="button" className="session-option" aria-pressed={sessionId === session.id}
            onClick={() => { setSessionId(session.id === sessionId ? '' : session.id); setSelectedGroup('All'); setSearchQuery(''); setEquipmentFilter(session.homeNoEquipment ? 'bodyweight' : 'any'); setFavoritesOnly(false); setVisibleCount(CATALOG_PAGE_SIZE); revealExerciseCatalog(); }}>
            {session.homeNoEquipment ? <Home size={16} aria-hidden="true" /> : <Dumbbell size={16} aria-hidden="true" />}<span><strong>{session.title}</strong><small>{session.detail}</small></span>
          </button>)}
        </div>
      </section></details>

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
          aria-label="Search exercises"
          type="text"
          value={searchQuery}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder={`Search ${EXERCISE_CATALOG.length} exercises (squat, row, walking...)`}
          className="w-full rounded-2xl border border-[#2F3A33] bg-[#1E2520] py-2.5 pl-10 pr-9 text-xs text-[#F4F1EA] outline-none placeholder:text-[#636961] focus:border-[#6BA37E]"
        />
        {searchQuery && (
          <button
            onClick={() => updateSearch('')}
            aria-label="Clear exercise search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#84877F] hover:text-[#F4F1EA]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="exercise-tools">
        <button className="favorite-filter" type="button" aria-pressed={favoritesOnly} onClick={() => { setFavoritesOnly((value) => !value); setVisibleCount(CATALOG_PAGE_SIZE); }}><Heart size={15} fill={favoritesOnly ? 'currentColor' : 'none'} /> Favorites ({settings.favoriteExerciseIds.length})</button>
        <label className="equipment-filter"><span>Equipment</span><select value={equipmentFilter} onChange={(event) => { setEquipmentFilter(event.target.value as EquipmentFilter); setVisibleCount(CATALOG_PAGE_SIZE); }} aria-label="Filter by equipment">
          <option value="any">Any equipment</option><option value="bodyweight">No equipment</option><option value="dumbbells">Dumbbells</option><option value="band">Resistance band</option><option value="machine">Gym machines</option>
        </select></label>
      </div>

      {/* Exercise Catalog List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 id="exercise-catalog-heading" data-guide-target="workouts-catalog" tabIndex={-1} className="font-heading text-xs font-semibold uppercase tracking-wider text-[#84877F]">
            {selectedSession ? selectedSession.title : equipmentFilter === 'bodyweight' ? `${selectedGroup === 'All' ? 'No-equipment' : `${selectedGroup} · no-equipment`} exercises` : `${selectedGroup} Exercises`} ({filteredExercises.length})
          </h2>
          <span className="text-[0.6875rem] text-[#D8C39E]">Tap for details →</span>
        </div>

        {filteredExercises.length === 0 && <EmptyState title="No exercises found" subtitle={favoritesOnly ? 'Save exercises with the heart, or turn off Favorites.' : 'Try another search, session, equipment or muscle group.'} />}
        <div className="space-y-2 pr-0.5" data-testid="exercise-catalog-list">
          {filteredExercises.slice(0, visibleCount).map((ex) => {
            const favorite = settings.favoriteExerciseIds.includes(ex.id);
            return <div key={ex.id} data-exercise-id={ex.id} className="exercise-row">
              <button type="button" className="exercise-open" onClick={() => openExerciseSheet(ex)}>
                <div className="min-w-0 pr-3"><div className="flex flex-wrap items-center gap-1.5"><h4 className="break-words font-heading text-xs font-semibold leading-snug text-[#F4F1EA]">{ex.name}</h4><span className="rounded-md bg-[#2B271F] border border-[#4A4232] px-1.5 py-0.5 text-[0.5625rem] font-semibold text-[#D8C39E]">{ex.muscleGroup}</span></div><p className="mt-0.5 text-[0.6875rem] text-[#84877F]">{ex.equipment} · {ex.difficulty} · {ex.secondaryMuscles}</p></div>
                <div className="flex shrink-0 items-center gap-2"><div className="exercise-stats text-right"><div className="font-heading text-xs font-bold text-[#F4F1EA]">{ex.difficulty}</div><div className="text-[0.625rem] font-semibold text-[#7BB38F]">+20 XP</div></div><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#528B67] text-[#F4F1EA]"><Plus className="h-4 w-4 stroke-[2.5]" /></div></div>
              </button>
              <button type="button" className="exercise-favorite" aria-label={`${favorite ? 'Remove' : 'Add'} ${ex.name} ${favorite ? 'from' : 'to'} favorites`} aria-pressed={favorite} onClick={() => toggleFavoriteExercise(ex.id)}><Heart size={19} fill={favorite ? 'currentColor' : 'none'} /></button>
            </div>;
          })}
        </div>
        <p className="training-estimate-note">Calories are rough estimates, not measured energy expenditure.</p>
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
          <span className="text-xs text-[#84877F]">{todayWorkouts.some(w => w.energyEstimateAvailable === false) ? 'Energy not estimated for all entries' : `~${totalBurnedToday} kcal estimated`}</span>
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
                    <p className="truncate text-[0.6875rem] text-[#84877F]">
                      {w.sets} sets × {w.reps} {w.muscleGroup === 'Cardio' ? 'min' : 'reps'} ·{' '}
                      {w.weightKg > 0 ? formatWeight(w.weightKg, unit) : 'Bodyweight'} ·{' '}
                      <span className="text-[#7BB38F]">{w.energyEstimateAvailable === false ? 'Energy not estimated' : `~${w.caloriesBurned} kcal est.`}</span>
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

      {guided && <GuidedWorkout session={guided.session} resume={guided.resume} onExit={() => {setGuided(null);setSavedSession(loadGuided(localOwnerId));}} />}

      {/* MODAL BOTTOM SHEET — Adaptive Workout Engine Set Entry */}
      {selectedExercise && prescription && createPortal(
        <div
          onClick={() => closeSheetSmoothly()}
          className={`fixed inset-0 z-50 !m-0 flex items-end justify-center bg-[#0E120F]/80 transition-opacity duration-150 ${
            isSheetClosing ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <MotionEntry
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
                <div className="inline-flex items-center gap-1 rounded-full bg-[#213026] border border-[#3E634B] px-2.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-[#7BB38F]">
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

            {lastSelectedWorkout && <div className="last-workout-note"><strong>Last time · {lastSelectedWorkout.dateKey}</strong><span>{lastSelectedWorkout.sets} sets × {lastSelectedWorkout.reps} {selectedExercise.muscleGroup === 'Cardio' ? 'min' : 'reps'} · {lastSelectedWorkout.weightKg > 0 ? formatWeight(lastSelectedWorkout.weightKg, unit) : 'No added load'}</span></div>}

            {/* Adaptive Engine Rationale & Form Tip */}
            <div className="mt-3 rounded-2xl border border-[#2F3A33] bg-[#1E2520] p-3 text-xs space-y-1.5">
              <p className="text-[#F4F1EA]">{prescription.goalRationale}</p>
              <p className="text-[0.6875rem] text-[#D8C39E]">💡 Coach Cue: {selectedExercise.tip}</p>
              <p className="text-[0.6875rem] text-[#B8B5AD]">Load starts at zero or your previous entry. Choose an amount that suits your ability; start light and adjust as needed.</p>
              <p className="exercise-easier"><strong>Easier option:</strong> {easierOption(selectedExercise).note}</p>
              {easierOption(selectedExercise).exerciseId && <button type="button" className="exercise-alternative" onClick={() => { const alt=EXERCISE_CATALOG.find(e => e.id === easierOption(selectedExercise).exerciseId); if (alt) openExerciseSheet(alt); }}>View easier movement</button>}
            </div>

            {/* Light BMI Caution Note (if applicable) */}
            {prescription.bmiCautionNote && (
              <div className="mt-2.5 flex items-start gap-2 rounded-2xl border border-[#6E532B] bg-[#2E2418] p-3 text-[0.6875rem] text-[#E0B467]">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#E0B467] mt-0.5" />
                <span>{prescription.bmiCautionNote}</span>
              </div>
            )}

            {/* Editable Sets / Reps / Weight / Rest Form */}
            <form onSubmit={handleConfirmLog} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-[#2F3A33] bg-[#1E2520] p-2 text-center">
                  <label className="block text-[0.625rem] font-semibold uppercase tracking-wider text-[#84877F]">
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
                  <label className="block text-[0.625rem] font-semibold uppercase tracking-wider text-[#84877F]">
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
                  <label className="block text-[0.625rem] font-semibold uppercase tracking-wider text-[#84877F]">
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
                  <Flame className="h-3.5 w-3.5" />
                  {hasUserWeight ? `~${estimateWorkoutCalories(selectedExercise, sets, reps, latestWeightKg)} kcal est.` : 'Add weight for an estimate'}
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
          </MotionEntry>
        </div>, document.body
      )}
    </div>
  );
};
