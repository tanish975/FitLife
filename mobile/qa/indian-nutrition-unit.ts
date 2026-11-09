import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });

import legacyFoods from './legacy-foods.json';
import {
  CURATED_FOOD_CATALOG,
  FOOD_CATALOG,
  INDIAN_FOOD_CATALOG,
  ORIGINAL_FOOD_CATALOG,
} from '../src/data/FoodCatalog';
import { CURATED_INDIAN_FOODS } from '../src/data/CuratedIndianFoods';
import { IFCT_CATALOG, IFCT_GROUPS } from '../src/data/IfctCatalog';
import { WORLD_CULINARY_ATLAS } from '../src/data/WorldCulinaryAtlas';
import { GLOBAL_LAB_FOOD_CATALOG } from '../src/data/FitLifeFoodDb';
import {
  buildIngredientFromPortion,
  buildMealFromRecipe,
  computePortionNutrition,
  computeRecipeNutrition,
  estimateCookingFat,
  filterAndRankFoods,
} from '../src/domain/IndianNutrition';
import { parseMealFreeText } from '../src/domain/MealTextParser';
import {
  mergePersonalSettings,
  validCustomRecipe,
  validPersonalSettings,
  type CustomRecipe,
} from '../src/domain/PersonalFeatures';
import { decryptBackup, encryptBackup, validSnapshot } from '../src/domain/EncryptedBackup';
import { emptyDeletions, mergeCloud, validCloudPayload } from '../src/domain/CloudSync';
import { NATURAL_PALETTES, type PaletteId } from '../src/domain/ThemePalettes';

// 1. Legacy catalog byte-for-field preservation
assert.deepEqual(
  ORIGINAL_FOOD_CATALOG,
  legacyFoods,
  'all 32 original catalog items remain byte-for-field identical'
);
assert.equal(ORIGINAL_FOOD_CATALOG.length, 32);
assert.equal(CURATED_INDIAN_FOODS.length, 36);
assert.equal(CURATED_FOOD_CATALOG.length, 68);
assert.equal(IFCT_CATALOG.length, 542);
assert.equal(IFCT_GROUPS.length, 20);
assert.equal(INDIAN_FOOD_CATALOG.length, 610);
assert.equal(
  FOOD_CATALOG.length,
  CURATED_FOOD_CATALOG.length +
    WORLD_CULINARY_ATLAS.length +
    IFCT_CATALOG.length +
    GLOBAL_LAB_FOOD_CATALOG.length
);
assert.equal(
  new Set(FOOD_CATALOG.map((f) => f.id)).size,
  FOOD_CATALOG.length,
  'every food ID is globally unique'
);

const getFood = (id: string) => {
  const item = FOOD_CATALOG.find((f) => f.id === id);
  assert(item, `missing food ${id}`);
  return item;
};

// 2. IFCT 2017 conversion & Table T lipid energy verification
const atta = getFood('ifct-a019');
assert.equal(atta.ifctCode, 'A019');
assert.equal(atta.calories, 320.3);
assert.equal(atta.proteinG, 10.6);
assert.equal(atta.fiberG, 11.4);
assert.equal(atta.isRaw, true);

const rawRice = getFood('ifct-a015');
assert.equal(rawRice.calories, 356.4);
assert.equal(rawRice.carbsG, 78.2);

const toorDal = getFood('ifct-b021');
assert.equal(toorDal.calories, 330.8);
assert.equal(toorDal.proteinG, 21.7);

const rawEgg = getFood('ifct-m001');
assert.equal(rawEgg.sodiumMg, 123, 'IFCT sodium g/100g converted to mg/100g');

const cowMilk = getFood('ifct-l002');
assert.equal(cowMilk.sodiumMg, 25.5);

// All 14 IFCT Table T oils & fats must derive ~900 kcal/100g (never 0 kcal!)
const tableTFoods = IFCT_CATALOG.filter((f) => f.ifctCode?.startsWith('T'));
assert.equal(tableTFoods.length, 14);
for (const fatItem of tableTFoods) {
  assert(
    fatItem.calories >= 899 && fatItem.calories <= 901,
    `Table T ${fatItem.ifctCode} must not have 0 kcal: got ${fatItem.calories}`
  );
  assert(fatItem.provenanceNote?.includes('Table T'));
}
assert.equal(getFood('ifct-t013').name, 'Ghee');
assert.equal(getFood('ifct-t005').name, 'Groundnut oil');

