import assert from 'node:assert/strict';
import { canUseAdultNutritionTargets, canUseAdultBmiCategories } from '../src/domain/AgeSafety';
import { calculateMacroTargets } from '../src/domain/CalorieCalculator';
import { calculateBmi } from '../src/domain/BmiCalculator';
import { getWorkoutPrescription } from '../src/domain/AdaptiveWorkoutEngine';
import { EXERCISE_CATALOG } from '../src/data/ExerciseCatalog';
import { computeGamification } from '../src/domain/GamificationEngine';
import { generateAiCoachMessage } from '../src/domain/AiCoach';
import { parseMealFreeText } from '../src/domain/MealTextParser';
import { aggregateDailyCalories, aggregateWeightTrend, calendarDayNumber, chartDateFractions, getDateKeyDaysAgo, weightLogComparison } from '../src/domain/ProgressAggregator';
import { displayWeight } from '../src/domain/WeightConverter';
import { CLOUD_DEVICE_LIMIT, canWriteDeviceSnapshot } from '../src/domain/CloudSync';

const demographics: any = { sex:'female', age:15, heightCm:160, weightKg:50, goal:'lose_weight', activityLevel:'light' };
for (const age of [0, 14, 15, 17, 17.9, NaN, Infinity, 121]) {
  assert.equal(canUseAdultNutritionTargets(age), false, `unsafe age ${age}`);
  assert.equal(calculateMacroTargets({ ...demographics, age }), null, `no adult target for ${age}`);
}
for (const age of [18, 19, 20, 30]) {
  assert(canUseAdultNutritionTargets(age));
  const target = calculateMacroTargets({ ...demographics, age });
  assert(target && target.calories >= 1200 && target.proteinG > 0, `adult target available at ${age}`);
}
assert.equal(calculateMacroTargets({ ...demographics, age:18, heightCm:NaN }), null);
for (const age of [0, 15, 17, 18, 19, 19.9, NaN, 121]) {
  const bmi = calculateBmi(90, 170, age);
  assert.equal(canUseAdultBmiCategories(age), false);
  assert.equal(bmi.category, null, `adult BMI category hidden at ${age}`);
  assert.equal(bmi.healthyRangeKg, null, `adult BMI range hidden at ${age}`);
}
assert.equal(calculateBmi(90, 170, 20).category, 'Obese');
assert(calculateBmi(90, 170, 20).healthyRangeKg);
const exercise = EXERCISE_CATALOG.find(e => e.muscleGroup === 'Legs' && e.muscleGroup !== 'Cardio')!;
const minorWorkout = getWorkoutPrescription(exercise, 'lose_weight', 90, 170, 15, true);
assert.equal(minorWorkout.protocolName, 'Starting template');
assert(!/density|loss|weight loss|metabolic/i.test(minorWorkout.protocolName + minorWorkout.goalRationale));
const nineteen = getWorkoutPrescription(exercise, 'lose_weight', 90, 170, 19, true);
assert(nineteen.bmiCautionNote?.includes('below age 20'));
assert.equal(nineteen.suggestedWeightKg, getWorkoutPrescription(exercise, 'lose_weight', 50, 170, 19, true).suggestedWeightKg, 'adult BMI category does not alter youth workout');
const badge = computeGamification([], [], [], [], null).badges.find(x => x.id === 'badge_macro_sniper')!;
assert.equal(badge.title, 'Meal Rhythm');
assert(!badge.description.includes('calorie target'));
const coach = generateAiCoachMessage({ healthScore:null, moodId:null, goal:'lose_weight', caloriesRemaining:null, proteinRemainingG:null, workedOutToday:true, streakDays:1 });
assert(!coach.body.includes('target'));

