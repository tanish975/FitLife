import { FoodItem, MealCategory } from '../data/types';
import { CURATED_FOOD_CATALOG, FOOD_CATALOG } from '../data/FoodCatalog';
import { WORLD_CULINARY_ATLAS } from '../data/WorldCulinaryAtlas';
import { isLaboratoryPer100gFood } from '../data/WorldAtlasMeta';
import { GRAMS_PER_TBSP_FAT, GRAMS_PER_TSP_FAT } from './IndianNutrition';

export interface ParsedMealDraft {
  name: string;
  servingLabel: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG?: number;
  sodiumMg?: number;
  nutritionNote?: string;
  category: MealCategory;
  /** Unknown, ambiguous, or unmatched portions must be reviewed before logging. */
  requiresReview?: boolean;
  source?: 'catalog' | 'manual' | 'unknown';
  matchedFoodId?: string;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  half: 0.5,
  couple: 2,
};

const UNIT_PATTERN =
  'cups?|bowls?|katoris?|glasses|glass|slices?|pieces?|scoops?|servings?|plates?|tablespoons?|tbsp|teaspoons?|tsp';

function normalizeUnit(raw?: string): string | null {
  if (!raw) return null;
  const u = raw.toLowerCase().trim();
  if (u === 'glasses' || u === 'glass') return 'glass';
  if (u === 'tablespoon' || u === 'tablespoons' || u === 'tbsp') return 'tbsp';
  if (u === 'teaspoon' || u === 'teaspoons' || u === 'tsp') return 'tsp';
  if (u === 'katori' || u === 'katoris') return 'katori';
  return u.replace(/s$/, '');
}

function pluralizeUnit(unit: string, count: number): string {
  if (count === 1 || ['tbsp', 'tsp', 'katori'].includes(unit)) return unit;
  if (unit === 'glass') return 'glasses';
  return `${unit}s`;
}

/**
 * Splits free text like "2 boiled eggs and a banana", "1 katori gujarati dal",
 * or "2 rotis with 1 tsp ghee" into multiple logged meal items at once.
 */
