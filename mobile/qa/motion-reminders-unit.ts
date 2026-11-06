import assert from 'node:assert/strict';
import { EXERCISE_CATALOG } from '../src/data/ExerciseCatalog';
import { MOTION_DEMOS, exerciseMotionFor, motionPoseAt } from '../src/data/ExerciseMotion';
import { parseTime, minuteTime, validWaterPlan, waterPlanFrom } from '../src/domain/Reminders';

const ids=new Set<string>();
assert.equal(MOTION_DEMOS.length,30);
assert.equal(MOTION_DEMOS.filter(d=>d.hold).length,2);
assert.deepEqual([MOTION_DEMOS.filter(d=>d.avatar==='A').length,MOTION_DEMOS.filter(d=>d.avatar==='B').length],[15,15]);
for(const d of MOTION_DEMOS){
  assert(!ids.has(d.exerciseId),`duplicate mapping ${d.exerciseId}`);ids.add(d.exerciseId);
  assert(EXERCISE_CATALOG.some(e=>e.id===d.exerciseId),`unknown mapped exercise ${d.exerciseId}`);
  assert(d.start && d.action && d.frames.length>=1,`missing instructions ${d.exerciseId}`);
  assert.equal(exerciseMotionFor({id:d.exerciseId}),d);
  let previous=motionPoseAt(d,0);
  for(let i=0;i<=200;i++){
    const f=motionPoseAt(d,i/200);
    for(const key of Object.keys(f) as (keyof typeof f)[]){
      assert(f[key].every(Number.isFinite),`non-finite ${d.exerciseId}/${key}`);
      assert(f[key][0]>=0 && f[key][0]<=320 && f[key][1]>=0 && f[key][1]<=200,`off-canvas ${d.exerciseId}/${key}`);
      const delta=Math.hypot(f[key][0]-previous[key][0],f[key][1]-previous[key][1]);
      assert(delta<5,`abrupt joint jump ${d.exerciseId}/${key}: ${delta}`);
    }
    if(d.exerciseId==='ex-pushups' || d.exerciseId==='ex-home-side-lying-leg-raise'){
      const v=[f.ankle[0]-f.hip[0],f.ankle[1]-f.hip[1]],w=[f.knee[0]-f.hip[0],f.knee[1]-f.hip[1]];
      assert(Math.abs(v[0]*w[1]-v[1]*w[0])<0.001,'working leg stays straight');
    }
    previous=f;
  }
  if(d.cyclic) assert.deepEqual(motionPoseAt(d,0),motionPoseAt(d,1),`cycle ends where it starts: ${d.exerciseId}`);
}
assert.equal(exerciseMotionFor({id:'ex-more-neck-flexion-machine'}),undefined,'no generic placeholder for an unmatched exercise');
assert.equal(parseTime('09:05'),545);assert.equal(parseTime('24:00'),null);assert.equal(parseTime('9:05'),null);assert.equal(minuteTime(1140),'19:00');
const legacy=waterPlanFrom({enabled:true,hour:13,minute:15});
assert.deepEqual(legacy,{enabled:true,mode:'times',times:[795],startMinute:540,endMinute:1140,intervalMinutes:120});
assert(validWaterPlan({...legacy,mode:'times',times:[660,900,1140]}));
assert(validWaterPlan({...legacy,mode:'interval',intervalMinutes:60}));
assert(!validWaterPlan({...legacy,times:[660,660]}));
assert(!validWaterPlan({...legacy,times:[]}));
assert(!validWaterPlan({...legacy,startMinute:1200,endMinute:540}));
assert(!validWaterPlan({...legacy,intervalMinutes:90}));
console.log('PASS: exact movement mappings, balanced illustration styles, bounded continuous poses, static holds, legacy water migration and input validation.');
