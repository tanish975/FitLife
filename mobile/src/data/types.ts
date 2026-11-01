import {
  CornerStyle,
  DensityStyle,
  MotionStyle,
  PaletteId,
  ThemeMode,
} from '../domain/ThemePalettes';

export type BiologicalSex = 'male' | 'female';

export type FitnessGoal = 'lose_weight' | 'maintain' | 'gain_muscle' | 'endurance';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';

export type WeightUnit = 'kg' | 'lb';

export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type MuscleGroup =
  | 'All'
  | 'Chest'
  | 'Back'
  | 'Legs'
  | 'Shoulders'
  | 'Arms'
  | 'Core'
  | 'Cardio'
  | 'Full Body';

export type MoodId =
  | 'energized'
  | 'focused'
  | 'happy'
  | 'calm'
  | 'motivated'
  | 'neutral'
  | 'tired'
  | 'stressed'
  | 'sore'
  | 'anxious'
  | 'exhausted';

export interface MoodOption {
  id: MoodId;
  label: string;
  emoji: string;
  energyScore: number; // -2 to +2
  color: string;
}

export interface UserProfile {
  name: string;
  email: string;
  sex: BiologicalSex;
  age: number;
  heightCm: number;
  weightKg: number; // Always stored in kg internally
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
  onboarded: boolean;
  uid?: string;
}

export interface MacroTargets {
  calories: number;
  bmr: number;
  tdee: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface FoodItem {
  id: string;
  name: string;
  servingLabel: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  defaultCategory: MealCategory;
  tags: string[];
}

export interface LoggedMeal {
  id: string;
  dateKey: string; // YYYY-MM-DD
  timestamp: number;
  name: string;
  servingLabel: string;
  category: MealCategory;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: Exclude<MuscleGroup, 'All'>;
  secondaryMuscles: string;
  equipment: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  isBodyweight: boolean;
  defaultWeightKg: number;
  caloriesPerSet: number;
  tip: string;
}

export interface LoggedWorkout {
  id: string;
  dateKey: string; // YYYY-MM-DD
  timestamp: number;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: Exclude<MuscleGroup, 'All'>;
  sets: number;
  reps: number;
  weightKg: number; // Stored in kg internally
  caloriesBurned: number;
  restSeconds: number;
}

export interface WeightEntry {
  id: string;
  dateKey: string; // YYYY-MM-DD
  timestamp: number;
  weightKg: number; // Stored in kg internally
}

export interface MoodEntry {
  id: string;
  dateKey: string; // YYYY-MM-DD
  timestamp: number;
  moodId: MoodId;
}

export interface DashboardWidgetsConfig {
  showMacros: boolean;
  showHydration: boolean;
  showMood: boolean;
  showAiCoach: boolean;
  showActivityFeed: boolean;
}

export interface AppSettings {
  weightUnit: WeightUnit;
  hapticsEnabled: boolean;
  firebaseProjectId: string;
  themeMode: ThemeMode;
  paletteId: PaletteId;
  cornerStyle: CornerStyle;
  motionStyle: MotionStyle;
  densityStyle: DensityStyle;
  defaultRestSeconds: number;
  waterGoalMl: number;
  dashboardWidgets: DashboardWidgetsConfig;
}

export interface BadgeStatus {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number; // 0..1
  currentValue: number;
  targetValue: number;
  category: 'streak' | 'nutrition' | 'workout' | 'mindset' | 'milestone';
}

export interface GamificationSummary {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  levelProgress: number; // 0..1
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
  badges: BadgeStatus[];
}
