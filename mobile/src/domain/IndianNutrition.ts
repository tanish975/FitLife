import type {
  EdibleCategoryId,
  FoodDietaryFlag,
  FoodItem,
  FoodMicronutrients,
  FoodPreparationProfile,
  LoggedMeal,
  MealCategory,
  WorldRegionId,
} from '../data/types';
import {
  COUNTRY_SEARCH_TERMS,
  EDIBLE_CATEGORY_MAP,
  WORLD_REGION_MAP,
  isLaboratoryPer100gFood,
  scaleFoodMicronutrients,
} from '../data/WorldAtlasMeta';
import type { CustomRecipe, RecipeIngredient } from './PersonalFeatures';

export type HouseholdUnit =
  | 'serving'
  | 'katori'
  | 'glass'
  | 'tbsp'
  | 'tsp'
  | 'roti'
  | 'grams';

export type KatoriSize = 'small' | 'medium' | 'large';
export type GlassSize = 'small' | 'standard' | 'tall';
export type RotiStyle = 'thin_rotli' | 'medium_roti' | 'thick_bhakhri' | 'millet_rotlo';
export type WeightBasis = 'as_served' | 'raw' | 'cooked';
export type CookingFatKind =
  | 'none'
  | 'ghee'
  | 'oil'
  | 'groundnut_oil'
  | 'mustard_oil'
  | 'coconut_oil';

export const KATORI_ML: Record<KatoriSize, number> = {
  small: 100,
  medium: 150,
  large: 200,
};

export const KATORI_LABELS: Record<KatoriSize, string> = {
  small: 'Small katori (100 ml)',
  medium: 'Medium katori (150 ml)',
  large: 'Large katori (200 ml)',
};

export const GLASS_ML: Record<GlassSize, number> = {
  small: 150,
  standard: 200,
  tall: 250,
};

export const GLASS_LABELS: Record<GlassSize, string> = {
  small: 'Small glass (150 ml)',
  standard: 'Standard glass (200 ml)',
  tall: 'Tall glass (250 ml)',
};

export const ROTI_COOKED_GRAMS: Record<RotiStyle, number> = {
  thin_rotli: 28,
  medium_roti: 40,
  thick_bhakhri: 55,
  millet_rotlo: 90,
};

export const ROTI_STYLE_LABELS: Record<RotiStyle, string> = {
  thin_rotli: 'Thin Gujarati rotli (28g)',
  medium_roti: 'Medium phulka / roti (40g)',
  thick_bhakhri: 'Thick roti / bhakhri (55g)',
  millet_rotlo: 'Bajri / Jowar rotlo (90g)',
};

/** 1 tsp oil/ghee ≈ 4.5g (5 ml × 0.90 g/ml lipid density); 1 tbsp ≈ 13.5g. */
export const GRAMS_PER_TSP_FAT = 4.5;
export const GRAMS_PER_TBSP_FAT = 13.5;
export const KCAL_PER_GRAM_FAT = 9;

export const COOKING_FAT_LABELS: Record<CookingFatKind, string> = {
  none: 'No added oil/ghee',
  ghee: 'Ghee (IFCT T013)',
  oil: 'Cooking oil (IFCT T012)',
  groundnut_oil: 'Groundnut / Singtel (IFCT T005)',
  mustard_oil: 'Mustard oil (IFCT T006)',
  coconut_oil: 'Coconut oil (IFCT T001)',
};

export const COOKING_FAT_SHORT_NAMES: Record<CookingFatKind, string> = {
  none: '',
  ghee: 'ghee',
  oil: 'oil',
  groundnut_oil: 'groundnut oil',
  mustard_oil: 'mustard oil',
  coconut_oil: 'coconut oil',
};

export interface CookingFatPreset {
  id: string;
  label: string;
  sublabel: string;
  tsp: number;
  grams: number;
  calories: number;
}

export const COOKING_FAT_PRESETS: CookingFatPreset[] = [
  { id: 'none', label: '0 tsp', sublabel: 'None / dry', tsp: 0, grams: 0, calories: 0 },
  { id: 'half-tsp', label: '½ tsp', sublabel: 'Rotli smear (2.3g)', tsp: 0.5, grams: 2.25, calories: 20 },
  { id: 'one-tsp', label: '1 tsp', sublabel: 'Home tadka (4.5g)', tsp: 1, grams: 4.5, calories: 41 },
  { id: 'two-tsp', label: '2 tsp', sublabel: 'Rich tadka (9g)', tsp: 2, grams: 9, calories: 81 },
  { id: 'one-tbsp', label: '1 tbsp', sublabel: 'Restaurant / festive (13.5g)', tsp: 3, grams: 13.5, calories: 122 },
];

export interface YieldConfig {
  defaultCookedPerRaw: number;
  label: string;
  explanation: string;
  presets?: { label: string; ratio: number }[];
}

