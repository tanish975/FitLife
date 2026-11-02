import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { hasNativeReminders, remindersRequest, type ReminderKind, type ReminderSnapshot } from '../domain/Reminders';

const asTime = (hour: number, minute: number) => `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
export const LocalReminders: React.FC = () => {
  const { cloudAccount } = useFitLife();
  const uid = cloudAccount?.uid || null;
  const uidRef = useRef(uid); uidRef.current = uid;
  const available = hasNativeReminders();
  const [state,setState] = useState<ReminderSnapshot|null>(null);
  const [clocks,setClocks] = useState({workout:'08:00',water:'12:00'});
  const [busy,setBusy] = useState('');
  const [message,setMessage] = useState('');
  const refresh = async () => {
    const owner = uidRef.current; if (!available || !owner) return;
    try {
      const result = await remindersRequest<ReminderSnapshot>('snapshot',owner);
      if (uidRef.current !== owner) return;
      setState(result); setClocks({workout:asTime(result.workout.hour,result.workout.minute),water:asTime(result.water.hour,result.water.minute)});
    } catch (e) { if (uidRef.current === owner) setMessage(e instanceof Error ? e.message : 'Reminders unavailable.'); }
  };
  useEffect(() => {
    setState(null);setMessage('');void refresh();
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange',visible); return () => document.removeEventListener('visibilitychange',visible);
  }, [uid,available]);
  const configure = async (kind: ReminderKind, enabled: boolean) => {
    const owner=uidRef.current; if (!owner) return;
    const match=/^(\d{2}):(\d{2})$/.exec(clocks[kind]);
    if (!match || Number(match[1])>23 || Number(match[2])>59) {setMessage('Choose a valid time.');return;}
    setBusy(kind);setMessage('');
    try {
      const result = await remindersRequest<ReminderSnapshot>('configure',owner,{kind,enabled,hour:Number(match[1]),minute:Number(match[2])});
      if (uidRef.current !== owner) return; setState(result); setMessage(enabled ? `${kind === 'water' ? 'Water' : 'Workout'} reminder saved on this phone.` : 'Reminder turned off.');
    } catch (e) { if (uidRef.current === owner) setMessage(e instanceof Error ? e.message : 'Could not save reminder.'); }
    finally { if (uidRef.current === owner) setBusy(''); }
  };
  return <details className="reminder-settings"><summary data-guide-target="settings-reminders"><span className="reminder-icon"><Bell size={18}/></span><span><strong>Reminders</strong><small>Workout & water · optional</small></span><ChevronDown size={18}/></summary>
    <div className="reminder-body">
      {!available ? <p>Reminders are available in the Android app.</p> : <>
        <p>On this phone only. Android may deliver them late due to battery settings.</p>
        {(['workout','water'] as const).map(kind => <div className="reminder-row" key={kind}><div><strong>{kind === 'workout' ? 'Workout' : 'Water'}</strong><small>{state?.[kind].enabled ? 'On' : 'Off'}</small></div><label><span className="sr-only">{kind === 'workout' ? 'Workout' : 'Water'} reminder time</span><input type="time" value={clocks[kind]} onChange={e => setClocks(v => ({...v,[kind]:e.target.value}))}/></label><button type="button" disabled={!!busy || !state} onClick={() => void configure(kind,!state?.[kind].enabled)}>{busy === kind ? 'Saving…' : state?.[kind].enabled ? 'Turn off' : 'Turn on'}</button>{state?.[kind].enabled && clocks[kind] !== asTime(state[kind].hour,state[kind].minute) && <button className="reminder-save-time" type="button" disabled={!!busy} onClick={() => void configure(kind,true)}>Save time</button>}</div>)}
        {state && !state.notificationsEnabled && <button className="reminder-system" type="button" onClick={() => uid && void remindersRequest('openSettings',uid).catch(e => setMessage(e.message))}>Open Android notification settings</button>}
        {message && <p className="reminder-message" role="status">{message}</p>}
      </>}
    </div>
  </details>;
};
