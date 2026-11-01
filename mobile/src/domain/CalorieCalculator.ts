import { ActivityLevel, BiologicalSex, FitnessGoal, MacroTargets, UserProfile } from '../data/types';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { multiplier: number; label: string; subtitle: string }> = {
  sedentary: {
    multiplier: 1.2,
    label: 'Sedentary',
    subtitle: 'Desk job, minimal planned exercise',
  },
  light: {
    multiplier: 1.375,
    label: 'Lightly Active',
    subtitle: 'Light exercise 1–3 days / week',
  },
  moderate: {
    multiplier: 1.55,
    label: 'Moderately Active',
    subtitle: 'Workouts 3–5 days / week',
  },
  active: {
    multiplier: 1.725,
    label: 'Very Active',
    subtitle: 'Hard training 6–7 days / week',
  },
  athlete: {
    multiplier: 1.9,
    label: 'Athlete',
    subtitle: 'Intense daily training or physical job',
  },
};

export const GOAL_CONFIG: Record<
  FitnessGoal,
  {
    label: string;
    subtitle: string;
    calorieDelta: number;
    proteinRatio: number;
    carbsRatio: number;
    fatRatio: number;
  }
> = {
  lose_weight: {
    label: 'Lose Fat',
    subtitle: 'An estimated 500 kcal adjustment from the calculated TDEE',
    calorieDelta: -500,
    proteinRatio: 0.32,
    carbsRatio: 0.40,
    fatRatio: 0.28,
  },
  maintain: {
    label: 'Maintain & Tone',
    subtitle: 'Balanced energy intake for body recomposition',
    calorieDelta: 0,
    proteinRatio: 0.28,
    carbsRatio: 0.44,
    fatRatio: 0.28,
  },
  gain_muscle: {
    label: 'Build Muscle',
    subtitle: 'An estimated 300 kcal adjustment from the calculated TDEE',
    calorieDelta: 300,
    proteinRatio: 0.30,
    carbsRatio: 0.45,
    fatRatio: 0.25,
  },
  endurance: {
    label: 'Peak Endurance',
    subtitle: 'An estimated 150 kcal adjustment from the calculated TDEE',
    calorieDelta: 150,
    proteinRatio: 0.24,
    carbsRatio: 0.52,
    fatRatio: 0.24,
  },
};

/**
 * Mifflin-St Jeor BMR -> TDEE -> Calorie & Macro Targets
 * The 1200 kcal calculation floor is not a safety guarantee; individual needs vary.
 */
export function calculateMacroTargets(profile: Pick<UserProfile, 'sex' | 'age' | 'heightCm' | 'weightKg' | 'goal' | 'activityLevel'>): MacroTargets {
  const weight = Math.max(30, profile.weightKg);
  const height = Math.max(120, profile.heightCm);
  const age = Math.max(14, Math.min(100, profile.age));

  const sexOffset = profile.sex === 'male' ? 5 : -161;
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + sexOffset);

  const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel]?.multiplier ?? 1.55;
  const tdee = Math.round(bmr * multiplier);

  const goalCfg = GOAL_CONFIG[profile.goal] ?? GOAL_CONFIG.maintain;
  // Floor at 1200 kcal per README spec
  const calories = Math.max(1200, Math.round(tdee + goalCfg.calorieDelta));

  const proteinG = Math.round((calories * goalCfg.proteinRatio) / 4);
  const carbsG = Math.round((calories * goalCfg.carbsRatio) / 4);
  const fatG = Math.round((calories * goalCfg.fatRatio) / 9);
  const fiberG = Math.max(25, Math.round((calories / 1000) * 14));

  return {
    calories,
    bmr,
    tdee,
    proteinG,
    carbsG,
    fatG,
    fiberG,
  };
}