export const PREPARATION_YIELD_CONFIG: Partial<Record<FoodPreparationProfile, YieldConfig>> = {
  raw_rice_grain: {
    defaultCookedPerRaw: 3.0,
    label: 'Steamed / boiled grain (3.0× weight)',
    explanation: '100g raw rice/millet absorbs water to yield ~300g plain cooked grain.',
    presets: [
      { label: 'Firm / pulao (2.6×)', ratio: 2.6 },
      { label: 'Steamed bhat (3.0×)', ratio: 3.0 },
      { label: 'Soft / kanji (3.6×)', ratio: 3.6 },
    ],
  },
  raw_dal: {
    defaultCookedPerRaw: 3.75,
    label: 'Boiled dal before tadka (3.75× weight)',
    explanation: '40g raw split dal yields ~150g (1 medium katori) homestyle cooked dal before oil/ghee.',
    presets: [
      { label: 'Thick dal (3.0×)', ratio: 3.0 },
      { label: 'Homestyle (3.75×)', ratio: 3.75 },
      { label: 'Thin Gujarati dal (5.0×)', ratio: 5.0 },
    ],
  },
  raw_whole_legume: {
    defaultCookedPerRaw: 2.6,
    label: 'Soaked & pressure-cooked (2.6× weight)',
    explanation: '100g dry chana/rajma/moong yields ~260g cooked drained beans before oil.',
    presets: [
      { label: 'Drained / dry shaak (2.4×)', ratio: 2.4 },
      { label: 'Standard cooked (2.6×)', ratio: 2.6 },
      { label: 'Rasawala / gravy (3.2×)', ratio: 3.2 },
    ],
  },
  raw_poha: {
    defaultCookedPerRaw: 2.0,
    label: 'Rinsed & steamed poha (2.0× weight)',
    explanation: '60g dry rice flakes (paunva) hydrate to ~120g cooked poha before oil/peanuts.',
  },
  raw_flour_roti: {
    defaultCookedPerRaw: 1.45,
    label: 'Kneaded & roasted flatbread (1.45× weight)',
    explanation: '27.5g dry flour yields ~40g medium roti (19.3g dry atta → ~28g thin Gujarati rotli).',
  },
  raw_semolina_dalia: {
    defaultCookedPerRaw: 3.2,
    label: 'Cooked upma / dalia porridge (3.2× weight)',
    explanation: '47g dry soji/rava or dalia cooks with water to ~150g (1 medium katori).',
  },
  raw_vegetable_tuber: {
    defaultCookedPerRaw: 0.9,
    label: 'Cooked / steamed veg (0.9× moisture loss)',
    explanation: '100g raw edible vegetable yields ~90g cooked after light moisture loss (0 added oil).',
  },
  raw_meat_seafood: {
    defaultCookedPerRaw: 0.75,
    label: 'Cooked meat / fish / egg (0.75× moisture loss)',
    explanation: '100g raw meat/fish yields ~75g cooked (~133g raw per 100g cooked, 0 added oil).',
  },
};

/** Non-mutating lookup for the 32 legacy catalog entries so ORIGINAL_FOOD_CATALOG stays untouched. */
const LEGACY_PORTION_META: Record<
  string,
  { grams: number; profile: FoodPreparationProfile; defaultUnit?: HouseholdUnit }
> = {
  'food-eggs': { grams: 50, profile: 'ready_to_eat' },
  'food-egg-whites': { grams: 130, profile: 'cooked_dish', defaultUnit: 'katori' },
  'food-oats': { grams: 240, profile: 'cooked_dish', defaultUnit: 'katori' },
  'food-banana': { grams: 118, profile: 'ready_to_eat' },
  'food-poha': { grams: 180, profile: 'cooked_dish', defaultUnit: 'katori' },
  'food-idli': { grams: 220, profile: 'cooked_dish' },
  'food-moong-chilla': { grams: 160, profile: 'cooked_dish' },
  'food-greek-yogurt': { grams: 170, profile: 'liquid_dairy_beverage', defaultUnit: 'katori' },
  'food-avocado-toast': { grams: 140, profile: 'cooked_dish' },
  'food-peanut-butter': { grams: 32, profile: 'ready_to_eat', defaultUnit: 'tbsp' },
  'food-chicken-breast': { grams: 150, profile: 'cooked_dish', defaultUnit: 'grams' },
  'food-paneer-tikka': { grams: 150, profile: 'cooked_dish', defaultUnit: 'grams' },
  'food-dal-tadka': { grams: 200, profile: 'cooked_dish', defaultUnit: 'katori' },
  'food-roti': { grams: 40, profile: 'cooked_dish', defaultUnit: 'roti' },
  'food-brown-rice': { grams: 195, profile: 'cooked_dish', defaultUnit: 'katori' },
  'food-rajma-chawal': { grams: 320, profile: 'cooked_dish' },
  'food-chole': { grams: 220, profile: 'cooked_dish', defaultUnit: 'katori' },
  'food-quinoa-bowl': { grams: 280, profile: 'cooked_dish' },
  'food-tofu-stirfry': { grams: 250, profile: 'cooked_dish' },
  'food-salmon': { grams: 150, profile: 'cooked_dish', defaultUnit: 'grams' },
  'food-khichdi': { grams: 260, profile: 'cooked_dish', defaultUnit: 'katori' },
  'food-palak-paneer': { grams: 220, profile: 'cooked_dish', defaultUnit: 'katori' },
  'food-soya-chunks': { grams: 180, profile: 'cooked_dish', defaultUnit: 'katori' },
  'food-sweet-potato': { grams: 150, profile: 'cooked_dish', defaultUnit: 'grams' },
  'food-chicken-salad': { grams: 300, profile: 'cooked_dish' },
  'food-whey-shake': { grams: 250, profile: 'liquid_dairy_beverage', defaultUnit: 'glass' },
  'food-almonds': { grams: 28, profile: 'ready_to_eat', defaultUnit: 'grams' },
  'food-apple': { grams: 182, profile: 'ready_to_eat' },
  'food-makhana': { grams: 35, profile: 'ready_to_eat', defaultUnit: 'katori' },
  'food-sprouts': { grams: 150, profile: 'ready_to_eat', defaultUnit: 'katori' },
  'food-protein-bar': { grams: 60, profile: 'ready_to_eat' },
  'food-black-coffee': { grams: 240, profile: 'liquid_dairy_beverage', defaultUnit: 'glass' },
};

