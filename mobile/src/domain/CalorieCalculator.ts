import {
  ActivityLevel,
  BiologicalSex,
  FitnessGoal,
  MacroTargets,
  UserProfile,
  WeightUnit,
} from '../data/types';
import { canUseAdultNutritionTargets } from './AgeSafety';
import { feetInchesToCm, inchesToCm, lbToKg } from './WeightConverter';

/**
 * Semantic version of the deterministic FitLife adult nutrition calculation engine.
 * Bump MAJOR if any formula constant, rounding rule, clinical safety floor, or age gate changes;
 * bump MINOR for backward-compatible diagnostic metadata additions.
 */
export const CALCULATION_MODULE_VERSION = '2.0.0' as const;

export const MIN_SAFE_ADULT_CALORIES = 1200;
export const MIN_CARBS_GRAMS = 40;
export const MIN_FIBER_GRAMS = 25;
export const FIBER_GRAMS_PER_1000_KCAL = 14;

export const CALCULATION_BOUNDS = {
  minAdultAge: 18,
  maxAdultAge: 120,
  minWeightKg: 20,
  maxWeightKg: 350,
  minHeightCm: 80,
  maxHeightCm: 260,
} as const;

export const CALCULATION_SCHEMA_METADATA = {
  version: CALCULATION_MODULE_VERSION,
  bmrEquation: 'Mifflin-St Jeor (1990)',
  tdeeModel: '5-tier physical activity multiplier (1.2 to 1.9)',
  minimumAdultAge: CALCULATION_BOUNDS.minAdultAge,
  minimumCalorieFloor: MIN_SAFE_ADULT_CALORIES,
  minimumCarbFloorG: MIN_CARBS_GRAMS,
  minimumFiberFloorG: MIN_FIBER_GRAMS,
} as const;

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export const GOAL_CONFIG: Record<
  FitnessGoal,
  { calorieOffset: number; proteinPerKg: number; fatShare: number; label: string }
> = {
  lose_weight: {
    calorieOffset: -500,
    proteinPerKg: 2.0,
    fatShare: 0.25,
    label: 'Fat Loss (-500 kcal)',
  },
  maintain: {
    calorieOffset: 0,
    proteinPerKg: 1.8,
    fatShare: 0.28,
    label: 'Maintenance',
  },
  gain_muscle: {
    calorieOffset: 300,
    proteinPerKg: 2.2,
    fatShare: 0.25,
    label: 'Lean Bulk (+300 kcal)',
  },
  endurance: {
    calorieOffset: 150,
    proteinPerKg: 1.6,
    fatShare: 0.25,
    label: 'Endurance & Stamina',
  },
};

export interface VersionedCalculationInput {
  sex: BiologicalSex;
  age: number;
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
  onboarded?: boolean;
  /** Metric or display weight input */
  weightKg?: number;
  weightLb?: number;
  weightValue?: number;
  weightUnit?: WeightUnit;
  /** Metric or imperial height input */
  heightCm?: number;
  heightInchesTotal?: number;
  heightFeetInches?: { feet: number; inches?: number };
}

export interface NormalizedAnthropometrics {
  sex: BiologicalSex;
  age: number;
  weightKg: number;
  heightCm: number;
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
}

export interface BmrCalculationResult {
  version: typeof CALCULATION_MODULE_VERSION;
  rawBmr: number;
  bmr: number;
}

export interface CalorieTargetResult {
  version: typeof CALCULATION_MODULE_VERSION;
  calories: number;
  rawTargetCalories: number;
  calorieOffset: number;
  wasFloored: boolean;
}

