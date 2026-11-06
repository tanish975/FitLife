import type { ExerciseItem, ExerciseTarget, LoggedWorkout } from '../data/types';

export const EXERCISE_TARGETS: readonly ExerciseTarget[] = [
  'Neck', 'Traps', 'Shoulders', 'Chest', 'Back', 'Biceps', 'Triceps', 'Forearms',
  'Core', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Shins',
  'Rotator cuff', 'Hip stabilizers', 'Stabilizers', 'Cardio', 'Full body',
];

/** Search synonyms retain the original exercise ID and do not create duplicate movements. */
const LEGACY_ALIASES: Record<string, string[]> = {
  'ex-pushups': ['standard push-up', 'standard pushups'],
  'ex-pullups': ['pull up', 'wide grip pullup'],
  'ex-wall-slide': ['wall angel', 'wall angels'],
  'ex-home-scapular-pushup': ['push-up plus', 'scapular push-ups'],
  'ex-home-scapular-squeeze': ['shoulder blade squeeze', 'rhomboids'],
  'ex-home-donkey-kick': ['donkey kick', 'donkey kicks'],
  'ex-home-good-morning': ['bodyweight good morning'],
  'ex-home-air-squat': ['air squat'],
  'ex-home-plank-shoulder-taps': ['shoulder taps'],
  'ex-glute-bridge': ['glute bridge'],
  'ex-romanian-deadlift': ['rdl', 'romanian deadlift'],
  'ex-conventional-deadlift': ['conventional deadlift'],
};

const synonyms: Partial<Record<ExerciseTarget, string>> = {
  'Traps': 'trapezius trapezoid', 'Back': 'back',
  'Shoulders': 'deltoid delts', 'Quadriceps': 'quad quads', 'Glutes': 'glute butt',
  'Calves': 'calf gastrocnemius soleus', 'Shins': 'tibialis dorsiflexion',
  'Core': 'abs abdominal obliques transverse abdominis',
  'Hip stabilizers': 'hip abduction adduction', 'Cardio': 'cardiovascular aerobic',
  'Full body': 'compound',
};

/** Original entries are classified by their existing descriptions rather than re-IDed. */
export function matchesExerciseTarget(ex: ExerciseItem, target: ExerciseTarget): boolean {
  if (ex.targetAreas) {
    if (ex.targetAreas.includes(target)) return true;
    if (target === 'Stabilizers' && ex.targetAreas.some(x => x === 'Hip stabilizers' || x === 'Rotator cuff')) return true;
    return false;
  }
  const text = `${ex.name} ${ex.secondaryMuscles} ${(LEGACY_ALIASES[ex.id] || []).join(' ')}`.toLowerCase();
  switch (target) {
    case 'Neck': return /\bneck\b/.test(text);
    case 'Traps': return /trap|shrug|face pull|shoulder.blade squeeze/.test(text);
    case 'Shoulders': return ex.muscleGroup === 'Shoulders' || /delt|shoulder|rotator cuff/.test(text);
    case 'Chest': return ex.muscleGroup === 'Chest' || /chest|pectoral|pecs/.test(text);
    case 'Back': return ex.muscleGroup === 'Back' || /\blats?\b|latissimus|mid.back|upper back|rhomboid|spinal erector/.test(text);
    case 'Biceps': return /bicep|hammer curl|chin.up/.test(text);
    case 'Triceps': return /tricep/.test(text);
    case 'Forearms': return /forearm|grip|wrist/.test(text);
    case 'Core': return ex.muscleGroup === 'Core' || /core|abdomin|oblique|\babs\b/.test(text);
    case 'Quadriceps': return /\bquads?\b|quadriceps|squat|lunge|leg press/.test(text);
    case 'Hamstrings': return /hamstring|romanian deadlift|hip hinge/.test(text);
    case 'Glutes': return /glute|hip thrust/.test(text);
    case 'Calves': return /calf|calves|gastrocnemius|soleus/.test(text);
    case 'Shins': return /shin|tibialis/.test(text);
    case 'Rotator cuff': return /rotator cuff|external rotation|internal rotation/.test(text);
    case 'Hip stabilizers': return /hip stabilizer|side glute/.test(text);
    case 'Stabilizers': return /stabili[sz]er|rotator cuff|shoulder.blade/.test(text);
    case 'Cardio': return ex.muscleGroup === 'Cardio';
    case 'Full body': return ex.muscleGroup === 'Full Body';
  }
}

export function exerciseSearchText(ex: ExerciseItem): string {
  const tags = EXERCISE_TARGETS.filter(target => matchesExerciseTarget(ex, target));
  const expansions = tags.map(target => synonyms[target] || '');
  return [ex.name, ex.muscleGroup, ex.secondaryMuscles, ex.equipment,
    ...(ex.aliases || []), ...(LEGACY_ALIASES[ex.id] || []), ...tags, ...expansions].join(' ').toLowerCase();
}

export function exerciseValueLabel(ex: ExerciseItem): 'Minutes' | 'Seconds' | 'Reps' {
  return ex.muscleGroup === 'Cardio' ? 'Minutes' : ex.logUnit === 'seconds' ? 'Seconds' : 'Reps';
}

/** Optional seconds tag preserves the original meaning of every legacy rep count. */
export function loggedWorkoutUnit(workout: Pick<LoggedWorkout, 'measurementUnit' | 'muscleGroup'>): 'sec' | 'min' | 'reps' {
  return workout.measurementUnit === 'seconds' ? 'sec' : workout.muscleGroup === 'Cardio' ? 'min' : 'reps';
}
