import type { ExerciseItem } from '../data/types';

export interface EasierOption { note: string; exerciseId?: string }
/** Curated choices are suggestions, not a medical prescription. */
export function easierOption(ex: ExerciseItem): EasierOption {
  const id = ex.id;
  if (id.startsWith('ex-more-neck-') && ex.difficulty === 'Advanced') return { note: 'Skip loaded neck work unless a qualified professional guides you.' };
  if (id.startsWith('ex-more-neck-')) return { note: 'Use lighter pressure or skip this movement; ask a clinician if uncertain.' };
  if (id === 'ex-more-wall-walk' || id === 'ex-more-handstand-pushup') return { note: 'Try a pike push-up or a wall push-up instead.', exerciseId: 'ex-home-pike-pushup' };
  if (['ex-more-jefferson-curl','ex-more-barbell-good-morning','ex-more-rack-pull'].includes(id)) return { note: 'Practice a comfortable unweighted hip hinge instead.', exerciseId: 'ex-home-good-morning' };
  if (/pushup|pushups|push-up/.test(id) && id !== 'ex-wall-pushup') return { note: 'Try a wall push-up for a gentler angle.', exerciseId: 'ex-wall-pushup' };
  if (id === 'ex-home-single-leg-bridge') return { note: 'Keep both feet on the floor.', exerciseId: 'ex-glute-bridge' };
  if (['ex-burpees','ex-jump-rope','ex-hiit-sprints','ex-home-walkout'].includes(id)) return { note: 'Try a low-impact march instead.', exerciseId: 'ex-home-march-in-place' };
  if (['ex-plank-hold','ex-ab-wheel','ex-home-bear-knee-hover','ex-home-reverse-crunch'].includes(id)) return { note: 'Try a slow heel slide instead.', exerciseId: 'ex-home-heel-slides' };
  if (ex.muscleGroup === 'Cardio') return { note: 'Slow your pace or shorten the interval; keep it comfortable.' };
  if (!ex.isBodyweight) return { note: 'Use less resistance, or practice the movement without added load.' };
  return { note: 'Reduce the range or repetitions; use a stable support if helpful.' };
}
