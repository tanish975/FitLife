import React, { useMemo, useState } from 'react';
import {
  Award,
  Edit3,
  LogOut,
  Settings,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { BadgeStatus } from '../data/types';
import { calculateBmi } from '../domain/BmiCalculator';
import { ACTIVITY_MULTIPLIERS, GOAL_CONFIG } from '../domain/CalorieCalculator';
import { formatWeight } from '../domain/WeightConverter';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { PressScale } from '../components/PressScale';
import { initials } from '../components/FitnessSidebars';

interface ProfileScreenProps {
  onOpenSettings: () => void;
  onEditOnboarding: () => void;
  onOpenInstall: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onOpenSettings,
  onEditOnboarding,
  onOpenInstall,
}) => {
  const {
    profile,
    settings,
    latestWeightKg,
    meals,
    workouts,
    macroTargets,
    gamification,
    triggerManualCelebration,
    signOut,
  } = useFitLife();

  const unit = settings.weightUnit;
  const [selectedBadge, setSelectedBadge] = useState<BadgeStatus | null>(null);

  const bmiInfo = useMemo(
    () => calculateBmi(latestWeightKg, profile.heightCm, profile.age),
    [latestWeightKg, profile.heightCm, profile.age]
  );

  const unlockedCount = useMemo(
    () => gamification.badges.filter((b) => b.unlocked).length,
    [gamification.badges]
  );

  return (
    <div className="space-y-4 px-4 pb-28 pt-2 animate-screen-enter">
      {/* Header with Settings Gear Icon */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-[#F4F1EA]">Athlete Profile</h1>
          
        </div>

        <div className="flex items-center gap-2">
          <PressScale
            onClick={onOpenInstall}
            ariaLabel="Install on Phone"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#4A4333] bg-[#29251D] text-[#D8C39E]"
          >
            <Smartphone className="h-5 w-5" />
          </PressScale>
          <PressScale
            onClick={onOpenSettings}
            ariaLabel="Open Settings"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#2F3A33] bg-[#1E2520] text-[#B8B5AD] hover:text-[#F4F1EA]"
          >
            <Settings className="h-5 w-5" />
          </PressScale>
        </div>
      </div>

      {/* Profile summary: all numbers come from local fitness history. */}
      <section className="fitness-profile-card" data-guide-target="profile-card" aria-label="Your fitness profile">
        <div className="fitness-profile-top">
          <div className="fitness-profile-ring"><span>{initials(profile.name)}</span></div>
          <div className="fitness-profile-stats">
            <div><strong>{workouts.length}</strong><span>exercise logs</span></div>
            <div><strong>{meals.length}</strong><span>meals</span></div>
            <div><strong>{gamification.currentStreak}</strong><span>day streak</span></div>
          </div>
        </div>
        <div className="fitness-profile-bio">
          <h2>{profile.name}</h2>
          <p>Level {gamification.level} athlete{macroTargets ? ` · ${GOAL_CONFIG[profile.goal]?.label}` : !profile.onboarded ? ' · Set a goal when you’re ready' : ''}</p>
          
        </div>
        <div className="fitness-profile-actions">
          <button onClick={onEditOnboarding}><Edit3 size={15} /> Edit profile</button>
          <button onClick={onOpenSettings}><Settings size={15} /> Settings</button>
        </div>
        <div className="fitness-profile-level">
          <div><span>LEVEL {gamification.level} PROGRESS</span><strong>{gamification.xpIntoLevel} / {gamification.xpForNextLevel} XP</strong></div>
          <div className="fitness-profile-progress"><span style={{ transform: `scaleX(${Math.max(0, Math.min(1, gamification.levelProgress))})` }} /></div>
          <p>{gamification.totalXp.toLocaleString()} total XP <span>·</span> {unlockedCount} of 9 badges unlocked</p>
        </div>
      </section>

      {/* Never present placeholder demographics as a person's information. */}
      {profile.onboarded ? <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-[#F4F1EA]">
            {macroTargets ? 'Biometrics & Daily Targets' : 'Your measurements'}
          </h3>
          <button
            onClick={onEditOnboarding}
            className="text-xs font-semibold text-[#7BB38F] hover:underline"
          >
            Recalibrate →
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-[#141916] p-3 border border-[#26302A]">
            <div className="text-[0.625rem] text-[#84877F]">Weight</div>
            <div className="mt-0.5 font-heading text-sm font-bold text-[#F4F1EA]">
              {formatWeight(latestWeightKg, unit)}
            </div>
            <div className="text-[0.625rem] text-[#84877F]">{profile.heightCm} cm · {profile.age}y</div>
          </div>

          <div className="rounded-2xl bg-[#141916] p-3 border border-[#26302A]">
            <div className="text-[0.625rem] text-[#84877F]">Current BMI</div>
            <div className="mt-0.5 font-heading text-sm font-bold text-[#F4F1EA]">{bmiInfo.bmi}</div>
            <div className="text-[0.625rem] font-semibold text-[#F4F1EA]">
              {bmiInfo.category ?? 'Adult scale not applicable under 20'}
            </div>
          </div>

          {macroTargets && <div className="rounded-2xl bg-[#141916] p-3 border border-[#26302A]">
            <div className="text-[0.625rem] text-[#84877F]">Daily Target</div>
            <div className="mt-0.5 font-heading text-sm font-bold text-[#7BB38F]">
              {macroTargets.calories} kcal
            </div>
            <div className="text-[0.625rem] text-[#84877F]">
              {GOAL_CONFIG[profile.goal]?.label}
            </div>
            {macroTargets.calculationVersion && (
              <div className="mt-1 text-[0.5625rem] font-mono text-[#87B5AD]">
                v{macroTargets.calculationVersion}{macroTargets.wasFloored ? ' · floored to minimums' : ''}
              </div>
            )}
          </div>}
        </div>

        {macroTargets ? <><div className="grid grid-cols-4 gap-2 pt-1">
          <div className="rounded-xl bg-[#141916] p-2 text-center border border-[#26302A]">
            <div className="text-[0.625rem] text-[#84877F]">Protein</div>
            <div className="font-heading text-xs font-bold text-[#7BB38F]">
              {macroTargets.proteinG}g
            </div>
          </div>
          <div className="rounded-xl bg-[#141916] p-2 text-center border border-[#26302A]">
            <div className="text-[0.625rem] text-[#84877F]">Carbs</div>
            <div className="font-heading text-xs font-bold text-[#D8C39E]">
              {macroTargets.carbsG}g
            </div>
          </div>
          <div className="rounded-xl bg-[#141916] p-2 text-center border border-[#26302A]">
            <div className="text-[0.625rem] text-[#84877F]">Fats</div>
            <div className="font-heading text-xs font-bold text-[#E0B467]">
              {macroTargets.fatG}g
            </div>
          </div>
          <div className="rounded-xl bg-[#141916] p-2 text-center border border-[#26302A]">
            <div className="text-[0.625rem] text-[#84877F]">Fiber</div>
            <div className="font-heading text-xs font-bold text-[#87B5AD]">
              {macroTargets.fiberG}g
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#141916] px-3 py-2 text-[0.6875rem] text-[#84877F]">
          <span>Activity: {ACTIVITY_MULTIPLIERS[profile.activityLevel]}</span>
          <span>BMR {macroTargets.bmr} · TDEE {macroTargets.tdee} kcal</span>
        </div></> : <p className="text-xs leading-relaxed text-[#B8B5AD]">Adult targets not provided under 18.</p>}
      </div> : <section className="profile-needed profile-needed-card" aria-label="Optional profile details"><div><strong>Profile details are optional</strong><p>Add measurements for targets & BMI.</p></div><button type="button" onClick={onEditOnboarding}>Add profile details</button></section>}

      {/* 9-BADGE GAMIFICATION GRID */}
      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4" data-guide-target="profile-badges" aria-label="Achievement badges">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-sm font-semibold text-[#F4F1EA]">
              Achievement Badges ({unlockedCount}/9)
            </h3>
            
          </div>
          <PressScale
            onClick={() => triggerManualCelebration(selectedBadge || undefined)}
            className="inline-flex items-center gap-1 rounded-xl bg-[#213026] border border-[#3E634B] px-2.5 py-1 text-[0.6875rem] font-semibold text-[#7BB38F]"
          >
            <Sparkles className="h-3 w-3" />
            <span>Burst</span>
          </PressScale>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {gamification.badges.map((badge) => (
            <PressScale
              key={badge.id}
              scaleDown={0.93}
              onClick={() => {
                setSelectedBadge(badge);
                if (badge.unlocked) {
                  triggerManualCelebration(badge);
                }
              }}
              className={`relative flex flex-col items-center rounded-2xl border p-3 text-center transition ${
                badge.unlocked
                  ? 'border-[#3E634B] bg-[#213026]'
                  : 'border-[#2F3A33] bg-[#141916] opacity-60'
              }`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-2xl ${
                  badge.unlocked
                    ? 'bg-[#151F19] border border-[#355440]'
                    : 'bg-[#1A201C] grayscale'
                }`}
              >
                {badge.icon}
              </div>
              <span className="mt-1.5 font-heading text-[0.6875rem] font-semibold text-[#F4F1EA] line-clamp-1">
                {badge.title}
              </span>
              <span className="mt-0.5 text-[0.625rem] font-medium text-[#7BB38F]">
                {badge.currentValue}/{badge.targetValue}
              </span>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#121714]">
                <div
                  className="h-full rounded-full bg-[#6BA37E]"
                  style={{ width: `${Math.round(badge.progress * 100)}%` }}
                />
              </div>
            </PressScale>
          ))}
        </div>

        {selectedBadge && (
          <div className="mt-3 rounded-2xl border border-[#3E634B] bg-[#141916] p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{selectedBadge.icon}</span>
              <div>
                <div className="font-heading text-xs font-bold text-[#F4F1EA]">
                  {selectedBadge.title}{' '}
                  <span className="text-[0.625rem] font-normal text-[#7BB38F]">
                    ({selectedBadge.unlocked ? 'Unlocked' : 'In Progress'})
                  </span>
                </div>
                <p className="text-[0.6875rem] text-[#B8B5AD]">{selectedBadge.description}</p>
              </div>
            </div>
            <Award className="h-5 w-5 text-[#7BB38F] shrink-0" />
          </div>
        )}
      </div>

      {/* Quick Footer Actions */}
      <div className="grid grid-cols-2 gap-2.5" data-guide-target="profile-settings" aria-label="Profile account controls">
        <PressScale
          onClick={onOpenSettings}
          className="flex items-center justify-center gap-2 rounded-2xl border border-[#2F3A33] bg-[#1E2520] py-3 text-xs font-semibold text-[#F4F1EA]"
        >
          <Settings className="h-4 w-4 text-[#D8C39E]" />
          <span>Units & Haptics</span>
        </PressScale>

        <PressScale
          onClick={signOut}
          className="flex items-center justify-center gap-2 rounded-2xl border border-[#6E4433] bg-[#33241E] py-3 text-xs font-semibold text-[#DE9473]"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </PressScale>
      </div>
    </div>
  );
};
