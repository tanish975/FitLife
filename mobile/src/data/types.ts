import type {
  StepObservation,
  SavedMeal,
  CustomRecipe,
  PlannedDay,
  BodyMeasurementEntry,
  HabitReminderPreferences,
} from '../domain/PersonalFeatures';

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

/** Monotonic first-visit flags. IDs are stable across devices and app versions. */
export const GUIDE_IDS = ['dashboard', 'meals', 'workouts', 'progress', 'profile', 'settings', 'daily', 'onboarding'] as const;
export type GuideId = typeof GUIDE_IDS[number];
export function normalizeGuides(value: unknown): GuideId[] {
  if (!Array.isArray(value)) return [];
  return GUIDE_IDS.filter(id => value.includes(id));
}

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

/** Detailed catalog-only filters; persisted workouts keep the legacy broad muscleGroup. */
export type ExerciseTarget =
  | 'Neck' | 'Traps' | 'Shoulders' | 'Chest' | 'Back'
  | 'Biceps' | 'Triceps' | 'Forearms' | 'Core'
  | 'Quadriceps' | 'Hamstrings' | 'Glutes' | 'Calves' | 'Shins'
  | 'Rotator cuff' | 'Hip stabilizers' | 'Stabilizers' | 'Cardio' | 'Full body';

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
  calculationVersion?: string;
  wasFloored?: boolean;
}

export type FoodSourceKind =
  | 'curated'
  | 'ifct2017'
  | 'usda-sr28'
  | 'taco-brazil'
  | 'ciqual-france'
  | 'fitlife-global-dish';

export type WorldRegionId =
  | 'global'
  | 'south-asia'
  | 'east-asia'
  | 'southeast-asia'
  | 'central-asia-caucasus'
  | 'middle-east'
  | 'north-africa'
  | 'west-africa'
  | 'east-southern-africa'
  | 'mediterranean-europe'
  | 'western-central-europe'
  | 'nordic-baltic'
  | 'eastern-europe'
  | 'north-america'
  | 'mexico-central-america-caribbean'
  | 'south-america'
  | 'oceania-pacific';

export type EdibleCategoryId =
  | 'prepared-dishes'
  | 'grains-cereals'
  | 'roots-tubers'
  | 'legumes-pulses'
  | 'vegetables-greens'
  | 'fruits-berries'
  | 'mushrooms-fungi'
  | 'seaweeds-algae'
  | 'nuts-seeds'
  | 'dairy-cheeses'
  | 'eggs'
  | 'poultry-fowl'
  | 'meats-game'
  | 'fish-seafood'
  | 'oils-fats'
  | 'herbs-spices-condiments'
  | 'beverages-infusions'
  | 'sweets-bakery';

export type FoodDietaryFlag =
  | 'vegan'
  | 'vegetarian'
  | 'eggetarian'
  | 'pescatarian'
  | 'gluten-free'
  | 'dairy-free'
  | 'high-protein'
  | 'high-fiber'
  | 'fermented';

export type FoodAllergenFlag =
  | 'milk'
  | 'egg'
  | 'fish'
  | 'shellfish'
  | 'tree-nut'
  | 'peanut'
  | 'wheat-gluten'
  | 'soy'
  | 'sesame';

export type FoodEdibleState =
  | 'raw'
  | 'cooked'
  | 'steamed-boiled'
  | 'roasted-grilled'
  | 'fried'
  | 'fermented'
  | 'dried'
  | 'ready-to-eat';

export interface FoodMeasuredPortion {
  label: string;
  grams: number;
}

export interface FoodMicronutrients {
  saturatedFatG?: number;
  cholesterolMg?: number;
  calciumMg?: number;
  ironMg?: number;
  magnesiumMg?: number;
  potassiumMg?: number;
  zincMg?: number;
  vitaminCMg?: number;
  vitaminB12Ug?: number;
  folateUg?: number;
  vitaminDUg?: number;
  vitaminAUg?: number;
  caffeineMg?: number;
}

export type FoodPreparationProfile =
  | 'cooked_dish'
  | 'raw_rice_grain'
  | 'raw_dal'
  | 'raw_whole_legume'
  | 'raw_poha'
  | 'raw_flour_roti'
  | 'raw_semolina_dalia'
  | 'raw_vegetable_tuber'
  | 'raw_meat_seafood'
  | 'liquid_dairy_beverage'
  | 'cooking_fat_oil'
  | 'ready_to_eat';

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
  /** Optional catalog metadata for FitLife FoodDB, IFCT 2017 & global portions; legacy 32 items remain untouched. */
  source?: FoodSourceKind;
  sourceCode?: string;
  ifctCode?: string;
  ifctGroup?: string;
  scientificName?: string;
  cuisineTag?: 'gujarati' | 'indian' | 'global';
  worldRegion?: WorldRegionId;
  countryCodes?: string[];
  originLabel?: string;
  edibleCategory?: EdibleCategoryId;
  edibleState?: FoodEdibleState;
  dietaryFlags?: FoodDietaryFlag[];
  allergenFlags?: FoodAllergenFlag[];
  measuredPortions?: FoodMeasuredPortion[];
  micronutrients?: FoodMicronutrients;
  aliases?: string[];
  servingGrams?: number;
  sugarG?: number;
  sodiumMg?: number;
  moistureG?: number;
  preparationProfile?: FoodPreparationProfile;
  isRaw?: boolean;
  provenanceNote?: string;
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
  /** Optional user-supplied values; absent means unknown, not zero. */
  sugarG?: number;
  sodiumMg?: number;
  nutritionNote?: string;
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
  /** Optional catalog-only metadata; no changes to legacy exercise IDs. */
  targetAreas?: ExerciseTarget[];
  aliases?: string[];
  caution?: string;
  logUnit?: 'seconds';
  energyEstimateUnavailable?: boolean;
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
  /** False when the inputs needed for an estimate have not been provided. */
  energyEstimateAvailable?: boolean;
  /** Added only to new timed exercises; legacy rows still represent reps/minutes. */
  measurementUnit?: 'seconds';
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
  autoStartRest: boolean;
  weeklyWorkoutGoal: number;
  favoriteExerciseIds: string[];
  navStyle: 'glass' | 'solid';
  waterGoalMl: number;
  dashboardWidgets: DashboardWidgetsConfig;
  /** Optional for backward-compatible backups made before these features existed. */
  guidesSeen?: GuideId[];
  largeText?: boolean;
  stepGoal?: number;
  stepHistory?: StepObservation[];
  savedMeals?: SavedMeal[];
  customRecipes?: CustomRecipe[];
  weeklyPlan?: PlannedDay[];
  bodyMeasurements?: BodyMeasurementEntry[];
  habitReminders?: HabitReminderPreferences;
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
