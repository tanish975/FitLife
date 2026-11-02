import assert from 'node:assert/strict';
import { parseMealFreeText } from '../src/domain/MealTextParser';
import { EXERCISE_CATALOG } from '../src/data/ExerciseCatalog';
import { WORKOUT_SESSION_IDEAS } from '../src/data/WorkoutSessions';
import { estimateWorkoutCalories, getWorkoutPrescription } from '../src/domain/AdaptiveWorkoutEngine';

const parse = (text: string) => parseMealFreeText(text, 'Lunch');
assert.equal(EXERCISE_CATALOG.length, 91);
assert.equal(new Set(EXERCISE_CATALOG.map(ex => ex.id)).size, 91, 'exercise IDs are stable and unique');
const addedHome = EXERCISE_CATALOG.filter(ex => ex.id.startsWith('ex-home-'));
assert.equal(addedHome.length, 30, '30 additional home exercises');
assert(addedHome.every(ex => ex.equipment === 'Bodyweight' && ex.isBodyweight && ex.defaultWeightKg === 0), 'no weights, bands or furniture required');
assert.equal(EXERCISE_CATALOG.filter(ex => ex.equipment === 'Bodyweight').length, 39);
const homeSessions = WORKOUT_SESSION_IDEAS.filter(session => session.homeNoEquipment);
assert.equal(homeSessions.length, 3);
for (const session of homeSessions) {
  assert(session.ids.length >= 5 && new Set(session.ids).size === session.ids.length);
  for (const id of session.ids) assert.equal(EXERCISE_CATALOG.find(ex => ex.id === id)?.equipment, 'Bodyweight', `${session.id} must use no equipment`);
}
const march = addedHome.find(ex => ex.id === 'ex-home-march-in-place')!;
const prescription = getWorkoutPrescription(march, 'lose_weight', 60, 170, 30);
assert.deepEqual([prescription.suggestedSets, prescription.suggestedReps], [1, 1], 'indoor cardio starts short and editable');
assert.equal(estimateWorkoutCalories(march, 1, 2, 60), 7, 'cardio estimate scales with time and bodyweight');
assert.deepEqual(new Set(EXERCISE_CATALOG.map(ex => ex.muscleGroup)), new Set(['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body']));
assert.equal(parse('2 eggs')[0].calories, 144);
assert.equal(parse('2 eggs')[0].requiresReview, false);
assert.equal(parse('0.1 eggs')[0].calories, 7, 'small quantities are not silently rounded to a quarter');
assert.equal(parse('0 eggs').length, 0, 'zero quantity is not silently logged');
assert.equal(parse('150g grilled chicken')[0].calories, 248, 'scales against the actual 120g catalog serving');
assert.equal(parse('1 tbsp peanut butter')[0].calories, 95, 'one tablespoon scales against a two-tablespoon serving');
for (const phrase of ['2 mystery soup', '1 cup oats', '100 ml chicken', '150g cooked oats', 'fried chicken', 'protein', 'paneer']) {
  const item = parse(phrase)[0];
  assert(item && item.requiresReview, `${phrase} must require verified nutrition`);
  assert.equal(item.calories, 0, `${phrase} cannot silently fabricate energy`);
}
assert.equal(parse('1 cup oats')[0].servingLabel, '1 cup');
console.log('PASS: 91 unique exercises, 30 no-equipment additions, home sessions and cardio; exact food portions and safe review');
