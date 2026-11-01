import React, { useEffect, useState } from 'react';
import { Clock3, Pause, Play, RotateCcw } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';

const KEY = 'fitlife_rest_timer_v1';
type Timer = { status: 'running' | 'paused' | 'complete'; endAt: number; remainingMs: number; totalMs: number };

// Deadlines, not interval ticks, measure rest. Closing or suspending the app
// cannot make the countdown drift; completion is shown when the app is next open.
function loadTimer(key: string): Timer | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (!value || !['running', 'paused', 'complete'].includes(value.status) ||
        !Number.isFinite(value.endAt) || !Number.isFinite(value.remainingMs) || !Number.isFinite(value.totalMs) ||
        value.totalMs <= 0 || value.totalMs > 3600000 || value.remainingMs < 0 || value.remainingMs > 3600000 ||
        value.endAt > Date.now() + 3600000) return null;
    if (value.status === 'running' && value.endAt <= Date.now()) return { ...value, status: 'complete', remainingMs: 0 };
    return value as Timer;
  } catch { return null; }
}
function timeLabel(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export const RestTimer: React.FC<{ defaultSeconds: number; startRequest?: { seconds: number; id: number } | null }> = ({ defaultSeconds, startRequest }) => {
  const { localOwnerId } = useFitLife();
  const key = localOwnerId ? `${KEY}:${localOwnerId}` : KEY;
  const [timer, setTimer] = useState<Timer | null>(() => loadTimer(key));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    try { timer ? localStorage.setItem(key, JSON.stringify(timer)) : localStorage.removeItem(key); } catch { /* timer still works in memory */ }
  }, [timer, key]);
  useEffect(() => {
    if (timer?.status !== 'running') return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= timer.endAt) setTimer((previous) => previous?.status === 'running' && previous.endAt <= current
        ? { ...previous, status: 'complete', remainingMs: 0 } : previous);
    };
    tick();
    const interval = window.setInterval(tick, 500);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick); };
  }, [timer?.status, timer?.endAt]);

  useEffect(() => {
    if (!startRequest) return;
    const ms = Math.max(1, Math.min(3600, startRequest.seconds)) * 1000;
    const current = Date.now(); setNow(current);
    setTimer({ status: 'running', endAt: current + ms, remainingMs: ms, totalMs: ms });
  }, [startRequest?.id]);

  const remainingMs = !timer ? defaultSeconds * 1000 : timer.status === 'running' ? Math.max(0, timer.endAt - now) : timer.remainingMs;
  const totalMs = timer?.totalMs || defaultSeconds * 1000;
  const percent = Math.max(0, Math.min(1, remainingMs / totalMs));
  const start = () => { const ms = defaultSeconds * 1000; const current = Date.now(); setNow(current); setTimer({ status: 'running', endAt: current + ms, remainingMs: ms, totalMs: ms }); };
  const pause = () => setTimer((previous) => previous?.status === 'running' ? { ...previous, status: 'paused', remainingMs: Math.max(0, previous.endAt - Date.now()) } : previous);
  const resume = () => { const current = Date.now(); setNow(current); setTimer((previous) => previous?.status === 'paused' ? { ...previous, status: 'running', endAt: current + previous.remainingMs } : previous); };
  const addTime = () => { const current = Date.now(); setNow(current); setTimer((previous) => {
    if (!previous) return { status: 'paused', endAt: current, remainingMs: defaultSeconds * 1000 + 15000, totalMs: defaultSeconds * 1000 + 15000 };
    const remaining = previous.status === 'running' ? Math.max(0, previous.endAt - current) : previous.remainingMs;
    const next = Math.min(3600000, remaining + 15000);
    return { ...previous, status: previous.status === 'running' ? 'running' : 'paused', endAt: current + next, remainingMs: next, totalMs: Math.min(3600000, Math.max(previous.totalMs, remaining) + 15000) };
  }); };
  const status = !timer ? 'Ready when you are' : timer.status === 'running' ? 'Resting' : timer.status === 'paused' ? 'Paused' : 'Rest complete';

  return <section className="rest-card" aria-labelledby="rest-heading">
    <div className="rest-top"><div><span className="training-eyebrow"><Clock3 size={13} /> BETWEEN SETS</span><h2 id="rest-heading">Rest timer</h2><p>Keep your recovery on track.</p></div>
      <div className="rest-display"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" className="rest-ring-track" /><circle cx="32" cy="32" r="28" className="rest-ring-progress" strokeDasharray="175.93" strokeDashoffset={175.93 * (1 - percent)} /></svg><span aria-label={`Rest timer ${timeLabel(remainingMs)}`}>{timeLabel(remainingMs)}</span></div>
    </div>
    <div className="rest-controls">
      {!timer || timer.status === 'complete' ? <button className="rest-primary" type="button" onClick={start}><Play size={15} fill="currentColor" /> Start</button>
        : timer.status === 'running' ? <button className="rest-primary" type="button" onClick={pause}><Pause size={15} fill="currentColor" /> Pause</button>
        : <button className="rest-primary" type="button" onClick={resume}><Play size={15} fill="currentColor" /> Resume</button>}
      <button type="button" onClick={addTime} aria-label="Add 15 seconds to rest timer">+15s</button>
      <button type="button" onClick={() => setTimer(null)} aria-label="Reset rest timer"><RotateCcw size={16} /></button>
      <span className="rest-status" role="status">{status}</span>
    </div>
    <p className="rest-footnote">Timer keeps time while the app is closed; reopen to check. No background alert.</p>
  </section>;
};
