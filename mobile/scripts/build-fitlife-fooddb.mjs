import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tsvPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : join(root, 'scripts/data/fitlife-global-lab-foods.tsv');
const outPath = join(root, 'src/data/FitLifeFoodDb.ts');

const DIET_FLAG_LIST = [
  'vegan',
  'vegetarian',
  'eggetarian',
  'pescatarian',
  'gluten-free',
  'dairy-free',
  'high-protein',
  'high-fiber',
  'fermented',
];

const ALLERGEN_FLAG_LIST = [
  'milk',
  'egg',
  'fish',
  'shellfish',
  'tree-nut',
  'peanut',
  'wheat-gluten',
  'soy',
  'sesame',
];

const MEAL_CATS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const PREP_PROFILES = [
  'cooked_dish',
  'raw_rice_grain',
  'raw_dal',
  'raw_whole_legume',
  'raw_poha',
  'raw_flour_roti',
  'raw_semolina_dalia',
  'raw_vegetable_tuber',
  'raw_meat_seafood',
  'liquid_dairy_beverage',
  'cooking_fat_oil',
  'ready_to_eat',
];
const EDIBLE_STATES = [
  'raw',
  'cooked',
  'steamed-boiled',
  'roasted-grilled',
  'fried',
  'fermented',
  'dried',
  'ready-to-eat',
];

function parseTsv(text) {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.length > 0 && !l.startsWith('#'));
  const headers = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const vals = line.split('\t');
    const obj = {};
    for (let i = 0; i < headers.length; i += 1) {
      obj[headers[i]] = (vals[i] ?? '').trim();
    }
    return obj;
  });
}

function classifyPrepAndState(row) {
  const low = row.name.toLowerCase();
  const cat = row.cat;

  let state = 'ready-to-eat';
  if (/\b(fermented|miso|natto|tempeh|kimchi|sauerkraut|choucroute|kefir|tucupi)\b/.test(low)) {
    state = 'fermented';
  } else if (/\b(dried|dry|carne-seca|dehydrated)\b/.test(low)) {
    state = 'dried';
  } else if (/\b(fried|frit[oa]?)\b/.test(low)) {
    state = 'fried';
  } else if (/\b(roasted|grilled|broiled|baked|assad[oa]?|grelhad[oa]?)\b/.test(low)) {
    state = 'roasted-grilled';
  } else if (/\b(boiled|steamed|poached|cozid[oa]?)\b/.test(low)) {
    state = 'steamed-boiled';
  } else if (/\b(cooked|stewed|braised)\b/.test(low)) {
    state = 'cooked';
  } else if (/\b(raw|uncooked|cru[a]?|crue?)\b/.test(low)) {
    state = 'raw';
  } else if (
    cat === 'grains-cereals' &&
    !/\b(bread|baguette|pain |tortilla|pita|bagel|focaccia|ciabatta|croissant|brioche|phyllo|galette|crêpe|cuscuz|canjica|pamonha|pão)\b/.test(
      low
    )
  ) {
    state = 'raw';
  } else if (
    cat === 'legumes-pulses' &&
    !/\b(tofu|tempeh|miso|natto|hummus|sprouted|prepared)\b/.test(low)
  ) {
    state = 'raw';
  }

  const isRaw = state === 'raw' || (state === 'dried' && ['grains-cereals', 'legumes-pulses'].includes(cat));

  let prep = 'ready_to_eat';
  if (cat === 'oils-fats') {
    prep = 'cooking_fat_oil';
  } else if (cat === 'beverages-infusions' || /\b(milk|yogurt|kefir|fromage blanc|iogurte|leite|broth|stock)\b/.test(low)) {
    prep = 'liquid_dairy_beverage';
  } else if (cat === 'grains-cereals' && isRaw) {
    prep = /\b(flour|farinha|meal|starch|polvilho)\b/.test(low) ? 'raw_flour_roti' : 'raw_rice_grain';
  } else if (cat === 'legumes-pulses' && isRaw && !/\b(tofu|tempeh|miso|natto|hummus)\b/.test(low)) {
    prep = /\b(lentil|split)\b/.test(low) ? 'raw_dal' : 'raw_whole_legume';
  } else if (['vegetables-greens', 'roots-tubers', 'mushrooms-fungi'].includes(cat) && state === 'raw') {
    prep = 'raw_vegetable_tuber';
  } else if (['poultry-fowl', 'meats-game', 'fish-seafood', 'eggs'].includes(cat) && state === 'raw') {
    prep = 'raw_meat_seafood';
  } else if (state !== 'raw' && state !== 'ready-to-eat' && state !== 'dried') {
    prep = 'cooked_dish';
  }

  return { prep, state, isRaw: prep.startsWith('raw_') };
}