const round1 = (value: number) => Math.round(value * 10) / 10;

export function getFoodServingGrams(food: FoodItem): number {
  if (food.servingGrams && food.servingGrams > 0) return food.servingGrams;
  if (LEGACY_PORTION_META[food.id]) return LEGACY_PORTION_META[food.id].grams;
  const match = food.servingLabel.match(/\((\d+(?:\.\d+)?)\s*(?:g|ml)\b/i)
    ?? food.servingLabel.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)\b/i);
  return match ? Number(match[1]) : 100;
}

export function getFoodPreparationProfile(food: FoodItem): FoodPreparationProfile {
  if (food.preparationProfile) return food.preparationProfile;
  return LEGACY_PORTION_META[food.id]?.profile ?? 'cooked_dish';
}

export function supportsRawCookedToggle(food: FoodItem): boolean {
  const profile = getFoodPreparationProfile(food);
  return Boolean(PREPARATION_YIELD_CONFIG[profile]);
}

export function getDefaultPortionSetup(food: FoodItem): {
  unit: HouseholdUnit;
  quantity: number;
  katoriSize: KatoriSize;
  glassSize: GlassSize;
  rotiStyle: RotiStyle;
  basis: WeightBasis;
  cookedPerRawRatio: number;
} {
  const profile = getFoodPreparationProfile(food);
  const yieldCfg = PREPARATION_YIELD_CONFIG[profile];
  const ratio = yieldCfg?.defaultCookedPerRaw ?? 1;

  if (isLaboratoryPer100gFood(food)) {
    if (profile === 'cooking_fat_oil') {
      return {
        unit: 'tsp',
        quantity: 1,
        katoriSize: 'medium',
        glassSize: 'standard',
        rotiStyle: 'medium_roti',
        basis: 'as_served',
        cookedPerRawRatio: 1,
      };
    }
    if (profile === 'liquid_dairy_beverage') {
      return {
        unit: 'glass',
        quantity: 1,
        katoriSize: 'medium',
        glassSize: 'standard',
        rotiStyle: 'medium_roti',
        basis: 'as_served',
        cookedPerRawRatio: 1,
      };
    }
    if (profile === 'raw_flour_roti' && food.source === 'ifct2017') {
      const isMillet = ['A003', 'A005', 'A006', 'A010'].includes(food.ifctCode ?? '');
      return {
        unit: 'roti',
        quantity: 1,
        katoriSize: 'medium',
        glassSize: 'standard',
        rotiStyle: isMillet ? 'millet_rotlo' : 'medium_roti',
        basis: 'cooked',
        cookedPerRawRatio: ratio,
      };
    }
    if (
      profile === 'raw_rice_grain' ||
      profile === 'raw_dal' ||
      profile === 'raw_whole_legume' ||
      profile === 'raw_poha' ||
      profile === 'raw_semolina_dalia'
    ) {
      return {
        unit: 'katori',
        quantity: 1,
        katoriSize: 'medium',
        glassSize: 'standard',
        rotiStyle: 'medium_roti',
        basis: 'cooked',
        cookedPerRawRatio: ratio,
      };
    }
    return {
      unit: 'grams',
      quantity: 100,
      katoriSize: 'medium',
      glassSize: 'standard',
      rotiStyle: 'medium_roti',
      basis: yieldCfg ? 'raw' : 'as_served',
      cookedPerRawRatio: ratio,
    };
  }

  return {
    unit: 'serving',
    quantity: 1,
    katoriSize: 'medium',
    glassSize: 'standard',
    rotiStyle:
      food.id === 'food-guj-rotli-dry' || food.id === 'food-guj-rotli-ghee'
        ? 'thin_rotli'
        : food.id.includes('rotlo')
        ? 'millet_rotlo'
        : food.id.includes('bhakhri')
        ? 'thick_bhakhri'
        : 'medium_roti',
    basis: 'as_served',
    cookedPerRawRatio: ratio,
  };
}

