/** Session ideas are curated exercise lists, not medical or timed prescriptions. */
export interface WorkoutSessionIdea {
  id: string;
  title: string;
  detail: string;
  homeNoEquipment?: boolean;
  ids: readonly string[];
}

export const WORKOUT_SESSION_IDEAS: readonly WorkoutSessionIdea[] = [
  { id: 'home-foundations', title: 'Home full body', detail: 'No equipment · gentle start', homeNoEquipment: true, ids: ['ex-home-march-in-place', 'ex-home-air-squat', 'ex-home-kneeling-pushup', 'ex-glute-bridge', 'ex-bird-dog', 'ex-home-calf-raise'] },
  { id: 'home-cardio', title: 'Low-impact home cardio', detail: 'No equipment · no jumping', homeNoEquipment: true, ids: ['ex-home-march-in-place', 'ex-home-side-step-reach', 'ex-home-standing-knee-lifts', 'ex-home-step-out-jacks', 'ex-squat-to-calf-raise'] },
  { id: 'home-core', title: 'Home core & back', detail: 'No equipment · floor options', homeNoEquipment: true, ids: ['ex-home-scapular-squeeze', 'ex-home-standing-cross-crunch', 'ex-dead-bug', 'ex-bird-dog', 'ex-home-prone-w-raise', 'ex-home-side-lying-leg-raise'] },
  { id: 'home-back-posture', title: 'Home back & posture', detail: 'No equipment · gentle floor options', homeNoEquipment: true, ids: ['ex-home-scapular-squeeze', 'ex-more-superman-pull', 'ex-more-prone-y', 'ex-home-prone-w-raise', 'ex-bird-dog'] },
  { id: 'foundation', title: 'Full-body foundations', detail: 'A gentle place to start', ids: ['ex-incline-pushup', 'ex-band-pull-apart', 'ex-glute-bridge', 'ex-bird-dog', 'ex-brisk-walking'] },
  { id: 'strength', title: 'Upper-body strength', detail: 'Push, pull & arms', ids: ['ex-db-floor-press', 'ex-single-arm-db-row', 'ex-db-shoulder-press', 'ex-hammer-curl', 'ex-rope-triceps-pressdown'] },
  { id: 'low-impact', title: 'Low-impact movement', detail: 'Comfortable whole-body work', ids: ['ex-brisk-walking', 'ex-squat-to-calf-raise', 'ex-glute-bridge', 'ex-dead-bug', 'ex-wall-slide'] },
];
