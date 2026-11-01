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
  age = 18
): WorkoutPrescription {
  const bmiInfo = calculateBmi(weightKg, heightCm);

  let suggestedSets = 3;
  let suggestedReps = 10;
  let suggestedRestSeconds = 75;
  let weightMultiplier = 1.0;
  let protocolName = 'Balanced Hypertrophy';
  let goalRationale = 'Steady volume and moderate rest for all-around conditioning.';

  if (exercise.muscleGroup === 'Cardio') {
    suggestedSets = goal === 'endurance' || goal === 'lose_weight' ? 4 : 3;
    suggestedReps = 15; // minutes / intervals
    suggestedRestSeconds = 45;
    protocolName = 'Metabolic Conditioning';
    goalRationale = 'A starting template for cardio intervals. Adjust the pace and rest to suit your fitness.';
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

  let bmiCautionNote: string | null = null;
  if (age < 18) {
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
