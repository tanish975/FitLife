import assert from 'node:assert/strict';
import {
  CALCULATION_MODULE_VERSION,
  MIN_SAFE_ADULT_CALORIES,
  MIN_CARBS_GRAMS,
  MIN_FIBER_GRAMS,
  isValidAnthropometricRange,
  normalizeCalculationInputs,
  calculateMifflinStJeorBmr,
  calculateTdee,
  calculateCalorieTarget,
  calculateMacroSplit,
  calculateVersionedNutritionPlan,
  calculateMacroTargets,
} from '../src/domain/CalorieCalculator';
import type { UserProfile } from '../data/types';

assert.equal(CALCULATION_MODULE_VERSION, '2.0.0', 'version is pinned');
assert.equal(MIN_SAFE_ADULT_CALORIES, 1200, 'calorie floor');
assert.equal(MIN_CARBS_GRAMS, 40, 'carb floor');
assert.equal(MIN_FIBER_GRAMS, 25, 'fiber floor');

assert.equal(isValidAnthropometricRange(70, 170), true, 'normal adult range');
assert.equal(isValidAnthropometricRange(19, 100), false, 'underweight rejected (below 20 kg)');
assert.equal(isValidAnthropometricRange(351, 170), false, 'overweight rejected (above 350 kg)');
assert.equal(isValidAnthropometricRange(70, 79), false, 'too short rejected (below 80 cm)');
assert.equal(isValidAnthropometricRange(70, 261), false, 'too tall rejected (above 260 cm)');

const profile: UserProfile = {
  name: 'Test Athlete',
  email: 'test@example.com',
  age: 30,
  sex: 'female',
  heightCm: 165,
  weightKg: 68,
  goal: 'maintain',
  activityLevel: 'moderate',
  onboarded: true,
  weightUnit: 'kg',
  waterGoalMl: 2500,
  weeklyWorkoutGoal: 4,
};

const normalized = normalizeCalculationInputs(profile);
assert(normalized !== null, 'normalizeCalculationInputs returns valid result');
assert.equal(normalized!.sex, 'female');
assert.equal(normalized!.age, 30);
assert.equal(normalized!.heightCm, 165);
assert.equal(normalized!.weightKg, 68);
assert.equal(normalized!.activityLevel, 'moderate');
assert.equal(normalized!.goal, 'maintain');

const bmr = calculateMifflinStJeorBmr(normalized!);
assert(bmr !== null, 'BMR computed');
assert.equal(bmr!.bmr, 1400, 'Mifflin-St Jeor BMR for 30F 165cm 68kg');
assert(bmr!.bmr > 0);

const tdee = calculateTdee(bmr!.bmr, 'moderate');
assert(tdee !== null, 'TDEE computed');
assert.equal(tdee, 2170, 'TDEE = BMR × 1.55');
assert(tdee! > bmr!.bmr);

const target = calculateCalorieTarget(tdee!, 'maintain');
assert(target !== null, 'calorie target computed');
assert.equal(target.calories, tdee, 'maintain = TDEE');
assert.equal(target.wasFloored, false, 'not floored at maintenance');

const loseTarget = calculateCalorieTarget(tdee!, 'lose_weight');
assert(loseTarget !== null, 'lose target computed');
assert.equal(loseTarget.calories, 1670, 'lose = TDEE − 500');
assert.equal(loseTarget.wasFloored, false);

const gainTarget = calculateCalorieTarget(tdee!, 'gain_muscle');
assert(gainTarget !== null, 'gain target computed');
assert.equal(gainTarget.calories, 2470, 'gain = TDEE + 300');
assert.equal(gainTarget.wasFloored, false);

// Floor test: low calorie target hits the 1200 kcal floor via macro split
const floorTarget = calculateCalorieTarget(1000, 'lose_weight');
assert(floorTarget !== null, 'floor target computed');
assert.equal(floorTarget.calories, 1200, 'floored to minimum safe calories');
assert.equal(floorTarget.wasFloored, true, 'wasFloored is true when floored');

const macros = calculateMacroSplit({ calories: target.calories, weightKg: 68, goal: 'maintain' });
assert(macros !== null, 'macros computed');
assert.equal(macros!.proteinG, 122, 'protein = 1.8g/kg for maintain');
assert(Math.abs(macros!.proteinG - 68 * 1.8) < 1, 'protein = 1.8g/kg for maintain');
assert(macros!.carbsG >= 40, 'carbs at or above 40g floor');
assert(macros!.fiberG >= 25, 'fiber at or above 25g floor');
assert(macros!.fatG > 0, 'fat is positive');
const macroSum = Math.round(macros!.proteinG * 4 + macros!.carbsG * 4 + macros!.fatG * 9);
assert(Math.abs(macroSum - target.calories) < 50, 'macro calories are within 50 kcal of target');

// Low calorie target: carbs should hit 40g floor
const lowMacros = calculateMacroSplit({ calories: 1200, weightKg: 55, goal: 'lose_weight' });
assert(lowMacros !== null, 'low macros computed');
assert(lowMacros!.carbsG >= 40, 'carbs at or above 40g floor');
assert.equal(lowMacros!.fiberG, 25, 'fiber at 25g floor');
assert(lowMacros!.proteinG > 0, 'protein remains positive');
const lowSum = Math.round(lowMacros!.proteinG * 4 + lowMacros!.carbsG * 4 + lowMacros!.fatG * 9);
assert(Math.abs(lowSum - 1200) < 50, 'low-calorie macros sum near target');

const plan = calculateVersionedNutritionPlan(profile);
assert(plan !== null, 'versioned plan computed');
assert.equal(plan!.calculationVersion, '2.0.0', 'plan carries version');
assert.equal(plan!.calories, target.calories, 'plan calories match target');
assert.equal(plan!.wasFloored, false, 'plan not floored');
assert(plan!.proteinG > 0 && plan!.carbsG > 0 && plan!.fatG > 0 && plan!.fiberG >= 25, 'all macros present');

// Legacy calculateMacroTargets still works
const legacy = calculateMacroTargets(profile);
assert(legacy !== null, 'legacy API returns result');
assert.equal(legacy!.calories, target.calories, 'legacy API matches target');
assert.equal(legacy!.calculationVersion, '2.0.0', 'legacy API carries version');

console.log('PASS: calculation module v2.0.0 — BMR, TDEE, calorie target with floor, macro split with floors, versioned plan');