/** Converts volumetric ml (katori/glass/tbsp/tsp) into grams for a food profile & basis. */
export function densityGramsPerMl(
  food: FoodItem,
  basis: WeightBasis
): number {
  const profile = getFoodPreparationProfile(food);
  if (profile === 'cooking_fat_oil') return 0.9;
  if (food.id === 'food-makhana' || food.id === 'food-guj-vagharela-mamra' || food.ifctCode === 'A012') {
    return 0.24;
  }
  if (food.id === 'food-peanut-butter') return 1.07;
  if (profile === 'raw_poha') return basis === 'raw' ? 0.4 : 0.85;
  if (
    basis === 'raw' &&
    (profile === 'raw_rice_grain' ||
      profile === 'raw_dal' ||
      profile === 'raw_whole_legume' ||
      profile === 'raw_flour_roti' ||
      profile === 'raw_semolina_dalia')
  ) {
    return 0.8;
  }
  return 1.0;
}

export interface PortionCalculationInput {
  food: FoodItem;
  unit: HouseholdUnit;
  quantity: number;
  katoriSize?: KatoriSize;
  glassSize?: GlassSize;
  rotiStyle?: RotiStyle;
  basis?: WeightBasis;
  cookedPerRawRatio?: number;
  cookingFatKind?: CookingFatKind;
  cookingFatGrams?: number;
}

export interface PortionCalculationResult {
  measuredGrams: number;
  catalogReferenceGrams: number;
  rawEquivalentGrams?: number;
  cookedEquivalentGrams?: number;
  addedFatGrams: number;
  addedFatCalories: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG?: number;
  sodiumMg?: number;
  moistureG?: number;
  micronutrients?: FoodMicronutrients;
  servingLabel: string;
  nutritionNote?: string;
}

export function estimateCookingFat(
  kind: CookingFatKind,
  grams: number
): { grams: number; calories: number; fatG: number; label: string } {
  if (kind === 'none' || !Number.isFinite(grams) || grams <= 0) {
    return { grams: 0, calories: 0, fatG: 0, label: '' };
  }
  const cleanGrams = round1(Math.min(Math.max(grams, 0), 500));
  const calories = Math.round(cleanGrams * KCAL_PER_GRAM_FAT);
  const fatName = COOKING_FAT_SHORT_NAMES[kind] || 'oil';
  const tspApprox = round1(cleanGrams / GRAMS_PER_TSP_FAT);
  const measureText =
    Math.abs(cleanGrams - GRAMS_PER_TBSP_FAT) < 0.2
      ? '1 tbsp'
      : Math.abs(cleanGrams - 2.25) < 0.15
      ? '0.5 tsp'
      : Number.isInteger(tspApprox) && tspApprox <= 6
      ? `${tspApprox} tsp`
      : `${cleanGrams}g`;
  return {
    grams: cleanGrams,
    calories,
    fatG: cleanGrams,
    label: `${measureText} ${fatName} (${cleanGrams}g)`,
  };
}

