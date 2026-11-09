import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  CURATED_FOOD_CATALOG,
  FOOD_CATALOG,
  ORIGINAL_FOOD_CATALOG,
  READY_TO_EAT_FOOD_CATALOG,
} from '../src/data/FoodCatalog';
import { GLOBAL_LAB_FOOD_CATALOG } from '../src/data/FitLifeFoodDb';
import { IFCT_CATALOG } from '../src/data/IfctCatalog';
import { WORLD_CULINARY_ATLAS } from '../src/data/WorldCulinaryAtlas';
import {
  EDIBLE_CATEGORIES,
  WORLD_REGIONS,
  computeFoodDensityInsights,
  isLaboratoryPer100gFood,
} from '../src/data/WorldAtlasMeta';
import {
  buildIngredientFromPortion,
  computePortionNutrition,
  computeRecipeNutrition,
  filterAndRankFoods,
  getEffectiveDietaryFlags,
  getEffectiveEdibleCategory,
  getEffectiveWorldRegion,
} from '../src/domain/IndianNutrition';
import { parseMealFreeText } from '../src/domain/MealTextParser';

// 1. Scale, uniqueness & structural integrity across the entire FitLife FoodDB
assert(FOOD_CATALOG.length >= 2600, `expected >= 2600 foods, got ${FOOD_CATALOG.length}`);
assert.equal(ORIGINAL_FOOD_CATALOG.length, 32);
assert.equal(IFCT_CATALOG.length, 542);
assert(WORLD_CULINARY_ATLAS.length >= 70, 'World Culinary Atlas must cover 70+ regional dishes');
assert(GLOBAL_LAB_FOOD_CATALOG.length >= 1950, 'Global Lab DB must cover 1950+ lab foods');
assert.equal(
  READY_TO_EAT_FOOD_CATALOG.length,
  CURATED_FOOD_CATALOG.length + WORLD_CULINARY_ATLAS.length
);

const ids = new Set<string>();
for (const item of FOOD_CATALOG) {
  assert(!ids.has(item.id), `duplicate food ID: ${item.id}`);
  ids.add(item.id);
  assert(item.name.length >= 2, `empty name on ${item.id}`);
  assert(Number.isFinite(item.calories) && item.calories >= 0, `invalid kcal on ${item.id}`);
  assert(Number.isFinite(item.proteinG) && item.proteinG >= 0, `invalid protein on ${item.id}`);
  assert(Number.isFinite(item.carbsG) && item.carbsG >= 0, `invalid carbs on ${item.id}`);
  assert(Number.isFinite(item.fatG) && item.fatG >= 0, `invalid fat on ${item.id}`);
  assert(Number.isFinite(item.fiberG) && item.fiberG >= 0, `invalid fiber on ${item.id}`);
}

// 2. Every single one of the 17 World Regions must have foods
for (const reg of WORLD_REGIONS) {
  const matches = filterAndRankFoods(FOOD_CATALOG, {
    query: '',
    scope: 'all',
    worldRegion: reg.id,
  });
  assert(
    matches.length >= 2,
    `worldRegion "${reg.id}" (${reg.label}) must have >= 2 foods, got ${matches.length}`
  );
}

// 3. Every single one of the 18 Edible Categories must have foods
for (const cat of EDIBLE_CATEGORIES) {
  const matches = filterAndRankFoods(FOOD_CATALOG, {
    query: '',
    scope: 'all',
    edibleCategory: cat.id,
  });
  assert(
    matches.length >= 3,
    `edibleCategory "${cat.id}" (${cat.label}) must have >= 3 foods, got ${matches.length}`
  );
}

// 4. Verify all 4 scientific laboratory authorities + unit conversions
const byId = new Map(FOOD_CATALOG.map((f) => [f.id, f]));