function classifyMealSlot(row) {
  const cat = row.cat;
  if (cat === 'eggs' || cat === 'fruits-berries') return 'Breakfast';
  if (cat === 'nuts-seeds' || cat === 'beverages-infusions' || cat === 'sweets-bakery') return 'Snack';
  if (cat === 'prepared-dishes' || cat === 'meats-game' || cat === 'fish-seafood') return 'Dinner';
  return 'Lunch';
}

function classifyDietAndAllergens(row, prot, fib, state) {
  const low = `${row.name} ${row.group}`.toLowerCase();
  const cat = row.cat;
  const diets = new Set();
  const allergens = new Set();

  const isMeat = cat === 'meats-game' || cat === 'poultry-fowl' || /\b(beef|pork|lamb|veal|chicken|turkey|duck|goose|venison|bison|caribou|seal|whale|walrus|moose|elk|rabbit|lard|tallow|rillettes|boudin|quiche lorraine|cassoulet|bourguignon|blanquette|parmentier|pot-au-feu)\b/.test(low);
  const isFish = cat === 'fish-seafood' || /\b(fish|salmon|tuna|cod|sardine|shrimp|crab|lobster|oyster|mussel|clam|scallop|octopus|squid|anchovy|bouillabaisse|fish sauce|oyster sauce)\b/.test(low);
  const isShellfish = /\b(shrimp|prawn|crab|lobster|crayfish|clam|mussel|oyster|scallop|abalone|cockle|whelk|escargot|squid|octopus|cuttlefish|saint-jacques|moule|huître)\b/.test(low);
  const isEgg = cat === 'eggs' || /\b(egg|oeuf|ovo|quiche|brioche|croissant|mayonnaise)\b/.test(low);
  const isDairy = cat === 'dairy-cheeses' || /\b(milk|cheese|butter|cream|yogurt|kefir|whey|casein|queijo|requeij|fromage|comté|roquefort|camembert|brie|reblochon|cantal|mimolette|morbier|tomme|emmental|chèvre|raclette|beaufort|gratin dauphinois|quiche|croissant|brioche)\b/.test(low);

  if (!isMeat && !isFish && !isEgg) {
    diets.add('vegetarian');
    if (!isDairy && !/\bhoney\b/.test(low)) {
      diets.add('vegan');
      diets.add('dairy-free');
    }
  } else if (!isMeat && !isFish && isEgg) {
    diets.add('eggetarian');
    if (!isDairy) diets.add('dairy-free');
  } else if (!isMeat && isFish) {
    diets.add('pescatarian');
    if (!isDairy) diets.add('dairy-free');
  } else if (!isDairy) {
    diets.add('dairy-free');
  }

  const hasGluten = /\b(wheat|barley|rye|spelt|kamut|triticale|couscous|bulgur|semolina|pasta|spaghetti|macaroni|noodle|udon|ramen|bread|baguette|pain |bagel|pita|focaccia|ciabatta|croissant|brioche|phyllo|tortillas, flour|soy sauce|quiche|crêpe)\b/.test(low) && !/\b(tamari|gluten-free|rice noodle)\b/.test(low);
  if (hasGluten) allergens.add('wheat-gluten');
  else diets.add('gluten-free');

  if (isDairy) allergens.add('milk');
  if (isEgg) allergens.add('egg');
  if (isFish && !isShellfish) allergens.add('fish');
  if (isShellfish) allergens.add('shellfish');
  if (/\b(peanut|groundnut)\b/.test(low)) allergens.add('peanut');
  if (/\b(soy|soja|tofu|tempeh|edamame|miso|natto|tamari)\b/.test(low)) allergens.add('soy');
  if (/\b(sesame|tahini)\b/.test(low)) allergens.add('sesame');
  if (/\b(almond|walnut|pecan|cashew|pistachio|macadamia|hazelnut|brazil nut|pine nut|chestnut|châtaigne|castanha|noix)\b/.test(low) && !/\b(cashew apple|waterchestnut)\b/.test(low)) {
    allergens.add('tree-nut');
  }

  if (prot >= 15) diets.add('high-protein');
  if (fib >= 6) diets.add('high-fiber');
  if (state === 'fermented') diets.add('fermented');

  let dietMask = 0;
  DIET_FLAG_LIST.forEach((f, idx) => {
    if (diets.has(f)) dietMask |= 1 << idx;
  });
  let allergenMask = 0;
  ALLERGEN_FLAG_LIST.forEach((f, idx) => {
    if (allergens.has(f)) allergenMask |= 1 << idx;
  });

  return { dietMask, allergenMask };
}

