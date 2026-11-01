import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Flame, Sparkles } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { ActivityLevel, BiologicalSex, FitnessGoal } from '../data/types';
import {
  ACTIVITY_MULTIPLIERS,
  calculateMacroTargets,
  GOAL_CONFIG,
} from '../domain/CalorieCalculator';
import { displayWeight, parseInputToKg } from '../domain/WeightConverter';
import { calculateBmi } from '../domain/BmiCalculator';
import { SegmentedSelector } from '../components/SegmentedSelector';
import { PressScale } from '../components/PressScale';
import { AnimatedCounter } from '../components/AnimatedCounter';

interface OnboardingScreenProps {
  onFinish: () => void;
  onCancel?: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish, onCancel }) => {
  const { profile, settings, latestWeightKg, updateProfile } = useFitLife();
  const unit = settings.weightUnit;

  const [name, setName] = useState(profile.name);
  const [sex, setSex] = useState<BiologicalSex>(profile.sex);
  const [age, setAge] = useState<number>(profile.age);
  const [heightCm, setHeightCm] = useState<number>(profile.heightCm);
  const [weightInput, setWeightInput] = useState<number>(() =>
    displayWeight(latestWeightKg, unit, 1)
  );
  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);

  const weightKg = useMemo(
    () => parseInputToKg(weightInput, unit) || profile.weightKg,
    [weightInput, unit, profile.weightKg]
  );

  const previewTargets = useMemo(
    () =>
      calculateMacroTargets({
        sex,
        age,
        heightCm,
        weightKg,
        goal,
        activityLevel,
      }),
    [sex, age, heightCm, weightKg, goal, activityLevel]
  );

  const previewBmi = useMemo(
    () => calculateBmi(weightKg, heightCm),
    [weightKg, heightCm]
  );

  const handleSave = () => {
    updateProfile({
      name: name.trim() || 'FitLife Athlete',
      sex,
      age: Math.max(14, Math.min(99, age)),
      heightCm: Math.max(120, Math.min(230, heightCm)),
      weightKg: Math.max(30, Math.min(250, weightKg)),
      goal,
      activityLevel,
      onboarded: true,
    });
    onFinish();
  };

  return (
    <div className="space-y-4 px-4 pb-28 pt-3 animate-screen-enter">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onCancel && (
            <PressScale
              onClick={onCancel}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2F3A33] bg-[#1E2520] text-[#B8B5AD]"
            >
              <ArrowLeft className="h-4 w-4" />
            </PressScale>
          )}
          <div>
            <h1 className="font-heading text-lg font-bold text-[#F4F1EA]">Body & Goal Calibration</h1>
            <p className="text-xs text-[#84877F]">
              Mifflin-St Jeor BMR → TDEE → Personalized Macros
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#213026] border border-[#3E634B] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7BB38F]">
          {unit.toUpperCase()} Mode
        </span>
      </div>

      {/* Live Calculated Targets Hero Preview (Solid Deep Sage Surface) */}
      <div className="relative overflow-hidden rounded-[26px] bg-[#213026] p-4 shadow-xl border border-[#3E634B]">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#7BB38F]">
              <Sparkles className="h-3.5 w-3.5" /> Estimated daily target
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <AnimatedCounter
                value={previewTargets.calories}
                className="font-heading text-3xl font-extrabold text-[#F4F1EA]"
              />
              <span className="text-xs font-medium text-[#B8B5AD]">kcal / day</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#B8B5AD]">
              BMR: <strong>{previewTargets.bmr}</strong> kcal · TDEE: <strong>{previewTargets.tdee}</strong> kcal · BMI:{' '}
              <strong style={{ color: previewBmi.color }}>
                {previewBmi.bmi} {age < 18 ? '(adult categories do not apply)' : `(${previewBmi.category})`}
              </strong>
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#151A17] border border-[#3E634B] text-[#7BB38F]">
            <Flame className="h-6 w-6" />
          </div>
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-[#B8B5AD]">{age < 18 ? 'These adult formulas and calorie targets are not appropriate guidance for people under 18. Ask a qualified health professional for individual advice.' : 'Calorie and macro targets are estimates, not medical advice. Individual needs vary; the calculation floor is not a safety guarantee.'}</p>
        <div className="mt-3.5 grid grid-cols-4 gap-2 pt-3 border-t border-[#344A3C] text-center">
          <div className="rounded-xl bg-[#151A17] p-2">
            <div className="text-[10px] text-[#84877F]">Protein</div>
            <div className="font-heading text-xs font-bold text-[#7BB38F]">
              {previewTargets.proteinG}g
            </div>
          </div>
          <div className="rounded-xl bg-[#151A17] p-2">
            <div className="text-[10px] text-[#84877F]">Carbs</div>
            <div className="font-heading text-xs font-bold text-[#D8C39E]">
              {previewTargets.carbsG}g
            </div>
          </div>
          <div className="rounded-xl bg-[#151A17] p-2">
            <div className="text-[10px] text-[#84877F]">Fats</div>
            <div className="font-heading text-xs font-bold text-[#E0B467]">
              {previewTargets.fatG}g
            </div>
          </div>
          <div className="rounded-xl bg-[#151A17] p-2">
            <div className="text-[10px] text-[#84877F]">Fiber</div>
            <div className="font-heading text-xs font-bold text-[#87B5AD]">
              {previewTargets.fiberG}g
            </div>
          </div>
        </div>
      </div>

      {/* Biometrics Card */}
      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#B8B5AD]">Athlete Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[#2F3A33] bg-[#141916] px-3.5 py-2 text-sm text-[#F4F1EA] outline-none focus:border-[#6BA37E]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#B8B5AD]">Biological Sex</label>
          <SegmentedSelector<BiologicalSex>
            options={[
              { value: 'male', label: 'Male (+5 BMR)' },
              { value: 'female', label: 'Female (-161 BMR)' },
            ]}
            selected={sex}
            onChange={setSex}
          />
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#84877F]">Age (yrs)</label>
            <input
              type="number"
              min={14}
              max={99}
              value={age}
              onChange={(e) => setAge(Number(e.target.value) || 24)}
              className="w-full rounded-xl border border-[#2F3A33] bg-[#141916] px-3 py-2 text-center font-heading text-sm font-bold text-[#F4F1EA] outline-none focus:border-[#6BA37E]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#84877F]">Height (cm)</label>
            <input
              type="number"
              min={120}
              max={230}
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value) || 170)}
              className="w-full rounded-xl border border-[#2F3A33] bg-[#141916] px-3 py-2 text-center font-heading text-sm font-bold text-[#F4F1EA] outline-none focus:border-[#6BA37E]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#84877F]">
              Weight ({unit})
            </label>
            <input
              type="number"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-[#2F3A33] bg-[#141916] px-3 py-2 text-center font-heading text-sm font-bold text-[#7BB38F] outline-none focus:border-[#6BA37E]"
            />
          </div>
        </div>
      </div>

      {/* Primary Goal Selection */}
      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-2.5">
        <h3 className="font-heading text-sm font-semibold text-[#F4F1EA]">Primary Fitness Goal</h3>
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(GOAL_CONFIG) as FitnessGoal[]).map((gKey) => {
            const cfg = GOAL_CONFIG[gKey];
            const isSelected = goal === gKey;
            return (
              <PressScale
                key={gKey}
                onClick={() => setGoal(gKey)}
                className={`flex items-center justify-between rounded-2xl border p-3 transition ${
                  isSelected
                    ? 'border-[#528B67] bg-[#213026]'
                    : 'border-[#2F3A33] bg-[#141916] hover:border-[#3E5245]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xs font-bold text-[#F4F1EA]">{cfg.label}</span>
                    <span className="rounded-md bg-[#2A352E] px-1.5 py-0.5 text-[10px] font-semibold text-[#7BB38F]">
                      {cfg.calorieDelta > 0 ? `+${cfg.calorieDelta}` : cfg.calorieDelta} kcal
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#84877F]">{cfg.subtitle}</p>
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
        </div>
      </div>

      {/* Activity Level Selection */}
      <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4 space-y-2.5">
        <h3 className="font-heading text-sm font-semibold text-[#F4F1EA]">Weekly Activity Multiplier</h3>
        <div className="space-y-2">
          {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((aKey) => {
            const item = ACTIVITY_MULTIPLIERS[aKey];
            const isSelected = activityLevel === aKey;
            return (
              <PressScale
                key={aKey}
                onClick={() => setActivityLevel(aKey)}
                className={`flex items-center justify-between rounded-2xl border p-3 transition ${
                  isSelected
                    ? 'border-[#C2A878] bg-[#2B271F]'
                    : 'border-[#2F3A33] bg-[#141916] hover:border-[#3E5245]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xs font-bold text-[#F4F1EA]">{item.label}</span>
                    <span className="rounded-md bg-[#2E2B23] px-1.5 py-0.5 text-[10px] font-semibold text-[#D8C39E]">
                      ×{item.multiplier}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#84877F]">{item.subtitle}</p>
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

      <PressScale scaleDown={0.97} onClick={handleSave}>
        <button
          type="button"
          className="w-full rounded-2xl bg-[#528B67] hover:bg-[#5E9A74] py-3.5 font-heading text-sm font-bold text-[#F4F1EA] shadow-lg"
        >
          Save Targets & Open Dashboard
        </button>
      </PressScale>
    </div>
  );
};
