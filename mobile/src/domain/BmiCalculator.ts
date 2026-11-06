import { canUseAdultBmiCategories } from './AgeSafety';

export type BmiCategory = 'Underweight' | 'Normal' | 'Overweight' | 'Obese';

export interface BmiResult {
  bmi: number;
  category: BmiCategory | null;
  color: string;
  badgeBg: string;
  healthyRangeKg: [number, number] | null;
  summary: string;
}

export function calculateBmi(weightKg: number, heightCm: number, age: number): BmiResult {
  const heightM = Math.max(1.0, heightCm / 100);
  const rawBmi = weightKg / (heightM * heightM);
  const bmi = Math.round(rawBmi * 10) / 10;

  if (!canUseAdultBmiCategories(age)) {
    return { bmi, category: null, color: '#B8B5AD', badgeBg: '#1E2520', healthyRangeKg: null,
      summary: 'Adult BMI categories are not used below age 20. BMI is a screening measure, not a diagnosis. Ask a qualified health professional for age-appropriate advice.' };
  }

  const minHealthyKg = Math.round(18.5 * heightM * heightM * 10) / 10;
  const maxHealthyKg = Math.round(24.9 * heightM * heightM * 10) / 10;

  if (bmi < 18.5) {
    return {
      bmi,
      category: 'Underweight',
      color: '#87B5AD',
      badgeBg: '#1F2E2C',
      healthyRangeKg: [minHealthyKg, maxHealthyKg],
      summary: 'Below the standard adult BMI reference range. BMI is a screening measure, not an assessment of individual health.',
    };
  }
  if (bmi < 25) {
    return {
      bmi,
      category: 'Normal',
      color: '#7BB38F',
      badgeBg: '#213328',
      healthyRangeKg: [minHealthyKg, maxHealthyKg],
      summary: 'Within the standard adult BMI reference range. BMI does not assess body composition or individual health.',
    };
  }
  if (bmi < 30) {
    return {
      bmi,
      category: 'Overweight',
      color: '#E0B467',
      badgeBg: '#30281B',
      healthyRangeKg: [minHealthyKg, maxHealthyKg],
      summary: 'Above the standard adult BMI reference range. BMI alone does not assess individual health.',
    };
  }
  return {
    bmi,
    category: 'Obese',
    color: '#DE9473',
    badgeBg: '#33241E',
    healthyRangeKg: [minHealthyKg, maxHealthyKg],
    summary: 'Above the standard adult BMI reference range. BMI alone does not assess individual health.',
  };
}
