import React, { useState } from 'react';
import { Cloud, RefreshCw, ShieldCheck } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';

/** Google auth is handled only by the native Android bridge. */
export const CloudAccountPanel: React.FC = () => {
  const { cloudAvailable, cloudAccount, cloudStatus, lastSuccessfulSyncAt, hasUnsyncedChanges, signInGoogle, signOutGoogle, syncNow } = useFitLife();
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>) => { setBusy(true); try { await action(); } finally { setBusy(false); } };
  const syncing = /checking cloud|saving merged|syncing again/i.test(cloudStatus);
  const label = !cloudAccount ? 'Not connected' : syncing ? 'Syncing…' : hasUnsyncedChanges ? 'Changes on this device need sync' : cloudStatus === 'Up to date.' ? 'Up to date' : 'Sync needs attention';
  return <section className="cloud-compact" aria-label="Google account and cloud sync">
    <div className="cloud-compact-title"><span><Cloud size={19}/></span><div><h3>Cloud sync</h3><p>{cloudAccount ? cloudAccount.email || cloudAccount.name : 'Google account'}</p></div></div>
    <div className="cloud-sync-state" role="status"><strong>{label}</strong><span>{lastSuccessfulSyncAt ? `Last successful sync: ${new Date(lastSuccessfulSyncAt).toLocaleString()}` : 'No successful sync yet'}</span>{cloudStatus !== 'Up to date.' && <small>{cloudStatus}</small>}</div>
    {cloudAvailable && (cloudAccount ? <div className="cloud-compact-actions"><button type="button" disabled={busy} onClick={() => void run(syncNow)}><RefreshCw size={16}/> {hasUnsyncedChanges ? 'Retry sync' : 'Sync now'}</button><button type="button" disabled={busy} onClick={() => void run(signOutGoogle)}>Sign out</button></div> : <button type="button" className="cloud-sign-in" disabled={busy} onClick={() => void run(signInGoogle)}><ShieldCheck size={16}/> {busy ? 'Opening Google…' : 'Sign in with Google'}</button>)}
    <details className="cloud-privacy"><summary>What syncs & privacy</summary><p>Meals, workouts, weights, moods, steps, favorite meals, your weekly plan and guide progress merge across devices. Sample logs stay local. Your profile, other preferences and today’s water are per-device recovery copies.</p><p>Firebase protects data in transit and at rest, but sync is not end-to-end encrypted: the project owner can access it. Local data stays on this device. Different Google accounts are kept separate.</p></details>
  </section>;
};