export function computePortionNutrition(
  input: PortionCalculationInput
): PortionCalculationResult {
  const {
    food,
    unit,
    katoriSize = 'medium',
    glassSize = 'standard',
    rotiStyle = 'medium_roti',
    cookingFatKind = 'none',
    cookingFatGrams = 0,
  } = input;

  const qty = Number.isFinite(input.quantity) && input.quantity > 0 ? input.quantity : 0;
  const profile = getFoodPreparationProfile(food);
  const yieldCfg = PREPARATION_YIELD_CONFIG[profile];
  const hasRawCooked = Boolean(yieldCfg);
  const ratio =
    input.cookedPerRawRatio && input.cookedPerRawRatio > 0.1
      ? input.cookedPerRawRatio
      : yieldCfg?.defaultCookedPerRaw ?? 1;

  const effectiveBasis: WeightBasis = hasRawCooked
    ? input.basis === 'cooked'
      ? 'cooked'
      : 'raw'
    : 'as_served';

  const baseServingGrams = getFoodServingGrams(food);
  const density = densityGramsPerMl(food, effectiveBasis);

  let measuredGrams = 0;
  let basePortionLabel = '';

  const fmtQty = (n: number) => (Number.isInteger(n) ? String(n) : String(round1(n)));

  switch (unit) {
    case 'serving': {
      measuredGrams = round1(qty * baseServingGrams);
      basePortionLabel =
        qty === 1 ? food.servingLabel : `${fmtQty(qty)} × ${food.servingLabel}`;
      break;
    }
    case 'katori': {
      const ml = KATORI_ML[katoriSize];
      measuredGrams = round1(qty * ml * density);
      const sizeWord = katoriSize;
      const stateWord =
        effectiveBasis === 'cooked'
          ? ' cooked'
          : effectiveBasis === 'raw'
          ? ' raw'
          : '';
      basePortionLabel = `${fmtQty(qty)} ${sizeWord} katori${stateWord} (${Math.round(measuredGrams)}g)`;
      break;
    }
    case 'glass': {
      const ml = GLASS_ML[glassSize];
      measuredGrams = round1(qty * ml * density);
      basePortionLabel = `${fmtQty(qty)} ${glassSize} glass (${Math.round(qty * ml)}ml)`;
      break;
    }
    case 'tbsp': {
      const gramsPerTbsp =
        profile === 'cooking_fat_oil'
          ? GRAMS_PER_TBSP_FAT
          : food.id === 'food-peanut-butter'
          ? 16
          : effectiveBasis === 'raw'
          ? 10
          : 15;
      measuredGrams = round1(qty * gramsPerTbsp);
      basePortionLabel = `${fmtQty(qty)} tbsp (${measuredGrams}g)`;
      break;
    }
    case 'tsp': {
      const gramsPerTsp =
        profile === 'cooking_fat_oil'
          ? GRAMS_PER_TSP_FAT
          : food.id === 'food-peanut-butter'
          ? 5.3
          : effectiveBasis === 'raw'
          ? 3.5
          : 5;
      measuredGrams = round1(qty * gramsPerTsp);
      basePortionLabel = `${fmtQty(qty)} tsp (${measuredGrams}g)`;
      break;
    }
    case 'roti': {
      const gramsPerRoti = ROTI_COOKED_GRAMS[rotiStyle];
      // A roti unit is always a cooked flatbread weight; if the underlying food is raw flour,
      // convert cooked flatbread grams back to raw flour grams below.
      measuredGrams = round1(qty * gramsPerRoti);
      const styleShort =
        rotiStyle === 'thin_rotli'
          ? 'thin rotli'
          : rotiStyle === 'millet_rotlo'
          ? 'rotlo'
          : rotiStyle === 'thick_bhakhri'
          ? 'bhakhri'
          : 'medium roti';
      basePortionLabel = `${fmtQty(qty)} ${styleShort} (${Math.round(measuredGrams)}g)`;
      break;
    }
    case 'grams':
    default: {
      measuredGrams = round1(qty);
      const stateWord =
        effectiveBasis === 'cooked'
          ? ' cooked'
          : effectiveBasis === 'raw'
          ? ' raw'
          : '';
      basePortionLabel = `${measuredGrams}g${stateWord}`;
      break;
    }
  }

  let catalogReferenceGrams = measuredGrams;
  let rawEquivalentGrams: number | undefined;
  let cookedEquivalentGrams: number | undefined;

  if (hasRawCooked && food.isRaw) {
    const treatMeasuredAsCooked = effectiveBasis === 'cooked' || unit === 'roti';
    if (treatMeasuredAsCooked) {
      cookedEquivalentGrams = measuredGrams;
      rawEquivalentGrams = round1(measuredGrams / ratio);
      catalogReferenceGrams = rawEquivalentGrams;
    } else {
      rawEquivalentGrams = measuredGrams;
      cookedEquivalentGrams = round1(measuredGrams * ratio);
      catalogReferenceGrams = rawEquivalentGrams;
    }
  }

  const scale = baseServingGrams > 0 ? catalogReferenceGrams / baseServingGrams : 0;
  const fatAdd = estimateCookingFat(cookingFatKind, cookingFatGrams);

  const calories = Math.round(food.calories * scale + fatAdd.calories);
  const proteinG = round1(food.proteinG * scale);
  const carbsG = round1(food.carbsG * scale);
  const fatG = round1(food.fatG * scale + fatAdd.fatG);
  const fiberG = round1(food.fiberG * scale);
  const sugarG = food.sugarG !== undefined ? round1(food.sugarG * scale) : undefined;
  const sodiumMg = food.sodiumMg !== undefined ? Math.round(food.sodiumMg * scale) : undefined;
  const moistureG = food.moistureG !== undefined ? round1(food.moistureG * scale) : undefined;
  const micronutrients = scaleFoodMicronutrients(food, catalogReferenceGrams, baseServingGrams);

  const servingLabel = fatAdd.label
    ? `${basePortionLabel} + ${fatAdd.label}`.slice(0, 280)
    : basePortionLabel.slice(0, 280);

  const noteParts: string[] = [];
  if (food.ifctCode) {
    if (rawEquivalentGrams !== undefined && cookedEquivalentGrams !== undefined) {
      noteParts.push(
        `IFCT 2017 ${food.ifctCode}: ${rawEquivalentGrams}g raw ↔ ${cookedEquivalentGrams}g cooked (${round1(ratio)}×)`
      );
    } else {
      noteParts.push(`IFCT 2017 ${food.ifctCode} (${catalogReferenceGrams}g)`);
    }
  } else if (food.sourceCode && isLaboratoryPer100gFood(food)) {
    if (rawEquivalentGrams !== undefined && cookedEquivalentGrams !== undefined) {
      noteParts.push(
        `${food.sourceCode}: ${rawEquivalentGrams}g raw ↔ ${cookedEquivalentGrams}g cooked (${round1(ratio)}×)`
      );
    } else {
      noteParts.push(`${food.sourceCode} (${catalogReferenceGrams}g)`);
    }
  } else if (food.provenanceNote) {
    noteParts.push(food.provenanceNote);
  }
  if (fatAdd.label) {
    noteParts.push(`+${fatAdd.label} (${fatAdd.calories} kcal)`);
  }
  const nutritionNote = noteParts.length ? noteParts.join(' · ').slice(0, 295) : undefined;

  return {
    measuredGrams,
    catalogReferenceGrams,
    rawEquivalentGrams,
    cookedEquivalentGrams,
    addedFatGrams: fatAdd.grams,
    addedFatCalories: fatAdd.calories,
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    ...(sugarG !== undefined ? { sugarG } : {}),
    ...(sodiumMg !== undefined ? { sodiumMg } : {}),
    ...(moistureG !== undefined ? { moistureG } : {}),
    ...(micronutrients ? { micronutrients } : {}),
    servingLabel,
    ...(nutritionNote ? { nutritionNote } : {}),
  };
}

