import assert from 'node:assert/strict';
import legacy from './legacy-exercises.json';
import { EXERCISE_CATALOG, ORIGINAL_EXERCISE_CATALOG } from '../src/data/ExerciseCatalog';
import { EXERCISE_ADDITIONS } from '../src/data/ExerciseExpansion';
import { EXERCISE_TARGETS, exerciseSearchText, matchesExerciseTarget, exerciseValueLabel, loggedWorkoutUnit } from '../src/domain/ExerciseDiscovery';
import { WORKOUT_SESSION_IDEAS } from '../src/data/WorkoutSessions';
import { estimateWorkoutCalories, getWorkoutPrescription } from '../src/domain/AdaptiveWorkoutEngine';
import { validSnapshot, encryptBackup, decryptBackup } from '../src/domain/EncryptedBackup';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
import { validCloudPayload, emptyDeletions } from '../src/domain/CloudSync';
import { easierOption } from '../src/domain/ExerciseGuidance';

assert.deepEqual(ORIGINAL_EXERCISE_CATALOG, legacy, 'all 91 original entries remain byte-for-field equivalent');
assert.equal(ORIGINAL_EXERCISE_CATALOG.length, 91);
assert.equal(EXERCISE_ADDITIONS.length, 130);
assert.equal(EXERCISE_CATALOG.length, 221);
assert.equal(new Set(EXERCISE_CATALOG.map(e => e.id)).size, EXERCISE_CATALOG.length, 'no duplicate IDs');
assert.equal(new Set(EXERCISE_ADDITIONS.map(e => e.name.toLowerCase())).size, EXERCISE_ADDITIONS.length, 'new names are distinct');
const oldNames = new Set(ORIGINAL_EXERCISE_CATALOG.map(e => e.name.toLowerCase()));
assert(EXERCISE_ADDITIONS.every(e => !oldNames.has(e.name.toLowerCase())), 'no exact duplicate of an original exercise');
const get = (id:string) => { const ex=EXERCISE_CATALOG.find(e=>e.id===id); assert(ex,`missing ${id}`); return ex; };
for (const e of EXERCISE_CATALOG) {
  assert(e.id && e.name && e.tip && e.equipment && e.secondaryMuscles, e.id);
  assert(['Chest','Back','Legs','Shoulders','Arms','Core','Cardio','Full Body'].includes(e.muscleGroup), `legacy-compatible broad group: ${e.id}`);
  const alt=easierOption(e); if (alt.exerciseId) assert(EXERCISE_CATALOG.some(x=>x.id===alt.exerciseId), `unknown alternative for ${e.id}`);
}
for (const e of EXERCISE_ADDITIONS) {
  assert(e.id.startsWith('ex-more-') && e.targetAreas?.length, e.id);
  assert(e.targetAreas!.every(x=>EXERCISE_TARGETS.includes(x)), e.id);
  assert.equal(e.defaultWeightKg, 0, `new exercises don't suggest a fabricated weight: ${e.id}`);
  if (e.muscleGroup !== 'Cardio') {
    assert(e.energyEstimateUnavailable, `no invented burn for new strength exercise ${e.id}`);
    assert.equal(estimateWorkoutCalories(e,3,12,65),0);
  }
  if (e.equipment === 'Bodyweight') assert(e.isBodyweight, `no-equipment should not require a load: ${e.id}`);
}
for (const t of EXERCISE_TARGETS) assert(EXERCISE_CATALOG.some(e=>matchesExerciseTarget(e,t)), `${t} has discoverable exercises`);
for (const [id,area] of [
  ['ex-more-neck-front-hold','Neck'], ['ex-more-barbell-shrug','Traps'], ['ex-more-reverse-wrist-curl','Forearms'],
  ['ex-more-front-squat','Quadriceps'], ['ex-more-lying-leg-curl','Hamstrings'], ['ex-more-fire-hydrant','Glutes'],
  ['ex-more-seated-calf-machine','Calves'], ['ex-more-toe-raise','Shins'], ['ex-more-cable-external-rotation','Rotator cuff'],
  ['ex-more-clamshell','Hip stabilizers'], ['ex-more-jogging','Cardio'], ['ex-more-outdoor-cycling','Cardio'],
] as const) assert(matchesExerciseTarget(get(id),area), `${id} appears under ${area}`);
assert(!matchesExerciseTarget(get('ex-lateral-raise'),'Back'), 'lateral is not the same as lats');
assert(!matchesExerciseTarget(get('ex-home-donkey-kick'),'Quadriceps'), 'quadruped is not quadriceps');
assert(exerciseSearchText(get('ex-wall-slide')).includes('wall angels'), 'wall angels find the original wall slide');
assert(exerciseSearchText(get('ex-home-scapular-pushup')).includes('push-up plus'));
assert(exerciseSearchText(get('ex-home-donkey-kick')).includes('donkey kick'));
assert(exerciseSearchText(get('ex-more-prone-t')).includes('prone reverse fly'));
assert(exerciseSearchText(get('ex-more-jogging')).includes('jog'));
assert(exerciseSearchText(get('ex-more-stationary-cycling')).includes('cycling'));
for (const id of ['ex-more-band-row','ex-more-band-face-pull','ex-more-doorframe-row','ex-more-wall-sit','ex-more-decline-pushup','ex-more-jug-curl','ex-more-outdoor-cycling']) {
  assert.notEqual(get(id).equipment,'Bodyweight',`${id} requires an actual object, support or machine`);
}
assert.equal(get('ex-more-neck-front-hold').equipment,'Bodyweight');
assert.equal(get('ex-more-jogging').equipment,'Bodyweight');
assert.equal(get('ex-more-fingertip-pushup').difficulty,'Advanced');
assert(get('ex-more-fingertip-pushup').caution);
assert(get('ex-more-jefferson-curl').caution?.includes('supervision'));
assert(get('ex-more-doorframe-row').caution?.includes('Do not pull on a door'));
assert(get('ex-more-neck-flexion-machine').caution?.includes('supervision'));
const timed=get('ex-more-neck-front-hold');
assert.equal(exerciseValueLabel(timed),'Seconds');
assert.equal(loggedWorkoutUnit({measurementUnit:'seconds',muscleGroup:'Shoulders'}),'sec');
assert.equal(loggedWorkoutUnit({muscleGroup:'Shoulders'}),'reps', 'old logs retain the original unit');
assert.equal(loggedWorkoutUnit({muscleGroup:'Cardio'}),'min');
for (const age of [15,17,20,30]) {
  const p=getWorkoutPrescription(timed,'lose_weight',55,160,age,true);
  assert.deepEqual([p.suggestedSets,p.suggestedReps,p.suggestedWeightKg],[1,5,0]);
  if(age<18) assert(!/density|weight loss|fat/i.test(p.protocolName+p.goalRationale));
}
assert.deepEqual([getWorkoutPrescription(get('ex-more-jefferson-curl'),'gain_muscle',55,160,30,true).suggestedSets,getWorkoutPrescription(get('ex-more-jefferson-curl'),'gain_muscle',55,160,30,true).suggestedReps],[1,5]);
assert.equal(getWorkoutPrescription(get('ex-more-reverse-treadmill'),'maintain',55,160,30,true).suggestedReps,1);
assert.equal(exerciseValueLabel(get('ex-more-jogging')),'Minutes');
assert(estimateWorkoutCalories(get('ex-more-jogging'),1,5,60)>0, 'cardio uses duration, with a rough generic estimate');
for (const session of WORKOUT_SESSION_IDEAS) {
  assert(session.ids.every(id=>EXERCISE_CATALOG.some(e=>e.id===id)),session.id);
  if (session.homeNoEquipment) assert(session.ids.every(id=>get(id).equipment==='Bodyweight'), `${session.id} really needs no equipment`);
}
assert(WORKOUT_SESSION_IDEAS.some(s=>s.id==='home-back-posture'));

