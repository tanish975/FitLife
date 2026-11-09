import { WeightUnit } from '../data/types';

export type LengthUnit = 'cm' | 'in';

export const LB_PER_KG = 2.2046226218;
export const CM_PER_INCH = 2.54;
export const INCHES_PER_FOOT = 12;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

/**
 * Converts imperial feet + inches into centimetres.
 * Rejects non-finite, negative, or out-of-range inches (>= 12 or < 0 when feet > 0,
 * while allowing total inches when feet === 0 only if explicitly non-negative).
 */
export function feetInchesToCm(feet: number, inches = 0): number | null {
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;
  if (!Number.isInteger(feet) || feet < 0 || inches < 0 || inches >= INCHES_PER_FOOT) {
    return null;
  }
  const totalInches = feet * INCHES_PER_FOOT + inches;
  if (totalInches <= 0) return null;
  return Math.round(totalInches * CM_PER_INCH * 100) / 100;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } | null {
  if (!Number.isFinite(cm) || cm <= 0) return null;
  const totalInches = cm / CM_PER_INCH;
  let feet = Math.floor(totalInches / INCHES_PER_FOOT);
  let inches = Math.round((totalInches - feet * INCHES_PER_FOOT) * 10) / 10;
  if (inches >= INCHES_PER_FOOT) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function toDisplayWeight(weightKg: number, unit: WeightUnit): number {
  const val = unit === 'lb' ? kgToLb(weightKg) : weightKg;
  return Math.round(val * 10) / 10;
}

export function fromDisplayWeight(displayVal: number, unit: WeightUnit): number {
  if (!Number.isFinite(displayVal)) return 0;
  const kg = unit === 'lb' ? lbToKg(displayVal) : displayVal;
  return Math.round(kg * 100) / 100;
}

/** Format weight for display with a fixed number of decimal places. */
export function displayWeight(weightKg: number, unit: WeightUnit, decimals = 1): number {
  const val = toDisplayWeight(weightKg, unit);
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/** Parse a display-formatted weight back into kilograms. */
export function parseInputToKg(displayVal: number, unit: WeightUnit): number {
  return fromDisplayWeight(displayVal, unit);
}

export function formatWeight(weightKg: number, unit: WeightUnit): string {
  return `${toDisplayWeight(weightKg, unit).toFixed(1)} ${unit}`;
}

export function unitLabel(unit: WeightUnit): string {
  return unit === 'lb' ? 'lbs' : 'kg';
}

export function lengthUnitForWeightUnit(weightUnit: WeightUnit): LengthUnit {
  return weightUnit === 'lb' ? 'in' : 'cm';
}

export function toDisplayLength(lengthCm: number, unit: LengthUnit): number {
  const val = unit === 'in' ? cmToInches(lengthCm) : lengthCm;
  return Math.round(val * 10) / 10;
}

export function fromDisplayLength(displayVal: number, unit: LengthUnit): number {
  if (!Number.isFinite(displayVal)) return 0;
  const cm = unit === 'in' ? inchesToCm(displayVal) : displayVal;
  return Math.round(cm * 100) / 100;
}

export function formatLength(lengthCm: number, unit: LengthUnit): string {
  return `${toDisplayLength(lengthCm, unit).toFixed(1)} ${unit}`;
}
