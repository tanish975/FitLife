import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  AppSettings,
  BadgeStatus,
  DashboardWidgetsConfig,
  FoodItem,
  GamificationSummary,
  LoggedMeal,
  LoggedWorkout,
  MacroTargets,
  MealCategory,
  MoodEntry,
  MoodId,
  UserProfile,
  WeightEntry,
  WeightUnit,
} from './types';
import {
  CORNER_RADIUS_MAP,
  CornerStyle,
  DensityStyle,
  MotionStyle,
  NATURAL_PALETTES,
  PaletteId,
  ThemeColors,
  ThemeMode,
} from '../domain/ThemePalettes';
import { calculateMacroTargets } from '../domain/CalorieCalculator';
import { getDateKeyDaysAgo } from '../domain/ProgressAggregator';
import { computeGamification } from '../domain/GamificationEngine';
import { triggerHaptic } from '../domain/Haptics';
import { ParsedMealDraft } from '../domain/MealTextParser';
import { applyThemeColorVariables } from '../domain/ThemeColorVariables';
import { createThemeRevealController } from '../domain/ThemeReveal';

const STORAGE_KEYS = {
  PROFILE: 'fitlife_profile_v1',
  SETTINGS: 'fitlife_settings_v2',
  MEALS: 'fitlife_meals_v1',
  WORKOUTS: 'fitlife_workouts_v1',
  WEIGHTS: 'fitlife_weights_v1',
  MOODS: 'fitlife_moods_v1',
  WATER: 'fitlife_water_v1',
  AUTH: 'fitlife_auth_v1',
};

