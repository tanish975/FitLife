import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  AppSettings,
  BadgeStatus,
  DashboardWidgetsConfig,
  FoodItem,
  GamificationSummary,
  GUIDE_IDS,
  GuideId,
  normalizeGuides,
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
import { BackupSnapshot, mergeBackupRows } from '../domain/EncryptedBackup';
import { activatePartition, CLOUD_KINDS, CloudDeletions, CloudKind, CloudPartition, CloudPayload, emptyDeletions,
  GoogleAccount, GUEST_OWNER, hasNativeCloud, isDemoId, mergeCloud, nativeCloudRequest, readActivePartition, readPartition,
  RemoteSnapshot, rowFingerprint, savePartition, validCloudPayload } from '../domain/CloudSync';

const STORAGE_KEYS = {
  PROFILE: 'fitlife_profile_v1',
  SETTINGS: 'fitlife_settings_v2',
  MEALS: 'fitlife_meals_v1',
  WORKOUTS: 'fitlife_workouts_v1',
  WEIGHTS: 'fitlife_weights_v1',
  MOODS: 'fitlife_moods_v1',
  WATER: 'fitlife_water_v1',
  AUTH: 'fitlife_auth_v1',
  UNCLAIMED_FRESH: 'fitlife_unclaimed_fresh_v1',
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
  authRestoring: boolean;
  guidesReady: boolean;
  markGuideSeen: (id: GuideId) => void;
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
  updateProfile: (next: Partial<UserProfile>) => Promise<boolean>;
  setWeightUnit: (unit: WeightUnit) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setThemeMode: (mode: ThemeMode, origin?: HTMLElement | null) => void;
  toggleThemeMode: (origin?: HTMLElement | null) => void;
  setPaletteId: (paletteId: PaletteId) => void;
  setCornerStyle: (corner: CornerStyle) => void;
  setMotionStyle: (motion: MotionStyle) => void;
  setDensityStyle: (density: DensityStyle) => void;
  setDefaultRestSeconds: (sec: number) => void;
  setAutoStartRest: (enabled: boolean) => void;
  setWeeklyWorkoutGoal: (days: number) => void;
  toggleFavoriteExercise: (id: string) => void;
  setNavStyle: (style: 'glass' | 'solid') => void;
  setWaterGoalMl: (ml: number) => void;
  toggleDashboardWidget: (key: keyof DashboardWidgetsConfig) => void;
  addWaterMl: (deltaMl: number) => void;
  logFoodItem: (item: FoodItem, category: MealCategory) => void;
  logQuickAddMeals: (drafts: ParsedMealDraft[]) => void;
  editMeal: (id: string, draft: ParsedMealDraft) => Promise<boolean>;
  removeMeal: (id: string) => void;
  logWorkout: (entry: Omit<LoggedWorkout, 'id' | 'dateKey' | 'timestamp'>) => void;
  removeWorkout: (id: string) => void;
  logWeight: (weightKg: number) => void;
  logMood: (moodId: MoodId) => void;
  signOut: () => void;
  localOwnerId: string | null;
  cloudAvailable: boolean;
  cloudAccount: GoogleAccount | null;
  cloudStatus: string;
  signInGoogle: () => Promise<boolean>;
  signOutGoogle: () => Promise<void>;
  syncNow: () => Promise<void>;
  seedDemoHistory: () => void;
  clearAllHistory: () => void;
  makeBackupSnapshot: () => BackupSnapshot;
  restoreBackupSnapshot: (snapshot: BackupSnapshot, mode: 'merge' | 'replace') => Promise<void>;
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
  autoStartRest: false,
  weeklyWorkoutGoal: 3,
  favoriteExerciseIds: [],
  navStyle: 'glass',
  waterGoalMl: 2500,
  guidesSeen: [],
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
  // Account slots are authoritative when a Google account has claimed this
  // device's data. Never fall back to another account's legacy keys if a slot
  // is missing or corrupt.
  const initialCloud = useMemo(() => {
    // The standalone preview may deliberately deny storage entirely.
    try { return readActivePartition(localStorage); }
    catch { return { uid: null, partition: null, damaged: false }; }
  }, []);
  const initialOwnerSnapshot = initialCloud.partition?.snapshot || null;
  // Distinguish a genuinely fresh install from an existing unclaimed profile
  // *before* the default demo is persisted. Keep the marker across a restart
  // at the sign-in screen. If any legacy fitness data already exists, treat
  // it as the user's data even if its IDs resemble sample IDs.
  const freshUnclaimed = useMemo(() => {
    try {
      if (localStorage.getItem(STORAGE_KEYS.UNCLAIMED_FRESH) === '1') return true;
      const existingKeys = [STORAGE_KEYS.PROFILE, STORAGE_KEYS.MEALS, STORAGE_KEYS.WORKOUTS,
        STORAGE_KEYS.WEIGHTS, STORAGE_KEYS.MOODS, STORAGE_KEYS.WATER, 'fitlife_cloud_owner_v1'];
      if (existingKeys.some(key => localStorage.getItem(key) !== null)) return false;
      localStorage.setItem(STORAGE_KEYS.UNCLAIMED_FRESH, '1');
      return true;
    } catch { return false; } // fail safe: never discard data if storage is unavailable
  }, []);
  const ownerRef = useRef<string | null>(initialCloud.uid);
  const [localOwnerId, setLocalOwnerId] = useState<string | null>(initialCloud.uid);
  const storageBlockedRef = useRef(initialCloud.damaged);
  const [cloudDeleted, setCloudDeleted] = useState<CloudDeletions>(() => initialCloud.partition?.deleted || emptyDeletions());
  const cloudDeletedRef = useRef(cloudDeleted);
  const [cloudAccount, setCloudAccount] = useState<GoogleAccount | null>(null);
  const cloudAccountRef = useRef<GoogleAccount | null>(null);
  const [cloudStatus, setCloudStatus] = useState(initialCloud.damaged
    ? 'Account data needs recovery; cloud sync is paused and existing data was not overwritten.'
    : 'Not connected.');
  const cloudBusyRef = useRef(false);
  const needsRecoveryRef = useRef(false);
  const cloudAvailable = hasNativeCloud();
  const [authRestoring, setAuthRestoring] = useState(cloudAvailable);
  const [guidesReady, setGuidesReady] = useState(false);
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
    initialOwnerSnapshot?.profile || (initialCloud.damaged ? { ...DEFAULT_PROFILE, name: 'FitLife Athlete', email: '', onboarded: false } : loadJson(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE))
  );
  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = initialOwnerSnapshot?.settings || (initialCloud.damaged ? DEFAULT_SETTINGS : loadJson(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS));
    let original: Partial<AppSettings> | null = initialOwnerSnapshot?.settings || null;
    if (!original && !initialCloud.damaged) {
      try { const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS); original = raw ? JSON.parse(raw) : null; } catch { /* storage unavailable */ }
    }
    let hadPriorProfile = false;
    try { hadPriorProfile = !!localStorage.getItem(STORAGE_KEYS.PROFILE) || !!initialOwnerSnapshot; } catch { /* storage unavailable */ }
    const legacyGuideState = profile.onboarded && hadPriorProfile && (!original || original.guidesSeen === undefined);
    return {
      ...DEFAULT_SETTINGS,
      ...loaded,
      favoriteExerciseIds: Array.isArray(loaded.favoriteExerciseIds) ? loaded.favoriteExerciseIds.filter((id): id is string => typeof id === 'string') : [],
      weeklyWorkoutGoal: Number.isFinite(loaded.weeklyWorkoutGoal) ? Math.max(1, Math.min(7, Math.round(loaded.weeklyWorkoutGoal))) : DEFAULT_SETTINGS.weeklyWorkoutGoal,
      navStyle: loaded.navStyle === 'solid' ? 'solid' : 'glass',
      guidesSeen: legacyGuideState ? [...GUIDE_IDS] : normalizeGuides(loaded.guidesSeen),
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
    initialOwnerSnapshot?.meals || (initialCloud.damaged ? [] : loadArray(STORAGE_KEYS.MEALS, initialSeed.meals))
  );
  const [workouts, setWorkouts] = useState<LoggedWorkout[]>(() =>
    initialOwnerSnapshot?.workouts || (initialCloud.damaged ? [] : loadArray(STORAGE_KEYS.WORKOUTS, initialSeed.workouts))
  );
  const [weights, setWeights] = useState<WeightEntry[]>(() =>
    initialOwnerSnapshot?.weights || (initialCloud.damaged ? [] : loadArray(STORAGE_KEYS.WEIGHTS, initialSeed.weights))
  );
  const [moods, setMoods] = useState<MoodEntry[]>(() =>
    initialOwnerSnapshot?.moods || (initialCloud.damaged ? [] : loadArray(STORAGE_KEYS.MOODS, initialSeed.moods))
  );
  const [waterRecord, setWaterRecord] = useState<{ dateKey: string; amountMl: number }>(() => {
    if (initialOwnerSnapshot) return initialOwnerSnapshot.water;
    if (initialCloud.damaged) return { dateKey: todayKey, amountMl: 0 };
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
  // A stored UI flag from an older local profile is not a Google session.
  // Native Firebase restores a verified session locally, including when offline.
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
      if (!storageBlockedRef.current) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    try {
      if (!storageBlockedRef.current) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      if (!storageBlockedRef.current) localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
    } catch {}
  }, [meals]);

  useEffect(() => {
    try {
      if (!storageBlockedRef.current) localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
    } catch {}
  }, [workouts]);

  useEffect(() => {
    try {
      if (!storageBlockedRef.current) localStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(weights));
    } catch {}
  }, [weights]);

  useEffect(() => {
    try {
      if (!storageBlockedRef.current) localStorage.setItem(STORAGE_KEYS.MOODS, JSON.stringify(moods));
    } catch {}
  }, [moods]);

  useEffect(() => {
    try {
      if (!storageBlockedRef.current) localStorage.setItem(STORAGE_KEYS.WATER, JSON.stringify(waterRecord));
    } catch {}
  }, [waterRecord]);

  useEffect(() => {
    try {
      if (!storageBlockedRef.current) localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(isAuthenticated));
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
    () => computeGamification(meals, workouts, moods, weights, profile.onboarded ? macroTargets.calories : 0),
    [meals, workouts, moods, weights, macroTargets.calories, profile.onboarded]
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

  // Deletions are content-specific and recorded before activity is removed.
  // If another account becomes active while hashes are computed, do nothing.
  const markCloudDeletes = async (groups: Partial<Record<CloudKind, { id: string }[]>>): Promise<boolean> => {
    const owner = ownerRef.current;
    if (!owner) return !storageBlockedRef.current;
    if (storageBlockedRef.current) { showToast('Account data needs recovery before changes.'); return false; }
    try {
      const revision = backupRevisionRef.current;
      const additions: Partial<Record<CloudKind, string[]>> = {};
      for (const kind of CLOUD_KINDS) {
        additions[kind] = await Promise.all((groups[kind] || []).filter(row => !isDemoId(row.id)).map(rowFingerprint));
      }
      if (ownerRef.current !== owner || backupRevisionRef.current !== revision) { showToast('Data changed; please try again.'); return false; }
      setCloudDeleted(prev => {
        const result = { ...prev };
        for (const kind of CLOUD_KINDS) result[kind] = [...new Set([...prev[kind], ...(additions[kind] || [])])].sort();
        return result;
      });
      return true;
    } catch { showToast('Could not safely record the deletion. Nothing was removed.'); return false; }
  };

  const updateProfile = async (next: Partial<UserProfile>) => {
    if (next.weightKg && next.weightKg > 0 && !(await markCloudDeletes({ weights: weights.filter(w => w.dateKey === todayKey) }))) return false;
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
    return true;
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

  const setAutoStartRest = (autoStartRest: boolean) => {
    setSettings((prev) => ({ ...prev, autoStartRest }));
    showToast(autoStartRest ? 'Rest timer will start after logging' : 'Automatic rest timer off');
  };

  const setWeeklyWorkoutGoal = (days: number) => {
    const weeklyWorkoutGoal = Math.max(1, Math.min(7, Math.round(days)));
    setSettings((prev) => ({ ...prev, weeklyWorkoutGoal }));
    showToast(`Weekly goal: ${weeklyWorkoutGoal} workout days`);
  };

  const toggleFavoriteExercise = (id: string) => {
    triggerHaptic('light', settings.hapticsEnabled);
    setSettings((prev) => ({ ...prev, favoriteExerciseIds: prev.favoriteExerciseIds.includes(id)
      ? prev.favoriteExerciseIds.filter((item) => item !== id)
      : [...prev.favoriteExerciseIds, id] }));
  };

  const setNavStyle = (navStyle: 'glass' | 'solid') => {
    setSettings((prev) => ({ ...prev, navStyle }));
    showToast(navStyle === 'glass' ? 'Glass navigation selected' : 'Solid navigation selected');
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
    if (drafts.some((draft) => draft.requiresReview)) { showToast('Review each unknown food before logging.'); return; }
    triggerHaptic('success', settings.hapticsEnabled);
    const now = Date.now();
    const created: LoggedMeal[] = drafts.map((d, idx) => ({
      id: `meal-qa-${now}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
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
      ...(d.sugarG !== undefined ? { sugarG: d.sugarG } : {}),
      ...(d.sodiumMg !== undefined ? { sodiumMg: d.sodiumMg } : {}),
      ...(d.nutritionNote ? { nutritionNote: d.nutritionNote } : {}),
    }));
    setMeals((prev) => [...created, ...prev]);
    showToast(`Quick-added ${created.length} item${created.length > 1 ? 's' : ''} (+${created.length * 10} XP)`);
  };

  const editMeal = async (id: string, draft: ParsedMealDraft): Promise<boolean> => {
    const original = meals.find((meal) => meal.id === id);
    if (!original || draft.requiresReview) return false;
    const updated: LoggedMeal = { ...original, name: draft.name, servingLabel: draft.servingLabel, category: draft.category,
      calories: draft.calories, proteinG: draft.proteinG, carbsG: draft.carbsG, fatG: draft.fatG, fiberG: draft.fiberG,
      sugarG: draft.sugarG, sodiumMg: draft.sodiumMg, nutritionNote: draft.nutritionNote };
    if (JSON.stringify(updated) === JSON.stringify(original)) return true; // Never tombstone an unchanged row.
    if (!(await markCloudDeletes({ meals: [original] }))) return false;
    // Sample entries are never uploaded; an edited sample becomes a real row.
    if (isDemoId(original.id)) updated.id = `meal-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMeals((previous) => previous.map((meal) => meal.id === id ? updated : meal));
    showToast('Meal details updated.');
    return true;
  };

  const removeMeal = async (id: string) => {
    if (!(await markCloudDeletes({ meals: meals.filter(row => row.id === id) }))) return;
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

  const removeWorkout = async (id: string) => {
    if (!(await markCloudDeletes({ workouts: workouts.filter(row => row.id === id) }))) return;
    triggerHaptic('light', settings.hapticsEnabled);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    showToast('Workout removed');
  };

  const logWeight = async (weightKg: number) => {
    if (!(await markCloudDeletes({ weights: weights.filter(row => row.dateKey === todayKey) }))) return;
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
    showToast(profile.onboarded ? 'Weight logged & BMI updated' : 'Weight logged');
  };

  const logMood = async (moodId: MoodId) => {
    if (!(await markCloudDeletes({ moods: moods.filter(row => row.dateKey === todayKey) }))) return;
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

  const signOut = async () => {
    if (cloudAccountRef.current) { await signOutGoogle(); return; }
    ++authGenerationRef.current;
    try { switchToLocalGuest(); }
    catch { showToast('Could not safely separate local account data. Free device storage and try again.'); return; }
    triggerHaptic('medium', settings.hapticsEnabled);
    setIsAuthenticated(false);
    showToast('Profile closed on this device');
  };

  const seedDemoHistory = async () => {
    if (!(await markCloudDeletes({ meals, workouts, weights, moods }))) return;
    triggerHaptic('success', settings.hapticsEnabled);
    const fresh = buildInitialDemoData();
    setMeals(fresh.meals);
    setWorkouts(fresh.workouts);
    setWeights(fresh.weights);
    setMoods(fresh.moods);
    setWaterRecord({ dateKey: todayKey, amountMl: 1500 });
    const account = cloudAccountRef.current;
    setProfile(account ? { ...DEFAULT_PROFILE, name: account.name || 'FitLife Athlete', email: account.email, uid: account.uid } : DEFAULT_PROFILE);
    showToast('Restored 14-day FitLife demo dataset');
  };

  const clearAllHistory = async () => {
    if (!(await markCloudDeletes({ meals, workouts, weights, moods }))) return;
    triggerHaptic('medium', settings.hapticsEnabled);
    setMeals([]);
    setWorkouts([]);
    setWeights(profile.onboarded ? [
      {
        id: `wt-init-${Date.now()}`,
        dateKey: todayKey,
        timestamp: Date.now(),
        weightKg: profile.weightKg,
      },
    ] : []);
    setMoods([]);
    setWaterRecord({ dateKey: todayKey, amountMl: 0 });
    showToast('Cleared logs — ready for a fresh start');
  };

  const backupRevisionRef = useRef(0);
  const backupDataRef = useRef({ profile, settings, meals, workouts, weights, moods, water: waterRecord });
  useLayoutEffect(() => {
    backupDataRef.current = { profile, settings, meals, workouts, weights, moods, water: waterRecord };
    cloudDeletedRef.current = cloudDeleted;
    backupRevisionRef.current++;
    if (ownerRef.current && !storageBlockedRef.current) {
      try {
        savePartition(localStorage, ownerRef.current, { version: 1, snapshot: { schema: 1, createdAt: 0, ...backupDataRef.current }, deleted: cloudDeleted });
      } catch {
        setCloudStatus('Device storage is full or unavailable. Changes may not persist; create an encrypted backup.');
      }
    }
  }, [profile, settings, meals, workouts, weights, moods, waterRecord, cloudDeleted]);

  const makeBackupSnapshot = (): BackupSnapshot => ({ schema: 1, createdAt: Date.now(), ...backupDataRef.current });

  const syncAgainRef = useRef(false);
  const syncNowRef = useRef<() => Promise<void>>(async () => {});
  const authGenerationRef = useRef(0);

  const parseAccount = (value: unknown): GoogleAccount | null => {
    if (!value || typeof value !== 'object') return null;
    const user = value as Partial<GoogleAccount>;
    return user.signedIn === true && typeof user.uid === 'string' && user.uid !== GUEST_OWNER && /^[A-Za-z0-9_-]{1,128}$/.test(user.uid)
      && typeof user.name === 'string' && user.name.length <= 200 && typeof user.email === 'string' && user.email.length <= 320
      ? user as GoogleAccount : null;
  };
  const applyPartition = (part: CloudPartition) => {
    const next = part.snapshot;
    themeRevealRef.current?.cancel();
    requestedThemeRef.current = next.settings.themeMode;
    appliedThemeRef.current = next.settings.themeMode;
    flushSync(() => {
      setProfile(next.profile); setSettings({ ...DEFAULT_SETTINGS, ...next.settings, guidesSeen: next.settings.guidesSeen === undefined && next.profile.onboarded ? [...GUIDE_IDS] : normalizeGuides(next.settings.guidesSeen) }); setMeals(next.meals); setWorkouts(next.workouts);
      setWeights(next.weights); setMoods(next.moods); setWaterRecord(next.water); setCloudDeleted(part.deleted);
    });
  };
  const freshPartition = (account: GoogleAccount): CloudPartition => ({
    version: 1,
    snapshot: { schema: 1, createdAt: 0,
      profile: { ...DEFAULT_PROFILE, name: account.name || 'FitLife Athlete', email: account.email, uid: account.uid, onboarded: false },
      settings: DEFAULT_SETTINGS, meals: [], workouts: [], weights: [], moods: [], water: { dateKey: getDateKeyDaysAgo(0), amountMl: 0 } },
    deleted: emptyDeletions(),
  });
  const switchToLocalGuest = () => {
    const owner = ownerRef.current;
    if (!owner || owner === GUEST_OWNER) return;
    if (storageBlockedRef.current) throw new Error('Local data needs recovery.');
    // Store the account first. The separate guest slot is activated only after
    // it exists, so a crash cannot expose account A as the guest or account B.
    const previous: CloudPartition = { version: 1, snapshot: makeBackupSnapshot(), deleted: cloudDeletedRef.current };
    savePartition(localStorage, owner, previous);
    const existing = readPartition(localStorage, GUEST_OWNER);
    const guest = existing || freshPartition({ signedIn: true, uid: GUEST_OWNER, name: 'FitLife Athlete', email: '' });
    activatePartition(localStorage, GUEST_OWNER, guest);
    ownerRef.current = GUEST_OWNER; setLocalOwnerId(GUEST_OWNER);
    needsRecoveryRef.current = false;
    applyPartition(guest);
  };
  const isUntouchedDemo = (snapshot: BackupSnapshot) =>
    [snapshot.meals, snapshot.workouts, snapshot.weights, snapshot.moods].every(rows => rows.every(row => isDemoId(row.id)))
    && snapshot.water.amountMl === 0 && JSON.stringify(snapshot.profile) === JSON.stringify(DEFAULT_PROFILE);

  const activateGoogleAccount = (account: GoogleAccount, openApp: boolean) => {
    if (storageBlockedRef.current) throw new Error('The local account data needs recovery. Nothing was switched or uploaded.');
    const previousOwner = ownerRef.current;
    const previous: CloudPartition = { version: 1, snapshot: makeBackupSnapshot(), deleted: cloudDeletedRef.current };
    let next: CloudPartition;
    let recoverProfile = false;
    if (previousOwner === account.uid) {
      next = previous;
      recoverProfile = !previous.snapshot.profile.onboarded && [previous.snapshot.meals, previous.snapshot.workouts, previous.snapshot.weights, previous.snapshot.moods].every(rows => rows.length === 0);
    } else if (previousOwner) {
      // Saving A is mandatory before B becomes active. An error aborts the switch.
      savePartition(localStorage, previousOwner, previous);
      const existing = readPartition(localStorage, account.uid);
      next = existing || freshPartition(account);
      recoverProfile = !existing;
    } else {
      // Only the first claimed account inherits the previously unclaimed data.
      // Replace demo defaults only when this install was provably fresh before
      // its first load. Persisted legacy rows are never inferred to be disposable
      // just from their IDs. Retain any customized preferences either way.
      recoverProfile = freshUnclaimed && isUntouchedDemo(previous.snapshot);
      if (recoverProfile) {
        const fresh = freshPartition(account);
        next = { ...fresh, snapshot: { ...fresh.snapshot, settings: previous.snapshot.settings } };
      } else next = previous;
    }
    // Existing pre-guide local profiles should not be forced through new-user tips.
    // A new partition explicitly contains an empty guidesSeen list.
    if (next.snapshot.settings.guidesSeen === undefined && next.snapshot.profile.onboarded) {
      next = { ...next, snapshot: { ...next.snapshot, settings: { ...next.snapshot.settings, guidesSeen: [...GUIDE_IDS] } } };
    }
    const identityProfile = { ...next.snapshot.profile,
      // A new partition already uses the Google name; do not overwrite the
      // display name a legacy user may have deliberately chosen.
      email: account.email || next.snapshot.profile.email, uid: account.uid };
    next = { ...next, snapshot: { ...next.snapshot, profile: identityProfile } };
    // A first claim also retains the existing local rest timer in that account.
    // Later accounts never inherit another person's timer.
    if (!previousOwner) {
      const originalTimer = localStorage.getItem('fitlife_rest_timer_v1');
      const accountTimerKey = `fitlife_rest_timer_v1:${account.uid}`;
      if (originalTimer && !localStorage.getItem(accountTimerKey)) localStorage.setItem(accountTimerKey, originalTimer);
    }
    // A single slot is written first and the ownership marker second. If the
    // app stops between writes, the old owner's slot remains authoritative.
    activatePartition(localStorage, account.uid, next);
    if (!previousOwner) {
      try { localStorage.removeItem(STORAGE_KEYS.UNCLAIMED_FRESH); } catch { /* partition is already saved */ }
    }
    ownerRef.current = account.uid;
    setLocalOwnerId(account.uid);
    needsRecoveryRef.current = recoverProfile;
    cloudAccountRef.current = account;
    setGuidesReady(false);
    setCloudAccount(account);
    applyPartition(next);
    if (openApp) setIsAuthenticated(true);
  };

  const signInGoogle = async (): Promise<boolean> => {
    if (!cloudAvailable) { setCloudStatus('Google sign-in is available in the Android app.'); return false; }
    const generation = ++authGenerationRef.current;
    setCloudStatus('Opening Google sign-in…');
    let nativeSignedIn = false;
    try {
      const result = await nativeCloudRequest<unknown>('signIn');
      nativeSignedIn = true;
      const account = parseAccount(result);
      if (!account || generation !== authGenerationRef.current) throw new Error('Google sign-in did not finish.');
      activateGoogleAccount(account, true);
      setCloudStatus('Google account connected. Checking cloud data…');
      return true;
    } catch (error) {
      if (nativeSignedIn) { try { await nativeCloudRequest('signOut'); } catch {} }
      cloudAccountRef.current = null; setCloudAccount(null);
      setCloudStatus(error instanceof Error ? error.message : 'Google sign-in failed.');
      return false;
    }
  };
  const signOutGoogle = async () => {
    ++authGenerationRef.current;
    try {
      await nativeCloudRequest('signOut');
    } catch (error) { setCloudStatus(error instanceof Error ? error.message : 'Could not sign out.'); return; }
    cloudAccountRef.current = null; setCloudAccount(null);
    setIsAuthenticated(false); setGuidesReady(false);
    try {
      switchToLocalGuest();
      setCloudStatus('Signed out. Your account data remains on this device.');
    } catch {
      setCloudStatus('Signed out. Your saved account data was not deleted; free storage before signing in again.');
    }
  };

  const syncNow = async () => {
    const account = cloudAccountRef.current;
    if (!account || !cloudAvailable) return;
    if (storageBlockedRef.current || ownerRef.current !== account.uid) { setCloudStatus('Local account data needs recovery. Sync is paused.'); return; }
    if (cloudBusyRef.current) { syncAgainRef.current = true; return; }
    cloudBusyRef.current = true;
    setCloudStatus('Checking cloud data…');
    try {
      const response = await nativeCloudRequest<{ uid: string; deviceId: string; snapshots: RemoteSnapshot[] }>('pull', undefined, account.uid);
      if (cloudAccountRef.current?.uid !== account.uid || ownerRef.current !== account.uid || response.uid !== account.uid)
        throw new Error('Account changed; sync was stopped.');
      if (!/^[a-f0-9]{32}$/.test(response.deviceId) || !Array.isArray(response.snapshots) || response.snapshots.length > 10)
        throw new Error('Cloud data could not be verified; nothing was overwritten.');
      const remotes: CloudPayload[] = [];
      let ownPayload: string | null = null;
      for (const item of response.snapshots) {
        if (!item || !/^[a-f0-9]{32}$/.test(item.deviceId) || typeof item.payload !== 'string') throw new Error('Cloud data is invalid; nothing was overwritten.');
        let parsed: unknown; try { parsed = JSON.parse(item.payload); } catch { throw new Error('Cloud data is invalid; nothing was overwritten.'); }
        if (!validCloudPayload(parsed)) throw new Error('Cloud data is invalid; nothing was overwritten.');
        remotes.push(parsed); if (item.deviceId === response.deviceId) ownPayload = item.payload;
      }
      const revision = backupRevisionRef.current;
      let snapshot = makeBackupSnapshot();
      // A new device can recover one account's profile/preferences/water copy.
      // Otherwise those values are device-local and are never silently merged.
      if (needsRecoveryRef.current && remotes.length > 0) {
        const recovered = remotes[0].snapshot;
        snapshot = { ...snapshot, profile: { ...recovered.profile, email: account.email || recovered.profile.email, uid: account.uid },
          settings: recovered.settings, water: recovered.water };
      }
      const merged = await mergeCloud({ schema: 1, snapshot, deleted: cloudDeletedRef.current }, remotes);
      if (cloudAccountRef.current?.uid !== account.uid || ownerRef.current !== account.uid) throw new Error('Account changed; sync was stopped.');
      if (revision !== backupRevisionRef.current) { syncAgainRef.current = true; setCloudStatus('Changes saved locally; retrying sync…'); return; }
      const payload = JSON.stringify(merged);
      if (new TextEncoder().encode(payload).byteLength > 500_000) throw new Error('This data is too large for cloud sync. Keep an encrypted local backup.');
      // Demo records are intentionally excluded from cloud payloads, but that
      // must not silently delete an existing user's local sample history.
      const localSnapshot = { ...merged.snapshot };
      for (const kind of CLOUD_KINDS) {
        const localSamples = snapshot[kind].filter(row => isDemoId(row.id));
        (localSnapshot as any)[kind] = [...localSamples, ...merged.snapshot[kind]];
      }
      const part: CloudPartition = { version: 1, snapshot: localSnapshot, deleted: merged.deleted };
      // Fail before modifying visible data if the local atomic slot cannot be saved.
      savePartition(localStorage, account.uid, part);
      const currentComparable = JSON.stringify({ ...makeBackupSnapshot(), createdAt: 0 });
      const nextComparable = JSON.stringify(localSnapshot);
      if (currentComparable !== nextComparable || JSON.stringify(cloudDeletedRef.current) !== JSON.stringify(merged.deleted)) applyPartition(part);
      needsRecoveryRef.current = false;
      const mergedRevision = backupRevisionRef.current;
      if (ownPayload !== payload) {
        setCloudStatus('Saving merged activity to your Google account…');
        const saved = await nativeCloudRequest<{ uid: string }>('push', payload, account.uid);
        if (saved.uid !== account.uid || cloudAccountRef.current?.uid !== account.uid || ownerRef.current !== account.uid) throw new Error('Account changed; sync was stopped.');
      }
      if (mergedRevision !== backupRevisionRef.current) { syncAgainRef.current = true; setCloudStatus('Changes saved locally; syncing again…'); }
      else setCloudStatus('Activity synced. Profile, settings and today’s water are device-specific.');
    } catch (error) {
      if (cloudAccountRef.current?.uid === account.uid) setCloudStatus(error instanceof Error ? error.message : 'Cloud sync is unavailable. Data stays on this device.');
    } finally {
      if (cloudAccountRef.current?.uid === account.uid) setGuidesReady(true);
      cloudBusyRef.current = false;
      if (syncAgainRef.current) {
        syncAgainRef.current = false;
        window.setTimeout(() => { void syncNowRef.current(); }, 1600);
      }
    }
  };
  syncNowRef.current = syncNow;

  // Restore only the native Firebase session; the WebView never receives tokens.
  useEffect(() => {
    if (!cloudAvailable) { setAuthRestoring(false); return; }
    const generation = authGenerationRef.current;
    void nativeCloudRequest<unknown>('session').then(value => {
      if (generation !== authGenerationRef.current) return;
      const account = parseAccount(value);
      if (!account) { if (!storageBlockedRef.current) setCloudStatus('Not connected.'); return; }
      try { activateGoogleAccount(account, true); setCloudStatus('Google account connected. Checking cloud data…'); }
      catch (error) { cloudAccountRef.current = null; setCloudAccount(null); setCloudStatus(error instanceof Error ? error.message : 'Account recovery is required.'); }
    }).catch(() => { if (generation === authGenerationRef.current) setCloudStatus('Google session unavailable. Your saved data remains on this device.'); })
      .finally(() => setAuthRestoring(false));
  }, []);
  useEffect(() => {
    if (!cloudAccount) return;
    const uid = cloudAccount.uid;
    const timer = window.setTimeout(() => { if (cloudAccountRef.current?.uid === uid) setGuidesReady(true); }, 6500);
    return () => window.clearTimeout(timer);
  }, [cloudAccount]);
  const markGuideSeen = (id: GuideId) => {
    setSettings(previous => ({ ...previous, guidesSeen: normalizeGuides([...(previous.guidesSeen || []), id]) }));
  };

  // Debounced writes, periodic reads and foreground/online retry keep ordinary
  // use within modest free-tier quotas. A network error never discards local edits.
  useEffect(() => {
    if (!cloudAccount) return;
    const timer = window.setTimeout(() => { void syncNowRef.current(); }, 1800);
    return () => window.clearTimeout(timer);
  }, [cloudAccount, profile, settings, meals, workouts, weights, moods, waterRecord, cloudDeleted]);
  useEffect(() => {
    if (!cloudAccount) return;
    const timer = window.setInterval(() => { if (!document.hidden) void syncNowRef.current(); }, 120000);
    const retry = () => { if (!document.hidden) void syncNowRef.current(); };
    window.addEventListener('online', retry); document.addEventListener('visibilitychange', retry);
    return () => { window.clearInterval(timer); window.removeEventListener('online', retry); document.removeEventListener('visibilitychange', retry); };
  }, [cloudAccount]);

  const restoreBackupSnapshot = async (snapshot: BackupSnapshot, mode: 'merge' | 'replace') => {
    if (storageBlockedRef.current) throw new Error('Account data needs recovery before importing.');
    // Read live state after decryption, not the render closure from when the user
    // opened the file picker. Do not overwrite edits from another open tab.
    const revision = backupRevisionRef.current;
    const current = makeBackupSnapshot();
    const keys: [string, unknown][] = [[STORAGE_KEYS.PROFILE, current.profile], [STORAGE_KEYS.SETTINGS, current.settings],
      [STORAGE_KEYS.MEALS, current.meals], [STORAGE_KEYS.WORKOUTS, current.workouts], [STORAGE_KEYS.WEIGHTS, current.weights],
      [STORAGE_KEYS.MOODS, current.moods], [STORAGE_KEYS.WATER, current.water]];
    const originals = keys.map(([key]) => localStorage.getItem(key));
    if (keys.some(([, value], i) => originals[i] !== JSON.stringify(value))) throw new Error('Device data changed in another tab. Reload FitLife before importing.');
    // An intentional backup restore gets a fresh stable ID when its old copy
    // was deleted in cloud sync. Otherwise an old tombstone would hide it.
    const imported = { ...snapshot };
    if (ownerRef.current) {
      for (const kind of CLOUD_KINDS) {
        const tombstones = new Set(cloudDeletedRef.current[kind]);
        const rows = await Promise.all((snapshot[kind] as { id: string }[]).map(async row => {
          const fingerprint = await rowFingerprint(row);
          return tombstones.has(fingerprint) ? { ...row, id: `${row.id.slice(0, 250)}-restored-${fingerprint.slice(0, 24)}` } : row;
        }));
        (imported as any)[kind] = rows;
      }
    }
    const next: BackupSnapshot = mode === 'merge' ? {
      ...current,
      meals: await mergeBackupRows(current.meals, imported.meals),
      workouts: await mergeBackupRows(current.workouts, imported.workouts),
      weights: await mergeBackupRows(current.weights, imported.weights),
      moods: await mergeBackupRows(current.moods, imported.moods),
    } : { ...imported, settings: {
      ...DEFAULT_SETTINGS, ...snapshot.settings,
      // Importing an older backup must not resurrect tips already dismissed.
      guidesSeen: normalizeGuides([...(current.settings.guidesSeen || []), ...(snapshot.settings.guidesSeen || [])]),
      favoriteExerciseIds: snapshot.settings.favoriteExerciseIds || [],
      weeklyWorkoutGoal: snapshot.settings.weeklyWorkoutGoal || DEFAULT_SETTINGS.weeklyWorkoutGoal,
      navStyle: snapshot.settings.navStyle || DEFAULT_SETTINGS.navStyle,
      dashboardWidgets: { ...DEFAULT_SETTINGS.dashboardWidgets, ...snapshot.settings.dashboardWidgets },
    } };
    const account = cloudAccountRef.current;
    if (account && ownerRef.current === account.uid) next.profile = { ...next.profile, email: account.email || next.profile.email, uid: account.uid };
    const nextDeleted: CloudDeletions = { ...cloudDeletedRef.current };
    if (ownerRef.current && mode === 'replace') {
      for (const kind of CLOUD_KINDS) {
        const incoming = new Set(await Promise.all((next[kind] as { id: string }[]).map(rowFingerprint)));
        const old = await Promise.all((current[kind] as { id: string }[]).filter(row => !isDemoId(row.id)).map(rowFingerprint));
        nextDeleted[kind] = [...new Set([...nextDeleted[kind], ...old.filter(hash => !incoming.has(hash))])].sort();
      }
    }
    if (backupRevisionRef.current !== revision || keys.some(([key], i) => localStorage.getItem(key) !== originals[i])) throw new Error('Your activity changed during import. Please try again.');
    const changes: [string, unknown][] = [[STORAGE_KEYS.PROFILE, next.profile], [STORAGE_KEYS.SETTINGS, next.settings],
      [STORAGE_KEYS.MEALS, next.meals], [STORAGE_KEYS.WORKOUTS, next.workouts], [STORAGE_KEYS.WEIGHTS, next.weights],
      [STORAGE_KEYS.MOODS, next.moods], [STORAGE_KEYS.WATER, next.water]];
    // Write all values before changing React state. On quota or storage failure,
    // restore the earlier values when possible and report failure, never pretend.
    let written = 0;
    try {
      for (const [key, value] of changes) { localStorage.setItem(key, JSON.stringify(value)); written++; }
      if (ownerRef.current) savePartition(localStorage, ownerRef.current, { version: 1, snapshot: next, deleted: nextDeleted });
    } catch {
      // Free changed entries first: restoring them one-by-one can itself hit
      // quota if an earlier replacement was larger than its original value.
      for (let index = 0; index < written; index++) try { localStorage.removeItem(changes[index][0]); } catch { /* report failure below */ }
      for (let index = 0; index < written; index++) {
        try { const [key] = changes[index]; const old = originals[index]; if (old !== null) localStorage.setItem(key, old); } catch { /* report failure below */ }
      }
      throw new Error('Could not complete the restore. Check available device storage and try again.');
    }
    setProfile(next.profile); setSettings(next.settings); setMeals(next.meals); setWorkouts(next.workouts);
    setWeights(next.weights); setMoods(next.moods); setWaterRecord(next.water); setCloudDeleted(nextDeleted);
    showToast(mode === 'merge' ? 'Backup activity merged' : 'Backup restored');
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
        authRestoring,
        guidesReady,
        markGuideSeen,
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
        setAutoStartRest,
        setWeeklyWorkoutGoal,
        toggleFavoriteExercise,
        setNavStyle,
        setWaterGoalMl,
        toggleDashboardWidget,
        addWaterMl,
        logFoodItem,
        logQuickAddMeals,
        editMeal,
        removeMeal,
        logWorkout,
        removeWorkout,
        logWeight,
        logMood,
        signOut,
        localOwnerId,
        cloudAvailable,
        cloudAccount,
        cloudStatus,
        signInGoogle,
        signOutGoogle,
        syncNow,
        seedDemoHistory,
        clearAllHistory,
        makeBackupSnapshot,
        restoreBackupSnapshot,
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