export interface MacroSplitResult {
  version: typeof CALCULATION_MODULE_VERSION;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
  macroCalorieTotal: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export interface VersionedNutritionPlan extends MacroTargets {
  calculationVersion: typeof CALCULATION_MODULE_VERSION;
  rawBmr: number;
  rawTargetCalories: number;
  calorieOffset: number;
  wasFloored: boolean;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  macroCalorieTotal: number;
  normalizedWeightKg: number;
  normalizedHeightCm: number;
}

function isValidSex(sex: unknown): sex is BiologicalSex {
  return sex === 'male' || sex === 'female';
}

function isValidActivityLevel(level: unknown): level is ActivityLevel {
  return (
    typeof level === 'string' &&
    Object.prototype.hasOwnProperty.call(ACTIVITY_MULTIPLIERS, level)
  );
}

function isValidGoal(goal: unknown): goal is FitnessGoal {
  return typeof goal === 'string' && Object.prototype.hasOwnProperty.call(GOAL_CONFIG, goal);
}

export function isValidAnthropometricRange(weightKg: number, heightCm: number): boolean {
  return (
    Number.isFinite(weightKg) &&
    Number.isFinite(heightCm) &&
    weightKg >= CALCULATION_BOUNDS.minWeightKg &&
    weightKg <= CALCULATION_BOUNDS.maxWeightKg &&
    heightCm >= CALCULATION_BOUNDS.minHeightCm &&
    heightCm <= CALCULATION_BOUNDS.maxHeightCm
  );
}

/**
 * Validates and normalizes metric or imperial body inputs into canonical SI/metric units.
 * Fails closed (`null`) for minors (<18), out-of-range ages (>120 or non-integer),
 * non-finite values, or physiologically implausible weight/height values.
 */
export function normalizeCalculationInputs(
  input: VersionedCalculationInput
): NormalizedAnthropometrics | null {
  if (!input || typeof input !== 'object') return null;
  if (input.onboarded === false) return null;
  if (!isValidSex(input.sex)) return null;
  if (!canUseAdultNutritionTargets(input.age)) return null;
  if (!isValidGoal(input.goal) || !isValidActivityLevel(input.activityLevel)) return null;

  let weightKg: number | null = null;
  if (input.weightKg !== undefined) {
    weightKg = Number.isFinite(input.weightKg) ? input.weightKg : null;
  } else if (input.weightLb !== undefined) {
    weightKg = Number.isFinite(input.weightLb) ? lbToKg(input.weightLb) : null;
  } else if (input.weightValue !== undefined) {
    const unit = input.weightUnit ?? 'kg';
    if (unit !== 'kg' && unit !== 'lb') return null;
    weightKg = Number.isFinite(input.weightValue)
      ? unit === 'lb'
        ? lbToKg(input.weightValue)
        : input.weightValue
      : null;
  }

  let heightCm: number | null = null;
  if (input.heightCm !== undefined) {
    heightCm = Number.isFinite(input.heightCm) ? input.heightCm : null;
  } else if (input.heightFeetInches !== undefined) {
    heightCm = feetInchesToCm(
      input.heightFeetInches.feet,
      input.heightFeetInches.inches ?? 0
    );
  } else if (input.heightInchesTotal !== undefined) {
    heightCm =
      Number.isFinite(input.heightInchesTotal) && input.heightInchesTotal > 0
        ? inchesToCm(input.heightInchesTotal)
        : null;
  }

  if (weightKg === null || heightCm === null) return null;
  if (!isValidAnthropometricRange(weightKg, heightCm)) return null;

  return {
    sex: input.sex,
    age: input.age,
    weightKg: Math.round(weightKg * 1000) / 1000,
    heightCm: Math.round(heightCm * 100) / 100,
    goal: input.goal,
    activityLevel: input.activityLevel,
  };
}

/**
 * Pure Mifflin-St Jeor (1990) Basal Metabolic Rate formula for adults (18..120y):
 *   Male:   10 * weightKg + 6.25 * heightCm - 5 * age + 5
 *   Female: 10 * weightKg + 6.25 * heightCm - 5 * age - 161
 */
export function calculateMifflinStJeorBmr(params: {
  sex: BiologicalSex;
  age: number;
  weightKg: number;
  heightCm: number;
}): BmrCalculationResult | null {
  if (!params || !isValidSex(params.sex)) return null;
  if (!canUseAdultNutritionTargets(params.age)) return null;
  if (!isValidAnthropometricRange(params.weightKg, params.heightCm)) return null;

  const sexOffset = params.sex === 'male' ? 5 : -161;
  const rawBmr =
    10 * params.weightKg + 6.25 * params.heightCm - 5 * params.age + sexOffset;
  if (!Number.isFinite(rawBmr) || rawBmr <= 0) return null;

  return {
    version: CALCULATION_MODULE_VERSION,
    rawBmr: Math.round(rawBmr * 100) / 100,
    bmr: Math.round(rawBmr),
  };
}

/**
 * Pure Total Daily Energy Expenditure (TDEE) from unrounded or rounded BMR.
 */
export function calculateTdee(
  bmr: number,
  activityLevel: ActivityLevel
): number | null {
  if (!Number.isFinite(bmr) || bmr <= 0 || !isValidActivityLevel(activityLevel)) {
    return null;
  }
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Pure Goal Calorie Target with explicit 1,200 kcal adult safety floor.
 */
export function calculateCalorieTarget(
  tdee: number,
  goal: FitnessGoal
): CalorieTargetResult | null {
  if (!Number.isFinite(tdee) || tdee <= 0 || !isValidGoal(goal)) return null;
  const calorieOffset = GOAL_CONFIG[goal].calorieOffset;
  const rawTargetCalories = Math.round(tdee + calorieOffset);
  const calories = Math.max(MIN_SAFE_ADULT_CALORIES, rawTargetCalories);
  return {
    version: CALCULATION_MODULE_VERSION,
    calories,
    rawTargetCalories,
    calorieOffset,
    wasFloored: rawTargetCalories < MIN_SAFE_ADULT_CALORIES,
  };
}

/**
 * Pure Protein, Fat, Carbohydrate, and Fiber split from target calories + body weight.
 * - Protein: goal-specific g/kg body weight (4 kcal/g)
 * - Fat: goal-specific share of target calories (9 kcal/g)
 * - Carbs: remaining energy (4 kcal/g), floored at 40g so severe deficits never produce negative carbs
 * - Fiber: 14g per 1,000 kcal, floored at 25g
 */
export function calculateMacroSplit(params: {
  calories: number;
  weightKg: number;
  goal: FitnessGoal;
}): MacroSplitResult | null {
  if (!params || !Number.isFinite(params.calories) || params.calories < MIN_SAFE_ADULT_CALORIES) {
    return null;
  }
  if (
    !Number.isFinite(params.weightKg) ||
    params.weightKg < CALCULATION_BOUNDS.minWeightKg ||
    params.weightKg > CALCULATION_BOUNDS.maxWeightKg ||
    !isValidGoal(params.goal)
  ) {
    return null;
  }

  const goalCfg = GOAL_CONFIG[params.goal];
  const proteinG = Math.round(params.weightKg * goalCfg.proteinPerKg);
  const proteinKcal = proteinG * 4;

  const fatKcalTarget = params.calories * goalCfg.fatShare;
  const fatG = Math.round(fatKcalTarget / 9);
  const fatKcal = fatG * 9;

  const remainingForCarbs = Math.max(0, params.calories - proteinKcal - fatKcal);
  const carbsG = Math.max(MIN_CARBS_GRAMS, Math.round(remainingForCarbs / 4));
  const carbsKcal = carbsG * 4;

  const fiberG = Math.max(
    MIN_FIBER_GRAMS,
    Math.round((params.calories / 1000) * FIBER_GRAMS_PER_1000_KCAL)
  );

  const macroCalorieTotal = proteinKcal + carbsKcal + fatKcal;
  const denom = macroCalorieTotal > 0 ? macroCalorieTotal : params.calories;
  const proteinPct = Math.round((proteinKcal / denom) * 100);
  const fatPct = Math.round((fatKcal / denom) * 100);
  const carbsPct = Math.max(0, 100 - proteinPct - fatPct);

  return {
    version: CALCULATION_MODULE_VERSION,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    proteinKcal,
    carbsKcal,
    fatKcal,
    macroCalorieTotal,
    proteinPct,
    carbsPct,
    fatPct,
  };
}

/**
 * Full version-stamped adult nutrition calculation pipeline accepting metric or imperial inputs.
 */
export function calculateVersionedNutritionPlan(
  input: VersionedCalculationInput
): VersionedNutritionPlan | null {
  const norm = normalizeCalculationInputs(input);
  if (!norm) return null;

  const bmrRes = calculateMifflinStJeorBmr({
    sex: norm.sex,
    age: norm.age,
    weightKg: norm.weightKg,
    heightCm: norm.heightCm,
  });
  if (!bmrRes) return null;

  // Match legacy precision: TDEE uses unrounded Mifflin-St Jeor rawBmr before rounding
  const tdee = calculateTdee(bmrRes.rawBmr, norm.activityLevel);
  if (tdee === null) return null;

  const calTarget = calculateCalorieTarget(tdee, norm.goal);
  if (!calTarget) return null;

  const split = calculateMacroSplit({
    calories: calTarget.calories,
    weightKg: norm.weightKg,
    goal: norm.goal,
  });
  if (!split) return null;

  return {
    calculationVersion: CALCULATION_MODULE_VERSION,
    bmr: bmrRes.bmr,
    rawBmr: bmrRes.rawBmr,
    tdee,
    calories: calTarget.calories,
    rawTargetCalories: calTarget.rawTargetCalories,
    calorieOffset: calTarget.calorieOffset,
    wasFloored: calTarget.wasFloored,
    proteinG: split.proteinG,
    carbsG: split.carbsG,
    fatG: split.fatG,
    fiberG: split.fiberG,
    proteinPct: split.proteinPct,
    carbsPct: split.carbsPct,
    fatPct: split.fatPct,
    macroCalorieTotal: split.macroCalorieTotal,
    normalizedWeightKg: norm.weightKg,
    normalizedHeightCm: norm.heightCm,
  };
}

/**
 * Mifflin-St Jeor Equation for adult BMR, TDEE, and daily macro targets.
 * Ages under 18 fail closed (`null`) per `canUseAdultNutritionTargets`.
 */
export function calculateMacroTargets(profile: UserProfile): MacroTargets | null {
  if (!profile.onboarded) return null;
  const plan = calculateVersionedNutritionPlan({
    sex: profile.sex,
    age: profile.age,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    goal: profile.goal,
    activityLevel: profile.activityLevel,
    onboarded: profile.onboarded,
  });
  if (!plan) return null;
  return {
    calories: plan.calories,
    bmr: plan.bmr,
    tdee: plan.tdee,
    proteinG: plan.proteinG,
    carbsG: plan.carbsG,
    fatG: plan.fatG,
    fiberG: plan.fiberG,
    calculationVersion: plan.calculationVersion,
    wasFloored: plan.wasFloored,
  };
}
