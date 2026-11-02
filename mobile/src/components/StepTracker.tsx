import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatedCounter } from './AnimatedCounter';
import { MotionEntry } from './MotionEntry';
import { ArrowUpRight, ChevronRight, Footprints, RefreshCw, ShieldCheck, Smartphone, X } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { stepsForDay, type StepObservation } from '../domain/PersonalFeatures';
import { getDateKeyDaysAgo, formatShortDateLabel } from '../domain/ProgressAggregator';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { useStepTracking } from './StepTrackingProvider';

const format = (n: number) => n.toLocaleString();
const sourceName = (row: StepObservation) => row.source === 'health' ? 'Health Connect' : 'Phone sensor';

export const StepTracker: React.FC = () => {
  const { settings, todayKey } = useFitLife();
  const tracking = useStepTracking();
  const [open, setOpen] = useState(false);
  const records = settings.stepHistory || [];
  const goal = settings.stepGoal || 6000;
  const today = useMemo(() => {
    const liveHealth = tracking.snapshot?.records.find(r => r.dateKey === todayKey && r.source === 'health' && r.deviceId === tracking.snapshot?.deviceId);
    if (liveHealth) return records.find(r => r.dateKey === todayKey && r.source === 'health' && r.deviceId === liveHealth.deviceId) || liveHealth;
    if (tracking.snapshot?.phoneRunning) {
      const phone = records.find(r => r.dateKey === todayKey && r.source === 'phone' && r.deviceId === tracking.snapshot?.deviceId);
      if (phone) return phone;
    }
    return stepsForDay(records, todayKey);
  }, [records, todayKey, tracking.snapshot]);
  const fraction = Math.max(0, Math.min(1, (today?.count || 0) / goal));
  const status = today ? `${sourceName(today)}${today.partial ? ' · partial day' : ''}` : !tracking.available ? 'Available in the Android app' : tracking.loading ? 'Checking sources…' : 'Connect a step source';
  return <>
    <section className="step-card" aria-labelledby="steps-title" data-guide-target="home-steps">
      <div className="step-card-top"><div className="step-title"><span className="step-symbol"><Footprints size={17} aria-hidden="true" /></span><div><p>YOUR MOVEMENT</p><h2 id="steps-title">Daily steps</h2></div></div>
        <button type="button" className="step-detail-link" onClick={() => setOpen(true)} aria-label={today ? 'View step details and sources' : 'Set up step tracking'}>{today ? 'Details' : 'Set up'} <ArrowUpRight size={16}/></button></div>
      <div className="step-card-body">
        <div className="step-ring" role="img" aria-label={today ? `${format(today.count)} steps, ${Math.round(fraction * 100)} percent of the ${format(goal)} step goal` : 'No step count available'}>
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="step-ring-track" cx="60" cy="60" r="49"/><circle className="step-ring-fill" cx="60" cy="60" r="49" strokeDasharray="307.88" strokeDashoffset={307.88 * (1 - fraction)}/></svg>
          <div><strong>{today ? <AnimatedCounter value={today.count} duration={300} /> : '—'}</strong><span>steps</span></div>
        </div>
        <div className="step-card-copy"><strong>{today ? (today.count >= goal ? 'Goal reached' : `${format(Math.max(0, goal - today.count))} to go`) : 'Every step counts'}</strong>
          <span>Daily goal · {format(goal)}</span><small>{status}</small>
          <button type="button" onClick={() => setOpen(true)}>{today ? 'See your week' : 'Connect steps'} <ChevronRight size={16}/></button>
        </div>
      </div>
    </section>
    {open && <StepDetail onClose={() => setOpen(false)} today={today} />}
  </>;
};

