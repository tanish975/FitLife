import { FitnessGoal, MoodId, MoodOption } from '../data/types';

export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'energized', label: 'Energized', emoji: '⚡', energyScore: 2, color: '#6BA37E' },
  { id: 'motivated', label: 'Motivated', emoji: '🔥', energyScore: 2, color: '#C89643' },
  { id: 'focused', label: 'Focused', emoji: '🎯', energyScore: 1, color: '#5F8D85' },
  { id: 'happy', label: 'Happy', emoji: '😊', energyScore: 1, color: '#7BB38F' },
  { id: 'calm', label: 'Calm', emoji: '🌿', energyScore: 1, color: '#87B5AD' },
  { id: 'neutral', label: 'Neutral', emoji: '😐', energyScore: 0, color: '#A8B0A9' },
  { id: 'sore', label: 'Sore', emoji: '💪', energyScore: -1, color: '#C2A878' },
  { id: 'tired', label: 'Tired', emoji: '😴', energyScore: -1, color: '#84877F' },
  { id: 'stressed', label: 'Stressed', emoji: '🌀', energyScore: -1, color: '#C47451' },
  { id: 'anxious', label: 'Anxious', emoji: '🌧️', energyScore: -2, color: '#B5836D' },
  { id: 'exhausted', label: 'Exhausted', emoji: '🪫', energyScore: -2, color: '#B85D4B' },
];

export interface AiCoachContext {
  healthScore: number;
  moodId: MoodId | null;
  goal: FitnessGoal;
  caloriesRemaining: number;
  proteinRemainingG: number;
  workedOutToday: boolean;
  streakDays: number;
}

export interface AiCoachMessage {
  headline: string;
  body: string;
  actionTag: string;
  toneColor: string;
}

/** Simple local rules, not generative AI, medical advice, or a health assessment. */
export function generateAiCoachMessage(ctx: AiCoachContext): AiCoachMessage {
  const mood = MOOD_OPTIONS.find((m) => m.id === ctx.moodId) ?? null;

  if (mood && (mood.id === 'exhausted' || mood.id === 'tired' || mood.id === 'sore')) {
    return {
      headline: 'Make room for recovery',
      body: mood.id === 'sore'
        ? 'Consider resting or choosing gentle movement if it feels comfortable. If pain is severe or persistent, seek professional advice.'
        : 'It is okay to take a rest day. If you feel up to moving, choose something gentle and stop if it does not feel right.',
      actionTag: 'Recovery first',
      toneColor: '#C2A878',
    };
  }

  if (mood && (mood.id === 'stressed' || mood.id === 'anxious')) {
    return {
      headline: 'Take it at your own pace',
      body: 'A comfortable walk, gentle movement, or a quiet break may help. Choose what feels right for you today.',
      actionTag: 'A gentle option',
      toneColor: '#87B5AD',
    };
  }

  if (mood && mood.energyScore >= 1 && !ctx.workedOutToday) {
    return {
      headline: 'Ready to move?',
      body: 'If you feel up to it, explore a workout that suits your experience and the time you have. Rest is an option too.',
      actionTag: 'Explore workouts',
      toneColor: '#7BB38F',
    };
  }

  if (ctx.workedOutToday) {
    return {
      headline: 'Movement logged today',
      body: ctx.proteinRemainingG > 15
        ? `You've logged a workout. Your estimated daily protein target has ${ctx.proteinRemainingG} g remaining; consider it as you plan your meals.`
        : 'You have logged movement today. Remember to allow time for recovery and drink according to your needs.',
      actionTag: 'Plan your day',
      toneColor: '#7BB38F',
    };
  }

  return {
    headline: 'A little movement adds up',
    body: 'Choose an activity you enjoy and an intensity that feels appropriate for you. A rest day counts, too.',
    actionTag: 'Find your pace',
    toneColor: '#D8C39E',
  };
}