export function getEffectiveWorldRegion(food: FoodItem): WorldRegionId {
  if (food.worldRegion) return food.worldRegion;
  if (
    food.cuisineTag === 'gujarati' ||
    food.cuisineTag === 'indian' ||
    food.source === 'ifct2017' ||
    food.tags.includes('indian') ||
    food.tags.includes('south indian') ||
    food.id.startsWith('food-guj-') ||
    food.id.startsWith('food-ind-') ||
    [
      'food-poha',
      'food-idli',
      'food-moong-chilla',
      'food-paneer-tikka',
      'food-dal-tadka',
      'food-roti',
      'food-rajma-chawal',
      'food-chole',
      'food-khichdi',
      'food-palak-paneer',
      'food-soya-chunks',
      'food-makhana',
      'food-sprouts',
    ].includes(food.id)
  ) {
    return 'south-asia';
  }
  return 'global';
}

export function getEffectiveEdibleCategory(food: FoodItem): EdibleCategoryId {
  if (food.edibleCategory) return food.edibleCategory;
  if (food.id === 'food-eggs' || food.id === 'food-egg-whites') return 'eggs';
  if (food.id === 'food-banana' || food.id === 'food-apple') return 'fruits-berries';
  if (food.id === 'food-almonds' || food.id === 'food-peanut-butter' || food.id === 'food-makhana') {
    return 'nuts-seeds';
  }
  if (food.id === 'food-greek-yogurt' || food.id === 'food-guj-chaas') return 'dairy-cheeses';
  if (food.id === 'food-chicken-breast') return 'poultry-fowl';
  if (food.id === 'food-salmon') return 'fish-seafood';
  if (food.id === 'food-sweet-potato') return 'roots-tubers';
  if (food.id === 'food-black-coffee' || food.id === 'food-whey-shake') return 'beverages-infusions';
  if (food.id === 'food-roti' || food.id.includes('rotli') || food.id.includes('rotlo') || food.id.includes('bhakhri')) {
    return 'grains-cereals';
  }
  return 'prepared-dishes';
}

export function getEffectiveDietaryFlags(food: FoodItem): FoodDietaryFlag[] {
  if (food.dietaryFlags) return food.dietaryFlags;
  const out: FoodDietaryFlag[] = [];
  const low = `${food.name} ${food.tags.join(' ')}`.toLowerCase();
  const hasMeat = /\b(chicken|beef|pork|lamb|mutton|fish|salmon|prawn|shrimp)\b/.test(low);
  const hasEgg = /\b(egg|omelette)\b/.test(low);
  const hasDairy = /\b(milk|yogurt|curd|dahi|chaas|paneer|cheese|ghee|whey|kadhi|shrikhand)\b/.test(low);
  if (!hasMeat && !hasEgg) {
    out.push('vegetarian');
    if (!hasDairy) out.push('vegan', 'dairy-free');
  } else if (!hasMeat && hasEgg) {
    out.push('eggetarian');
  } else if (/\b(salmon|fish)\b/.test(low)) {
    out.push('pescatarian');
  }
  if (food.proteinG >= 15) out.push('high-protein');
  if (food.fiberG >= 6) out.push('high-fiber');
  return out;
}

const searchTextCache = new WeakMap<FoodItem, string>();

export function foodSearchText(food: FoodItem): string {
  const cached = searchTextCache.get(food);
  if (cached !== undefined) return cached;
  const region = getEffectiveWorldRegion(food);
  const cat = getEffectiveEdibleCategory(food);
  const countryTerms = (food.countryCodes ?? [])
    .map((c) => COUNTRY_SEARCH_TERMS[c]?.terms ?? c)
    .join(' ');
  const text = [
    food.name,
    food.servingLabel,
    food.ifctCode ?? '',
    food.sourceCode ?? '',
    food.ifctGroup ?? '',
    food.scientificName ?? '',
    food.originLabel ?? '',
    WORLD_REGION_MAP[region]?.label ?? '',
    EDIBLE_CATEGORY_MAP[cat]?.label ?? '',
    countryTerms,
    ...(food.aliases ?? []),
    ...food.tags,
  ]
    .join(' ')
    .toLowerCase();
  searchTextCache.set(food, text);
  return text;
}

export type CatalogScopeFilter =
  | 'all'
  | 'curated'
  | 'world-atlas'
  | 'gujarati'
  | 'ifct'
  | 'global-lab';

