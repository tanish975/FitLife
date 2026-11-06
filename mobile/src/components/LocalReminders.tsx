import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { asTime, hasNativeReminders, hasWaterSchedules, minuteTime, parseTime, remindersRequest, validWaterPlan, waterPlanFrom,
  type ReminderKind, type ReminderSnapshot, type WaterPlan } from '../domain/Reminders';

type WaterDraft = { mode:'times'|'interval'; times:string[]; start:string; end:string; every:60|120 };
const draftFrom = (plan:WaterPlan):WaterDraft => ({mode:plan.mode,times:plan.times.map(minuteTime),start:minuteTime(plan.startMinute),end:minuteTime(plan.endMinute),every:plan.intervalMinutes});
const defaultDraft:WaterDraft = {mode:'times',times:['12:00'],start:'09:00',end:'19:00',every:120};
function makePlan(draft:WaterDraft,enabled:boolean,fallback:WaterPlan):WaterPlan | null {
  const parsed=draft.times.map(parseTime);
  const validTimes=parsed.length>=1 && parsed.length<=12 && !parsed.some(x=>x===null) && new Set(parsed).size===parsed.length;
  let times=validTimes ? parsed as number[] : fallback.times;
  let start=parseTime(draft.start), end=parseTime(draft.end);
  const validWindow=start!==null && end!==null && start<=end;
  // Hidden fields from the other mode must not trap the user in an error.
  if (draft.mode==='times' && !validWindow) {start=fallback.startMinute;end=fallback.endMinute;}
  if (draft.mode==='interval' && !validTimes) times=fallback.times;
  if ((draft.mode==='times' && !validTimes) || start===null || end===null) return null;
  const result:WaterPlan={enabled,mode:draft.mode,times,startMinute:start,endMinute:end,intervalMinutes:draft.every};
  return validWaterPlan(result) ? {...result,times:[...result.times].sort((a,b)=>a-b)} : null;
}

