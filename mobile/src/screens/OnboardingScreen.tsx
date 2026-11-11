import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Flame, Sparkles } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { ActivityLevel, BiologicalSex, FitnessGoal } from '../data/types';
import {
  ACTIVITY_MULTIPLIERS,
  calculateMacroTargets,
  GOAL_CONFIG,
} from '../domain/CalorieCalculator';
import { displayWeight, parseInputToKg } from '../domain/WeightConverter';
import { calculateBmi } from '../domain/BmiCalculator';
import { canUseAdultNutritionTargets } from '../domain/AgeSafety';
import { SegmentedSelector } from '../components/SegmentedSelector';
import { PressScale } from '../components/PressScale';
import { EntryActionBar } from '../components/EntryActionBar';

interface OnboardingScreenProps {
  onFinish: () => void;
  onCancel?: () => void;
}

type ProfileField = 'sex' | 'age' | 'height' | 'weight' | 'goal' | 'activity';
const numberOr = (value: string, fallback: number) => {
  const parsed = Number(value);
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : fallback;
};

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish, onCancel }) => {
  const { profile, settings, latestWeightKg, weights, updateProfile } = useFitLife();
  const unit = settings.weightUnit;

  const [name, setName] = useState(profile.name);
  const [sex, setSex] = useState<BiologicalSex | null>(profile.onboarded ? profile.sex : null);
  // Strings let people clear and replace values without the old default
  // immediately snapping back into the field on every keystroke.
  const [ageInput, setAgeInput] = useState(profile.onboarded ? String(profile.age) : '');
  const [heightInput, setHeightInput] = useState(profile.onboarded ? String(profile.heightCm) : '');
  const [weightInput, setWeightInput] = useState(() => profile.onboarded || weights.length ? String(displayWeight(latestWeightKg, unit, 1)) : '');
  const [goal, setGoal] = useState<FitnessGoal | null>(profile.onboarded ? profile.goal : null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(profile.onboarded ? profile.activityLevel : null);
  const [fieldError, setFieldError] = useState<{ field: ProfileField; message: string } | null>(null);

  // An unknown age must not fall back to the adult sample profile.
  const age = numberOr(ageInput, Number.NaN);
  const ageReady = ageInput.trim() !== '' && Number.isInteger(age) && age >= 14 && age <= 99;
  const isMinor = ageReady && age < 18;
  const heightCm = numberOr(heightInput, profile.heightCm);
  const weightKg = useMemo(
    () => parseInputToKg(numberOr(weightInput, 0), unit) || profile.weightKg,
    [weightInput, unit, profile.weightKg]
  );

  const previewTargets = useMemo(
    () =>
      calculateMacroTargets({
        sex: sex || 'male', // Calculated only for a hidden preview until an explicit choice.
        age,
        heightCm,
        weightKg,
        goal: goal || 'maintain',
        activityLevel: activityLevel || 'moderate',
      }),
    [sex, age, heightCm, weightKg, goal, activityLevel]
  );

  const previewBmi = useMemo(
    () => calculateBmi(weightKg, heightCm, age),
    [weightKg, heightCm, age]
  );

  const previewReady = !!sex && !!goal && !!activityLevel && Number.isInteger(Number(ageInput)) && Number(ageInput) >= 14 && Number(ageInput) <= 99 &&
    Number(heightInput) >= 120 && Number(heightInput) <= 230 && weightInput.trim() !== '' &&
    Number(weightInput) >= displayWeight(30, unit, 1) && Number(weightInput) <= displayWeight(250, unit, 1);

  const showFieldError = (field: ProfileField, message: string) => {
    setFieldError({ field, message });
    window.requestAnimationFrame(() => {
      const input = document.getElementById(`onboarding-${field}`) as HTMLInputElement | null;
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ block: 'center', behavior: 'auto' });
    });
  };

  const handleSave = async () => {
    const parsedAge = Number(ageInput);
    const parsedHeight = Number(heightInput);
    const parsedWeight = Number(weightInput);
    const minWeight = displayWeight(30, unit, 1);
    const maxWeight = displayWeight(250, unit, 1);
    if (!sex) { showFieldError('sex', 'Choose a biological sex for this estimate.'); return; }
    if (!ageInput.trim() || !Number.isInteger(parsedAge) || parsedAge < 14 || parsedAge > 99) {
      showFieldError('age', 'Enter an age from 14 to 99.');
      return;
    }
    if (!heightInput.trim() || !Number.isFinite(parsedHeight) || parsedHeight < 120 || parsedHeight > 230) {
      showFieldError('height', 'Enter a height from 120 to 230 cm.');
      return;
    }
    if (!weightInput.trim() || !Number.isFinite(parsedWeight) || parsedWeight < minWeight || parsedWeight > maxWeight) {
      showFieldError('weight', `Enter a weight from ${minWeight} to ${maxWeight} ${unit}.`);
      return;
    }
    if (parsedAge >= 18 && !goal) { showFieldError('goal', 'Choose a fitness goal.'); return; }
    if (!activityLevel) { showFieldError('activity', 'Choose your usual activity level.'); return; }
    setFieldError(null);
    const saved = await updateProfile({
      name: name.trim() || 'FitLife Athlete',
      sex,
      age: parsedAge,
      heightCm: parsedHeight,
      weightKg: Math.max(30, Math.min(250, parseInputToKg(parsedWeight, unit))),
      // Preserve an existing goal, but do not use it for minor targets or workouts.
      goal: goal || 'maintain',
      activityLevel,
      onboarded: true,
    });
    if (saved) onFinish();
  };

  return (
    <>
    <div className="space-y-4 px-4 pb-28 pt-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onCancel && (
            <PressScale
              onClick={onCancel}
              ariaLabel="Back"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2F3A33] bg-[#1E2520] text-[#B8B5AD]"
            >
              <ArrowLeft className="h-4 w-4" />
            </PressScale>
          )}
          <div>
            <h1 className="font-heading text-lg font-bold text-[#F4F1EA]">Complete your profile</h1>
            <p className="text-xs text-[#84877F]">
              Your details and optional estimates
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#213026] border border-[#3E634B] px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-[#7BB38F]">
          {unit.toUpperCase()} Mode
        </span>
      </div>

      {/* Live preview only uses values explicitly entered by this person. */}
      {previewReady && previewTargets ? <div className="relative overflow-hidden rounded-[26px] bg-[#213026] p-4 shadow-xl border border-[#3E634B]" data-guide-target="onboarding-preview" aria-label="Estimated targets preview">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#7BB38F]">
              <Sparkles className="h-3.5 w-3.5" /> Estimated daily target
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-heading text-3xl font-extrabold text-[#F4F1EA]">{Math.round(previewTargets.calories).toLocaleString()}</span>
              <span className="text-xs font-medium text-[#B8B5AD]">kcal / day</span>
            </div>
            <p className="mt-0.5 text-[0.6875rem] text-[#B8B5AD]">
              BMR: <strong>{previewTargets.bmr}</strong> kcal · TDEE: <strong>{previewTargets.tdee}</strong> kcal · BMI:{' '}
              <strong style={{ color: previewBmi.color }}>
                {previewBmi.bmi} {previewBmi.category ? `(${previewBmi.category})` : '(adult categories are not used below age 20)'}
              </strong>
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#151A17] border border-[#3E634B] text-[#7BB38F]">
            <Flame className="h-6 w-6" />
          </div>
        </div>

        <p className="mt-2 text-[0.6875rem] text-[#B8B5AD]">Targets are estimates, not medical advice.</p>
        <div className="mt-3.5 grid grid-cols-4 gap-2 pt-3 border-t border-[#344A3C] text-center">
          <div className="rounded-xl bg-[#151A17] p-2">
            <div className="text-[0.625rem] text-[#84877F]">Protein</div>
            <div className="font-heading text-xs font-bold text-[#7BB38F]">
              {previewTargets.proteinG}g
            </div>
          </div>
          <div className="rounded-xl bg-[#151A17] p-2">
            <div className="text-[0.625rem] text-[#84877F]">Carbs</div>
            <div className="font-heading text-xs font-bold text-[#D8C39E]">
              {previewTargets.carbsG}g
            </div>
          </div>
          <div className="rounded-xl bg-[#151A17] p-2">
            <div className="text-[0.625rem] text-[#84877F]">Fats</div>
            <div className="font-heading text-xs font-bold text-[#E0B467]">
              {previewTargets.fatG}g
            </div>
          </div>
          <div className="rounded-xl bg-[#151A17] p-2">
            <div className="text-[0.625rem] text-[#84877F]">Fiber</div>
            <div className="font-heading text-xs font-bold text-[#87B5AD]">
              {previewTargets.fiberG}g
            </div>
          </div>
        </div>
      </div> : <section className="profile-needed profile-needed-card" data-guide-target="onboarding-preview" aria-label="Estimated targets preview"><div><strong>{isMinor ? "Adult targets are unavailable" : "Estimates will appear here"}</strong><p>{isMinor ? "Adult targets not provided under 18." : "Choose sex, measurements, goal & activity to preview."}</p></div></section>}

      {/* Biometrics Card */}
      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-4" data-guide-target="onboarding-details" aria-label="Profile details">
        <div>
          <label htmlFor="onboarding-name" className="mb-1.5 block text-xs font-semibold text-[#B8B5AD]">Athlete Name</label>
          <input
            id="onboarding-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[#2F3A33] bg-[#141916] px-3.5 py-2 text-sm text-[#F4F1EA] outline-none focus:border-[#6BA37E]"
          />
        </div>

        <div id="onboarding-sex" tabIndex={-1}>
          <label className="mb-1.5 block text-xs font-semibold text-[#B8B5AD]">Biological Sex</label>
          <SegmentedSelector<BiologicalSex>
            options={[
              { value: 'male', label: 'Male (+5 BMR)' },
              { value: 'female', label: 'Female (-161 BMR)' },
            ]}
            selected={sex}
            onChange={value => { setSex(value); setFieldError(null); }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label htmlFor="onboarding-age" className="mb-1 block text-[0.6875rem] font-medium text-[#84877F]">Age (yrs)</label>
            <input
              id="onboarding-age"
              type="number"
              inputMode="numeric"
              min={14}
              max={99}
              value={ageInput}
              aria-invalid={fieldError?.field === 'age' || undefined}
              aria-describedby={fieldError?.field === 'age' ? 'onboarding-error' : undefined}
              onChange={(e) => { setAgeInput(e.target.value); setFieldError(null); }}
              className="w-full rounded-xl border border-[#2F3A33] bg-[#141916] px-3 py-2 text-center font-heading text-sm font-bold text-[#F4F1EA] outline-none focus:border-[#6BA37E]"
            />
          </div>
          <div>
            <label htmlFor="onboarding-height" className="mb-1 block text-[0.6875rem] font-medium text-[#84877F]">Height (cm)</label>
            <input
              id="onboarding-height"
              type="number"
              inputMode="decimal"
              min={120}
              max={230}
              value={heightInput}
              aria-invalid={fieldError?.field === 'height' || undefined}
              aria-describedby={fieldError?.field === 'height' ? 'onboarding-error' : undefined}
              onChange={(e) => { setHeightInput(e.target.value); setFieldError(null); }}
              className="w-full rounded-xl border border-[#2F3A33] bg-[#141916] px-3 py-2 text-center font-heading text-sm font-bold text-[#F4F1EA] outline-none focus:border-[#6BA37E]"
            />
          </div>
          <div>
            <label htmlFor="onboarding-weight" className="mb-1 block text-[0.6875rem] font-medium text-[#84877F]">
              Weight ({unit})
            </label>
            <input
              id="onboarding-weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weightInput}
              aria-invalid={fieldError?.field === 'weight' || undefined}
              aria-describedby={fieldError?.field === 'weight' ? 'onboarding-error' : undefined}
              onChange={(e) => { setWeightInput(e.target.value); setFieldError(null); }}
              className="w-full rounded-xl border border-[#2F3A33] bg-[#141916] px-3 py-2 text-center font-heading text-sm font-bold text-[#7BB38F] outline-none focus:border-[#6BA37E]"
            />
          </div>
        </div>
        {fieldError && !['goal','activity'].includes(fieldError.field) && <p id="onboarding-error" className="onboarding-error" role="alert">{fieldError.message}</p>}
      </div>

      {/* Primary Goal Selection */}
      <div id="onboarding-goal" tabIndex={-1} className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-2.5">
        <h3 className="font-heading text-sm font-semibold text-[#F4F1EA]">Primary Fitness Goal</h3>
        {fieldError?.field === 'goal' && <p className="onboarding-error" role="alert">{fieldError.message}</p>}
        {ageReady && canUseAdultNutritionTargets(age) ? <div className="grid grid-cols-1 gap-2">
          {(Object.keys(GOAL_CONFIG) as FitnessGoal[]).map((gKey) => {
            const cfg = GOAL_CONFIG[gKey];
            const isSelected = goal === gKey;
            return (
              <PressScale
                key={gKey}
                ariaPressed={isSelected}
                onClick={() => { setGoal(gKey); setFieldError(null); }}
                className={`flex items-center justify-between rounded-2xl border p-3 transition ${
                  isSelected
                    ? 'border-[#528B67] bg-[#213026]'
                    : 'border-[#2F3A33] bg-[#141916] hover:border-[#3E5245]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xs font-bold text-[#F4F1EA]">{cfg.label}</span>
                    <span className="rounded-md bg-[#2A352E] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[#7BB38F]">
                      {cfg.calorieOffset > 0 ? `+${cfg.calorieOffset}` : cfg.calorieOffset} kcal
                    </span>
                  </div>
                  <p className="mt-0.5 text-[0.6875rem] text-[#84877F]">{gKey === 'lose_weight' ? 'Fat loss' : gKey === 'gain_muscle' ? 'Lean bulk' : gKey === 'endurance' ? 'Endurance' : 'Maintenance'}</p>
                </div>
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    isSelected
                      ? 'border-[#6BA37E] bg-[#528B67] text-[#F4F1EA]'
                      : 'border-[#4A544D]'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </PressScale>
            );
          })}
        </div> : <p className="text-xs text-[#B8B5AD]">{isMinor ? "Adult goals not offered under 18." : "Enter your age to see goals."}</p>}
      </div>

      {/* Activity Level Selection */}
      <div id="onboarding-activity" tabIndex={-1} className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-2.5">
        <h3 className="font-heading text-sm font-semibold text-[#F4F1EA]">Weekly Activity Multiplier</h3>
        {fieldError?.field === 'activity' && <p className="onboarding-error" role="alert">{fieldError.message}</p>}
        <div className="space-y-2">
          {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((aKey) => {
            const item = ACTIVITY_MULTIPLIERS[aKey];
            const isSelected = activityLevel === aKey;
            return (
              <PressScale
                key={aKey}
                ariaPressed={isSelected}
                onClick={() => { setActivityLevel(aKey); setFieldError(null); }}
                className={`flex items-center justify-between rounded-2xl border p-3 transition ${
                  isSelected
                    ? 'border-[#C2A878] bg-[#2B271F]'
                    : 'border-[#2F3A33] bg-[#141916] hover:border-[#3E5245]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xs font-bold text-[#F4F1EA]">{aKey === 'sedentary' ? 'Sedentary' : aKey === 'light' ? 'Light' : aKey === 'moderate' ? 'Moderate' : aKey === 'active' ? 'Active' : 'Athlete'}</span>
                    <span className="rounded-md bg-[#2E2B23] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[#D8C39E]">
                      ×{item}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[0.6875rem] text-[#84877F]">{aKey === 'sedentary' ? 'Little/no exercise' : aKey === 'light' ? 'Light 1-3 days/wk' : aKey === 'moderate' ? 'Moderate 3-5 days/wk' : aKey === 'active' ? 'Hard 6-7 days/wk' : 'Very hard + physical job'}</p>
                </div>
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    isSelected
                      ? 'border-[#C2A878] bg-[#C2A878] text-[#151A17]'
                      : 'border-[#4A544D]'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </PressScale>
            );
          })}
        </div>
      </div>

    </div>
    <EntryActionBar>
      <button type="button" onClick={handleSave} className="entry-action-button">
        Complete profile & continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </EntryActionBar>
    </>
  );
};
