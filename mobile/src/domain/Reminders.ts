export type ReminderKind = 'workout'|'water';
export interface ReminderState { enabled: boolean; hour: number; minute: number }
export interface ReminderSnapshot { workout: ReminderState; water: ReminderState; notificationsEnabled: boolean }
interface NativeReminders {
  snapshot(request: string, uid: string): void;
  configure(request: string, uid: string, kind: ReminderKind, enabled: boolean, hour: number, minute: number): void;
  openSettings(request: string, uid: string): void;
}
declare global { interface Window { FitLifeReminders?: NativeReminders } }
export const hasNativeReminders = () => typeof window !== 'undefined' && window.location.protocol === 'file:' && !!window.FitLifeReminders;
let n = 0;
const validSnapshot = (x: any): x is ReminderSnapshot => !!x && typeof x === 'object' && typeof x.notificationsEnabled === 'boolean' && ['workout','water'].every(k => x[k] && typeof x[k].enabled === 'boolean' && Number.isInteger(x[k].hour) && x[k].hour >= 0 && x[k].hour <= 23 && Number.isInteger(x[k].minute) && x[k].minute >= 0 && x[k].minute <= 59);
export function remindersRequest<T>(method: keyof NativeReminders, uid: string, config?: {kind: ReminderKind;enabled:boolean;hour:number;minute:number}): Promise<T> {
  const bridge = window.FitLifeReminders;
  if (!bridge || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) return Promise.reject(new Error('Reminders are available in the Android app.'));
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
      if (method === 'configure' && config) bridge.configure(request,uid,config.kind,config.enabled,config.hour,config.minute);
      else if (method === 'snapshot') bridge.snapshot(request,uid);
      else if (method === 'openSettings') bridge.openSettings(request,uid);
      else finish(new Error('Invalid reminder request.'));
    } catch { finish(new Error('Reminders are unavailable on this device.')); }
  });
}