// 3. Vernacular & code discovery + curated-first ranking
const paneerAll = filterAndRankFoods(FOOD_CATALOG, {
  query: 'paneer',
  scope: 'all',
  preferredCategory: 'Breakfast',
});
assert.equal(paneerAll.length, 5, '3 legacy + Paneer Paratha + IFCT L003 Paneer');
assert.notEqual(
  paneerAll[0].source,
  'ifct2017',
  'curated ready-to-eat paneer dishes rank ahead of raw 100g IFCT reference in default scope'
);
assert(paneerAll.some((f) => f.id === 'ifct-l003'));

const byCode = filterAndRankFoods(FOOD_CATALOG, { query: 'l003', scope: 'all' });
assert.equal(byCode[0]?.id, 'ifct-l003', 'exact IFCT code ranks #1');

for (const [term, expectedId] of [
  ['bajri', 'food-guj-bajri-rotlo'],
  ['paunva', 'ifct-a011'],
  ['mamra', 'food-guj-vagharela-mamra'],
  ['bavato', 'ifct-a010'],
  ['rajagaro', 'ifct-a001'],
  ['tuver dal', 'food-guj-tuver-dal'],
  ['singtel', 'ifct-t005'],
  ['gol', 'ifct-i001'],
  ['undhiyu', 'food-guj-undhiyu'],
  ['khaman', 'food-guj-khaman-dhokla'],
  ['handvo', 'food-guj-handvo'],
  ['thepla', 'food-guj-methi-thepla'],
] as const) {
  const hits = filterAndRankFoods(FOOD_CATALOG, { query: term, scope: 'all' });
  assert(
    hits.some((h) => h.id === expectedId),
    `query "${term}" must discover ${expectedId}`
  );
}

// 4. Raw vs Cooked & Household Portions (katori, glass, tbsp, tsp, roti)
const cookedRiceKatori = computePortionNutrition({
  food: rawRice,
  unit: 'katori',
  katoriSize: 'medium',
  quantity: 1,
  basis: 'cooked', // 150g cooked / 3.0 = 50g raw rice
});
assert.equal(cookedRiceKatori.measuredGrams, 150);
assert.equal(cookedRiceKatori.rawEquivalentGrams, 50);
assert.equal(cookedRiceKatori.calories, 178);

const rawRice150g = computePortionNutrition({
  food: rawRice,
  unit: 'grams',
  quantity: 150,
  basis: 'raw',
});
assert.equal(rawRice150g.rawEquivalentGrams, 150);
assert.equal(rawRice150g.cookedEquivalentGrams, 450);
assert.equal(rawRice150g.calories, 535);

// Toor dal cooked katori + 1 tsp ghee tadka
const dalWithGhee = computePortionNutrition({
  food: toorDal,
  unit: 'katori',
  katoriSize: 'medium',
  quantity: 1,
  basis: 'cooked', // 150g / 3.75 = 40g raw dal (132.3 kcal) + 4.5g ghee (41 kcal) = 173 kcal
  cookingFatKind: 'ghee',
  cookingFatGrams: 4.5,
});
assert.equal(dalWithGhee.rawEquivalentGrams, 40);
assert.equal(dalWithGhee.addedFatCalories, 41);
assert.equal(dalWithGhee.calories, 173);
assert(dalWithGhee.servingLabel.includes('1 tsp ghee'));

// Roti unit from raw IFCT atta (1 thin Gujarati rotli = 28g cooked / 1.45 = 19.3g raw atta)
const thinRotliFromAtta = computePortionNutrition({
  food: atta,
  unit: 'roti',
  rotiStyle: 'thin_rotli',
  quantity: 2,
  basis: 'cooked',
  cookingFatKind: 'ghee',
  cookingFatGrams: 2.25, // 0.5 tsp total
});
assert.equal(thinRotliFromAtta.measuredGrams, 56);
assert.equal(thinRotliFromAtta.rawEquivalentGrams, 38.6);
assert(thinRotliFromAtta.calories > 140 && thinRotliFromAtta.calories < 150);

// Glass of chaas (tall 250ml vs standard 200ml)
const tallChaas = computePortionNutrition({
  food: getFood('food-guj-chaas'),
  unit: 'glass',
  glassSize: 'tall',
  quantity: 1,
});
assert.equal(tallChaas.measuredGrams, 250);
assert.equal(tallChaas.calories, 48);

// Tablespoon & teaspoon of pure IFCT Ghee
const tbspGhee = computePortionNutrition({
  food: getFood('ifct-t013'),
  unit: 'tbsp',
  quantity: 1,
});
assert.equal(tbspGhee.measuredGrams, 13.5);
assert.equal(tbspGhee.calories, 122);
assert.equal(estimateCookingFat('groundnut_oil', 9).calories, 81);