export const LocalReminders: React.FC = () => {
  const { cloudAccount } = useFitLife();
  const uid = cloudAccount?.uid || null;
  const uidRef = useRef(uid); uidRef.current = uid;
  const available = hasNativeReminders(), advanced = hasWaterSchedules();
  const [state,setState] = useState<ReminderSnapshot|null>(null);
  const [clocks,setClocks] = useState({workout:'08:00',water:'12:00'});
  const [draft,setDraft] = useState<WaterDraft>(defaultDraft);
  const clockDirty = useRef({workout:false,water:false});
  const draftDirty = useRef(false);
  const [changed,setChanged] = useState(false);
  const [busy,setBusy] = useState('');
  const busyRef=useRef(false), refreshVersion=useRef(0);
  const [message,setMessage] = useState('');
  const refresh = async () => {
    const owner = uidRef.current; if (!available || !owner || busyRef.current) return;
    const version=++refreshVersion.current;
    try {
      const result = await remindersRequest<ReminderSnapshot>('snapshot',owner);
      if (uidRef.current !== owner || version!==refreshVersion.current || busyRef.current) return;
      setState(result);
      setClocks(v=>({workout:clockDirty.current.workout?v.workout:asTime(result.workout.hour,result.workout.minute),water:clockDirty.current.water?v.water:asTime(result.water.hour,result.water.minute)}));
      if (!draftDirty.current) setDraft(draftFrom(waterPlanFrom(result.water)));
    } catch (e) { if (uidRef.current === owner && version===refreshVersion.current && !busyRef.current) setMessage(e instanceof Error ? e.message : 'Reminders unavailable.'); }
  };
  useEffect(() => {
    refreshVersion.current++;busyRef.current=false;clockDirty.current={workout:false,water:false};draftDirty.current=false;setChanged(false);setDraft(defaultDraft);
    setState(null);setBusy('');setMessage('');void refresh();
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange',visible); return () => document.removeEventListener('visibilitychange',visible);
  }, [uid,available,advanced]);
  const configure = async (kind:ReminderKind, enabled:boolean) => {
    const owner=uidRef.current; if (!owner || busyRef.current) return;
    const time=parseTime(clocks[kind]);
    if (time===null) {setMessage('Choose a valid time.');return;}
    busyRef.current=true;refreshVersion.current++;setBusy(kind);setMessage('');
    try {
      const result = await remindersRequest<ReminderSnapshot>('configure',owner,{kind,enabled,hour:Math.floor(time/60),minute:time%60});
      if (uidRef.current !== owner) return;
      clockDirty.current[kind]=false;setState(result);
      setClocks(v=>({...v,[kind]:asTime(result[kind].hour,result[kind].minute)}));
      setMessage(enabled ? `${kind === 'water' ? 'Water' : 'Workout'} reminder saved on this phone.` : 'Reminder turned off.');
    } catch (e) { if (uidRef.current === owner) setMessage(e instanceof Error ? e.message : 'Could not save reminder.'); }
    finally { if (uidRef.current === owner) {busyRef.current=false;setBusy('');} }
  };
  const editDraft = (change:Partial<WaterDraft>) => {draftDirty.current=true;setChanged(true);setDraft(v=>({...v,...change}));};
  const saveWater = async (enabled:boolean) => {
    const owner=uidRef.current; if (!owner || !state || busyRef.current) return;
    // Turning off preserves the saved schedule, not unsaved edits.
    const saved=waterPlanFrom(state.water);
    const plan=enabled ? makePlan(draft,true,saved) : {...saved,enabled:false};
    if (!plan) {setMessage('Choose different valid times and a same-day start and end.');return;}
    busyRef.current=true;refreshVersion.current++;setBusy('water');setMessage('');
    try {
      const result=await remindersRequest<ReminderSnapshot>('configureWater',owner,plan);
      if (uidRef.current!==owner) return;
      draftDirty.current=false;setChanged(false);setState(result);setDraft(draftFrom(waterPlanFrom(result.water)));
      setMessage(enabled?'Water schedule saved on this phone.':'Water reminders turned off.');
    } catch(e) { if (uidRef.current===owner) setMessage(e instanceof Error?e.message:'Could not save water schedule.'); }
    finally {if(uidRef.current===owner){busyRef.current=false;setBusy('');}}
  };
  const addTime = () => {
    const used=new Set(draft.times.map(parseTime));
    let next=(parseTime(draft.times[draft.times.length-1]) ?? 660)+60;
    while (used.has(next%1440)) next+=30;
    editDraft({times:[...draft.times,minuteTime(next%1440)]});
  };
  const dailyRow = (kind:ReminderKind) => <div className="reminder-row" key={kind}>
    <div><strong>{kind === 'workout' ? 'Workout' : 'Water'}</strong><small>{state?.[kind].enabled ? 'On' : 'Off'}</small></div>
    <label><span className="sr-only">{kind === 'workout' ? 'Workout' : 'Water'} reminder time</span><input type="time" disabled={!!busy || !state} value={clocks[kind]} onChange={e => {clockDirty.current[kind]=true;setClocks(v=>({...v,[kind]:e.target.value}));}}/></label>
    <button type="button" disabled={!!busy || !state} onClick={() => void configure(kind,!state?.[kind].enabled)}>{busy===kind?'Saving…':state?.[kind].enabled?'Turn off':'Turn on'}</button>
    {state?.[kind].enabled && clocks[kind] !== asTime(state[kind].hour,state[kind].minute) && <button className="reminder-save-time" type="button" disabled={!!busy} onClick={() => void configure(kind,true)}>Save time</button>}
  </div>;
  return <details className="reminder-settings"><summary data-guide-target="settings-reminders"><span className="reminder-icon"><Bell size={18}/></span><span><strong>Reminders</strong><small>Workout & water · optional</small></span><ChevronDown size={18}/></summary>
    <div className="reminder-body">
      {!available ? <p>Reminders are available in the Android app.</p> : <>
        <p>On this phone only. Android may delay notifications due to battery settings.</p>
        {dailyRow('workout')}
        {!advanced ? <>{dailyRow('water')}<p>Update the Android app for multiple water reminders.</p></> :
          <section className="water-schedule" aria-labelledby="water-reminders-heading">
            <div className="water-heading"><div><strong id="water-reminders-heading">Water</strong><small>{state?.water.enabled?'On':'Off'}</small></div>
              {state?.water.enabled && <button type="button" disabled={!!busy} onClick={()=>void saveWater(false)}>Turn off</button>}
            </div>
            <label className="water-field"><span>Schedule</span><select aria-label="Water reminder schedule" disabled={!!busy || !state} value={draft.mode==='times'?'times':String(draft.every)} onChange={e=>e.target.value==='times'?editDraft({mode:'times'}):editDraft({mode:'interval',every:Number(e.target.value) as 60|120})}>
              <option value="times">Specific times</option><option value="60">Every hour</option><option value="120">Every 2 hours</option>
            </select></label>
            {draft.mode==='times' ? <div className="water-times">
              {draft.times.map((time,index)=><div className="water-time-row" key={index}><label className="water-field"><span>Time {index+1}</span><input aria-label={`Water reminder time ${index+1}`} type="time" value={time} disabled={!!busy || !state} onChange={e=>editDraft({times:draft.times.map((v,i)=>i===index?e.target.value:v)})}/></label>
                {draft.times.length>1 && <button type="button" aria-label={`Remove water time ${index+1}`} disabled={!!busy} onClick={()=>editDraft({times:draft.times.filter((_,i)=>i!==index)})}><Trash2 size={17}/></button>}</div>)}
              <div className="water-time-actions"><button type="button" disabled={!!busy || !state || draft.times.length>=12} onClick={addTime}><Plus size={16}/> Add time</button><button type="button" disabled={!!busy || !state} onClick={()=>editDraft({times:['11:00','15:00','19:00']})}>Use 11:00, 15:00 & 19:00</button></div>
            </div> : <div className="water-window"><label className="water-field"><span>From</span><input aria-label="Water reminders start" type="time" value={draft.start} disabled={!!busy || !state} onChange={e=>editDraft({start:e.target.value})}/></label><label className="water-field"><span>Until</span><input aria-label="Water reminders end" type="time" value={draft.end} disabled={!!busy || !state} onChange={e=>editDraft({end:e.target.value})}/></label><small>Same-day window; no overnight reminders.</small></div>}
            <p className="water-explainer">Times are approximate. Alerts more than an hour late, or after the chosen window, are skipped—not replayed.</p>
            {(!state?.water.enabled || changed) && <button className="water-primary" type="button" disabled={!!busy || !state} onClick={()=>void saveWater(true)}>{busy==='water'?'Saving…':state?.water.enabled?'Save schedule':'Turn on'}</button>}
          </section>}
        {state && !state.notificationsEnabled && <button className="reminder-system" type="button" onClick={() => uid && void remindersRequest('openSettings',uid).catch(e => setMessage(e.message))}>Open Android notification settings</button>}
        {message && <p className="reminder-message" role="status">{message}</p>}
      </>}
    </div>
  </details>;
};
