import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, Clock3, Dumbbell, Pause, Play, SkipForward, X } from 'lucide-react';
import { EXERCISE_CATALOG } from '../data/ExerciseCatalog';
import type { WeightUnit } from '../data/types';
import { WORKOUT_SESSION_IDEAS, type WorkoutSessionIdea } from '../data/WorkoutSessions';
import { useFitLife } from '../data/FitLifeStore';
import { easierOption } from '../domain/ExerciseGuidance';
import { exerciseValueLabel } from '../domain/ExerciseDiscovery';
import { estimateWorkoutCalories } from '../domain/AdaptiveWorkoutEngine';
import { displayWeight, parseInputToKg } from '../domain/WeightConverter';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { MotionEntry } from './MotionEntry';
import { ExerciseMotion } from './ExerciseMotion';
import { exerciseMotionFor } from '../data/ExerciseMotion';

interface GuidedState {
  version: 1; sessionId: string; ids: string[]; index: number; doneSets: number; targetSets: number;
  reps: number; load: number; loadUnit: WeightUnit; restSeconds: number; phase: 'work'|'rest'|'paused'|'done';
  resume: 'work'|'rest'; endAt: number; remainingMs: number; loggedSets: number; token: string;
}
const key = (uid: string) => `fitlife_guided_session_v1:${uid}`;
export function loadGuided(uid: string | null): GuidedState | null {
  if (!uid) return null;
  try {
    const v = JSON.parse(localStorage.getItem(key(uid)) || 'null');
    const session = WORKOUT_SESSION_IDEAS.find(s => s.id === v?.sessionId);
    if (!v || v.version !== 1 || !session || !/^[a-z0-9-]{1,80}$/.test(v.token || '') ||
      !Array.isArray(v.ids) || v.ids.length !== session.ids.length || !v.ids.every((id: string, i: number) => {
        const original = EXERCISE_CATALOG.find(e => e.id === session.ids[i]);
        return !!original && (id === original.id || id === easierOption(original).exerciseId) && EXERCISE_CATALOG.some(e => e.id === id);
      }) || !Number.isInteger(v.index) || v.index < 0 || v.index > v.ids.length || !Number.isInteger(v.doneSets) || v.doneSets < 0 ||
      !Number.isInteger(v.targetSets) || v.targetSets < 1 || v.targetSets > 20 || v.doneSets >= v.targetSets || !Number.isInteger(v.reps) || v.reps < 1 || v.reps > 100 ||
      !['kg','lb'].includes(v.loadUnit) || typeof v.load !== 'number' || !Number.isFinite(v.load) || v.load < 0 || v.load > (v.loadUnit === 'lb' ? 2204.6 : 1000) ||
      !Number.isInteger(v.restSeconds) || v.restSeconds < 0 || v.restSeconds > 600 || !['work','rest','paused','done'].includes(v.phase) ||
      (v.phase === 'done' ? v.index !== v.ids.length || v.doneSets !== 0 : v.index >= v.ids.length) || !['work','rest'].includes(v.resume) ||
      !Number.isSafeInteger(v.endAt) || v.endAt < 0 || !Number.isFinite(v.remainingMs) || v.remainingMs < 0 || v.remainingMs > 3_600_000 ||
      !Number.isInteger(v.loggedSets) || v.loggedSets < 0 || v.loggedSets > 1000) return null;
    return v as GuidedState;
  } catch { return null; }
}
function fresh(session: WorkoutSessionIdea, rest: number, unit: WeightUnit): GuidedState {
  const first = EXERCISE_CATALOG.find(e => e.id === session.ids[0]);
  return { version:1, sessionId:session.id, ids:[...session.ids], index:0, doneSets:0, targetSets:first?.muscleGroup === 'Cardio' ? 1 : 2,
    reps:first?.muscleGroup === 'Cardio' ? 1 : 8, load:0, loadUnit:unit, restSeconds:Math.max(0,Math.min(600,rest)), phase:'work', resume:'work', endAt:0, remainingMs:0, loggedSets:0,
    token:`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}` };
}
const time = (ms: number) => `${Math.floor(Math.ceil(Math.max(0,ms)/1000)/60)}:${String(Math.ceil(Math.max(0,ms)/1000)%60).padStart(2,'0')}`;

