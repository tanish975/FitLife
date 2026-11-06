export type ReminderKind = 'workout'|'water';
export interface ReminderState { enabled: boolean; hour: number; minute: number }
export interface WaterPlan {
  enabled: boolean;
  mode: 'times' | 'interval';
  /** Minutes after local midnight, up to twelve distinct daily times. */
  times: number[];
  startMinute: number;
  endMinute: number;
  intervalMinutes: 60 | 120;
}
export type WaterReminderState = ReminderState & Partial<Omit<WaterPlan,'enabled'>>;
export interface ReminderSnapshot { workout: ReminderState; water: WaterReminderState; notificationsEnabled: boolean }
type DailyConfig = {kind: ReminderKind; enabled:boolean; hour:number; minute:number};
interface NativeReminders {
  snapshot(request: string, uid: string): void;
  configure(request: string, uid: string, kind: ReminderKind, enabled: boolean, hour: number, minute: number): void;
  configureWater?(request: string, uid: string, plan: string): void;
  openSettings(request: string, uid: string): void;
}
declare global { interface Window { FitLifeReminders?: NativeReminders } }
export const hasNativeReminders = () => typeof window !== 'undefined' && window.location.protocol === 'file:' && !!window.FitLifeReminders;
export const hasWaterSchedules = () => hasNativeReminders() && typeof window.FitLifeReminders?.configureWater === 'function';
export const asTime = (hour: number, minute: number) => `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
export const minuteTime = (value: number) => asTime(Math.floor(value/60),value%60);
export function parseTime(value: string): number | null {
  const match=/^(\d{2}):(\d{2})$/.exec(value);
  if (!match || +match[1]>23 || +match[2]>59) return null;
  return +match[1]*60 + +match[2];
}
export function validWaterPlan(value: unknown): value is WaterPlan {
  const p=value as WaterPlan | null;
  return !!p && typeof p === 'object' && typeof p.enabled === 'boolean' && (p.mode === 'times' || p.mode === 'interval') &&
    Array.isArray(p.times) && p.times.length >= 1 && p.times.length <= 12 &&
    p.times.every(v => Number.isInteger(v) && v>=0 && v<1440) && new Set(p.times).size === p.times.length &&
    Number.isInteger(p.startMinute) && p.startMinute>=0 && p.startMinute<1440 &&
    Number.isInteger(p.endMinute) && p.endMinute>=p.startMinute && p.endMinute<1440 &&
    (p.intervalMinutes===60 || p.intervalMinutes===120);
}
/** Old Android versions return only hour/minute; show that same single daily time. */
export function waterPlanFrom(state: WaterReminderState): WaterPlan {
  const candidate: WaterPlan = {
    enabled:state.enabled, mode:state.mode || 'times', times:state.times || [state.hour*60+state.minute],
    startMinute:state.startMinute ?? 540, endMinute:state.endMinute ?? 1140, intervalMinutes:state.intervalMinutes ?? 120,
  };
  if (!validWaterPlan(candidate)) throw new Error('Water reminder settings could not be verified.');
  return {...candidate,times:[...candidate.times].sort((a,b)=>a-b)};
}
let n = 0;
const validSnapshot = (x: any): x is ReminderSnapshot => !!x && typeof x === 'object' && typeof x.notificationsEnabled === 'boolean' &&
  ['workout','water'].every(k => x[k] && typeof x[k].enabled === 'boolean' && Number.isInteger(x[k].hour) && x[k].hour >= 0 && x[k].hour <= 23 && Number.isInteger(x[k].minute) && x[k].minute >= 0 && x[k].minute <= 59) &&
  (() => { try { waterPlanFrom(x.water); return true; } catch { return false; } })();
export function remindersRequest<T>(method: 'snapshot'|'configure'|'configureWater'|'openSettings', uid: string, config?: DailyConfig | WaterPlan): Promise<T> {
  const bridge = window.FitLifeReminders;
  if (!bridge || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) return Promise.reject(new Error('Reminders are available in the Android app.'));
  if (method === 'configureWater' && !bridge.configureWater) return Promise.reject(new Error('Update the Android app to use water schedules.'));
  const request = `m_${Date.now()}_${++n}`;
  return new Promise<T>((resolve,reject) => {
    const timer = window.setTimeout(() => finish(new Error('Reminder request timed out.')),35000);
    function result(event: Event) {
      const d = (event as CustomEvent).detail; if (!d || d.requestId !== request) return;
      if (!d.ok) finish(new Error(typeof d.error === 'string' ? d.error : 'Could not change reminders.'));
      else if (method !== 'openSettings' && !validSnapshot(d.result)) finish(new Error('Reminder settings could not be verified.'));
      else finish(null,d.result as T);
    }
    function finish(error: Error|null,value?:T) { window.clearTimeout(timer);window.removeEventListener('fitlife-reminder-result',result);error ? reject(error) : resolve(value as T); }
    window.addEventListener('fitlife-reminder-result',result);
    try {
      if (method === 'configure' && config && 'kind' in config) bridge.configure(request,uid,config.kind,config.enabled,config.hour,config.minute);
      else if (method === 'configureWater' && config && validWaterPlan(config)) bridge.configureWater!(request,uid,JSON.stringify(config));
      else if (method === 'snapshot') bridge.snapshot(request,uid);
      else if (method === 'openSettings') bridge.openSettings(request,uid);
      else finish(new Error('Choose valid, different reminder times and a same-day window.'));
    } catch { finish(new Error('Reminders are unavailable on this device.')); }
  });
}