const StepDetail: React.FC<{onClose: () => void; today: StepObservation | null}> = ({ onClose, today }) => {
  const { settings, setStepGoal, todayKey } = useFitLife();
  const tracking = useStepTracking();
  const [busy, setBusy] = useState('');
  const [goalText, setGoalText] = useState(String(settings.stepGoal || 6000));
  const [goalError, setGoalError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  useAccessibleDialog(true, root, onClose);
  const goal = settings.stepGoal || 6000;
  const history = Array.from({length: 7}, (_, i) => {
    const day = getDateKeyDaysAgo(6 - i);
    const observation = day === todayKey ? today : stepsForDay(settings.stepHistory || [], day);
    return {day, observation, label:formatShortDateLabel(day).shortDay};
  });
  const max = Math.max(goal, ...history.map(x => x.observation?.count || 0), 1);
  const doAction = async (action: 'connectHealth'|'disconnectHealth'|'connectPhone'|'disconnectPhone') => {
    setBusy(action); try { await tracking.action(action); } catch { /* message is announced below */ } finally { setBusy(''); }
  };
  const healthConnected = tracking.snapshot?.healthEnabled || false;
  const phoneEnabled = tracking.snapshot?.phoneEnabled || false;
  const phoneRunning = tracking.snapshot?.phoneRunning || false;
  const saveGoal = (event: React.FormEvent) => {
    event.preventDefault(); const n = Number(goalText);
    if (!Number.isInteger(n) || n < 100 || n > 100000) { setGoalError('Enter a goal between 100 and 100,000.'); return; }
    setStepGoal(n); setGoalError('');
  };
  return createPortal(<MotionEntry className="step-sheet-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <MotionEntry ref={root} className="step-sheet" role="dialog" aria-modal="true" aria-labelledby="step-sheet-title" tabIndex={-1}>
      <header className="step-sheet-header"><div><p>YOUR MOVEMENT</p><h2 id="step-sheet-title">Your steps</h2></div><button type="button" data-dialog-focus aria-label="Close step details" onClick={onClose}><X size={20}/></button></header>
      <div className="step-sheet-scroll">
        <div className="step-sheet-summary"><div><span>Today</span><strong>{today ? format(today.count) : '—'} <small>steps</small></strong><p>{today ? `${sourceName(today)}${today.partial ? ' · partial day' : ''}` : 'No reading yet'}</p></div><Footprints size={28} aria-hidden="true"/></div>
        <section className="step-week" aria-labelledby="step-week-title"><div className="step-section-heading"><h3 id="step-week-title">Last 7 days</h3><span>Daily totals</span></div><div className="step-bars">{history.map(x => <div className="step-bar-day" key={x.day} aria-label={`${x.label}, ${x.observation ? `${format(x.observation.count)} steps, ${sourceName(x.observation)}${x.observation.partial ? ', partial day' : ''}` : 'no data'}`}><span>{x.observation ? (x.observation.count >= 1000 ? `${(x.observation.count / 1000).toFixed(x.observation.count >= 10000 ? 0 : 1)}k` : x.observation.count) : '—'}</span><div className="step-bar-track"><i style={{height: x.observation ? `${Math.max(4, Math.round(x.observation.count / max * 100))}%` : '0%'}}/></div><small>{x.label}</small></div>)}</div><p className="step-caption">A dash means no data, not zero steps.</p></section>
        <form className="step-goal" onSubmit={saveGoal}><label htmlFor="step-goal-input">Daily goal</label><div><input id="step-goal-input" type="number" inputMode="numeric" min="100" max="100000" step="100" value={goalText} onChange={e => setGoalText(e.target.value)} /><button type="submit">Save goal</button></div>{goalError && <p role="alert">{goalError}</p>}</form>
        <section className="step-sources" aria-labelledby="step-sources-title"><div className="step-section-heading"><h3 id="step-sources-title">Step sources</h3><button type="button" disabled={tracking.loading || !!busy} onClick={() => void tracking.refresh(true)} aria-label="Refresh step sources"><RefreshCw size={17}/></button></div>
          {!tracking.available ? <p className="step-caption">Step tracking requires the FitLife Android app.</p> : <>
            <div className="step-source"><span className="step-source-icon"><ShieldCheck size={19}/></span><div><strong>Health Connect</strong><small>{healthConnected ? (tracking.snapshot?.healthState === 'ready' ? 'Connected' : tracking.snapshot?.healthState === 'no_data' ? 'Connected · waiting for data' : 'Connected · data unavailable') : tracking.snapshot?.healthAvailability === 'install' ? 'Install or update Health Connect' : tracking.snapshot?.healthAvailability === 'unsupported' ? 'Not available on this device' : tracking.snapshot?.healthState === 'permission' ? 'Permission needed' : 'Not connected'}</small></div>
              <button type="button" disabled={!!busy || (!healthConnected && tracking.snapshot?.healthAvailability !== 'available')} onClick={() => void doAction(healthConnected ? 'disconnectHealth' : 'connectHealth')}>{busy.includes('Health') ? 'Please wait' : healthConnected ? 'Disconnect' : 'Connect'}</button></div>
            <p className="step-caption">Connecting shares this Android profile’s daily Health Connect totals, including data from other apps, with your FitLife account. While FitLife’s app data remains intact, only the first connecting account can use this source. Clearing app data or uninstalling removes that protection.</p>
            {tracking.snapshot?.healthAvailability === 'install' && <a className="step-install-link" href="https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata">Get Health Connect <ArrowUpRight size={14}/></a>}
            <div className="step-source"><span className="step-source-icon"><Smartphone size={19}/></span><div><strong>Phone sensor</strong><small>{!tracking.snapshot?.phoneAvailable ? 'Not available on this phone' : phoneRunning ? (tracking.snapshot?.phoneNotificationVisible ? 'Tracking with a notification' : 'Tracking · notification hidden') : phoneEnabled ? 'Paused · reopen or resume' : 'Not tracking'}</small></div>
              {phoneEnabled && !phoneRunning && <button type="button" disabled={!!busy} onClick={() => void doAction('disconnectPhone')}>Stop</button>}
              {(!phoneEnabled || !phoneRunning) && <button type="button" disabled={!!busy || !tracking.snapshot?.phoneAvailable} onClick={() => void doAction('connectPhone')}>{busy.includes('Phone') ? 'Please wait' : phoneEnabled ? 'Resume' : 'Start'}</button>}
              {phoneRunning && <button type="button" disabled={!!busy} onClick={() => void doAction('disconnectPhone')}>{busy.includes('Phone') ? 'Please wait' : 'Stop'}</button>}</div>
          </>}
          {tracking.error && <p className="step-error" role="alert">{tracking.error}</p>}
        </section>
        <details className="step-about"><summary>How steps and privacy work</summary><p>Health Connect is preferred when it has a current reading; otherwise FitLife can use the phone sensor. Their counts are never added together. When devices overlap, history uses one reading rather than summing them.</p><p>For account privacy, a Health Connect day is read only if this account has stayed connected since local midnight. The first day may not have a Health reading. The phone sensor can start immediately. A partial day or interruption may undercount; data sources and permissions affect accuracy.</p><p>Daily totals sync to your FitLife account when the app is open and online. Firebase data is not end-to-end encrypted. Disconnect here; revoke permissions in Android or Health Connect settings.</p></details>
      </div>
    </MotionEntry>
  </MotionEntry>, document.body);
};
