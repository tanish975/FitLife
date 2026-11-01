import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Cloud,
  Download,
  Droplets,
  LayoutGrid,
  Moon,
  Palette,
  RefreshCw,
  Scale,
  Sliders,
  Smartphone,
  Sparkles,
  Sun,
  Timer,
  Trash2,
  Vibrate,
} from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { DashboardWidgetsConfig, WeightUnit } from '../data/types';
import {
  CornerStyle,
  DensityStyle,
  MotionStyle,
  NATURAL_PALETTES,
  PaletteId,
  ThemeMode,
} from '../domain/ThemePalettes';
import { SegmentedSelector } from '../components/SegmentedSelector';
import { PressScale } from '../components/PressScale';
import { FITLIFE_RELEASES_URL, FITLIFE_LATEST_APK_URL, getNativeUpdateBridge } from '../domain/Updates';
import { EncryptedBackupPanel } from '../components/EncryptedBackupPanel';
import { CloudAccountPanel } from '../components/CloudAccountPanel';

interface SettingsScreenProps {
  onBack: () => void;
  onOpenInstall: () => void;
}

const WIDGET_ITEMS: { key: keyof DashboardWidgetsConfig; label: string; desc: string }[] = [
  { key: 'showMacros', label: '4 Macro Rings Card', desc: 'Protein, Carbs, Fats & Fiber progress rings' },
  { key: 'showHydration', label: 'Daily Hydration Tracker', desc: 'Interactive water intake cups & target bar' },
  { key: 'showMood', label: '11-State Mood Check-In', desc: 'Daily energy & mindset calibration (+5 XP)' },
  { key: 'showAiCoach', label: 'Daily guidance', desc: 'Local, rule-based suggestions from your activity and mood' },
  { key: 'showActivityFeed', label: 'Today’s Activity Feed', desc: 'Chronological stream of logged meals & sets' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onOpenInstall }) => {
  const {
    profile,
    settings,
    setWeightUnit,
    setHapticsEnabled,
    setThemeMode,
    setPaletteId,
    setCornerStyle,
    setMotionStyle,
    setDensityStyle,
    setDefaultRestSeconds,
    setAutoStartRest,
    setWeeklyWorkoutGoal,
    setNavStyle,
    setWaterGoalMl,
    toggleDashboardWidget,
    seedDemoHistory,
    clearAllHistory,
    signOut,
  } = useFitLife();
  const isNativeAsset = typeof window !== 'undefined' && window.location.protocol === 'file:' && window.location.pathname.startsWith('/android_asset/');
  const updateBridge = getNativeUpdateBridge();
  const [automaticUpdateChecks, setAutomaticUpdateChecks] = useState(() => {
    try { return updateBridge?.automaticUpdateChecksEnabled() ?? true; } catch { return true; }
  });
  const [pendingDataAction, setPendingDataAction] = useState<'clear' | 'restore' | null>(null);
  let installedVersion = '';
  try { installedVersion = updateBridge?.versionName() || ''; } catch { /* Version is optional on older wrappers. */ }

  return (
    <div className="space-y-4 px-4 pb-28 pt-2 animate-screen-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PressScale
            onClick={onBack}
            ariaLabel="Back"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#2F3A33] bg-[#1E2520] text-[#F4F1EA]"
          >
            <ArrowLeft className="h-5 w-5" />
          </PressScale>
          <div>
            <h1 className="font-heading text-xl font-bold text-[#F4F1EA]">
              Studio & Customization
            </h1>
            <p className="text-xs text-[#84877F]">
              Natural palettes, Daylight/Nightfall theme, layout & units
            </p>
          </div>
        </div>
      </div>

      {/* 1. THEME MODE TOGGLE (Daylight Light vs Nightfall Dark) */}
      <div className="rounded-[26px] border border-[#3E634B] bg-[#213026] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#528B67] text-[#F4F1EA]">
              <Sun className="h-5 w-5 theme-visible-light" aria-hidden="true" />
              <Moon className="h-5 w-5 theme-visible-dark" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-[#F4F1EA]">
                Appearance Mode
              </h3>
              <p className="text-xs text-[#B8B5AD]">
                Switch between crisp Daylight linen and calm Nightfall slate
              </p>
            </div>
          </div>
        </div>

        <SegmentedSelector<ThemeMode>
          options={[
            { value: 'light', label: 'Daylight' },
            { value: 'dark', label: 'Nightfall' },
          ]}
          selected={settings.themeMode}
          onChange={setThemeMode}
          themePreview
        />
      </div>

      {/* Compact, labelled, keyboard-accessible solid palette controls. */}
      <section className="palette-picker" aria-labelledby="palette-heading">
        <div className="palette-picker-heading"><div><h3 id="palette-heading">Color palette</h3><p>{NATURAL_PALETTES[settings.paletteId].name}</p></div><Palette size={19} aria-hidden="true" /></div>
        <div className="palette-swatches" role="group" aria-label="Color palette">
          {(Object.keys(NATURAL_PALETTES) as PaletteId[]).map((pid) => {
            const palette = NATURAL_PALETTES[pid];
            const selected = settings.paletteId === pid;
            return <button key={pid} type="button" aria-label={palette.name} aria-pressed={selected} title={palette.name} onClick={() => setPaletteId(pid)} className={`palette-choice ${selected ? 'is-selected' : ''}`}>
              <span className="palette-color" style={{ backgroundColor: palette.swatches[1] }}><span style={{ backgroundColor: palette.swatches[0] }} />{selected && <Check size={15} strokeWidth={3} />}</span>
            </button>;
          })}
        </div>
      </section>

      {/* 3. INTERFACE SHAPE, DENSITY & MOTION CUSTOMIZATION */}
      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2B271F] border border-[#4A4232] text-[#D8C39E]">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold text-[#F4F1EA]">
              Shape, Density & Motion Feel
            </h3>
            <p className="text-xs text-[#84877F]">
              Tailor card roundness, text scale, and spring transition speed
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#B8B5AD]">
            Card Corner Radius
          </label>
          <SegmentedSelector<CornerStyle>
            size="sm"
            options={[
              { value: 'sharp', label: 'Crisp (14px)' },
              { value: 'organic', label: 'Organic (24px)' },
              { value: 'pebble', label: 'Pebble (30px)' },
            ]}
            selected={settings.cornerStyle}
            onChange={setCornerStyle}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#B8B5AD]">
            Display Density & Scale
          </label>
          <SegmentedSelector<DensityStyle>
            size="sm"
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'spacious', label: 'Spacious' },
            ]}
            selected={settings.densityStyle}
            onChange={setDensityStyle}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#B8B5AD]">Bottom navigation</label>
          <SegmentedSelector<'glass' | 'solid'> size="sm" options={[{ value: 'glass', label: 'Glass' }, { value: 'solid', label: 'Solid' }]} selected={settings.navStyle} onChange={setNavStyle} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#B8B5AD]">
            UI Animation Intensity
          </label>
          <SegmentedSelector<MotionStyle>
            size="sm"
            options={[
              { value: 'spring', label: 'Full Spring' },
              { value: 'gentle', label: 'Gentle' },
              { value: 'reduced', label: 'Minimal' },
            ]}
            selected={settings.motionStyle}
            onChange={setMotionStyle}
          />
        </div>
      </div>

      {/* 4. DASHBOARD WIDGET CUSTOMIZER */}
      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#213026] border border-[#3E634B] text-[#7BB38F]">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold text-[#F4F1EA]">
              Dashboard Widgets
            </h3>
            <p className="text-xs text-[#84877F]">
              Choose which cards appear on your home and daily dashboard
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {WIDGET_ITEMS.map((item) => {
            const enabled = settings.dashboardWidgets[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-2xl border border-[#2F3A33] bg-[#141916] px-3.5 py-2.5"
              >
                <div className="pr-3">
                  <div className="font-heading text-xs font-semibold text-[#F4F1EA]">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-[#84877F]">{item.desc}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label={item.label}
                  aria-checked={enabled}
                  onClick={() => toggleDashboardWidget(item.key)}
                  className="relative inline-flex h-11 w-11 shrink-0 items-center"
                >
                  <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${enabled ? 'bg-[#528B67]' : 'bg-[#2F3A33]'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. HYDRATION TARGET & WORKOUT REST PREFERENCES */}
      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Droplets className="h-4 w-4 text-[#7BB38F]" />
            <span className="font-heading text-xs font-semibold text-[#F4F1EA]">
              Daily Water Target
            </span>
          </div>
          <span className="text-xs font-bold text-[#7BB38F]">
            {(settings.waterGoalMl / 1000).toFixed(1)} Liters
          </span>
        </div>

        <SegmentedSelector<string>
          size="sm"
          options={[
            { value: '2000', label: '2.0L' },
            { value: '2500', label: '2.5L' },
            { value: '3000', label: '3.0L' },
            { value: '3500', label: '3.5L' },
            { value: '4000', label: '4.0L' },
          ]}
          selected={String(settings.waterGoalMl)}
          onChange={(v) => setWaterGoalMl(Number(v))}
        />

        <div className="pt-2 border-t border-[#2F3A33]">
          <div className="mb-2 flex items-center justify-between"><span className="font-heading text-xs font-semibold text-[#F4F1EA]">Weekly workout goal</span><span className="text-xs font-bold text-[#7BB38F]">{settings.weeklyWorkoutGoal} days</span></div>
          <SegmentedSelector<string> size="sm" options={[1, 2, 3, 4, 5, 6, 7].map(day => ({ value: String(day), label: String(day) }))} selected={String(settings.weeklyWorkoutGoal)} onChange={(value) => setWeeklyWorkoutGoal(Number(value))} />
        </div>

        <div className="pt-1 border-t border-[#2F3A33]">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Timer className="h-4 w-4 text-[#D8C39E]" />
              <span className="font-heading text-xs font-semibold text-[#F4F1EA]">
                Default Set Rest Timer
              </span>
            </div>
            <span className="text-xs font-bold text-[#D8C39E]">
              {settings.defaultRestSeconds} sec
            </span>
          </div>

          <SegmentedSelector<string>
            size="sm"
            options={[
              { value: '45', label: '45s' },
              { value: '60', label: '60s' },
              { value: '75', label: '75s' },
              { value: '90', label: '90s' },
              { value: '120', label: '120s' },
            ]}
            selected={String(settings.defaultRestSeconds)}
            onChange={(v) => setDefaultRestSeconds(Number(v))}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#B8B5AD]">Start rest after logging a workout</span>
            <button type="button" role="switch" aria-label="Auto-start rest timer" aria-checked={settings.autoStartRest} onClick={() => setAutoStartRest(!settings.autoStartRest)} className="relative inline-flex h-11 w-11 shrink-0 items-center">
              <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${settings.autoStartRest ? 'bg-[#528B67]' : 'bg-[#2F3A33]'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${settings.autoStartRest ? 'translate-x-6' : 'translate-x-1'}`} /></span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. WEIGHT UNIT (kg / lb) & HAPTICS */}
      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#213026] border border-[#3E634B] text-[#7BB38F]">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold text-[#F4F1EA]">
              Weight Measurement Unit
            </h3>
            <p className="text-xs text-[#84877F]">
              Updates display and input across Onboarding, Profile, Workouts, and Progress
            </p>
          </div>
        </div>

        <SegmentedSelector<WeightUnit>
          options={[
            { value: 'kg', label: 'Kilograms (kg)' },
            { value: 'lb', label: 'Pounds (lb)' },
          ]}
          selected={settings.weightUnit}
          onChange={setWeightUnit}
        />

        <div className="pt-2 border-t border-[#2F3A33] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2B271F] border border-[#4A4232] text-[#D8C39E]">
              <Vibrate className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-heading text-xs font-semibold text-[#F4F1EA]">
                Haptic Feedback
              </h4>
              <p className="text-[11px] text-[#84877F]">
                Tactile response on meals, workouts & mood check-ins
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-label="Haptic feedback"
            aria-checked={settings.hapticsEnabled}
            onClick={() => setHapticsEnabled(!settings.hapticsEnabled)}
            className="relative inline-flex h-11 w-11 shrink-0 items-center"
          >
            <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${settings.hapticsEnabled ? 'bg-[#528B67]' : 'bg-[#2F3A33]'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${settings.hapticsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </span>
          </button>
        </div>
      </div>

      {/* 7. INSTALL ON PHONE CARD */}
      <div className="rounded-[26px] border border-[#3E634B] bg-[#213026] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#528B67] text-[#F4F1EA]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[#F4F1EA]">
              Install FitLife on Your Phone
            </h3>
            <p className="text-xs text-[#B8B5AD]">
              Open the install guide or get the latest signed Android <code className="text-[#7BB38F]">FitLife.apk</code> from GitHub.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <PressScale
            onClick={onOpenInstall}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#528B67] hover:bg-[#5E9A74] py-2.5 text-xs font-bold text-[#F4F1EA]"
          >
            <Smartphone className="h-4 w-4" />
            <span>QR & Install Guide</span>
          </PressScale>

          {!isNativeAsset && <a
            href={FITLIFE_LATEST_APK_URL}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#3E634B] bg-[#151F19] py-2.5 text-xs font-semibold text-[#7BB38F]"
          >
            <Download className="h-4 w-4" />
            <span>Get FitLife.apk</span>
          </a>}
        </div>
      </div>

      {/* Release updates: GitHub is checked without sending fitness data. */}
      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#213026] border border-[#3E634B] text-[#7BB38F]">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold text-[#F4F1EA]">App updates</h3>
            <p className="text-xs text-[#84877F]">
              {updateBridge ? `Android version ${installedVersion || 'unknown'}.` : 'Find the latest Android APK and release notes on GitHub.'}
              {' '}Updates require your confirmation to install.
            </p>
          </div>
        </div>
        {updateBridge ? (
          <>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#2F3A33] bg-[#141916] px-3 py-2">
              <div><p className="text-xs font-semibold text-[#F4F1EA]">Automatic update checks</p><p className="text-[11px] text-[#84877F]">Contacts GitHub periodically; no fitness data is sent.</p></div>
              <button type="button" role="switch" aria-label="Automatic update checks" aria-checked={automaticUpdateChecks}
                onClick={() => { const next = !automaticUpdateChecks; try { updateBridge.setAutomaticUpdateChecks(next); setAutomaticUpdateChecks(next); } catch { /* Keep the displayed setting unchanged. */ } }}
                className="relative inline-flex h-11 w-11 shrink-0 items-center">
                <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${automaticUpdateChecks ? 'bg-[#528B67]' : 'bg-[#2F3A33]'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${automaticUpdateChecks ? 'translate-x-6' : 'translate-x-1'}`} />
                </span>
              </button>
            </div>
            <button type="button" onClick={() => updateBridge.checkForUpdates()} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#3E634B] bg-[#213026] px-3 text-xs font-semibold text-[#7BB38F]">
              <RefreshCw className="h-4 w-4" /> Check for updates
            </button>
          </>
        ) : (
          <a href={FITLIFE_RELEASES_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#3E634B] bg-[#213026] px-3 text-xs font-semibold text-[#7BB38F]">
            <Download className="h-4 w-4" /> View latest release
          </a>
        )}
      </div>

      <CloudAccountPanel />
      <EncryptedBackupPanel />

      {/* 8. LOCAL DATA MANAGEMENT */}
      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-[#D8C39E]" />
            <h3 className="font-heading text-xs font-semibold text-[#F4F1EA]">
              Local data & activity
            </h3>
          </div>
          <span className="text-[11px] text-[#84877F]">{profile.email}</span>
        </div>

        <p className="text-[11px] text-[#84877F]">FitLife keeps this profile on your device. Your device or browser may also include it in backups. Google sync, when connected above, only covers the activity described there.</p>
        <div className="grid grid-cols-2 gap-2">
          <PressScale
            onClick={() => setPendingDataAction('restore')}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#3E634B] bg-[#213026] py-2.5 text-xs font-semibold text-[#7BB38F]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Restore 14d Demo</span>
          </PressScale>

          <PressScale
            onClick={() => setPendingDataAction('clear')}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[#6E4433] bg-[#33241E] py-2.5 text-xs font-semibold text-[#DE9473]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear All Logs</span>
          </PressScale>
        </div>

        {pendingDataAction && (
          <div role="alert" className="rounded-2xl border border-[#6E4433] bg-[#33241E] p-3.5">
            <p className="text-xs leading-relaxed text-[#F4F1EA]">
              {pendingDataAction === 'clear'
                ? 'Clear all meals, workouts, mood and weight history on this device? Your profile is kept. This cannot be undone.'
                : 'Replace your profile and all activity on this device with the 14-day demo? This cannot be undone.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPendingDataAction(null)} className="min-h-[44px] rounded-xl border border-[#2F3A33] bg-[#1E2520] px-4 text-xs font-semibold text-[#F4F1EA]">Cancel</button>
              <button type="button" onClick={() => { if (pendingDataAction === 'clear') clearAllHistory(); else seedDemoHistory(); setPendingDataAction(null); }} className="min-h-[44px] rounded-xl bg-[#528B67] px-4 text-xs font-bold text-[#F4F1EA]">{pendingDataAction === 'clear' ? 'Confirm clear logs' : 'Confirm restore demo'}</button>
            </div>
          </div>
        )}

        <PressScale
          onClick={() => {
            signOut();
            onBack();
          }}
          className="flex w-full items-center justify-center rounded-xl border border-[#2F3A33] bg-[#141916] py-2.5 text-xs font-semibold text-[#B8B5AD] hover:text-[#F4F1EA]"
        >
          Exit local profile
        </PressScale>
      </div>
    </div>
  );
};