export interface CelebrationPayload {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

interface FitLifeContextValue {
  profile: UserProfile;
  settings: AppSettings;
  themeColors: ThemeColors;
  meals: LoggedMeal[];
  workouts: LoggedWorkout[];
  weights: WeightEntry[];
  moods: MoodEntry[];
  waterTodayMl: number;
  isAuthenticated: boolean;
  todayKey: string;
  todayMeals: LoggedMeal[];
  todayWorkouts: LoggedWorkout[];
  todayMood: MoodId | null;
  latestWeightKg: number;
  startingWeightKg: number;
  macroTargets: MacroTargets;
  gamification: GamificationSummary;
  celebration: CelebrationPayload | null;
  toastMessage: string | null;
  dismissCelebration: () => void;
  triggerManualCelebration: (badge?: BadgeStatus) => void;
  updateProfile: (next: Partial<UserProfile>) => void;
  setWeightUnit: (unit: WeightUnit) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setThemeMode: (mode: ThemeMode, origin?: HTMLElement | null) => void;
  toggleThemeMode: (origin?: HTMLElement | null) => void;
  setPaletteId: (paletteId: PaletteId) => void;
  setCornerStyle: (corner: CornerStyle) => void;
  setMotionStyle: (motion: MotionStyle) => void;
  setDensityStyle: (density: DensityStyle) => void;
  setDefaultRestSeconds: (sec: number) => void;
  setWaterGoalMl: (ml: number) => void;
  toggleDashboardWidget: (key: keyof DashboardWidgetsConfig) => void;
  addWaterMl: (deltaMl: number) => void;
  logFoodItem: (item: FoodItem, category: MealCategory) => void;
  logQuickAddMeals: (drafts: ParsedMealDraft[]) => void;
  removeMeal: (id: string) => void;
  logWorkout: (entry: Omit<LoggedWorkout, 'id' | 'dateKey' | 'timestamp'>) => void;
  removeWorkout: (id: string) => void;
  logWeight: (weightKg: number) => void;
  logMood: (moodId: MoodId) => void;
  signIn: (email: string, name?: string) => void;
  signOut: () => void;
  seedDemoHistory: () => void;
  clearAllHistory: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Tanish Patel',
  email: 'tanish@fitlife.app',
  sex: 'male',
  age: 24,
  heightCm: 176,
  weightKg: 73.4,
  goal: 'lose_weight',
  activityLevel: 'moderate',
  onboarded: true,
  uid: 'fitlife-b038b-uid-01',
};

const DEFAULT_SETTINGS: AppSettings = {
  weightUnit: 'kg',
  hapticsEnabled: true,
  firebaseProjectId: 'fitlife-b038b',
  themeMode: 'light', // Refreshing Daylight mode by default
  paletteId: 'matcha_oat',
  cornerStyle: 'organic',
  motionStyle: 'spring',
  densityStyle: 'comfortable',
  defaultRestSeconds: 75,
  waterGoalMl: 2500,
  dashboardWidgets: {
    showMacros: true,
    showHydration: true,
    showMood: true,
    showAiCoach: true,
    showActivityFeed: true,
  },
};

function buildInitialDemoData() {
  const meals: LoggedMeal[] = [];
  const workouts: LoggedWorkout[] = [];
  const weights: WeightEntry[] = [];
  const moods: MoodEntry[] = [];

  const weightCurve = [75.2, 75.0, 74.9, 74.8, 74.6, 74.5, 74.3, 74.2, 74.0, 73.9, 73.8, 73.7, 73.5, 73.4];
  const dailyCalTotals = [2120, 1980, 2050, 1890, 1940, 2010, 1960, 1880, 1950, 2040, 1920, 1970, 1930, 0];

  for (let i = 13; i >= 0; i--) {
    const dateKey = getDateKeyDaysAgo(i);
    const baseTs = Date.now() - i * 86400000;

    weights.push({
      id: `seed-wt-${i}`,
      dateKey,
      timestamp: baseTs + 1000,
      weightKg: weightCurve[13 - i],
    });

    if (i > 0) {
      const targetDayCal = dailyCalTotals[13 - i] || 1950;
      const bCal = Math.round(targetDayCal * 0.28);
      const lCal = Math.round(targetDayCal * 0.38);
      const dCal = targetDayCal - bCal - lCal;

      meals.push(
        {
          id: `seed-meal-${i}-b`,
          dateKey,
          timestamp: baseTs + 28800000,
          name: i % 2 === 0 ? 'Rolled Oats Porridge & 2 Eggs' : 'Moong Dal Paneer Chilla',
          servingLabel: '1 bowl + 2 eggs',
          category: 'Breakfast',
          calories: bCal,
          proteinG: 24,
          carbsG: 42,
          fatG: 12,
          fiberG: 6,
        },
        {
          id: `seed-meal-${i}-l`,
          dateKey,
          timestamp: baseTs + 4680000,
          name: i % 2 === 0 ? 'Grilled Chicken & Brown Rice Bowl' : 'Tandoori Paneer Tikka & Dal Tadka',
          servingLabel: '1 full plate',
          category: 'Lunch',
          calories: lCal,
          proteinG: 42,
          carbsG: 56,
          fatG: 14,
          fiberG: 8,
        },
        {
          id: `seed-meal-${i}-d`,
          dateKey,
          timestamp: baseTs + 72000000,
          name: i % 2 === 0 ? 'Pan-Seared Salmon & Sweet Potato' : 'Palak Paneer with 2 Whole Wheat Rotis',
          servingLabel: '1 dinner portion',
          category: 'Dinner',
          calories: dCal,
          proteinG: 36,
          carbsG: 40,
          fatG: 15,
          fiberG: 7,
        }
      );

      if (i <= 6 || i % 2 === 0) {
        workouts.push({
          id: `seed-wk-${i}`,
          dateKey,
          timestamp: baseTs + 61200000,
          exerciseId: i % 3 === 0 ? 'ex-bench-press' : i % 3 === 1 ? 'ex-barbell-squat' : 'ex-lat-pulldown',
          exerciseName:
            i % 3 === 0
              ? 'Barbell Flat Bench Press'
              : i % 3 === 1
              ? 'Barbell Back Squat'
              : 'Wide-Grip Lat Pulldown',
          muscleGroup: i % 3 === 0 ? 'Chest' : i % 3 === 1 ? 'Legs' : 'Back',
          sets: 4,
          reps: 10,
          weightKg: i % 3 === 0 ? 60 : i % 3 === 1 ? 75 : 52.5,
          caloriesBurned: 165,
          restSeconds: 75,
        });
      }

      if (i <= 5) {
        const moodPool: MoodId[] = ['energized', 'focused', 'motivated', 'happy', 'calm'];
        moods.push({
          id: `seed-mood-${i}`,
          dateKey,
          timestamp: baseTs + 36000000,
          moodId: moodPool[i % moodPool.length],
        });
      }
    } else {
      meals.push(
        {
          id: 'today-meal-1',
          dateKey,
          timestamp: Date.now() - 18000000,
          name: 'Rolled Oats Porridge + 2 Whole Eggs',
          servingLabel: '1 bowl + 2 eggs',
          category: 'Breakfast',
          calories: 374,
          proteinG: 21.1,
          carbsG: 39.8,
          fatG: 13.8,
          fiberG: 6.0,
        },
        {
          id: 'today-meal-2',
          dateKey,
          timestamp: Date.now() - 9200000,
          name: 'Grilled Chicken Breast & Quinoa Power Bowl',
          servingLabel: '150g chicken + 1 bowl',
          category: 'Lunch',
          calories: 633,
          proteinG: 60.5,
          carbsG: 52.0,
          fatG: 18.9,
          fiberG: 7.5,
        },
        {
          id: 'today-meal-3',
          dateKey,
          timestamp: Date.now() - 3600000,
          name: 'Whey Isolate Protein Shake & Almonds',
          servingLabel: '1 scoop + handful almonds',
          category: 'Snack',
          calories: 289,
          proteinG: 31.0,
          carbsG: 8.6,
          fatG: 15.4,
          fiberG: 4.0,
        }
      );

      workouts.push({
        id: 'today-wk-1',
        dateKey,
        timestamp: Date.now() - 5400000,
        exerciseId: 'ex-incline-db-press',
        exerciseName: 'Incline Dumbbell Press',
        muscleGroup: 'Chest',
        sets: 4,
        reps: 10,
        weightKg: 42.5,
        caloriesBurned: 145,
        restSeconds: 75,
      });

      moods.push({
        id: 'today-mood-1',
        dateKey,
        timestamp: Date.now() - 5000000,
        moodId: 'energized',
      });
    }
  }

  return { meals, workouts, weights, moods };
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function loadArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const FitLifeContext = createContext<FitLifeContextValue | null>(null);

export const FitLifeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialSeed = useMemo(() => buildInitialDemoData(), []);
  const [todayKey, setTodayKey] = useState(() => getDateKeyDaysAgo(0));

  // Re-evaluate daily totals at local midnight and after the app resumes.
  useEffect(() => {
    const next = new Date();
    next.setHours(24, 0, 1, 0);
    const timer = window.setTimeout(() => setTodayKey(getDateKeyDaysAgo(0)), Math.max(1000, next.getTime() - Date.now()));
    const checkDate = () => setTodayKey(getDateKeyDaysAgo(0));
    document.addEventListener('visibilitychange', checkDate);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', checkDate); };
  }, [todayKey]);

  const [profile, setProfile] = useState<UserProfile>(() =>
    loadJson(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE)
  );
  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadJson(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return {
      ...DEFAULT_SETTINGS,
      ...loaded,
      dashboardWidgets: {
        ...DEFAULT_SETTINGS.dashboardWidgets,
        ...(loaded.dashboardWidgets || {}),
      },
    };
  });
  // Track the requested mode separately so a second tap can interrupt a reveal
  // before React or an older WebView has finished applying the first one.
  const requestedThemeRef = useRef(settings.themeMode);
  const appliedThemeRef = useRef(settings.themeMode);
  const themeRevealRef = useRef<ReturnType<typeof createThemeRevealController> | null>(null);
  if (!themeRevealRef.current) themeRevealRef.current = createThemeRevealController();
  useEffect(() => () => themeRevealRef.current?.cancel(), []);

