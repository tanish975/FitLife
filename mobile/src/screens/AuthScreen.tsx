import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Mail, ShieldCheck, User } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { PressScale } from '../components/PressScale';
import { SegmentedSelector } from '../components/SegmentedSelector';
import { EntryActionBar } from '../components/EntryActionBar';

interface AuthScreenProps {
  onCompleteAuth: (isNewSignup: boolean) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onCompleteAuth }) => {
  const { signIn, profile, meals, workouts, weights, moods, waterTodayMl, clearAllHistory } = useFitLife();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState(profile.name || 'Tanish Patel');
  const [email, setEmail] = useState(profile.email || 'tanish@fitlife.app');
  const [error, setError] = useState<string | null>(null);
  const history = [...meals, ...workouts, ...weights, ...moods];
  const isSample = (id: string) => id.startsWith('seed-') || id.startsWith('today-meal-') || id.startsWith('today-wk-') || id.startsWith('today-mood-');
  const hasSample = history.some(item => isSample(item.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    if (mode === 'signup') {
      // A fresh install starts with sample history. Remove only untouched sample
      // data; never erase existing user-created logs just because someone signs in.
      const sampleOnly = history.length > 0 && history.every(item => isSample(item.id));
      if (sampleOnly && waterTodayMl === 0) clearAllHistory();
    }
    signIn(email, mode === 'signup' ? name : profile.name);
    onCompleteAuth(mode === 'signup');
  };

  return (
    <>
    <div className="auth-entry-content flex min-h-full flex-col justify-between px-5 py-7">
      {/* Brand Header */}
      <div className="text-center pt-3">
        <div className="mx-auto mb-4 relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#213026] border border-[#3E634B] shadow-xl overflow-hidden">
          <svg viewBox="0 0 108 108" className="h-14 w-14 relative z-10">
            <path
              d="M26,54 L40,54 L47,36 L54,74 L61,54 L82,54"
              fill="none"
              stroke="#7BB38F"
              strokeWidth="7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="font-heading text-2xl font-bold tracking-tight text-[#F4F1EA]">
          Welcome to <span className="text-[#7BB38F]">FitLife</span>
        </h1>
        <p className="mt-1 text-xs text-[#84877F]">
          Adaptive workouts, nutrition tracking & daily guidance
        </p>
      </div>

      {/* Auth Card */}
      <div className="my-5 rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-5 shadow-xl">
        <SegmentedSelector
          options={[
            { value: 'signin', label: 'Sign In' },
            { value: 'signup', label: 'Create Profile' },
          ]}
          selected={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
        />

        <form id="fitlife-auth-form" onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="mb-1 block text-xs font-medium text-[#B8B5AD]">Full Name</label>
              <div className="flex items-center gap-2.5 rounded-2xl border border-[#2F3A33] bg-[#141916] px-3.5 py-2.5 focus-within:border-[#6BA37E]">
                <User className="h-4 w-4 text-[#84877F]" />
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tanish Patel"
                  className="w-full bg-transparent text-sm text-[#F4F1EA] outline-none placeholder:text-[#636961]"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="mb-1 block text-xs font-medium text-[#B8B5AD]">Email Address</label>
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#2F3A33] bg-[#141916] px-3.5 py-2.5 focus-within:border-[#6BA37E]">
              <Mail className="h-4 w-4 text-[#84877F]" />
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@fitlife.app"
                className="w-full bg-transparent text-sm text-[#F4F1EA] outline-none placeholder:text-[#636961]"
              />
            </div>
          </div>

          <p className="rounded-xl bg-[#213026] p-3 text-xs leading-relaxed text-[#B8B5AD]">Local demo only: email is not verified and no password is needed. There is one profile per device; no cloud account is created.</p>

          {error && (
            <p className="rounded-xl bg-[#33241E] border border-[#C47451]/40 px-3 py-2 text-xs text-[#DE9473]">
              {error}
            </p>
          )}

        </form>

        <div className="my-3.5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#2F3A33]" />
          <span className="text-[11px] uppercase tracking-wider text-[#84877F]">or instant access</span>
          <div className="h-px flex-1 bg-[#2F3A33]" />
        </div>

        <PressScale
          onClick={() => {
            signIn(profile.email, profile.name);
            onCompleteAuth(false);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#3E634B] bg-[#213026] py-2.5 text-xs font-semibold text-[#7BB38F] hover:bg-[#27392D]"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{hasSample ? 'Quick launch (demo data)' : `Continue as ${profile.name}`}</span>
        </PressScale>
      </div>

      {/* Firebase Project Status Footer */}
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#2F3A33] bg-[#141916] px-3.5 py-2 text-[11px] text-[#84877F]">
        <ShieldCheck className="h-4 w-4 text-[#7BB38F] shrink-0" />
        <span>
          Demo sign-in only. Credentials are not verified and data stays on this device.
        </span>
      </div>
    </div>
    <EntryActionBar>
      <button type="submit" form="fitlife-auth-form" className="entry-action-button">
        <span>{mode === 'signin' ? 'Continue to FitLife' : 'Continue to Onboarding'}</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </EntryActionBar>
    </>
  );
};