const rawRows = parseTsv(readFileSync(tsvPath, 'utf8'));

const sources = [];
const regions = [];
const categories = [];
const groups = [];

const intern = (arr, val) => {
  let idx = arr.indexOf(val);
  if (idx < 0) {
    idx = arr.length;
    arr.push(val);
  }
  return idx;
};

const nOrNull = (s) => (s === '' || s === undefined ? null : Number(s));

const packedRows = rawRows.map((row) => {
  const srcIdx = intern(sources, row.source);
  const regIdx = intern(regions, row.region || 'global');
  const catIdx = intern(categories, row.cat);
  const grpIdx = intern(groups, row.group);

  const kcal = Number(row.kcal || 0);
  const prot = Number(row.prot || 0);
  const carb = Number(row.carb || 0);
  const fat = Number(row.fat || 0);
  const fib = Number(row.fib || 0);

  const { prep, state, isRaw } = classifyPrepAndState(row);
  const mealIdx = MEAL_CATS.indexOf(classifyMealSlot(row));
  const prepIdx = PREP_PROFILES.indexOf(prep);
  const stateIdx = EDIBLE_STATES.indexOf(state);
  const { dietMask, allergenMask } = classifyDietAndAllergens(row, prot, fib, state);

  return [
    row.id,
    row.code,
    row.name,
    row.sci || '',
    row.aliases || '',
    row.countries || '',
    row.portions || '',
    srcIdx,
    regIdx,
    catIdx,
    grpIdx,
    mealIdx,
    prepIdx,
    stateIdx,
    isRaw ? 1 : 0,
    dietMask,
    allergenMask,
    [
      kcal,
      prot,
      carb,
      fat,
      fib,
      nOrNull(row.sug),
      nOrNull(row.na),
      nOrNull(row.water),
      nOrNull(row.sat),
      nOrNull(row.chol),
      nOrNull(row.ca),
      nOrNull(row.fe),
      nOrNull(row.mg),
      nOrNull(row.k),
      nOrNull(row.zn),
      nOrNull(row.vitc),
      nOrNull(row.b12),
      nOrNull(row.fol),
      nOrNull(row.vitd),
      nOrNull(row.vita),
      nOrNull(row.caff),
    ],
  ];
});