export const GuidedWorkout: React.FC<{session: WorkoutSessionIdea; resume: boolean; onExit: () => void}> = ({session, resume, onExit}) => {
  const { localOwnerId, settings, profile, weights, latestWeightKg, logWorkout } = useFitLife();
  const owner = localOwnerId || '';
  const startingOwner = useRef(owner).current;
  const [state, setState] = useState<GuidedState>(() => {
    const saved = resume ? loadGuided(owner) : null;
    if (!saved || saved.sessionId !== session.id) return fresh(session, settings.defaultRestSeconds, settings.weightUnit);
    return saved.loadUnit === settings.weightUnit ? saved : { ...saved, load:displayWeight(parseInputToKg(saved.load,saved.loadUnit),settings.weightUnit,1), loadUnit:settings.weightUnit };
  });
  const [now, setNow] = useState(Date.now());
  const [confirmStop, setConfirmStop] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state); stateRef.current = state;
  const logLock = useRef(false);
  const save = (next: GuidedState) => {
    if (!owner || owner !== startingOwner) return;
    try { localStorage.setItem(key(owner), JSON.stringify(next)); } catch { setStorageWarning(true); }
  };
  const pauseAndExit = () => {
    if (confirmStop) { setConfirmStop(false); return; }
    const v = stateRef.current;
    if (v.phase !== 'done' && v.phase !== 'paused') {
      const next: GuidedState = { ...v, phase:'paused', resume:v.phase === 'rest' ? 'rest' : 'work', remainingMs:v.phase === 'rest' ? Math.max(0,v.endAt-Date.now()) : 0 };
      save(next);
    } else save(v);
    onExit();
  };
  useAccessibleDialog(true, root, pauseAndExit);
  useEffect(() => { save(state); }, [state, owner]);
  useEffect(() => {
    if (state.phase !== 'rest') return;
    const tick = () => {
      const n = Date.now(); setNow(n);
      if (n >= state.endAt) setState(prev => prev.phase === 'rest' && prev.endAt <= n ? {...prev,phase:'work',remainingMs:0} : prev);
    };
    tick(); const timer = window.setInterval(tick, 400);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange',tick); };
  }, [state.phase,state.endAt]);

  const current = EXERCISE_CATALOG.find(e => e.id === state.ids[state.index]);
  const alternative = current ? easierOption(current) : null;
  const alternativeExercise = alternative?.exerciseId ? EXERCISE_CATALOG.find(e => e.id === alternative.exerciseId) : undefined;
  const update = (patch: Partial<GuidedState>) => setState(prev => ({...prev,...patch}));
  const pause = () => update({ phase:'paused', resume:state.phase === 'rest' ? 'rest' : 'work', remainingMs:state.phase === 'rest' ? Math.max(0,state.endAt-Date.now()) : 0 });
  const continueSession = () => {
    const remaining = Math.max(0,state.remainingMs);
    update(state.resume === 'rest' && remaining > 0 ? {phase:'rest',endAt:Date.now()+remaining} : {phase:'work',remainingMs:0});
  };
  const nextFor = (index: number) => {
    const next = EXERCISE_CATALOG.find(e => e.id === state.ids[index]);
    return { targetSets:next?.muscleGroup === 'Cardio' ? 1 : 2, reps:next?.muscleGroup === 'Cardio' ? 1 : 8, load:0 };
  };
  const logSet = () => {
    if (!current || !owner || owner !== startingOwner || state.phase !== 'work' || logLock.current) return;
    logLock.current = true; window.setTimeout(() => { logLock.current = false; }, 600);
    const hasWeight = profile.onboarded || weights.some(w => !w.id.startsWith('seed-'));
    const weightKg = current.isBodyweight ? 0 : parseInputToKg(state.load, state.loadUnit);
    const canEstimateEnergy = hasWeight && !current.energyEstimateUnavailable;
    logWorkout({exerciseId:current.id,exerciseName:current.name,muscleGroup:current.muscleGroup,sets:1,reps:state.reps,weightKg,
      caloriesBurned:canEstimateEnergy ? estimateWorkoutCalories(current,1,state.reps,latestWeightKg) : 0,energyEstimateAvailable:canEstimateEnergy,...(current.logUnit === 'seconds' ? {measurementUnit:'seconds' as const} : {}),restSeconds:state.restSeconds}, `guided-${state.token}-${state.loggedSets}`);
    const complete = state.doneSets + 1 >= state.targetSets;
    const index = complete ? state.index + 1 : state.index;
    const end = index >= state.ids.length;
    const next: GuidedState = { ...state, index, doneSets:complete ? 0 : state.doneSets+1, loggedSets:state.loggedSets+1,
      ...(complete && !end ? nextFor(index) : {}), phase:end ? 'done' : state.restSeconds ? 'rest' : 'work', resume:'work',
      endAt:Date.now()+state.restSeconds*1000, remainingMs:state.restSeconds*1000 };
    setNow(Date.now()); setState(next);
  };
  const skipExercise = () => {
    const index = state.index + 1;
    setState({...state,index,doneSets:0,...(index < state.ids.length ? nextFor(index) : {}),phase:index >= state.ids.length ? 'done':'work',remainingMs:0});
  };
  const finish = () => { try { if (owner && owner === startingOwner) localStorage.removeItem(key(owner)); } catch {} onExit(); };
  const progress = Math.min(state.ids.length,state.index + (state.phase === 'done' ? 0 : 1));
  return createPortal(<div className="guided-backdrop"><MotionEntry ref={root} className="guided-sheet" role="dialog" aria-modal="true" aria-labelledby="guided-title" tabIndex={-1}>
    <header className="guided-header"><button type="button" data-dialog-focus onClick={pauseAndExit} aria-label="Pause workout and go back"><ArrowLeft size={21}/></button><div><span>GUIDED WORKOUT</span><h2 id="guided-title">{session.title}</h2></div><button type="button" onClick={pauseAndExit} aria-label="Save and exit workout"><X size={20}/></button></header>
    <div className="guided-scroll">
      <div className="guided-progress-text"><span>{state.phase === 'done' ? 'Session complete' : `Exercise ${progress} of ${state.ids.length}`}</span><strong>{state.loggedSets} {state.loggedSets === 1 ? 'set' : 'sets'} logged</strong></div>
      <div className="guided-progress-track" role="progressbar" aria-label="Workout exercises completed" aria-valuemin={0} aria-valuemax={state.ids.length} aria-valuenow={Math.min(state.index,state.ids.length)}><span style={{transform:`scaleX(${Math.min(1,state.index/state.ids.length)})`}}/></div>
      {storageWarning && <p className="guided-warning" role="alert">Session progress may not persist. Logged sets remain in your workout history.</p>}
      <MotionEntry className="guided-phase" key={`${state.phase}:${state.index}:${current?.id || 'complete'}`}>
      {state.phase === 'done' ? <div className="guided-done"><span><Check size={30}/></span><h3>Well done.</h3><p>{state.loggedSets ? `${state.loggedSets} ${state.loggedSets === 1 ? 'set is' : 'sets are'} saved to your activity.` : 'No sets were logged. You can start again whenever you’re ready.'}</p><button type="button" className="guided-primary" onClick={finish}>Done</button></div>
        : state.phase === 'paused' ? <div className="guided-done"><span><Pause size={28}/></span><h3>Workout paused</h3><p>Your logged sets are saved. Continue when you’re ready.</p><button type="button" className="guided-primary" onClick={continueSession}><Play size={17}/> Resume workout</button><button type="button" className="guided-secondary" onClick={pauseAndExit}>Save & exit</button></div>
        : state.phase === 'rest' ? <div className="guided-rest"><span><Clock3 size={20}/> RECOVERY</span><h3>Take a breath.</h3><div className="guided-rest-time" role="timer" aria-label={`Rest time ${time(state.endAt-now)}`}>{time(state.endAt-now)}</div><p>Next: <strong>{current?.name}</strong></p><div className="guided-rest-actions"><button type="button" onClick={pause}><Pause size={16}/> Pause</button><button type="button" onClick={() => { const remaining = Math.min(3_600_000, Math.max(0,state.endAt-Date.now())+15000); update({endAt:Date.now()+remaining,remainingMs:remaining}); }}>+15 sec</button><button type="button" onClick={() => update({phase:'work',remainingMs:0})}>Skip rest</button></div></div>
        : current && <>
          <div className="guided-exercise"><span className="guided-icon"><Dumbbell size={23}/></span><p>{current.muscleGroup} · {current.equipment}</p><h3>{current.name}</h3><span>Set {state.doneSets+1} of {state.targetSets}</span></div>
          {exerciseMotionFor(current) && <details className="guided-motion"><summary>Watch movement preview</summary><ExerciseMotion exercise={current} showUnavailable={false}/></details>}
          <div className="guided-instruction"><strong>Form cue</strong><p>{current.tip}</p>{current.caution && <p>{current.caution}</p>}<small>Move at a comfortable pace. Stop if you feel pain.</small></div>
          <div className="guided-alt"><strong>Easier option</strong><p>{alternative?.note}</p>{alternativeExercise && <button type="button" onClick={() => { const ids=[...state.ids]; ids[state.index]=alternativeExercise.id; update({ids,doneSets:0,targetSets:alternativeExercise.muscleGroup === 'Cardio' ? 1 : 2,reps:alternativeExercise.muscleGroup === 'Cardio' ? 1 : 8,load:0}); }}>Use {alternativeExercise.name}</button>}</div>
          <div className="guided-inputs"><label>{exerciseValueLabel(current)}<input type="number" min="1" max="100" inputMode="numeric" value={state.reps} onChange={e => update({reps:Math.max(1,Math.min(100,Math.round(Number(e.target.value)||1)))})}/></label>
            {!current.isBodyweight && <label>Load ({state.loadUnit})<input type="number" min="0" max={state.loadUnit === 'lb' ? 2204.6 : 1000} step="0.1" inputMode="decimal" value={state.load} onChange={e => update({load:Math.max(0,Math.min(state.loadUnit === 'lb' ? 2204.6 : 1000,Number(e.target.value)||0))})}/></label>}</div>
          <details className="guided-adjust"><summary>Adjust sets & rest</summary><div><label>Sets for this exercise<input type="number" min={state.doneSets+1} max="20" inputMode="numeric" value={state.targetSets} onChange={e => update({targetSets:Math.max(state.doneSets+1,Math.min(20,Math.round(Number(e.target.value)||1)))})}/></label><label>Rest seconds<input type="number" min="0" max="600" step="15" inputMode="numeric" value={state.restSeconds} onChange={e => update({restSeconds:Math.max(0,Math.min(600,Math.round(Number(e.target.value)||0)))})}/></label></div><p>Starting values are editable, not a prescription.</p></details>
          <button type="button" className="guided-primary" onClick={logSet}><Check size={18}/> Log set</button>
          <div className="guided-bottom-actions"><button type="button" onClick={pause}><Pause size={16}/> Pause</button><button type="button" onClick={skipExercise}><SkipForward size={16}/> Skip exercise</button></div>
        </>}
      </MotionEntry>
      {state.phase !== 'done' && <div className="guided-end">{confirmStop ? <div><p>End this session? Logged sets will stay in your history.</p><button type="button" onClick={finish}>End session</button><button type="button" onClick={() => setConfirmStop(false)}>Keep going</button></div> : <button type="button" onClick={() => setConfirmStop(true)}>End session</button>}</div>}
    </div>
  </MotionEntry></div>,document.body);
};