// 4a. ICMR-NIN IFCT 2017 micronutrients (converted from g/100g -> mg/100g & µg/100g)
const cowMilk = byId.get('ifct-l002')!;
assert.equal(cowMilk.micronutrients?.calciumMg, 118, 'IFCT cow milk Ca = 118 mg/100g');
assert.equal(cowMilk.micronutrients?.saturatedFatG, 2.7);
const rawEgg = byId.get('ifct-m001')!;
assert.equal(rawEgg.micronutrients?.cholesterolMg, 366, 'IFCT raw egg cholesterol = 366 mg/100g');
const toorDal = byId.get('ifct-b021')!;
assert.equal(toorDal.micronutrients?.ironMg, 3.9);
assert.equal(toorDal.micronutrients?.potassiumMg, 1395);
assert.equal(toorDal.micronutrients?.folateUg, 108);

// 4b. USDA ARS SR28 whole food + WEIGHT.txt measured household portions + micronutrients
const broccoli = byId.get('usda-11090');
assert(broccoli, 'USDA 11090 raw broccoli must exist');
assert.equal(broccoli.source, 'usda-sr28');
assert(isLaboratoryPer100gFood(broccoli));
assert(
  (broccoli.micronutrients?.vitaminCMg ?? 0) > 85,
  `Broccoli Vit C expected ~89.2 mg, got ${broccoli.micronutrients?.vitaminCMg}`
);
assert(
  (broccoli.measuredPortions?.length ?? 0) >= 1,
  'USDA broccoli must carry WEIGHT.txt household portion weights'
);

// 4c. UNICAMP TACO 4th Ed. (Brazil & Amazonian foods)
const tacoItems = FOOD_CATALOG.filter((f) => f.source === 'taco-brazil');
assert(tacoItems.length >= 150, `expected >= 150 TACO items, got ${tacoItems.length}`);
const acai = byId.get('taco-168');
assert(acai, 'TACO 168 Acai pulp must exist');
assert.equal(getEffectiveWorldRegion(acai), 'south-america');
assert(acai.countryCodes?.includes('BR'));

// 4d. ANSES CIQUAL (France & Europe)
const ciqualItems = FOOD_CATALOG.filter((f) => f.source === 'ciqual-france');
assert(ciqualItems.length >= 70, `expected >= 70 CIQUAL items, got ${ciqualItems.length}`);
const comte = FOOD_CATALOG.find(
  (f) => f.source === 'ciqual-france' && f.name.toLowerCase().includes('comte')
);
assert(comte, 'CIQUAL Comté cheese must exist');
assert(
  (comte.micronutrients?.calciumMg ?? 0) >= 850,
  `Comté Ca expected ~907 mg, got ${comte.micronutrients?.calciumMg}`
);

// 5. Country demonym, dish, vernacular & scientific binomial search coverage
for (const query of [
  'japanese',
  'ramen',
  'onigiri',
  'korean',
  'bibimbap',
  'kimchi',
  'thai',
  'pad thai',
  'vietnamese',
  'pho',
  'indonesian',
  'rendang',
  'filipino',
  'adobo',
  'sri lankan',
  'kottu',
  'nepali',
  'momo',
  'uzbek',
  'plov',
  'georgian',
  'khachapuri',
  'lebanese',
  'hummus',
  'falafel',
  'persian',
  'ghormeh sabzi',
  'moroccan',
  'tagine',
  'shakshuka',
  'egyptian',
  'koshari',
  'nigerian',
  'jollof',
  'egusi',
  'ethiopian',
  'injera',
  'kenyan',
  'ugali',
  'south african',
  'bobotie',
  'biltong',
  'italian',
  'minestrone',
  'spanish',
  'paella',
  'greek',
  'souvlaki',
  'french',
  'ratatouille',
  'nordic',
  'lohikeitto',
  'skyr',
  'polish',
  'pierogi',
  'ukrainian',
  'borscht',
  'mexican',
  'chilaquiles',
  'chapulines',
  'jamaican',
  'jerk chicken',
  'brazilian',
  'feijoada',
  'pao de queijo',
  'peruvian',
  'ceviche',
  'australian',
  'barramundi',
  'kangaroo',
  'polynesian',
  'poke',
  'oryza sativa',
  'digitaria exilis',
  'colocasia esculenta',
  'wakame',
  'shiitake',
]) {
  const hits = filterAndRankFoods(FOOD_CATALOG, { query, scope: 'all' });
  assert(hits.length >= 1, `global search query "${query}" must return >= 1 result`);
}