export function filterAndRankFoods(
  catalog: FoodItem[],
  options: {
    query: string;
    scope: CatalogScopeFilter;
    ifctGroup?: string;
    worldRegion?: WorldRegionId | 'all';
    edibleCategory?: EdibleCategoryId | 'all';
    dietaryFlag?: FoodDietaryFlag | 'all';
    preferredCategory?: MealCategory;
  }
): FoodItem[] {
  const q = options.query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  const filtered = catalog.filter((food) => {
    const isLab = isLaboratoryPer100gFood(food);
    if (options.scope === 'curated' && isLab) return false;
    if (options.scope === 'world-atlas' && food.source !== 'fitlife-global-dish') return false;
    if (options.scope === 'ifct' && food.source !== 'ifct2017') return false;
    if (
      options.scope === 'global-lab' &&
      food.source !== 'usda-sr28' &&
      food.source !== 'taco-brazil' &&
      food.source !== 'ciqual-france'
    ) {
      return false;
    }
    if (
      options.scope === 'gujarati' &&
      food.cuisineTag !== 'gujarati' &&
      !food.tags.includes('gujarati')
    ) {
      return false;
    }
    if (options.ifctGroup && options.ifctGroup !== 'all') {
      if (food.ifctGroup !== options.ifctGroup) return false;
    }
    if (options.worldRegion && options.worldRegion !== 'all') {
      if (getEffectiveWorldRegion(food) !== options.worldRegion) return false;
    }
    if (options.edibleCategory && options.edibleCategory !== 'all') {
      if (getEffectiveEdibleCategory(food) !== options.edibleCategory) return false;
    }
    if (options.dietaryFlag && options.dietaryFlag !== 'all') {
      if (!getEffectiveDietaryFlags(food).includes(options.dietaryFlag)) return false;
    }
    if (tokens.length === 0) return true;
    const hay = foodSearchText(food);
    return tokens.every((tok) => hay.includes(tok));
  });

  if (tokens.length === 0) {
    return [...filtered].sort((a, b) => {
      const aLab = isLaboratoryPer100gFood(a) ? 1 : 0;
      const bLab = isLaboratoryPer100gFood(b) ? 1 : 0;
      if (aLab !== bLab) return aLab - bLab;
      if (options.preferredCategory) {
        const aCat = a.defaultCategory === options.preferredCategory ? 0 : 1;
        const bCat = b.defaultCategory === options.preferredCategory ? 0 : 1;
        if (aCat !== bCat) return aCat - bCat;
      }
      return 0;
    });
  }

  const exactCodeMatch = (food: FoodItem): boolean => {
    const ic = (food.ifctCode ?? '').toLowerCase();
    const sc = (food.sourceCode ?? '').toLowerCase();
    const idLow = food.id.toLowerCase();
    return ic === q || sc === q || idLow === q;
  };

  const scoreFood = (food: FoodItem): number => {
    const nameLower = food.name.toLowerCase();
    const aliasesLower = (food.aliases ?? []).map((a) => a.toLowerCase());
    let score = 0;
    if (exactCodeMatch(food)) score += 600;
    if (!isLaboratoryPer100gFood(food) && options.scope !== 'ifct' && options.scope !== 'global-lab') {
      score += 320;
    }
    if (nameLower === q) score += 160;
    if (aliasesLower.includes(q)) score += 140;
    if (nameLower.startsWith(q)) score += 90;
    if (aliasesLower.some((a) => a.startsWith(q))) score += 75;
    if (nameLower.includes(q)) score += 45;
    if (options.preferredCategory && food.defaultCategory === options.preferredCategory) {
      score += 5;
    }
    return score;
  };

  const preferReadyFirst = options.scope !== 'ifct' && options.scope !== 'global-lab';

  return [...filtered].sort((a, b) => {
    const aCode = exactCodeMatch(a) ? 1 : 0;
    const bCode = exactCodeMatch(b) ? 1 : 0;
    if (aCode !== bCode) return bCode - aCode;
    if (preferReadyFirst) {
      const aLab = isLaboratoryPer100gFood(a) ? 1 : 0;
      const bLab = isLaboratoryPer100gFood(b) ? 1 : 0;
      if (aLab !== bLab) return aLab - bLab;
    }
    return scoreFood(b) - scoreFood(a);
  });
}

export interface RecipeNutritionSummary {
  batchCalories: number;
  batchProteinG: number;
  batchCarbsG: number;
  batchFatG: number;
  batchFiberG: number;
  batchSugarG?: number;
  batchSodiumMg?: number;
  addedFatCalories: number;
  addedFatGrams: number;
  perServingCalories: number;
  perServingProteinG: number;
  perServingCarbsG: number;
  perServingFatG: number;
  perServingFiberG: number;
  perServingSugarG?: number;
  perServingSodiumMg?: number;
}

