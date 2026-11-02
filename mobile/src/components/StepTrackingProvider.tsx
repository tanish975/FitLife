import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useFitLife } from '../data/FitLifeStore';
import { hasNativeSteps, stepsRequest, type StepSnapshot } from '../domain/Steps';

type Action = 'connectHealth' | 'disconnectHealth' | 'connectPhone' | 'disconnectPhone';
interface Value {
  available: boolean;
  snapshot: StepSnapshot | null;
  loading: boolean;
  error: string;
  refresh: (history?: boolean) => Promise<void>;
  action: (action: Action) => Promise<void>;
}
const Context = createContext<Value | null>(null);

/** Runs while FitLife is open on any tab. Native sensor collection may continue
 * in the foreground service; cloud uploads happen when the app is open. */
export const StepTrackingProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { cloudAccount, isAuthenticated, recordStepObservations } = useFitLife();
  const uid = isAuthenticated ? cloudAccount?.uid || null : null;
  const available = hasNativeSteps();
  const [snapshot, setSnapshot] = useState<StepSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const accountRef = useRef(uid); accountRef.current = uid;
  const recordRef = useRef(recordStepObservations); recordRef.current = recordStepObservations;
  const inFlight = useRef<{uid: string; history: boolean; promise: Promise<void>} | null>(null);
  const refreshRef = useRef<(history?: boolean) => Promise<void>>(async () => {});
  const refresh = async (history = false): Promise<void> => {
    const owner = accountRef.current;
    if (!available || !owner) return;
    const previous = inFlight.current;
    if (previous?.uid === owner) {
      await previous.promise;
      if (accountRef.current === owner && history && !previous.history) await refreshRef.current(true);
      return;
    }
    // A different account never waits for an old account's request or timeout.
    const flight = { uid: owner, history, promise: Promise.resolve() };
    const run = async () => {
      setLoading(true);
      try {
        const value = await stepsRequest<StepSnapshot>('snapshot', owner, history ? 30 : 1);
        if (accountRef.current !== owner) return;
        setSnapshot(value);
        setError(recordRef.current(owner, value.records) ? '' : 'Step history is full or could not be saved. Create an encrypted backup; new readings may not sync.');
      } catch (e) {
        if (accountRef.current === owner) setError(e instanceof Error ? e.message : 'Could not read steps.');
      } finally { if (accountRef.current === owner) setLoading(false); }
    };
    flight.promise = run().finally(() => { if (inFlight.current === flight) inFlight.current = null; });
    inFlight.current = flight;
    await flight.promise;
  };
  refreshRef.current = refresh;
  const action = async (method: Action) => {
    const owner = accountRef.current;
    if (!owner) throw new Error('Sign in to use step tracking.');
    setError('');
    try {
      await stepsRequest(method, owner);
      if (accountRef.current !== owner) throw new Error('Account changed. Please try again.');
      // A snapshot started before the action may be stale; wait for it and
      // explicitly request another. New accounts never wait on old requests.
      if (method === 'connectPhone') await new Promise(resolve => window.setTimeout(resolve, 450));
      const pending = inFlight.current;
      if (pending?.uid === owner) await pending.promise;
      if (accountRef.current === owner) await refreshRef.current(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not change tracking.';
      if (accountRef.current === owner) setError(message);
      throw new Error(message);
    }
  };
  useEffect(() => {
    setSnapshot(null); setError(''); setLoading(false);
    if (!uid || !available) return;
    void refreshRef.current(true);
    const timer = window.setInterval(() => { if (!document.hidden) void refreshRef.current(); }, 60_000);
    const onVisible = () => { if (!document.hidden) void refreshRef.current(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [uid, available]);
  return <Context.Provider value={{available, snapshot, loading, error, refresh, action}}>{children}</Context.Provider>;
};
export function useStepTracking(): Value {
  const value = useContext(Context);
  if (!value) throw new Error('Step tracking provider is missing');
  return value;
}
