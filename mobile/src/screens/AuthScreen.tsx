import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Smartphone } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { EntryActionBar } from '../components/EntryActionBar';
import { FitLifeLogo } from '../components/FitLifeLogo';

interface AuthScreenProps { onCompleteAuth: () => void }

/** Google authentication is performed by Android Credential Manager and Firebase,
 * not by an embedded web login or a pretend local account. */
export const AuthScreen: React.FC<AuthScreenProps> = ({ onCompleteAuth }) => {
  const { signInGoogle, cloudAvailable, cloudStatus } = useFitLife();
  const [busy, setBusy] = useState(false);
  const status = cloudStatus === 'Not connected.' ? '' : cloudStatus;

  const handleGoogle = async () => {
    if (busy || !cloudAvailable) return;
    setBusy(true);
    try { if (await signInGoogle()) onCompleteAuth(); }
    finally { setBusy(false); }
  };

  return <>
    <div className="auth-entry-content auth-google-entry">
      <div className="auth-brand">
        <span className="auth-brand-mark"><FitLifeLogo className="entry-logo" /></span>
        <p className="auth-eyebrow">MOVE WELL. LIVE WELL.</p>
        <h1>Welcome to <span>FitLife</span></h1>
        <p>Workouts, meals and progress, together in one place.</p>
      </div>
      <section className="auth-intro" aria-labelledby="auth-intro-heading">
        <span className="auth-intro-icon"><ShieldCheck size={21} aria-hidden="true" /></span>
        <div>
          <h2 id="auth-intro-heading">Your fitness, your account</h2>
          <p>Sign in with Google to get started. Your first sign-in needs an internet connection; your saved session can return when offline.</p>
          <p>Existing activity on this device is kept and merged with the first Google account. Cloud data is not end-to-end encrypted.</p>
        </div>
      </section>
      {!cloudAvailable && <section className="auth-platform-note" aria-label="Android app required">
        <Smartphone size={20} aria-hidden="true" />
        <div><strong>Available in the Android app</strong><p>Google sign-in is not supported in this web or standalone build. Install FitLife for Android to sign in.</p>
          <a href="https://github.com/tanish975/FitLife/releases/latest/download/FitLife.apk" target="_blank" rel="noreferrer">Download Android app <ArrowRight size={14} aria-hidden="true" /></a>
        </div>
      </section>}
      {status && <p className="auth-status" role="status">{status}</p>}
    </div>
    <EntryActionBar>
      <button type="button" className="entry-action-button" disabled={busy || !cloudAvailable} onClick={handleGoogle} aria-describedby={!cloudAvailable ? 'android-signin-note' : undefined}>
        <ShieldCheck size={19} aria-hidden="true" /> {busy ? 'Opening Google…' : 'Sign in with Google'}
      </button>
      {!cloudAvailable && <span id="android-signin-note" className="sr-only">Install the Android app to sign in.</span>}
    </EntryActionBar>
  </>;
};