const outputTs = `// AUTO-GENERATED by scripts/build-fitlife-fooddb.mjs from scripts/data/fitlife-global-lab-foods.tsv
// Open Scientific Authorities: USDA ARS SR28 (Public Domain), UNICAMP TACO 4th Ed. (MIT), ANSES CIQUAL (Open Licence 2.0 / MIT).
// See public/licenses/FitLife-FoodDB-Sources.txt for full attributions.
import type {
  EdibleCategoryId,
  FoodAllergenFlag,
  FoodDietaryFlag,
  FoodEdibleState,
  FoodItem,
  FoodMicronutrients,
  FoodPreparationProfile,
  FoodSourceKind,
  MealCategory,
  WorldRegionId,
} from './types';

const SOURCES: FoodSourceKind[] = ${JSON.stringify(sources)};
const REGIONS: WorldRegionId[] = ${JSON.stringify(regions)};
const CATEGORIES: EdibleCategoryId[] = ${JSON.stringify(categories)};
const GROUPS: string[] = ${JSON.stringify(groups)};
const MEAL_CATS: MealCategory[] = ${JSON.stringify(MEAL_CATS)};
const PREP_PROFILES: FoodPreparationProfile[] = ${JSON.stringify(PREP_PROFILES)};
const EDIBLE_STATES: FoodEdibleState[] = ${JSON.stringify(EDIBLE_STATES)};
const DIET_FLAGS: FoodDietaryFlag[] = ${JSON.stringify(DIET_FLAG_LIST)};
const ALLERGEN_FLAGS: FoodAllergenFlag[] = ${JSON.stringify(ALLERGEN_FLAG_LIST)};

type NumCell = number | null;
type PackedRow = [
  string, // 0 id
  string, // 1 sourceCode
  string, // 2 name
  string, // 3 sciName
  string, // 4 aliases pipe-delimited
  string, // 5 countries comma-delimited
  string, // 6 portions pipe-delimited label:grams
  number, // 7 srcIdx
  number, // 8 regIdx
  number, // 9 catIdx
  number, // 10 grpIdx
  number, // 11 mealIdx
  number, // 12 prepIdx
  number, // 13 stateIdx
  number, // 14 isRaw (0|1)
  number, // 15 dietMask
  number, // 16 allergenMask
  NumCell[], // 17 [kcal, prot, carb, fat, fib, sug, na, water, sat, chol, ca, fe, mg, k, zn, vitc, b12, fol, vitd, vita, caff]
];

const PACKED_ROWS: PackedRow[] = ${JSON.stringify(packedRows)};

function decodeFlags<T extends string>(mask: number, table: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < table.length; i += 1) {
    if ((mask & (1 << i)) !== 0) out.push(table[i]);
  }
  return out;
}

function originFor(source: FoodSourceKind, region: WorldRegionId, countries: string[]): string {
  if (source === 'taco-brazil') return 'Brazil · South America (UNICAMP TACO)';
  if (source === 'ciqual-france') return 'France & Europe (ANSES CIQUAL)';
  if (region === 'north-america' && countries.includes('US')) {
    return 'Indigenous North America & Arctic (USDA SR28)';
  }
  return 'Global Whole Staple (USDA SR28)';
}

function provenanceFor(source: FoodSourceKind, code: string, isRaw: boolean): string {
  if (source === 'taco-brazil') {
    return \`UNICAMP TACO 4th Ed. (\${code}) · per 100g edible portion (Brazil national reference)\`;
  }
  if (source === 'ciqual-france') {
    return \`ANSES CIQUAL (\${code}) · per 100g edible portion (French/European reference)\`;
  }
  return \`USDA ARS SR28 (\${code}, Public Domain) · per 100g \${isRaw ? 'raw edible portion' : 'edible portion'}\`;
}

function servingLabelFor(source: FoodSourceKind, isRaw: boolean): string {
  const tag =
    source === 'taco-brazil'
      ? 'TACO'
      : source === 'ciqual-france'
      ? 'CIQUAL'
      : 'USDA';
  return isRaw ? \`100 g raw (\${tag})\` : \`100 g edible (\${tag})\`;
}

let cachedCatalog: FoodItem[] | null = null;

export function getGlobalLabFoodCatalog(): FoodItem[] {
  if (cachedCatalog) return cachedCatalog;
  cachedCatalog = PACKED_ROWS.map((r) => {
    const source = SOURCES[r[7]];
    const worldRegion = REGIONS[r[8]];
    const edibleCategory = CATEGORIES[r[9]];
    const groupLabel = GROUPS[r[10]];
    const defaultCategory = MEAL_CATS[r[11]];
    const preparationProfile = PREP_PROFILES[r[12]];
    const edibleState = EDIBLE_STATES[r[13]];
    const isRaw = r[14] === 1;
    const dietaryFlags = decodeFlags(r[15], DIET_FLAGS);
    const allergenFlags = decodeFlags(r[16], ALLERGEN_FLAGS);
    const nums = r[17];

    const countries = r[5] ? r[5].split(',').filter(Boolean) : [];
    const aliases = r[4] ? r[4].split('|').filter(Boolean) : [];
    const measuredPortions = r[6]
      ? r[6]
          .split('|')
          .map((p) => {
            const idx = p.lastIndexOf(':');
            if (idx <= 0) return null;
            const grams = Number(p.slice(idx + 1));
            return grams > 0 ? { label: p.slice(0, idx), grams } : null;
          })
          .filter((x): x is { label: string; grams: number } => x !== null)
      : [];

    const micro: FoodMicronutrients = {};
    if (nums[8] !== null) micro.saturatedFatG = nums[8];
    if (nums[9] !== null) micro.cholesterolMg = nums[9];
    if (nums[10] !== null) micro.calciumMg = nums[10];
    if (nums[11] !== null) micro.ironMg = nums[11];
    if (nums[12] !== null) micro.magnesiumMg = nums[12];
    if (nums[13] !== null) micro.potassiumMg = nums[13];
    if (nums[14] !== null) micro.zincMg = nums[14];
    if (nums[15] !== null) micro.vitaminCMg = nums[15];
    if (nums[16] !== null) micro.vitaminB12Ug = nums[16];
    if (nums[17] !== null) micro.folateUg = nums[17];
    if (nums[18] !== null) micro.vitaminDUg = nums[18];
    if (nums[19] !== null) micro.vitaminAUg = nums[19];
    if (nums[20] !== null) micro.caffeineMg = nums[20];

    const tags: string[] = [source, edibleCategory, ...dietaryFlags];
    if (isRaw) tags.push('raw-ingredient');

    return {
      id: r[0],
      name: r[2],
      servingLabel: servingLabelFor(source, isRaw),
      calories: nums[0] ?? 0,
      proteinG: nums[1] ?? 0,
      carbsG: nums[2] ?? 0,
      fatG: nums[3] ?? 0,
      fiberG: nums[4] ?? 0,
      defaultCategory,
      tags,
      source,
      sourceCode: r[1],
      ifctGroup: groupLabel,
      ...(r[3] ? { scientificName: r[3] } : {}),
      cuisineTag: 'global',
      worldRegion,
      ...(countries.length ? { countryCodes: countries } : {}),
      originLabel: originFor(source, worldRegion, countries),
      edibleCategory,
      edibleState,
      dietaryFlags,
      ...(allergenFlags.length ? { allergenFlags } : {}),
      ...(measuredPortions.length ? { measuredPortions } : {}),
      ...(Object.keys(micro).length ? { micronutrients: micro } : {}),
      ...(aliases.length ? { aliases } : {}),
      servingGrams: 100,
      ...(nums[5] !== null ? { sugarG: nums[5] } : {}),
      ...(nums[6] !== null ? { sodiumMg: nums[6] } : {}),
      ...(nums[7] !== null ? { moistureG: nums[7] } : {}),
      preparationProfile,
      isRaw,
      provenanceNote: provenanceFor(source, r[1], isRaw),
    };
  });
  return cachedCatalog;
}

export const GLOBAL_LAB_FOOD_CATALOG: FoodItem[] = getGlobalLabFoodCatalog();
`;

writeFileSync(outPath, outputTs);
console.log(
  `Compiled ${packedRows.length} global lab foods -> ${outPath} (${Buffer.byteLength(outputTs)} bytes)`
);