const profile:any={name:'Fixture',email:'fixture@example.test',sex:'female',age:30,heightCm:170,weightKg:65,goal:'maintain',activityLevel:'moderate',onboarded:true};
const settings:any={weightUnit:'kg',hapticsEnabled:true,themeMode:'light',paletteId:'matcha_oat',cornerStyle:'organic',motionStyle:'spring',densityStyle:'comfortable',defaultRestSeconds:75,waterGoalMl:2500,dashboardWidgets:{showMacros:true,showHydration:true,showMood:true,showAiCoach:true,showActivityFeed:true}};
const old:any={id:'wk-old',dateKey:'2026-11-06',timestamp:1,exerciseId:'ex-pushups',exerciseName:'Strict Push-Ups',muscleGroup:'Chest',sets:3,reps:10,weightKg:0,caloriesBurned:24,restSeconds:60};
const held:any={...old,id:'wk-held',exerciseId:timed.id,exerciseName:timed.name,muscleGroup:timed.muscleGroup,sets:1,reps:5,caloriesBurned:0,energyEstimateAvailable:false,measurementUnit:'seconds'};
const snapshot:any={schema:1,createdAt:1,profile,settings,water:{dateKey:'2026-11-06',amountMl:0},meals:[],workouts:[old,held],weights:[],moods:[]};
assert(validSnapshot(snapshot), 'old and new entries can coexist in encrypted backups');
assert(validCloudPayload({schema:1,snapshot,deleted:emptyDeletions()}), 'new timed entry remains valid for sync');
const encrypted=await encryptBackup(snapshot,'fictional test passphrase');
const restored=await decryptBackup(encrypted,'fictional test passphrase');
assert.deepEqual(restored.workouts,[old,held], 'encrypted backup preserves old and new timed workouts');
assert(!validSnapshot({...snapshot,workouts:[{...held,measurementUnit:'meters'}]}), 'unknown units rejected');
console.log(`PASS: ${legacy.length} unchanged original exercises + ${EXERCISE_ADDITIONS.length} additions, targets/aliases, equipment, safety, timed units, backup and cloud compatibility`);
