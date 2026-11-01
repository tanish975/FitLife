import { WeightUnit } from '../data/types';

const KG_TO_LB = 2.20462262185;

/**
 * Storage is always kg internally. Only the UI layer converts.
 */
export function kgToLb(kg: number): number {
  return Math.round(kg * KG_TO_LB * 10) / 10;
}

export function lbToKg(lb: number): number {
  return Math.round((lb / KG_TO_LB) * 100) / 100;
}

export function displayWeight(weightKg: number, unit: WeightUnit, decimals = 1): number {
  const val = unit === 'lb' ? weightKg * KG_TO_LB : weightKg;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

export function parseInputToKg(inputValue: number, unit: WeightUnit): number {
  if (!Number.isFinite(inputValue) || inputValue <= 0) return 0;
  return unit === 'lb' ? lbToKg(inputValue) : Math.round(inputValue * 100) / 100;
}

export function formatWeight(weightKg: number, unit: WeightUnit, decimals = 1): string {
  return `${displayWeight(weightKg, unit, decimals)} ${unit}`;
}