export function parseMealFreeText(rawText: string, defaultCategory: MealCategory): ParsedMealDraft[] {
  const cleaned = rawText.trim();
  if (!cleaned) return [];

  // Split by comma, "+", "&", "and", "with", newline, or semicolon
  const segments = cleaned
    .split(/\s*(?:,|\+|&|\band\b|\bwith\b|;|\n)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const results: ParsedMealDraft[] = [];

  for (const segment of segments) {
    let multiplier = 1;
    let measure: { amount: number; unit: 'g' | 'ml' } | null = null;
    let quantityUnit: string | null = null;
    let queryPart = segment.toLowerCase();

    // Check gram/ml pattern like "150g chicken" or "200 ml chaas"
    const gramMatch = queryPart.match(/^(\d+(?:\.\d+)?)\s*(grams|gram|g|ml)\b\s*(.*)$/i);
    if (gramMatch) {
      const amount = parseFloat(gramMatch[1]);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) continue;
      measure = { amount, unit: gramMatch[2].toLowerCase() === 'ml' ? 'ml' : 'g' };
      queryPart = gramMatch[3].trim();
    } else {
      // Check numeric prefix like "2 eggs", "1 katori gujarati dal", or "1 tbsp ghee"
      const numMatch = queryPart.match(
        new RegExp(`^(\\d+(?:\\.\\d+)?)\\s+(?:(${UNIT_PATTERN})\\s+)?(?:of\\s+)?(.+)$`, 'i')
      );
      if (numMatch) {
        multiplier = parseFloat(numMatch[1]);
        if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 100) continue;
        quantityUnit = normalizeUnit(numMatch[2]);
        queryPart = numMatch[3].trim();
      } else {
        // Check word number like "two eggs", "a glass of chaas", or "a banana"
        const wordMatch = queryPart.match(
          new RegExp(
            `^(a|an|one|two|three|four|five|six|half|couple)\\s+(?:of\\s+)?(?:(${UNIT_PATTERN})\\s+(?:of\\s+)?)?(.*)$`,
            'i'
          )
        );
        if (wordMatch) {
          multiplier = NUMBER_WORDS[wordMatch[1].toLowerCase()] ?? 1;
          quantityUnit = normalizeUnit(wordMatch[2]);
          queryPart = wordMatch[3].trim();
        }
      }
    }

    if (!queryPart) continue;

    const explicitRawInQuery = /\b(raw|dry|uncooked)\b/i.test(queryPart);
    const cleanedQueryForIfct = queryPart.replace(/\b(raw|dry|uncooked)\b/gi, ' ').replace(/\s+/g, ' ').trim();

    const match = findBestFoodMatch(queryPart, cleanedQueryForIfct, explicitRawInQuery);
    if (match) {
      const matched = match.item;
      const isLab = isLaboratoryPer100gFood(matched);
      const isCookingFat = matched.preparationProfile === 'cooking_fat_oil';

      // Special exact spoon handling for pure lab oils & ghee (1 tsp = 4.5g, 1 tbsp = 13.5g)
      if (isLab && isCookingFat && (quantityUnit === 'tsp' || quantityUnit === 'tbsp')) {
        const gramsPerSpoon = quantityUnit === 'tbsp' ? GRAMS_PER_TBSP_FAT : GRAMS_PER_TSP_FAT;
        const totalGrams = Math.round(multiplier * gramsPerSpoon * 10) / 10;
        const scale = totalGrams / 100;
        results.push({
          name: `${formatMultiplier(multiplier)} ${quantityUnit} ${matched.name}`,
          servingLabel: `${Number(multiplier.toPrecision(6))} ${quantityUnit} (${totalGrams}g)`,
          calories: Math.round(matched.calories * scale),
          proteinG: Math.round(matched.proteinG * scale * 10) / 10,
          carbsG: Math.round(matched.carbsG * scale * 10) / 10,
          fatG: Math.round(matched.fatG * scale * 10) / 10,
          fiberG: Math.round(matched.fiberG * scale * 10) / 10,
          nutritionNote: matched.provenanceNote,
          category: defaultCategory,
          requiresReview: false,
          source: 'catalog',
          matchedFoodId: matched.id,
        });
        continue;
      }

      // Catalog nutrition values are per labelled serving, not automatically per 100g.
      // Scale a mass/volume query against that serving when the label provides it.
      const servingMeasure = matched.servingLabel.match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
      const matchingMeasure = !!measure && !!servingMeasure && servingMeasure[2].toLowerCase() === measure.unit;
      const labelUnitMatch = matched.servingLabel.match(
        new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:[a-z]+\\s+)?(${UNIT_PATTERN})\\b`, 'i')
      );
      const labelUnit = normalizeUnit(labelUnitMatch?.[2]);
      const unitMatches =
        !quantityUnit ||
        quantityUnit === 'serving' ||
        (!!labelUnit && labelUnit === quantityUnit);

      // A measured amount of a dish whose label contains a dry/raw ingredient
      // cannot be assumed to be the dry/raw amount unless the user explicitly wrote raw/dry.
      const dryBasisUnclear =
        !!measure &&
        /\b(dry|uncooked|raw)\b/i.test(matched.servingLabel) &&
        !(isLab && explicitRawInQuery);

      // Unmeasured 100g lab reference items (e.g. bare "paneer" or "spinach") have no household count.
      const unmeasuredLab = isLab && !measure;
      const compositeCount = !measure && !quantityUnit && multiplier !== 1 && /[+&]/.test(matched.servingLabel);
      const requiresReview =
        !match.exact ||
        unmeasuredLab ||
        (!!measure && (!matchingMeasure || dryBasisUnclear)) ||
        !unitMatches ||
        compositeCount;

      const effectiveMultiplier = measure
        ? measure.amount / (matchingMeasure ? parseFloat(servingMeasure![1]) : 100)
        : quantityUnit && quantityUnit !== 'serving' && unitMatches
        ? multiplier / parseFloat(labelUnitMatch![1])
        : multiplier;

      const displayQty = measure
        ? `${measure.amount} ${measure.unit}${matchingMeasure ? ` (catalog serving: ${matched.servingLabel})` : ''}`
        : quantityUnit
        ? `${multiplier} ${pluralizeUnit(quantityUnit, multiplier)}`
        : effectiveMultiplier === 1
        ? matched.servingLabel
        : `${Number(effectiveMultiplier.toPrecision(6))} × (${matched.servingLabel})`;

      results.push({
        name: measure
          ? `${measure.amount} ${measure.unit} ${matched.name}`
          : effectiveMultiplier !== 1
          ? `${formatMultiplier(effectiveMultiplier)} ${matched.name}`
          : matched.name,
        servingLabel: displayQty,
        calories: requiresReview ? 0 : Math.round(matched.calories * effectiveMultiplier),
        proteinG: requiresReview ? 0 : Math.round(matched.proteinG * effectiveMultiplier * 10) / 10,
        carbsG: requiresReview ? 0 : Math.round(matched.carbsG * effectiveMultiplier * 10) / 10,
        fatG: requiresReview ? 0 : Math.round(matched.fatG * effectiveMultiplier * 10) / 10,
        fiberG: requiresReview ? 0 : Math.round(matched.fiberG * effectiveMultiplier * 10) / 10,
        ...(matched.sugarG !== undefined && !requiresReview
          ? { sugarG: Math.round(matched.sugarG * effectiveMultiplier * 10) / 10 }
          : {}),
        ...(matched.sodiumMg !== undefined && !requiresReview
          ? { sodiumMg: Math.round(matched.sodiumMg * effectiveMultiplier) }
          : {}),
        ...(matched.provenanceNote && !requiresReview
          ? { nutritionNote: matched.provenanceNote }
          : {}),
        category: defaultCategory,
        requiresReview,
        source: 'catalog',
        matchedFoodId: matched.id,
      });
    } else {
      // Do not fabricate nutrition for an unrecognized food. The user supplies
      // label or recipe values in the review form before it can be logged.
      const titleCase = queryPart
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      results.push({
        name: `${
          measure
            ? `${measure.amount} ${measure.unit} `
            : multiplier !== 1
            ? `${formatMultiplier(multiplier)} `
            : ''
        }${titleCase}`,
        servingLabel: measure
          ? `${measure.amount} ${measure.unit}`
          : quantityUnit
          ? `${Number(multiplier.toPrecision(6))} ${pluralizeUnit(quantityUnit, multiplier)}`
          : `${Number(multiplier.toPrecision(6))} × ${titleCase}`,
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fiberG: 0,
        category: defaultCategory,
        requiresReview: true,
        source: 'unknown',
      });
    }
  }

  return results;
}

function formatMultiplier(n: number): string {
  return `${Number(n.toPrecision(6))}×`;
}

/** Only explicitly reviewed aliases for simple entries may auto-fill values.
 * Search tags are discovery terms, not proof that two foods are equivalent.
 * All other phrases stay user-entered and require nutrition details. */
function findBestFoodMatch(
  rawQuery: string,
  cleanedIfctQuery: string,
  explicitRawInQuery: boolean
): { item: FoodItem; exact: boolean } | null {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/s\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const normalized = normalize(rawQuery);
  if (!normalized) return null;

  const safeCuratedAliases: Record<string, string[]> = {
    'food-eggs': ['boiled egg'],
    'food-banana': ['banana'],
    'food-peanut-butter': ['peanut butter'],
    'food-chicken-breast': ['grilled chicken breast'],
    'food-roti': ['roti', 'chapati', 'phulka'],
    'food-apple': ['apple'],
    'food-guj-rotli-dry': ['thin gujarati rotli', 'dry rotli', 'sukhi rotli'],
    'food-guj-rotli-ghee': ['ghee rotli', 'rotli with ghee'],
    'food-guj-bajri-rotlo': ['bajri rotlo', 'bajra rotlo'],
    'food-guj-juvar-rotlo': ['jowar rotlo', 'juvar rotlo'],
    'food-guj-bhakhri': ['bhakhri', 'wheat bhakhri'],
    'food-guj-methi-thepla': ['methi thepla', 'thepla'],
    'food-guj-tuver-dal': ['gujarati dal', 'gujarati tuver dal', 'khatti meethi dal'],
    'food-ind-moong-dal': ['yellow moong dal', 'homestyle moong dal'],
    'food-guj-kadhi': ['gujarati kadhi'],
    'food-ind-steamed-rice': ['steamed white rice', 'plain cooked rice'],
    'food-guj-plain-khichdi': ['plain khichdi', 'gujarati plain khichdi'],
    'food-guj-vaghareli-khichdi': ['vaghareli khichdi'],
    'food-guj-batata-poha': ['batata poha', 'gujarati poha'],
    'food-guj-undhiyu': ['undhiyu', 'gujarati undhiyu'],
    'food-guj-sev-tameta': ['sev tameta'],
    'food-guj-bhinda-shaak': ['bhinda shaak', 'bhinda nu shaak'],
    'food-guj-dudhi-chana': ['dudhi chana dal'],
    'food-guj-ringan-oro': ['ringan no oro'],
    'food-guj-khaman-dhokla': ['khaman dhokla', 'khaman'],
    'food-guj-khatta-dhokla': ['khatta dhokla', 'idada'],
    'food-guj-handvo': ['handvo', 'gujarati handvo'],
    'food-guj-dudhi-muthiya': ['dudhi muthiya', 'steamed muthiya'],
    'food-guj-khandvi': ['khandvi'],
    'food-guj-patra': ['steamed patra'],
    'food-guj-vagharela-mamra': ['vagharela mamra'],
    'food-guj-khakhra': ['methi khakhra', 'whole wheat khakhra'],
    'food-guj-chaas': ['masala chaas', 'chaas', 'buttermilk'],
    'food-ind-homestyle-dahi': ['homestyle dahi'],
  };

  const curatedMatches = CURATED_FOOD_CATALOG.filter(
    (item) =>
      normalize(item.name) === normalized ||
      (safeCuratedAliases[item.id] || []).some((alias) => normalize(alias) === normalized)
  );
  if (curatedMatches.length === 1) return { item: curatedMatches[0], exact: true };

  // Check IFCT 2017 staples (oils/ghee, or explicit raw ingredients / exact IFCT names)
  const safeIfctAliases: Record<string, string[]> = {
    'ifct-t013': ['ghee', 'desi ghee'],
    'ifct-t005': ['groundnut oil', 'singtel', 'peanut oil'],
    'ifct-t006': ['mustard oil'],
    'ifct-t001': ['coconut oil'],
    'ifct-t004': ['sesame oil', 'til oil', 'gingelly oil'],
    'ifct-t012': ['sunflower oil', 'cooking oil'],
    'ifct-b021': ['toor dal', 'tuver dal', 'arhar dal', 'red gram dal'],
    'ifct-b010': ['moong dal', 'green gram dal'],
    'ifct-b013': ['masoor dal', 'lentil dal'],
    'ifct-b001': ['chana dal', 'bengal gram dal'],
    'ifct-b003': ['urad dal', 'black gram dal'],
    'ifct-a015': ['milled rice', 'white rice'],
    'ifct-a019': ['wheat atta', 'whole wheat atta', 'atta'],
    'ifct-a003': ['bajra', 'bajri'],
    'ifct-a005': ['jowar'],
    'ifct-a010': ['ragi', 'bavato'],
    'ifct-a011': ['poha', 'paunva', 'rice flakes'],
    'ifct-l003': ['paneer'],
    'ifct-i001': ['jaggery', 'cane jaggery', 'gol', 'gur'],
  };

  const targetNorm = explicitRawInQuery ? normalize(cleanedIfctQuery) : normalized;
  if (!targetNorm) return null;

  const ifctMatches = FOOD_CATALOG.filter(
    (item) =>
      item.source === 'ifct2017' &&
      (normalize(item.name) === targetNorm ||
        item.ifctCode?.toLowerCase() === targetNorm ||
        (safeIfctAliases[item.id] || []).some((alias) => normalize(alias) === targetNorm))
  );
  if (ifctMatches.length === 1) return { item: ifctMatches[0], exact: true };

  // Check exact World Culinary Atlas ready-to-eat dishes
  const safeWorldAliases: Record<string, string[]> = {
    'world-jp-onigiri-salmon': ['salmon onigiri'],
    'world-jp-miso-soup': ['miso soup'],
    'world-kr-kimchi': ['napa cabbage kimchi'],
    'world-lb-hummus-tahini': ['hummus bi tahini'],
    'world-tn-shakshuka': ['shakshuka'],
    'world-eg-ful-medames': ['ful medames'],
    'world-mx-guacamole': ['fresh guacamole'],
    'world-br-pao-de-queijo': ['pao de queijo'],
    'world-is-skyr-berries': ['icelandic skyr bowl'],
  };

  const atlasMatches = WORLD_CULINARY_ATLAS.filter(
    (item) =>
      normalize(item.name) === normalized ||
      (safeWorldAliases[item.id] || []).some((alias) => normalize(alias) === normalized)
  );
  if (atlasMatches.length === 1) return { item: atlasMatches[0], exact: true };

  // Check explicit global lab authority codes, safe spoon oils, or explicit "raw <ingredient>" queries
  const safeGlobalLabAliases: Record<string, string[]> = {
    'usda-04053': ['olive oil', 'extra virgin olive oil'],
  };

  const globalLabMatches = FOOD_CATALOG.filter(
    (item) =>
      (item.source === 'usda-sr28' ||
        item.source === 'taco-brazil' ||
        item.source === 'ciqual-france') &&
      (item.sourceCode?.toLowerCase() === targetNorm ||
        (safeGlobalLabAliases[item.id] || []).some((alias) => normalize(alias) === targetNorm) ||
        (explicitRawInQuery && normalize(item.name) === targetNorm))
  );
  return globalLabMatches.length === 1 ? { item: globalLabMatches[0], exact: true } : null;
}
