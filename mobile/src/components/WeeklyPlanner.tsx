import React, { useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { WORKOUT_SESSION_IDEAS } from '../data/WorkoutSessions';
import { formatDateKey } from '../domain/ProgressAggregator';

const DAYS = [{id:1,label:'Mon'},{id:2,label:'Tue'},{id:3,label:'Wed'},{id:4,label:'Thu'},{id:5,label:'Fri'},{id:6,label:'Sat'},{id:0,label:'Sun'}];
export const WeeklyPlanner: React.FC = () => {
  const { settings, workouts, setPlannedDay } = useFitLife();
  const [day, setDay] = useState(new Date().getDay());
  const plan = settings.weeklyPlan || [];
  const weekStart = new Date(); weekStart.setHours(12,0,0,0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay()+6)%7));
  const dates = DAYS.map((entry,i) => { const d = new Date(weekStart); d.setDate(d.getDate()+i); return {...entry,dateKey:formatDateKey(d)}; });
  const completed = new Set(workouts.filter(w => !w.id.startsWith('seed-') && !w.id.startsWith('today-wk-') && dates.some(d => d.dateKey === w.dateKey)).map(w => w.dateKey));
  const selected = plan.find(p => p.weekday === day)?.sessionId || '';
  return <details className="weekly-planner">
    <summary data-guide-target="workouts-plan"><span className="weekly-planner-icon"><CalendarDays size={19}/></span><span><strong>Your week</strong><small>{completed.size} of {settings.weeklyWorkoutGoal} workout days</small><span className="planner-progress" role="progressbar" aria-label="Weekly workout days" aria-valuemin={0} aria-valuemax={settings.weeklyWorkoutGoal} aria-valuenow={Math.min(completed.size,settings.weeklyWorkoutGoal)} aria-valuetext={`${completed.size} workout days; goal ${settings.weeklyWorkoutGoal}`}><i style={{transform:`scaleX(${Math.min(1,completed.size/settings.weeklyWorkoutGoal)})`}}/></span></span><ChevronDown size={18}/></summary>
    <div className="weekly-planner-body"><p>Choose workouts or rest. This plan repeats weekly and can be changed anytime.</p>
      <div className="planner-days" aria-label="Choose a day">{dates.map(d => <button key={d.id} type="button" aria-pressed={day === d.id} aria-label={`${d.label}${completed.has(d.dateKey) ? ', workout logged' : ''}${plan.some(p => p.weekday === d.id && p.sessionId) ? ', planned' : ''}`} onClick={() => setDay(d.id)}><span>{d.label}</span><i className={completed.has(d.dateKey) ? 'is-complete' : plan.some(p => p.weekday === d.id && p.sessionId) ? 'is-planned' : ''}/></button>)}</div>
      <label className="planner-select">{DAYS.find(d => d.id === day)?.label} plan<select value={selected} onChange={e => setPlannedDay(day,e.target.value)}><option value="">No plan</option><option value="rest">Rest day</option>{selected && selected !== 'rest' && !WORKOUT_SESSION_IDEAS.some(s => s.id === selected) && <option value={selected}>Unavailable session (saved)</option>}{WORKOUT_SESSION_IDEAS.map(s => <option value={s.id} key={s.id}>{s.title}</option>)}</select></label>
      <p className="planner-hint">A filled dot means a workout was logged; an outline means a plan is set. Rest is part of progress.</p>
    </div>
  </details>;
};