  const [meals, setMeals] = useState<LoggedMeal[]>(() =>
    loadArray(STORAGE_KEYS.MEALS, initialSeed.meals)
  );
  const [workouts, setWorkouts] = useState<LoggedWorkout[]>(() =>
    loadArray(STORAGE_KEYS.WORKOUTS, initialSeed.workouts)
  );
  const [weights, setWeights] = useState<WeightEntry[]>(() =>
    loadArray(STORAGE_KEYS.WEIGHTS, initialSeed.weights)
  );
  const [moods, setMoods] = useState<MoodEntry[]>(() =>
    loadArray(STORAGE_KEYS.MOODS, initialSeed.moods)
  );
  const [waterRecord, setWaterRecord] = useState<{ dateKey: string; amountMl: number }>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WATER);
      if (!raw) return { dateKey: todayKey, amountMl: 0 };
      const value = JSON.parse(raw);
      // Migrate the previous numeric-only format without discarding existing water.
      if (typeof value === 'number' && Number.isFinite(value)) return { dateKey: todayKey, amountMl: Math.max(0, value) };
      if (typeof value?.dateKey === 'string' && Number.isFinite(value.amountMl)) return { dateKey: value.dateKey, amountMl: Math.max(0, value.amountMl) };
    } catch {}
    return { dateKey: todayKey, amountMl: 0 };
  });
  const waterTodayMl = waterRecord.dateKey === todayKey ? waterRecord.amountMl : 0;
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2400);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const themeColors: ThemeColors = useMemo(() => {
    const palette = NATURAL_PALETTES[settings.paletteId] || NATURAL_PALETTES.matcha_oat;
    return settings.themeMode === 'light' ? palette.light : palette.dark;
  }, [settings.paletteId, settings.themeMode]);

  // The new tokens must be committed before the browser captures the new
  // theme for a View Transition, rather than in a later passive effect.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = settings.themeMode;
    root.dataset.themeMode = settings.themeMode;
    root.dataset.motion = settings.motionStyle;
    root.dataset.density = settings.densityStyle;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors.bgBase);
    applyThemeColorVariables(root, themeColors);

    const radiusCfg = CORNER_RADIUS_MAP[settings.cornerStyle] || CORNER_RADIUS_MAP.organic;
    root.style.setProperty('--radius-card', radiusCfg.card);
    root.style.setProperty('--radius-btn', radiusCfg.button);

    const motionScale =
      settings.motionStyle === 'reduced' ? '0ms' : settings.motionStyle === 'gentle' ? '220ms' : '320ms';
    root.style.setProperty('--motion-duration', motionScale);

    const fontScale =
      settings.densityStyle === 'compact' ? '14.5px' : settings.densityStyle === 'spacious' ? '16.8px' : '16px';
    root.style.fontSize = fontScale;
  }, [themeColors, settings.themeMode, settings.cornerStyle, settings.motionStyle, settings.densityStyle]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
    } catch {}
  }, [meals]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
    } catch {}
  }, [workouts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(weights));
    } catch {}
  }, [weights]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MOODS, JSON.stringify(moods));
    } catch {}
  }, [moods]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WATER, JSON.stringify(waterRecord));
    } catch {}
  }, [waterRecord]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(isAuthenticated));
    } catch {}
  }, [isAuthenticated]);

  const latestWeightKg = useMemo(() => {
    if (weights.length === 0) return profile.weightKg;
    const sorted = [...weights].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0].weightKg;
  }, [weights, profile.weightKg]);

  const startingWeightKg = useMemo(() => {
    if (weights.length === 0) return profile.weightKg;
    const sorted = [...weights].sort((a, b) => a.timestamp - b.timestamp);
    return sorted[0].weightKg;
  }, [weights, profile.weightKg]);

  const macroTargets = useMemo(
    () =>
      calculateMacroTargets({
        sex: profile.sex,
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: latestWeightKg,
        goal: profile.goal,
        activityLevel: profile.activityLevel,
      }),
    [profile.sex, profile.age, profile.heightCm, latestWeightKg, profile.goal, profile.activityLevel]
  );

  const gamification = useMemo(
    () => computeGamification(meals, workouts, moods, weights, macroTargets.calories),
    [meals, workouts, moods, weights, macroTargets.calories]
  );

  const prevUnlockedRef = useRef<Set<string> | null>(null);
  const prevLevelRef = useRef<number | null>(null);

  useEffect(() => {
    const currentUnlocked = new Set(gamification.badges.filter((b) => b.unlocked).map((b) => b.id));
    if (prevUnlockedRef.current === null) {
      prevUnlockedRef.current = currentUnlocked;
      prevLevelRef.current = gamification.level;
      return;
    }

    for (const badge of gamification.badges) {
      if (badge.unlocked && !prevUnlockedRef.current.has(badge.id)) {
        triggerHaptic('success', settings.hapticsEnabled);
        setCelebration({
          id: badge.id,
          title: `Badge Unlocked: ${badge.title}!`,
          subtitle: badge.description,
          icon: badge.icon,
        });
        break;
      }
    }

    if (prevLevelRef.current !== null && gamification.level > prevLevelRef.current) {
      triggerHaptic('success', settings.hapticsEnabled);
      setCelebration({
        id: `level-${gamification.level}`,
        title: `Level ${gamification.level} Reached!`,
        subtitle: `You crossed ${gamification.totalXp} Total XP — keep crushing your targets!`,
        icon: '⚡',
      });
    }

    prevUnlockedRef.current = currentUnlocked;
    prevLevelRef.current = gamification.level;
  }, [gamification, settings.hapticsEnabled]);

  const todayMeals = useMemo(
    () => meals.filter((m) => m.dateKey === todayKey).sort((a, b) => b.timestamp - a.timestamp),
    [meals, todayKey]
  );

  const todayWorkouts = useMemo(
    () => workouts.filter((w) => w.dateKey === todayKey).sort((a, b) => b.timestamp - a.timestamp),
    [workouts, todayKey]
  );

  const todayMood = useMemo(() => {
    const todayEntries = moods
      .filter((m) => m.dateKey === todayKey)
      .sort((a, b) => b.timestamp - a.timestamp);
    return todayEntries[0]?.moodId ?? null;
  }, [moods, todayKey]);

  const updateProfile = (next: Partial<UserProfile>) => {
    triggerHaptic('medium', settings.hapticsEnabled);
    setProfile((prev) => ({ ...prev, ...next }));
    if (next.weightKg && next.weightKg > 0) {
      setWeights((prev) => [
        ...prev.filter((w) => w.dateKey !== todayKey),
        {
          id: `wt-${Date.now()}`,
          dateKey: todayKey,
          timestamp: Date.now(),
          weightKg: next.weightKg!,
        },
      ]);
    }
    showToast('Profile & targets updated');
  };

  const setWeightUnit = (unit: WeightUnit) => {
    triggerHaptic('light', settings.hapticsEnabled);
    setSettings((prev) => ({ ...prev, weightUnit: unit }));
    showToast(`Weight unit switched to ${unit.toUpperCase()}`);
  };

  const setHapticsEnabled = (enabled: boolean) => {
    if (enabled) triggerHaptic('medium', true);
    setSettings((prev) => ({ ...prev, hapticsEnabled: enabled }));
    showToast(`Haptic feedback ${enabled ? 'enabled' : 'disabled'}`);
  };

  const setThemeMode = (themeMode: ThemeMode, origin?: HTMLElement | null) => {
    if (requestedThemeRef.current === themeMode) return;
    requestedThemeRef.current = themeMode;
    triggerHaptic('light', settings.hapticsEnabled);
    themeRevealRef.current?.cancel();
    // A very fast second tap may request the already-visible mode. Cancel the
    // unfinished first reveal rather than replaying the same appearance.
    if (appliedThemeRef.current === themeMode) return;
    const palette = NATURAL_PALETTES[settings.paletteId] || NATURAL_PALETTES.matcha_oat;
    const colors = themeMode === 'light' ? palette.light : palette.dark;
    const apply = () => {
      if (requestedThemeRef.current !== themeMode) return;
      appliedThemeRef.current = themeMode;
      flushSync(() => {
        setSettings((prev) => ({ ...prev, themeMode }));
        showToast(themeMode === 'light' ? '☀️ Daylight theme active' : '🌙 Nightfall theme active');
      });
    };
    themeRevealRef.current?.run({ origin, colors, mode: themeMode, motion: settings.motionStyle, apply });
  };

  const toggleThemeMode = (origin?: HTMLElement | null) => {
    setThemeMode(requestedThemeRef.current === 'light' ? 'dark' : 'light', origin);
  };

  const setPaletteId = (paletteId: PaletteId) => {
    themeRevealRef.current?.finish();
    triggerHaptic('light', settings.hapticsEnabled);
    setSettings((prev) => ({ ...prev, paletteId }));
    const name = NATURAL_PALETTES[paletteId]?.name || 'Custom';
    showToast(`Palette switched to ${name}`);
  };

  const setCornerStyle = (cornerStyle: CornerStyle) => {
    themeRevealRef.current?.finish();
    triggerHaptic('light', settings.hapticsEnabled);
    setSettings((prev) => ({ ...prev, cornerStyle }));
    showToast(`Corner style: ${CORNER_RADIUS_MAP[cornerStyle].label}`);
  };

  const setMotionStyle = (motionStyle: MotionStyle) => {
    themeRevealRef.current?.finish();
    triggerHaptic('light', settings.hapticsEnabled);
    setSettings((prev) => ({ ...prev, motionStyle }));
    showToast(`Motion intensity: ${motionStyle}`);
  };

  const setDensityStyle = (densityStyle: DensityStyle) => {
    themeRevealRef.current?.finish();
    triggerHaptic('light', settings.hapticsEnabled);
    setSettings((prev) => ({ ...prev, densityStyle }));
    showToast(`Layout density: ${densityStyle}`);
  };

  const setDefaultRestSeconds = (defaultRestSeconds: number) => {
    triggerHaptic('light', settings.hapticsEnabled);
    setSettings((prev) => ({ ...prev, defaultRestSeconds }));
    showToast(`Default workout rest set to ${defaultRestSeconds}s`);
  };

  const setWaterGoalMl = (waterGoalMl: number) => {
    triggerHaptic('light', settings.hapticsEnabled);
    setSettings((prev) => ({ ...prev, waterGoalMl }));
    showToast(`Daily hydration target set to ${(waterGoalMl / 1000).toFixed(1)}L`);
  };

  const toggleDashboardWidget = (key: keyof DashboardWidgetsConfig) => {
    triggerHaptic('light', settings.hapticsEnabled);
    setSettings((prev) => ({
      ...prev,
      dashboardWidgets: {
        ...prev.dashboardWidgets,
        [key]: !prev.dashboardWidgets[key],
      },
    }));
  };

  const addWaterMl = (deltaMl: number) => {
    triggerHaptic('light', settings.hapticsEnabled);
    setWaterRecord((prev) => ({
      dateKey: todayKey,
      amountMl: Math.max(0, Math.min(8000, (prev.dateKey === todayKey ? prev.amountMl : 0) + deltaMl)),
    }));
    if (deltaMl > 0) {
      showToast(`+${deltaMl}ml water logged`);
    }
  };

  const logFoodItem = (item: FoodItem, category: MealCategory) => {
    triggerHaptic('medium', settings.hapticsEnabled);
    const newMeal: LoggedMeal = {
      id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dateKey: todayKey,
      timestamp: Date.now(),
      name: item.name,
      servingLabel: item.servingLabel,
      category,
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      fiberG: item.fiberG,
    };
    setMeals((prev) => [newMeal, ...prev]);
    showToast(`Logged ${item.name} (+10 XP)`);
  };

  const logQuickAddMeals = (drafts: ParsedMealDraft[]) => {
    if (drafts.length === 0) return;
    triggerHaptic('success', settings.hapticsEnabled);
    const now = Date.now();
    const created: LoggedMeal[] = drafts.map((d, idx) => ({
      id: `meal-qa-${now}-${idx}`,
      dateKey: todayKey,
      timestamp: now + idx,
      name: d.name,
      servingLabel: d.servingLabel,
      category: d.category,
      calories: d.calories,
      proteinG: d.proteinG,
      carbsG: d.carbsG,
      fatG: d.fatG,
      fiberG: d.fiberG,
    }));
    setMeals((prev) => [...created, ...prev]);
    showToast(`Quick-added ${created.length} item${created.length > 1 ? 's' : ''} (+${created.length * 10} XP)`);
  };

  const removeMeal = (id: string) => {
    triggerHaptic('light', settings.hapticsEnabled);
    setMeals((prev) => prev.filter((m) => m.id !== id));
    showToast('Meal removed');
  };

  const logWorkout = (entry: Omit<LoggedWorkout, 'id' | 'dateKey' | 'timestamp'>) => {
    triggerHaptic('success', settings.hapticsEnabled);
    const newWorkout: LoggedWorkout = {
      ...entry,
      id: `wk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dateKey: todayKey,
      timestamp: Date.now(),
    };
    setWorkouts((prev) => [newWorkout, ...prev]);
    showToast(`Logged ${entry.exerciseName} (+20 XP)`);
  };

  const removeWorkout = (id: string) => {
    triggerHaptic('light', settings.hapticsEnabled);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    showToast('Workout removed');
  };

  const logWeight = (weightKg: number) => {
    triggerHaptic('medium', settings.hapticsEnabled);
    const rounded = Math.round(weightKg * 10) / 10;
    setWeights((prev) => [
      ...prev.filter((w) => w.dateKey !== todayKey),
      {
        id: `wt-${Date.now()}`,
        dateKey: todayKey,
        timestamp: Date.now(),
        weightKg: rounded,
      },
    ]);
    setProfile((prev) => ({ ...prev, weightKg: rounded }));
    showToast('Weight logged & BMI updated');
  };

  const logMood = (moodId: MoodId) => {
    triggerHaptic('light', settings.hapticsEnabled);
    setMoods((prev) => [
      ...prev.filter((m) => m.dateKey !== todayKey),
      {
        id: `mood-${Date.now()}`,
        dateKey: todayKey,
        timestamp: Date.now(),
        moodId,
      },
    ]);
    showToast('Mood checked in (+5 XP)');
  };

  const signIn = (email: string, name?: string) => {
    triggerHaptic('success', settings.hapticsEnabled);
    const displayName =
      name?.trim() ||
      email
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()) ||
      'FitLife Athlete';
    setProfile((prev) => ({
      ...prev,
      email: email.trim() || prev.email,
      name: displayName,
    }));
    setIsAuthenticated(true);
    showToast(`Welcome, ${displayName}!`);
  };

  const signOut = () => {
    triggerHaptic('medium', settings.hapticsEnabled);
    setIsAuthenticated(false);
    showToast('Signed out of FitLife');
  };

  const seedDemoHistory = () => {
    triggerHaptic('success', settings.hapticsEnabled);
    const fresh = buildInitialDemoData();
    setMeals(fresh.meals);
    setWorkouts(fresh.workouts);
    setWeights(fresh.weights);
    setMoods(fresh.moods);
    setWaterRecord({ dateKey: todayKey, amountMl: 1500 });
    setProfile(DEFAULT_PROFILE);
    showToast('Restored 14-day FitLife demo dataset');
  };

  const clearAllHistory = () => {
    triggerHaptic('medium', settings.hapticsEnabled);
    setMeals([]);
    setWorkouts([]);
    setWeights([
      {
        id: `wt-init-${Date.now()}`,
        dateKey: todayKey,
        timestamp: Date.now(),
        weightKg: profile.weightKg,
      },
    ]);
    setMoods([]);
    setWaterRecord({ dateKey: todayKey, amountMl: 0 });
    showToast('Cleared logs — ready for a fresh start');
  };

  const dismissCelebration = () => setCelebration(null);

  const triggerManualCelebration = (badge?: BadgeStatus) => {
    triggerHaptic('success', settings.hapticsEnabled);
    setCelebration({
      id: `manual-${Date.now()}`,
      title: badge ? `${badge.title} Unlocked!` : 'Badge Unlocked: 7-Day Warrior!',
      subtitle: badge
        ? badge.description
        : 'You maintained a 7-day consecutive fitness streak across FitLife!',
      icon: badge ? badge.icon : '⚡',
    });
  };

  return (
    <FitLifeContext.Provider
      value={{
        profile,
        settings,
        themeColors,
        meals,
        workouts,
        weights,
        moods,
        waterTodayMl,
        isAuthenticated,
        todayKey,
        todayMeals,
        todayWorkouts,
        todayMood,
        latestWeightKg,
        startingWeightKg,
        macroTargets,
        gamification,
        celebration,
        toastMessage,
        dismissCelebration,
        triggerManualCelebration,
        updateProfile,
        setWeightUnit,
        setHapticsEnabled,
        setThemeMode,
        toggleThemeMode,
        setPaletteId,
        setCornerStyle,
        setMotionStyle,
        setDensityStyle,
        setDefaultRestSeconds,
        setWaterGoalMl,
        toggleDashboardWidget,
        addWaterMl,
        logFoodItem,
        logQuickAddMeals,
        removeMeal,
        logWorkout,
        removeWorkout,
        logWeight,
        logMood,
        signIn,
        signOut,
        seedDemoHistory,
        clearAllHistory,
      }}
    >
      {children}
    </FitLifeContext.Provider>
  );
};

export function useFitLife() {
  const ctx = useContext(FitLifeContext);
  if (!ctx) throw new Error('useFitLife must be used inside FitLifeProvider');
  return ctx;
}