// 5. Quick-Add Free-Text Parser: new household units + strict ambiguity guard
const quickDal = parseMealFreeText('1 katori gujarati dal and 2 thin gujarati rotli', 'Lunch');
assert.equal(quickDal.length, 2);
assert.equal(quickDal[0].requiresReview, false);
assert.equal(quickDal[0].calories, 144);
assert.equal(quickDal[1].requiresReview, false);
assert.equal(quickDal[1].calories, 126);

const quickChaas = parseMealFreeText('2 glasses masala chaas with 1 tsp ghee', 'Lunch');
assert.equal(quickChaas.length, 2);
assert.equal(quickChaas[0].calories, 76);
assert.equal(quickChaas[1].calories, 41);

const explicitRawDal = parseMealFreeText('100g raw toor dal', 'Lunch');
assert.equal(explicitRawDal[0].requiresReview, false);
assert.equal(explicitRawDal[0].calories, 331);

for (const stillAmbiguous of [
  '100g toor dal',
  '150g white rice',
  'paneer',
  'spinach',
  '1 katori dal',
  '1 paratha',
]) {
  const parsed = parseMealFreeText(stillAmbiguous, 'Lunch');
  assert.equal(parsed.length, 1, stillAmbiguous);
  assert.equal(parsed[0].requiresReview, true, `${stillAmbiguous} must require review`);
  assert.equal(parsed[0].calories, 0, `${stillAmbiguous} must not invent calories`);
}

// 6. Custom Recipes: calculation, validation, LWW tombstone sync & encrypted backup
const ingDal = buildIngredientFromPortion(
  'ing-dal',
  toorDal,
  computePortionNutrition({ food: toorDal, unit: 'grams', quantity: 100, basis: 'raw' }),
  'raw'
);
const ingGol = buildIngredientFromPortion(
  'ing-gol',
  getFood('ifct-i001'),
  computePortionNutrition({
    food: getFood('ifct-i001'),
    unit: 'grams',
    quantity: 15,
    basis: 'as_served',
  }),
  'as_served'
);

const sampleRecipe: CustomRecipe = {
  id: 'recipe-gujarati-dal',
  updatedAt: 1000,
  deleted: false,
  name: 'Homemade Gujarati Tuver Dal',
  defaultCategory: 'Lunch',
  servingsYield: 4,
  servingUnitLabel: 'katori',
  cookedWeightG: 600,
  cookingFatType: 'oil',
  cookingFatGrams: 13.5, // 1 tbsp groundnut oil for whole pot
  notes: 'Homestyle 3 whistles',
  ingredients: [ingDal, ingGol],
};

assert(validCustomRecipe(sampleRecipe));
assert(!validCustomRecipe({ ...sampleRecipe, id: '../bad' }));
assert(!validCustomRecipe({ ...sampleRecipe, ingredients: [] }));

const recipeSummary = computeRecipeNutrition(sampleRecipe);
// 331 (dal) + 53 (gol) + 122 (13.5g oil) = 506 batch kcal -> 127 kcal per katori
assert.equal(recipeSummary.batchCalories, 506);
assert.equal(recipeSummary.perServingCalories, 127);

const oneKatoriMeal = buildMealFromRecipe(sampleRecipe, { category: 'Lunch', servings: 1 });
assert.equal(oneKatoriMeal.calories, 127);
assert(oneKatoriMeal.servingLabel.includes('150g'));

const halfPotByGrams = buildMealFromRecipe(sampleRecipe, {
  category: 'Dinner',
  cookedGrams: 300,
});
assert.equal(halfPotByGrams.calories, 253);

// Multi-device LWW sync & tombstone retention + backup round-trip
const baseSettings: any = {
  weightUnit: 'kg',
  hapticsEnabled: true,
  firebaseProjectId: '',
  themeMode: 'light',
  paletteId: 'matcha_oat',
  cornerStyle: 'organic',
  motionStyle: 'spring',
  densityStyle: 'comfortable',
  defaultRestSeconds: 75,
  autoStartRest: true,
  weeklyWorkoutGoal: 4,
  favoriteExerciseIds: [],
  navStyle: 'solid',
  waterGoalMl: 2500,
  dashboardWidgets: {
    showMacros: true,
    showHydration: true,
    showMood: true,
    showAiCoach: true,
    showActivityFeed: true,
  },
};

const devASettings = { ...baseSettings, customRecipes: [sampleRecipe] };
const devBSettings = {
  ...baseSettings,
  customRecipes: [{ ...sampleRecipe, deleted: true, updatedAt: 2000 }],
};
assert(validPersonalSettings(devASettings));
const mergedSettings = mergePersonalSettings(baseSettings, [devASettings, devBSettings]);
assert.equal(
  mergedSettings.customRecipes?.[0].deleted,
  true,
  'recipe deletion tombstone beats stale snapshot'
);

