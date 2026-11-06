/** Age policy for adult-only estimates. Unknown, fractional or invalid ages fail closed. */
export function canUseAdultNutritionTargets(age: number): boolean {
  return Number.isInteger(age) && age >= 18 && age <= 120;
}

/** CDC adult BMI categories begin at 20. This is not a child BMI assessment. */
export function canUseAdultBmiCategories(age: number): boolean {
  return Number.isInteger(age) && age >= 20 && age <= 120;
}