export function computeRecipeNutrition(
  recipe: Pick<
    CustomRecipe,
    'ingredients' | 'servingsYield' | 'cookingFatType' | 'cookingFatGrams'
  >
): RecipeNutritionSummary {
  const yieldCount =
    Number.isFinite(recipe.servingsYield) && recipe.servingsYield >= 0.1
      ? recipe.servingsYield
      : 1;
  const fatKind: CookingFatKind =
    recipe.cookingFatType === 'ghee'
      ? 'ghee'
      : recipe.cookingFatType === 'oil'
      ? 'oil'
      : 'none';
  const fatAdd = estimateCookingFat(fatKind, recipe.cookingFatGrams ?? 0);

  let cals = fatAdd.calories;
  let prot = 0;
  let carbs = 0;
  let fat = fatAdd.fatG;
  let fiber = 0;
  let sugar = 0;
  let hasSugar = false;
  let sodium = 0;
  let hasSodium = false;

  for (const ing of recipe.ingredients) {
    cals += ing.calories;
    prot += ing.proteinG;
    carbs += ing.carbsG;
    fat += ing.fatG;
    fiber += ing.fiberG;
    if (ing.sugarG !== undefined) {
      sugar += ing.sugarG;
      hasSugar = true;
    }
    if (ing.sodiumMg !== undefined) {
      sodium += ing.sodiumMg;
      hasSodium = true;
    }
  }

  return {
    batchCalories: Math.round(cals),
    batchProteinG: round1(prot),
    batchCarbsG: round1(carbs),
    batchFatG: round1(fat),
    batchFiberG: round1(fiber),
    ...(hasSugar ? { batchSugarG: round1(sugar) } : {}),
    ...(hasSodium ? { batchSodiumMg: Math.round(sodium) } : {}),
    addedFatCalories: fatAdd.calories,
    addedFatGrams: fatAdd.grams,
    perServingCalories: Math.round(cals / yieldCount),
    perServingProteinG: round1(prot / yieldCount),
    perServingCarbsG: round1(carbs / yieldCount),
    perServingFatG: round1(fat / yieldCount),
    perServingFiberG: round1(fiber / yieldCount),
    ...(hasSugar ? { perServingSugarG: round1(sugar / yieldCount) } : {}),
    ...(hasSodium ? { perServingSodiumMg: Math.round(sodium / yieldCount) } : {}),
  };
}

export function buildMealFromRecipe(
  recipe: CustomRecipe,
  options: {
    category: MealCategory;
    servings?: number;
    cookedGrams?: number;
  }
): Omit<LoggedMeal, 'id' | 'dateKey' | 'timestamp'> {
  const summary = computeRecipeNutrition(recipe);
  const yieldCount = recipe.servingsYield >= 0.1 ? recipe.servingsYield : 1;

  let fractionOfBatch = 1 / yieldCount;
  let servingLabel = `1 ${recipe.servingUnitLabel}`;

  if (
    options.cookedGrams &&
    options.cookedGrams > 0 &&
    recipe.cookedWeightG &&
    recipe.cookedWeightG > 0
  ) {
    fractionOfBatch = options.cookedGrams / recipe.cookedWeightG;
    const approxServings = round1(fractionOfBatch * yieldCount);
    servingLabel = `${round1(options.cookedGrams)}g cooked (≈ ${approxServings} ${recipe.servingUnitLabel})`;
  } else {
    const servings =
      options.servings && options.servings > 0 ? round1(options.servings) : 1;
    fractionOfBatch = servings / yieldCount;
    const perServingCookedG =
      recipe.cookedWeightG && recipe.cookedWeightG > 0
        ? Math.round((recipe.cookedWeightG / yieldCount) * servings)
        : undefined;
    servingLabel = perServingCookedG
      ? `${servings} ${recipe.servingUnitLabel} (${perServingCookedG}g)`
      : `${servings} ${recipe.servingUnitLabel}`;
  }

  const noteBase = `Custom recipe (${recipe.ingredients.length} ingredients${
    summary.addedFatGrams > 0 ? ` + ${summary.addedFatGrams}g ${recipe.cookingFatType}` : ''
  }, batch of ${recipe.servingsYield} ${recipe.servingUnitLabel})`;

  return {
    name: recipe.name,
    servingLabel: servingLabel.slice(0, 280),
    category: options.category,
    calories: Math.round(summary.batchCalories * fractionOfBatch),
    proteinG: round1(summary.batchProteinG * fractionOfBatch),
    carbsG: round1(summary.batchCarbsG * fractionOfBatch),
    fatG: round1(summary.batchFatG * fractionOfBatch),
    fiberG: round1(summary.batchFiberG * fractionOfBatch),
    ...(summary.batchSugarG !== undefined
      ? { sugarG: round1(summary.batchSugarG * fractionOfBatch) }
      : {}),
    ...(summary.batchSodiumMg !== undefined
      ? { sodiumMg: Math.round(summary.batchSodiumMg * fractionOfBatch) }
      : {}),
    nutritionNote: (recipe.notes ? `${noteBase} · ${recipe.notes}` : noteBase).slice(0, 295),
  };
}

export function buildIngredientFromPortion(
  id: string,
  food: FoodItem,
  portion: PortionCalculationResult,
  basis: WeightBasis
): RecipeIngredient {
  return {
    id,
    name: food.name,
    foodId: food.id,
    amountLabel: portion.servingLabel,
    grams: portion.measuredGrams,
    basis,
    calories: portion.calories,
    proteinG: portion.proteinG,
    carbsG: portion.carbsG,
    fatG: portion.fatG,
    fiberG: portion.fiberG,
    ...(portion.sugarG !== undefined ? { sugarG: portion.sugarG } : {}),
    ...(portion.sodiumMg !== undefined ? { sodiumMg: portion.sodiumMg } : {}),
  };
}
