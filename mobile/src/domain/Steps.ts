import { validStepObservation, type StepObservation } from './PersonalFeatures';

export interface StepSnapshot {
  deviceId: string;
  phoneAvailable: boolean;
  phonePermission: boolean;
  phoneEnabled: boolean;
  phoneRunning: boolean;
  phoneNotificationVisible: boolean;
  healthEnabled: boolean;
  healthAvailability: 'available' | 'install' | 'unsupported';
  healthState: 'ready' | 'no_data' | 'disabled' | 'permission' | 'error' | 'available' | 'install' | 'unsupported' | 'account_changed';
  records: StepObservation[];
}
interface NativeSteps {
  snapshot(request: string, uid: string, days: number): void;
  connectHealth(request: string, uid: string): void;
  disconnectHealth(request: string, uid: string): void;
  connectPhone(request: string, uid: string): void;
  disconnectPhone(request: string, uid: string): void;
}
declare global { interface Window { FitLifeSteps?: NativeSteps } }
export const hasNativeSteps = () => typeof window !== 'undefined' && window.location.protocol === 'file:' && !!window.FitLifeSteps;
let sequence = 0;
export function stepsRequest<T>(method: keyof NativeSteps, uid: string, days = 1): Promise<T> {
  const native = window.FitLifeSteps;
  if (!native || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) return Promise.reject(new Error('Step tracking is available in the Android app.'));
  const request = `s_${Date.now()}_${++sequence}`;
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => finish(new Error('Step request timed out. Try again.')), days > 1 ? 90000 : 35000);
    function onResult(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (!detail || detail.requestId !== request) return;
      if (!detail.ok) finish(new Error(typeof detail.error === 'string' ? detail.error : 'Could not access steps.'));
      else if (method === 'snapshot' && !validStepSnapshot(detail.result)) finish(new Error('Step data could not be verified.'));
      else finish(null, detail.result as T);
    }
    function finish(error: Error | null, result?: T) {
      window.clearTimeout(timer); window.removeEventListener('fitlife-steps-result', onResult);
      if (error) reject(error); else resolve(result as T);
    }
    window.addEventListener('fitlife-steps-result', onResult);
    try { method === 'snapshot' ? native.snapshot(request, uid, Math.max(1, Math.min(30, days))) : native[method](request, uid); }
    catch { finish(new Error('Step tracking is unavailable on this device.')); }
  });
}
function validStepSnapshot(v: any): v is StepSnapshot {
  return !!v && typeof v === 'object' && /^[a-f0-9]{32}$/.test(v.deviceId) &&
    ['phoneAvailable','phonePermission','phoneEnabled','phoneRunning','phoneNotificationVisible','healthEnabled'].every(k => typeof v[k] === 'boolean') &&
    ['available','install','unsupported'].includes(v.healthAvailability) &&
    ['ready','no_data','disabled','permission','error','available','install','unsupported','account_changed'].includes(v.healthState) &&
    Array.isArray(v.records) && v.records.length <= 4000 && v.records.every(validStepObservation);
}
