import { ExerciseItem, FitnessGoal } from '../data/types';
import { calculateBmi } from './BmiCalculator';

export interface WorkoutPrescription {
  suggestedSets: number;
  suggestedReps: number;
  suggestedWeightKg: number;
  suggestedRestSeconds: number;
  protocolName: string;
  goalRationale: string;
  bmiCautionNote: string | null;
}

/**
 * Adaptive Workout Engine:
 * Computes suggested sets, reps, weight, and rest interval from the user's
 * FitnessGoal, exercise characteristics, and current BMI (adding a light BMI caution
 * note when appropriate while keeping all fields editable).
 */
export function getWorkoutPrescription(
  exercise: ExerciseItem,
  goal: FitnessGoal,
  weightKg: number,
  heightCm: number,
  age = 18,
  profileReady = true
): WorkoutPrescription {
  const bmiInfo = calculateBmi(weightKg, heightCm);

  let suggestedSets = 3;
  let suggestedReps = 10;
  let suggestedRestSeconds = 75;
  let weightMultiplier = 1.0;
  let protocolName = 'Balanced Hypertrophy';
  let goalRationale = 'Steady volume and moderate rest for all-around conditioning.';

  if (exercise.muscleGroup === 'Cardio') {
    // Repetitions for cardio are displayed as minutes, so avoid accidentally
    // suggesting three or four 15-minute blocks as a default. Short indoor
    // movements start at one minute; all durations remain user-editable.
    suggestedSets = 1;
    suggestedReps = exercise.id.startsWith('ex-home-') ? 1 : 10;
    suggestedRestSeconds = 45;
    protocolName = 'Cardio at your pace';
    goalRationale = 'A brief starting template, not a target. Adjust the time, pace and rest to suit your fitness.';
  } else {
    switch (goal) {
      case 'gain_muscle':
        suggestedSets = 4;
        suggestedReps = exercise.difficulty === 'Advanced' ? 8 : 10;
        suggestedRestSeconds = 90;
        weightMultiplier = 1.12;
        protocolName = 'Progressive Hypertrophy (4×8–10)';
        goalRationale = 'A strength-focused starting template. Choose a load you can control and adjust rest as needed.';
        break;
      case 'lose_weight':
        suggestedSets = 3;
        suggestedReps = 14;
        suggestedRestSeconds = 55;
        weightMultiplier = 0.9;
        protocolName = 'Metabolic Density (3×14)';
        goalRationale = 'A higher-repetition starting template. Adjust sets, repetitions, load and rest to your ability.';
        break;
      case 'endurance':
        suggestedSets = 3;
        suggestedReps = 18;
        suggestedRestSeconds = 45;
        weightMultiplier = 0.8;
        protocolName = 'Muscular Stamina (3×18)';
        goalRationale = 'A higher-repetition starting template; keep the load and pace manageable for you.';
        break;
      case 'maintain':
      default:
        suggestedSets = 3;
        suggestedReps = 12;
        suggestedRestSeconds = 70;
        weightMultiplier = 1.0;
        protocolName = 'Athletic Maintenance (3×12)';
        goalRationale = 'A balanced starting template; adjust the load and rest to suit your experience.';
        break;
    }
  }

  let suggestedWeightKg = exercise.isBodyweight
    ? 0
    : Math.max(2.5, Math.round((exercise.defaultWeightKg * weightMultiplier) / 2.5) * 2.5);

  if (!profileReady && exercise.muscleGroup !== 'Cardio') {
    protocolName = 'Starting template';
    goalRationale = 'A generic starting point, not a personalized prescription. Adjust sets, repetitions and rest to your ability.';
  }
  let bmiCautionNote: string | null = null;
  if (!profileReady) {
    bmiCautionNote = null;
  } else if (age < 18) {
    bmiCautionNote = 'Adult BMI categories do not apply below age 18. Adjust exercises to your ability and seek qualified guidance.';
  } else if (bmiInfo.category === 'Obese' || bmiInfo.bmi >= 29) {
    bmiCautionNote = `BMI is a rough screening measure and does not assess fitness. Use a comfortable load and range of motion; stop if you experience pain.`;
    if (!exercise.isBodyweight && (exercise.muscleGroup === 'Legs' || exercise.muscleGroup === 'Full Body')) {
      suggestedWeightKg = Math.max(5, Math.round((suggestedWeightKg * 0.88) / 2.5) * 2.5);
    }
  } else if (bmiInfo.category === 'Underweight') {
    bmiCautionNote = `BMI is a rough screening measure and does not assess fitness. Choose a manageable load, comfortable form and enough rest.`;
  } else if (bmiInfo.category === 'Overweight' && exercise.muscleGroup === 'Cardio') {
    bmiCautionNote = `BMI is a rough screening measure and does not assess fitness. Consider a comfortable, lower-impact pace if appropriate for you.`;
  }

  return {
    suggestedSets,
    suggestedReps,
    suggestedWeightKg,
    suggestedRestSeconds,
    protocolName,
    goalRationale,
    bmiCautionNote,
  };
}

/** Rough gross energy only. Cardio has a duration; strength entries do not.
 * A generic 3.5 MET home / 5 MET other-cardio assumption is not a measurement
 * and does not model actual pace or individual physiology. One MET is about
 * 1 kcal/kg/hour: https://pacompendium.com/ .
 */
export function estimateWorkoutCalories(exercise: ExerciseItem, sets: number, repsOrMinutes: number, weightKg: number): number {
  if (exercise.muscleGroup === 'Cardio') {
    const genericMet = exercise.id.startsWith('ex-home-') ? 3.5 : 5;
    return Math.max(0, Math.round(genericMet * Math.max(0, weightKg) * sets * repsOrMinutes / 60));
  }
  return Math.max(0, Math.round(exercise.caloriesPerSet * sets * (1 + repsOrMinutes / 35)));
}
