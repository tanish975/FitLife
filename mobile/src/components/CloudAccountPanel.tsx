import React, { useState } from 'react';
import { Cloud, RefreshCw, ShieldCheck } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';

/** Only the Android native bridge can authenticate. Web/PWA remains local. */
export const CloudAccountPanel: React.FC = () => {
  const { cloudAvailable, cloudAccount, cloudStatus, signInGoogle, signOutGoogle, syncNow } = useFitLife();
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); try { await action(); } finally { setBusy(false); }
  };
  return <section className="cloud-account-panel rounded-[26px] border border-[#3E634B] bg-[#1E2520] p-4 space-y-3" aria-label="Google account and cloud sync">
    <div className="flex items-center gap-2"><Cloud className="h-4 w-4 text-[#7BB38F]" /><h3 className="font-heading text-xs font-semibold text-[#F4F1EA]">Google account & cloud sync</h3></div>
    <p className="text-xs leading-relaxed text-[#B8B5AD]">{cloudAccount ? <>Signed in as <strong className="text-[#F4F1EA]">{cloudAccount.email || cloudAccount.name}</strong>.</> : cloudAvailable ? 'Connect a Google account to sync your fitness activity.' : 'Google sign-in and cloud sync are available in the Android app. This browser stays local.'}</p>
    <p className="rounded-xl bg-[#141916] p-3 text-[11px] leading-relaxed text-[#B8B5AD]" role="status">{cloudStatus}</p>
    {cloudAvailable && (cloudAccount ? <div className="grid grid-cols-2 gap-2">
      <button type="button" disabled={busy} onClick={() => run(syncNow)} className="flex items-center justify-center gap-1.5 rounded-xl border border-[#3E634B] bg-[#213026] px-2 py-2.5 text-xs font-semibold text-[#A7D0B2] disabled:opacity-50"><RefreshCw size={14} /> Sync now</button>
      <button type="button" disabled={busy} onClick={() => run(signOutGoogle)} className="rounded-xl border border-[#2F3A33] bg-[#141916] px-2 py-2.5 text-xs font-semibold text-[#D7D5CE] disabled:opacity-50">Sign out of Google</button>
    </div> : <button type="button" disabled={busy} onClick={() => run(signInGoogle)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#83B491] bg-[#F4F1EA] px-3 py-2.5 text-xs font-semibold text-[#213026] disabled:opacity-50"><ShieldCheck size={15} /> {busy ? 'Opening Google…' : 'Sign in with Google'}</button>)}
    <p className="text-[11px] leading-relaxed text-[#84877F]">Meals, workouts, weights and moods merge across devices. Profile, preferences and today’s water are saved as per-device recovery copies, not merged. Sample logs are excluded.</p>
    <p className="text-[11px] leading-relaxed text-[#84877F]">Firebase protects data in transit and at rest, but this is not end-to-end encrypted: the project owner can access cloud data. Local data also remains on the device. Your first account claims existing local activity; later accounts stay separate.</p>
  </section>;
};
