import assert from 'node:assert/strict';
import { parseMealFreeText } from '../src/domain/MealTextParser';
import { EXERCISE_CATALOG, ORIGINAL_EXERCISE_CATALOG } from '../src/data/ExerciseCatalog';
import { EXERCISE_ADDITIONS } from '../src/data/ExerciseExpansion';
import { WORKOUT_SESSION_IDEAS } from '../src/data/WorkoutSessions';
import { estimateWorkoutCalories, getWorkoutPrescription } from '../src/domain/AdaptiveWorkoutEngine';

const parse = (text: string) => parseMealFreeText(text, 'Lunch');
assert.equal(ORIGINAL_EXERCISE_CATALOG.length, 91);
assert.equal(EXERCISE_CATALOG.length, ORIGINAL_EXERCISE_CATALOG.length + EXERCISE_ADDITIONS.length);
assert.equal(new Set(EXERCISE_CATALOG.map(ex => ex.id)).size, EXERCISE_CATALOG.length, 'exercise IDs are stable and unique');
const addedHome = EXERCISE_CATALOG.filter(ex => ex.id.startsWith('ex-home-'));
assert.equal(addedHome.length, 30, '30 additional home exercises');
assert(addedHome.every(ex => ex.equipment === 'Bodyweight' && ex.isBodyweight && ex.defaultWeightKg === 0), 'no weights, bands or furniture required');
assert.equal(ORIGINAL_EXERCISE_CATALOG.filter(ex => ex.equipment === 'Bodyweight').length, 39);
const homeSessions = WORKOUT_SESSION_IDEAS.filter(session => session.homeNoEquipment);
assert.equal(homeSessions.length, 4);
for (const session of homeSessions) {
  assert(session.ids.length >= 5 && new Set(session.ids).size === session.ids.length);
  for (const id of session.ids) assert.equal(EXERCISE_CATALOG.find(ex => ex.id === id)?.equipment, 'Bodyweight', `${session.id} must use no equipment`);
}
const march = addedHome.find(ex => ex.id === 'ex-home-march-in-place')!;
const prescription = getWorkoutPrescription(march, 'lose_weight', 60, 170, 30);
assert.deepEqual([prescription.suggestedSets, prescription.suggestedReps], [1, 1], 'indoor cardio starts short and editable');
assert.equal(estimateWorkoutCalories(march, 1, 2, 60), 7, 'cardio estimate scales with time and bodyweight');
assert.deepEqual(new Set(EXERCISE_CATALOG.map(ex => ex.muscleGroup)), new Set(['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body']));
assert.equal(parse('2 boiled eggs')[0].calories, 144);
assert.equal(parse('2 boiled eggs')[0].requiresReview, false);
assert.equal(parse('0.1 boiled eggs')[0].calories, 7, 'small quantities are not silently rounded to a quarter');
assert.equal(parse('0 boiled eggs').length, 0, 'zero quantity is not silently logged');
assert.equal(parse('150g grilled chicken breast')[0].calories, 248, 'uses the actual 150g cooked catalog serving');
assert.equal(parse('1 tbsp peanut butter')[0].calories, 95, 'one tablespoon scales against a two-tablespoon serving');
for (const phrase of ['2 mystery soup', '1 cup oats', '100 ml chicken', '150g cooked oats', 'fried chicken', '2 eggs', '150g grilled chicken', 'protein', 'paneer']) {
  const item = parse(phrase)[0];
  assert(item && item.requiresReview, `${phrase} must require verified nutrition`);
  assert.equal(item.calories, 0, `${phrase} cannot silently fabricate energy`);
}
assert.equal(parse('1 cup oats')[0].servingLabel, '1 cup');
console.log('PASS: preserved 91 original exercises, expanded catalog, no-equipment home sessions and cardio; exact food portions and safe review');