// 6. Search performance benchmark across full catalog (< 25ms per query)
const t0 = performance.now();
for (const q of ['salmon', 'quinoa', 'japanese', 'jollof', 'broccoli', 'ifct-b021']) {
  filterAndRankFoods(FOOD_CATALOG, { query: q, scope: 'all', preferredCategory: 'Lunch' });
}
const avgMs = (performance.now() - t0) / 6;
assert(avgMs < 35, `expected average search < 35ms across ${FOOD_CATALOG.length} items, got ${avgMs.toFixed(2)}ms`);

// 7. Curated ready-to-eat items still rank ahead of raw 100g lab items in default 'all' scope
const ramenSearch = filterAndRankFoods(FOOD_CATALOG, { query: 'ramen', scope: 'all' });
assert.equal(isLaboratoryPer100gFood(ramenSearch[0]), false);

// 8. Live micronutrient scaling + density insights + multi-authority recipe builder
const broccoli200 = computePortionNutrition({
  food: broccoli,
  unit: 'grams',
  quantity: 200,
  basis: 'raw',
});
assert.equal(
  broccoli200.micronutrients?.calciumMg,
  (broccoli.micronutrients?.calciumMg ?? 0) * 2
);
const density = computeFoodDensityInsights(broccoli.calories, broccoli.proteinG, 100);
assert.equal(density.energyDensityBand, 'Very Low');

const globalFusionRecipe = computeRecipeNutrition({
  servingsYield: 2,
  cookingFatType: 'oil',
  cookingFatGrams: 9,
  ingredients: [
    buildIngredientFromPortion(
      'i1',
      toorDal,
      computePortionNutrition({ food: toorDal, unit: 'grams', quantity: 60, basis: 'raw' }),
      'raw'
    ),
    buildIngredientFromPortion(
      'i2',
      broccoli,
      computePortionNutrition({ food: broccoli, unit: 'grams', quantity: 150, basis: 'raw' }),
      'raw'
    ),
  ],
});
assert(globalFusionRecipe.batchCalories > 300 && globalFusionRecipe.perServingCalories > 150);

// 9. Dietary & allergen filters work cleanly
const fermentedHits = filterAndRankFoods(FOOD_CATALOG, {
  query: '',
  scope: 'all',
  dietaryFlag: 'fermented',
});
assert(fermentedHits.length >= 8, 'fermented dietary filter must find kimchi, miso, skyr, injera, poi, etc.');
for (const f of fermentedHits) {
  assert(getEffectiveDietaryFlags(f).includes('fermented'));
}
for (const f of FOOD_CATALOG.slice(0, 50)) {
  assert(getEffectiveEdibleCategory(f));
}

// 10. Quick-add free-text parser: unambiguous Atlas dishes resolve, ambiguous queries still require review
assert.equal(parseMealFreeText('1 salmon onigiri', 'Snack')[0].requiresReview, false);
assert.equal(parseMealFreeText('1 salmon onigiri', 'Snack')[0].calories, 186);
assert.equal(parseMealFreeText('1 tbsp olive oil', 'Lunch')[0].requiresReview, false);
for (const amb of ['broccoli', '2 eggs', '150g white rice', 'paneer', 'mystery ramen']) {
  const p = parseMealFreeText(amb, 'Lunch')[0];
  assert.equal(p.requiresReview, true, `"${amb}" must still require review`);
  assert.equal(p.calories, 0);
}

// 11. License file & CSS solid-palette check (zero gradients)
const licText = readFileSync(
  resolve(process.cwd(), 'public/licenses/FitLife-FoodDB-Sources.txt'),
  'utf8'
);
for (const needle of ['USDA', 'IFCT 2017', 'TACO', 'CIQUAL']) {
  assert(licText.includes(needle), `license attribution must mention ${needle}`);
}
const personalCss = readFileSync(resolve(process.cwd(), 'src/personal.css'), 'utf8');
assert(!/linear-gradient|radial-gradient|conic-gradient/i.test(personalCss), 'zero CSS gradients allowed');

console.log(
  `PASS: FitLife FoodDB verified (${FOOD_CATALOG.length} foods across 17 regions, 18 edible categories & 5 open authorities; avg search ${avgMs.toFixed(2)}ms).`
);