const parse = (phrase:string) => parseMealFreeText(phrase, 'Lunch')[0];
for (const phrase of ['2 idlis', '1 cup dahi', '150g oats', '2 mystery soup', '1 cup curd', '2 sambar', '150g cooked oats', 'chicken', 'spinach', 'fried chicken', '2 eggs', '150g grilled chicken']) {
  const draft = parse(phrase);
  assert(draft?.requiresReview, `${phrase} requires details`);
  assert.equal(draft.calories, 0, `${phrase} has no fabricated energy`);
  assert(!/Greek Yogurt|Idli with Sambar|Porridge/i.test(draft.name), `${phrase} is not renamed to an unrelated recipe`);
}
assert.equal(parse('2 idlis').servingLabel, '2 × Idlis');
assert.equal(parse('1 cup dahi').servingLabel, '1 cup');
assert.equal(parse('150g oats').servingLabel, '150 g');
assert.equal(parse('2 boiled eggs').calories, 144);
assert.equal(parse('150g grilled chicken breast').calories, 248);
assert.equal(parse('1 tbsp peanut butter').calories, 95);
assert.equal(parse('150g Rolled Oats Porridge').requiresReview, true, 'raw/dry serving basis cannot be silently assumed');

const base = new Date(2026, 10, 6, 12);
const today = getDateKeyDaysAgo(0, base), yesterday = getDateKeyDaysAgo(1, base);
const meal = (dateKey:string, calories:number, id:string): any => ({ id, dateKey, timestamp:1, name:'fixture', servingLabel:'1', category:'Lunch', calories, proteinG:0, carbsG:0, fatG:0, fiberG:0 });
const days = aggregateDailyCalories([meal(today,0,'zero'), meal(yesterday,80,'one'), meal(yesterday,20,'two')], 14, base);
assert.equal(days.length,14);
assert.equal(days.at(-1)?.calories,0,'a logged zero remains zero');
assert.equal(days.at(-2)?.calories,100,'same-day meals add');
assert.equal(days.at(-3)?.calories,null,'no meal logs are unknown, not zero');
assert(aggregateDailyCalories([],14,base).every(x => x.calories === null));
assert.equal(calendarDayNumber('2024-02-29') !== null, true);
assert.equal(calendarDayNumber('2026-02-29'), null);
assert.equal(calendarDayNumber('2026-11-31'), null);
assert.deepEqual(chartDateFractions([]), []);
assert.deepEqual(chartDateFractions(['2026-11-06']), [0.5]);
assert.deepEqual(chartDateFractions(['2026-09-27','2026-11-05','2026-11-06']), [0,39/40,1], '40-day gap is proportionate to dates');
assert.deepEqual(chartDateFractions(['2026-03-07','2026-03-08','2026-03-09']), [0,0.5,1], 'DST does not distort calendar days');
assert.throws(() => chartDateFractions(['no-date']));
const w = (id:string,dateKey:string,timestamp:number,weightKg:number):any=>({id,dateKey,timestamp,weightKg});
const rows = [w('old','2026-09-27',1,90), w('latest','2026-11-06',4,80), w('prior-today','2026-11-06',3,82)];
const trend=aggregateWeightTrend(rows);
assert.deepEqual(trend.map(x=>x.weightKg),[90,80],'latest same-day weight is selected');
assert.deepEqual(weightLogComparison(rows), { first:rows[0], latest:rows[1] });
assert.equal(weightLogComparison([]),null); assert.equal(weightLogComparison([rows[0]]),null);
assert.equal(displayWeight(10,'kg',1),10); assert.equal(displayWeight(10,'lb',1),22.0);
const many=Array.from({length:20},(_,i)=>w(String(i),getDateKeyDaysAgo(19-i,base),i+1,60+i));
assert.equal(aggregateWeightTrend(many).length,14);

const ids=Array.from({length:10},(_,i)=>i.toString(16).padStart(32,'0'));
const fresh='f'.repeat(32);
assert.equal(CLOUD_DEVICE_LIMIT,10);
assert.equal(canWriteDeviceSnapshot(fresh,ids.slice(0,9)),true,'ninth to tenth allowed');
assert.equal(canWriteDeviceSnapshot(fresh,ids),false,'new eleventh blocked');
assert.equal(canWriteDeviceSnapshot(ids[3],ids),true,'existing slot can update');
console.log(`PASS: age safety, youth BMI/workouts/coach/badges, ambiguous foods, calendar gaps/weight/units, and sequential 10-device guard (TZ=${Intl.DateTimeFormat().resolvedOptions().timeZone})`);
