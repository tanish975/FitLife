export interface HealthScoreInput {
  caloriesConsumed: number;
  calorieTarget: number;
  proteinConsumed: number;
  proteinTarget: number;
  workedOutToday: boolean;
  workoutSetsToday: number;
  moodLoggedToday: boolean;
}

export interface HealthScoreBreakdown {
  score: number; // 0..100
  calorieComponent: number; // out of 55
  proteinComponent: number; // out of 15
  workoutComponent: number; // out of 25
  mindfulnessComponent: number; // out of 5
  statusLabel: string;
}

/**
 * Computes a 0-100 tracking score, not a health assessment, based on:
 * - Calorie adherence (up to 55 pts)
 * - Protein adherence (up to 15 pts)
 * - Workout completion today (up to 25 pts)
 * - Mood check-in today (up to 5 pts)
 */
export function calculateHealthScore(input: HealthScoreInput): HealthScoreBreakdown {
  const target = Math.max(1200, input.calorieTarget);
  const consumed = Math.max(0, input.caloriesConsumed);

  let calorieComponent = 0;
  if (consumed > 0) {
    const ratio = consumed / target;
    if (ratio <= 1.05) {
      // Smooth ramp up to 100% adherence
      calorieComponent = Math.min(55, Math.round(Math.min(ratio, 1) * 55));
    } else {
      // Gentle penalty for overshooting target
      const overshoot = ratio - 1.05;
      calorieComponent = Math.max(15, Math.round(55 * (1 - overshoot * 1.4)));
    }
  }

  const proteinRatio = input.proteinTarget > 0 ? Math.min(1, input.proteinConsumed / input.proteinTarget) : 0;
  const proteinComponent = Math.round(proteinRatio * 15);

  const workoutComponent = input.workedOutToday
    ? Math.min(25, 17 + Math.min(8, input.workoutSetsToday * 2))
    : 0;

  const mindfulnessComponent = input.moodLoggedToday ? 5 : 0;

  const score = Math.max(0, Math.min(100, calorieComponent + proteinComponent + workoutComponent + mindfulnessComponent));

  let statusLabel = 'Getting Started';
  if (score >= 88) statusLabel = 'Logs Complete';
  else if (score >= 72) statusLabel = 'Strong Momentum';
  else if (score >= 50) statusLabel = 'On Track';
  else if (score >= 25) statusLabel = 'Building Rhythm';

  return {
    score,
    calorieComponent,
    proteinComponent,
    workoutComponent,
    mindfulnessComponent,
    statusLabel,
  };
}