const profile: any = {
  name: 'Vadodara Athlete',
  email: 'athlete@example.test',
  sex: 'female',
  age: 29,
  heightCm: 164,
  weightKg: 61,
  goal: 'maintain',
  activityLevel: 'moderate',
  onboarded: true,
};

const snapA: any = {
  schema: 1,
  createdAt: 100,
  profile,
  settings: devASettings,
  meals: [{ ...oneKatoriMeal, id: 'meal-1', dateKey: '2026-11-09', timestamp: 100 }],
  workouts: [],
  weights: [],
  moods: [],
  water: { dateKey: '2026-11-09', amountMl: 500 },
};
const snapB: any = { ...snapA, settings: devBSettings };

assert(validSnapshot(snapA));
assert(validCloudPayload({ schema: 1, snapshot: snapA, deleted: emptyDeletions() }));

const cloudMerged = await mergeCloud(
  { schema: 1, snapshot: snapA, deleted: emptyDeletions() },
  [{ schema: 1, snapshot: snapB, deleted: emptyDeletions() }]
);
assert.equal(cloudMerged.snapshot.settings.customRecipes?.[0].deleted, true);

const encrypted = await encryptBackup(snapA, 'strong-gujarati-thali-passphrase');
const decrypted = await decryptBackup(encrypted, 'strong-gujarati-thali-passphrase');
assert.equal(decrypted.settings.customRecipes?.length, 1);
assert.equal(decrypted.settings.customRecipes?.[0].name, 'Homemade Gujarati Tuver Dal');
assert.equal(decrypted.meals[0].calories, 127);

// 7. Built CSS zero-gradient check & standalone HTML IFCT license check
const distAssets = resolve(process.cwd(), 'dist/assets');
for (const file of readdirSync(distAssets)) {
  if (file.endsWith('.css')) {
    const css = readFileSync(resolve(distAssets, file), 'utf8');
    assert(!css.includes('gradient('), `CSS file ${file} must contain zero gradients`);
  }
}
const standaloneHtml = readFileSync(resolve(process.cwd(), '../FitLife-App.html'), 'utf8');
assert(
  standaloneHtml.includes('Indian Food Composition Tables (IFCT 2017)'),
  'Standalone HTML embeds ICMR-NIN IFCT 2017 attribution'
);
assert(standaloneHtml.includes("script-src 'self' 'sha256-"), 'Standalone CSP hash intact');

// 8. WCAG 2.1 AA contrast verification (>= 4.5:1) across all 5 palettes in light & dark modes
function hexToLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const nums = [0, 2, 4].map((idx) => parseInt(clean.slice(idx, idx + 2), 16) / 255);
  const [r, g, b] = nums.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = hexToLuminance(fg);
  const l2 = hexToLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const tokenPairs: Array<[keyof typeof NATURAL_PALETTES.matcha_oat.light, keyof typeof NATURAL_PALETTES.matcha_oat.light, string]> = [
  ['textPrimary', 'bgCard', 'textPrimary on bgCard'],
  ['textSecondary', 'bgCard', 'textSecondary on bgCard'],
  ['textPrimary', 'bgBase', 'textPrimary on bgBase'],
  ['textSecondary', 'bgBase', 'textSecondary on bgBase'],
  ['accentPrimaryText', 'accentPrimarySoft', 'accentPrimaryText on accentPrimarySoft'],
  ['accentPrimaryText', 'bgCard', 'accentPrimaryText on bgCard'],
  ['accentPrimaryText', 'bgBase', 'accentPrimaryText on bgBase'],
  ['bgCard', 'accentPrimaryText', 'bgCard on accentPrimaryText (.portion-chip.active / .meal-editor-save)'],
  ['textPrimary', 'accentPrimarySoft', 'textPrimary on accentPrimarySoft (.portion-summary-card)'],
];

for (const paletteId of Object.keys(NATURAL_PALETTES) as PaletteId[]) {
  for (const mode of ['light', 'dark'] as const) {
    const colors = NATURAL_PALETTES[paletteId][mode];
    for (const [fgKey, bgKey, desc] of tokenPairs) {
      const ratio = contrastRatio(colors[fgKey], colors[bgKey]);
      assert(
        ratio >= 4.5,
        `WCAG AA contrast failure (${ratio.toFixed(2)}:1 < 4.5:1) for ${desc} in ${paletteId}/${mode} (${colors[fgKey]} on ${colors[bgKey]})`
      );
    }
  }
}

console.log(
  `PASS: 32 legacy + 36 curated Indian/Gujarati + 542 IFCT 2017 foods, katori/glass/tbsp/roti portions, raw-vs-cooked yields, oil/ghee estimation, custom recipes, cloud sync, encrypted backups, WCAG AA 10-theme contrast & standalone attribution`
);
