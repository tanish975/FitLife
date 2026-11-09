import { FoodItem, MealCategory } from '../data/types';
import {
  CURATED_FOOD_CATALOG,
  FOOD_CATALOG,
  READY_TO_EAT_FOOD_CATALOG,
} from '../data/FoodCatalog';
import {
  computePortionNutrition,
  CookingFatKind,
  filterAndRankFoods,
  HouseholdUnit,
} from './IndianNutrition';
import { ParsedMealDraft, parseMealFreeText } from './MealTextParser';

export interface NaturalLanguageCandidate {
  food: FoodItem;
  reasonLabel: string;
}

export interface NaturalLanguageMealItem {
  id: string;
  rawSegment: string;
  parsedQuery: string;
  quantity: number;
  unit: HouseholdUnit;
  cookingFatKind: CookingFatKind;
  cookingFatTsp: number;
  /** Null when multiple preparations match and the user must explicitly tap one. */
  selectedFoodId: string | null;
  candidates: NaturalLanguageCandidate[];
  needsDisambiguation: boolean;
  disambiguationPrompt?: string;
  /** Optional manual override when the food isn't in the catalog. */
  manualDraft?: ParsedMealDraft;
}

export interface EvaluatedNaturalLanguageItem {
  item: NaturalLanguageMealItem;
  resolvedDraft: ParsedMealDraft | null;
  isReadyToLog: boolean;
}

export interface NaturalLanguageAnalysisResult {
  rawText: string;
  category: MealCategory;
  items: NaturalLanguageMealItem[];
}

const FOOD_BY_ID = new Map<string, FoodItem>(FOOD_CATALOG.map((f) => [f.id, f]));

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
  quarter: 0.25,
  couple: 2,
};

const DISAMBIGUATION_CLUSTERS: {
  pattern: RegExp;
  prompt: string;
  foodIds: string[];
}[] = [
  {
    pattern: /^(?:dal|daal|lentil|lentils|cooked dal)$/i,
    prompt: 'Which dal preparation did you have?',
    foodIds: [
      'ind-gujarati-dal',
      'ind-moong-dal-cooked',
      'food-dal-tadka',
      'ind-dal-dhokli',
      'ind-rajma-masala',
    ],
  },
  {
    pattern: /^(?:curd|dahi|yogurt|yoghurt)$/i,
    prompt: 'Choose your curd / yogurt type:',
    foodIds: ['ind-curd-dahi', 'food-greek-yogurt', 'ind-chaas', 'ind-sweet-lassi'],
  },
  {
    pattern: /^(?:idli|idlis)$/i,
    prompt: 'Plain steamed idli or with sambar?',
    foodIds: ['ind-plain-idli', 'food-idli-sambar'],
  },
  {
    pattern: /^(?:dosa|dosas)$/i,
    prompt: 'Plain dosa or masala dosa?',
    foodIds: ['ind-plain-dosa', 'food-masala-dosa'],
  },
  {
    pattern: /^(?:paratha|parathas|parantha)$/i,
    prompt: 'Plain layered paratha or stuffed paratha?',
    foodIds: ['ind-plain-paratha', 'ind-aloo-paratha', 'ind-thepla'],
  },
  {
    pattern: /^(?:rice|chawal|bhaat|white rice)$/i,
    prompt: 'Choose your cooked rice preparation:',
    foodIds: ['ind-steamed-rice', 'ind-jeera-rice', 'food-brown-rice', 'ind-veg-pulao'],
  },
  {
    pattern: /^(?:egg|eggs|anda|ande)$/i,
    prompt: 'How were the eggs prepared?',
    foodIds: ['food-eggs-2', 'food-omelette', 'wca-us-scrambled-eggs'],
  },
  {
    pattern: /^(?:oats|oatmeal|cooked oats|rolled oats porridge)$/i,
    prompt: 'Confirm oats preparation:',
    foodIds: ['food-oats-bowl', 'ifct-A010'],
  },
  {
    pattern: /^(?:chicken|grilled chicken)$/i,
    prompt: 'Choose exact chicken cut & preparation:',
    foodIds: ['food-chicken-breast', 'ind-butter-chicken', 'wca-in-chicken-tikka'],
  },
  {
    pattern: /^(?:paneer)$/i,
    prompt: 'Raw paneer cubes or a cooked paneer dish?',
    foodIds: ['food-palak-paneer', 'food-paneer-tikka', 'ind-paneer-bhurji', 'ifct-L004'],
  },
  {
    pattern: /^(?:sabzi|subzi|shaak|bhaji|veg sabzi)$/i,
    prompt: 'Which vegetable sabzi / shaak did you eat?',
    foodIds: [
      'ind-bhindi-sabzi',
      'ind-ringan-bateta',
      'ind-dudhi-chana-shaak',
      'ind-sev-tameta',
      'food-palak-paneer',
    ],
  },
  {
    pattern: /^(?:milk|doodh)$/i,
    prompt: 'Toned milk or full-cream milk?',
    foodIds: ['ind-toned-milk', 'ind-full-cream-milk'],
  },
  {
    pattern: /^(?:sambar|sambhar)$/i,
    prompt: 'Confirm sambar serving:',
    foodIds: ['ind-sambar-bowl', 'food-idli-sambar'],
  },
];

const EXACT_ALTERNATIVE_MAP: Record<string, string[]> = {
  'food-roti': ['ind-rotli-plain', 'ind-rotli-ghee', 'ind-bajra-rotla', 'ind-jowar-rotla'],
  'ind-rotli-plain': ['food-roti', 'ind-rotli-ghee', 'ind-thepla'],
  'ind-rotli-ghee': ['ind-rotli-plain', 'food-roti', 'ind-thepla'],
  'ind-gujarati-dal': ['ind-moong-dal-cooked', 'food-dal-tadka', 'ind-kadhi-gujarati'],
  'food-dal-tadka': ['ind-gujarati-dal', 'ind-moong-dal-cooked', 'ind-rajma-masala'],
  'ind-chaas': ['ind-curd-dahi', 'ind-sweet-lassi'],
};

function resolveFoods(ids: string[], reasonLabel: string): NaturalLanguageCandidate[] {
  const out: NaturalLanguageCandidate[] = [];
  for (const id of ids) {
    const f = FOOD_BY_ID.get(id);
    if (f) out.push({ food: f, reasonLabel });
  }
  return out;
}

function splitNaturalLanguageSegments(rawText: string): string[] {
  const primary = rawText
    .split(/\s*(?:,|\+|&|;|\n|\band\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const finalSegments: string[] = [];
  for (const part of primary) {
    if (!/\bwith\b/i.test(part)) {
      finalSegments.push(part);
      continue;
    }
    const lower = part.toLowerCase().replace(/^\d+\s+/, '').trim();
    const isSingleKnownDish = READY_TO_EAT_FOOD_CATALOG.some(
      (f) =>
        f.name.toLowerCase().includes(lower) ||
        (f.aliases || []).some((a) => a.toLowerCase() === lower)
    );
    if (isSingleKnownDish) {
      finalSegments.push(part);
    } else {
      for (const sub of part.split(/\s+\bwith\b\s+/i)) {
        if (sub.trim()) finalSegments.push(sub.trim());
      }
    }
  }
  return finalSegments;
}

function parseQuantityAndUnit(segment: string): {
  quantity: number;
  rawUnit: string | null;
  query: string;
} {
  let text = segment.trim();

  // 1. Gram / ml prefix: "150g chicken", "200 ml chaas"
  const gramMatch = text.match(/^(\d+(?:\.\d+)?)\s*(grams?|g|ml)\b\s*(?:of\s+)?(.+)$/i);
  if (gramMatch) {
    const qty = parseFloat(gramMatch[1]);
    return {
      quantity: Number.isFinite(qty) && qty > 0 ? Math.min(qty, 5000) : 100,
      rawUnit: gramMatch[2].toLowerCase().startsWith('m') ? 'ml' : 'grams',
      query: gramMatch[3].trim(),
    };
  }

  // 2. Fraction prefix: "1/2 katori dal", "1/2 plate pulao"
  const fracMatch = text.match(
    /^(\d+)\s*\/\s*(\d+)\s+(?:(cups?|bowls?|katoris?|glasses|glass|slices?|pieces?|scoops?|servings?|plates?|tablespoons?|tbsp|teaspoons?|tsp|rotis?|rotlis?|chapatis?|phulkas?)\s+)?(?:of\s+)?(.+)$/i
  );
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    const ratio = den > 0 ? Math.round((num / den) * 100) / 100 : 1;
    const rawU = fracMatch[3]?.toLowerCase() ?? null;
    const rest = fracMatch[4].trim();
    if (rawU && /^(roti|rotis|rotli|rotlis|chapati|chapatis|phulka|phulkas)$/.test(rawU)) {
      return { quantity: ratio, rawUnit: 'roti', query: `${rawU} ${rest}`.trim() };
    }
    return { quantity: ratio > 0 ? ratio : 0.5, rawUnit: rawU, query: rest };
  }

  // 3. Numeric prefix: "2 roti", "1 katori dal", "1.5 bowls poha"
  const numMatch = text.match(
    /^(\d+(?:\.\d+)?)\s+(?:(cups?|bowls?|katoris?|glasses|glass|slices?|pieces?|scoops?|servings?|plates?|tablespoons?|tbsp|teaspoons?|tsp)\s+)?(?:of\s+)?(.+)$/i
  );
  if (numMatch) {
    const qty = parseFloat(numMatch[1]);
    return {
      quantity: Number.isFinite(qty) && qty > 0 ? Math.min(qty, 100) : 1,
      rawUnit: numMatch[2]?.toLowerCase() ?? null,
      query: numMatch[3].trim(),
    };
  }

  // 4. Word-number prefix: "two rotis", "half katori dal", "a glass of chaas"
  const wordMatch = text.match(
    /^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter|couple)\s+(?:of\s+)?(?:(cups?|bowls?|katoris?|glasses|glass|slices?|pieces?|scoops?|servings?|plates?|tablespoons?|tbsp|teaspoons?|tsp)\s+(?:of\s+)?)?(.+)$/i
  );
  if (wordMatch) {
    const qty = WORD_NUMBERS[wordMatch[1].toLowerCase()] ?? 1;
    return {
      quantity: qty,
      rawUnit: wordMatch[2]?.toLowerCase() ?? null,
      query: wordMatch[3].trim(),
    };
  }

  return { quantity: 1, rawUnit: null, query: text };
}

function mapRawUnitToHouseholdUnit(rawUnit: string | null, food?: FoodItem): HouseholdUnit {
  const availableUnits = food ? new Set(getAvailableHouseholdUnits(food)) : null;

  if (!rawUnit) {
    if (food && /^(roti|rotli|chapati|phulka)/i.test(food.name)) return 'roti';
    return 'serving';
  }

  const u = rawUnit.toLowerCase();
  if (u === 'grams' || u === 'g' || u === 'ml') return 'grams';
  if (u.startsWith('tbsp') || u.startsWith('tablespoon')) return 'tbsp';
  if (u.startsWith('tsp') || u.startsWith('teaspoon')) return 'tsp';
  if (u.startsWith('katori') || u.startsWith('bowl') || u.startsWith('cup')) return 'katori';
  if (u.startsWith('glass')) return 'glass';
  if (u.startsWith('roti') || u.startsWith('rotli') || u.startsWith('chapati') || u.startsWith('phulka')) return 'roti';
  return 'serving';
}

/**
 * Returns the household portion units supported by a food item.
 * Falls back to 'serving' when the catalog entry doesn't declare explicit units.
 */
function getAvailableHouseholdUnits(food: FoodItem): HouseholdUnit[] {
  const declared = (food as any).householdUnits as HouseholdUnit[] | undefined;
  if (declared && declared.length > 0) return declared;
  // Every catalog food supports at least serving and grams as fallbacks
  return ['serving', 'grams'];
}

/**
 * Parses natural-language meal text (e.g. "2 roti, 1 katori dal") into structured
 * confirmation items with exact matches + household disambiguation candidates.
 * Nothing is logged until the user explicitly confirms in the UI.
 */
export function analyzeNaturalLanguageMeal(
  rawText: string,
  category: MealCategory
): NaturalLanguageAnalysisResult {
  const cleaned = rawText.trim();
  if (!cleaned) {
    return { rawText: '', category, items: [] };
  }

  const segments = splitNaturalLanguageSegments(cleaned);
  const items: NaturalLanguageMealItem[] = [];

  segments.forEach((segment, idx) => {
    const { quantity, rawUnit, query } = parseQuantityAndUnit(segment);
    const normalizedQuery = query
      .toLowerCase()
      .replace(/\b(rotis)\b/g, 'roti')
      .replace(/\b(chapatis)\b/g, 'chapati')
      .replace(/\b(phulkas)\b/g, 'phulka')
      .replace(/\b(idlis)\b/g, 'idli')
      .replace(/\b(dosas)\b/g, 'dosa')
      .replace(/\b(parathas)\b/g, 'paratha')
      .trim();

    // 1. Check if this segment matches a curated household disambiguation cluster first
    const cluster = DISAMBIGUATION_CLUSTERS.find((c) => c.pattern.test(normalizedQuery));
    if (cluster) {
      const candidates = resolveFoods(cluster.foodIds, 'Common preparation');
      const referenceFood = candidates[0]?.food;
      const unit = mapRawUnitToHouseholdUnit(rawUnit, referenceFood);
      items.push({
        id: `nl-item-${idx}-${normalizedQuery.replace(/[^a-z0-9]+/g, '-')}`,
        rawSegment: segment,
        parsedQuery: query,
        quantity,
        unit,
        cookingFatKind: 'none',
        cookingFatTsp: 0,
        selectedFoodId: null,
        candidates,
        needsDisambiguation: true,
        disambiguationPrompt: cluster.prompt,
      });
      return;
    }

    // 2. Delegate to strict parseMealFreeText for single-segment exact matching check
    const strictParsed = parseMealFreeText(segment, category)[0];
    if (strictParsed && !strictParsed.requiresReview && strictParsed.matchedFoodId) {
      const matchedFood = FOOD_BY_ID.get(strictParsed.matchedFoodId);
      if (matchedFood) {
        const altIds = EXACT_ALTERNATIVE_MAP[matchedFood.id] ?? [];
        const altRanked = filterAndRankFoods(READY_TO_EAT_FOOD_CATALOG, {
          query: normalizedQuery,
          scope: 'curated',
          preferredCategory: category,
        })
          .filter((f) => f.id !== matchedFood.id && !altIds.includes(f.id))
          .slice(0, 2)
          .map((f) => f.id);

        const candidates: NaturalLanguageCandidate[] = [
          { food: matchedFood, reasonLabel: 'Matched' },
          ...resolveFoods([...altIds, ...altRanked].slice(0, 4), 'Alternative'),
        ];

        const unit = mapRawUnitToHouseholdUnit(rawUnit, matchedFood);
        let adjustedQty = quantity;
        if (
          unit === 'serving' &&
          !rawUnit &&
          matchedFood.id === 'food-eggs-2' &&
          /2\s+large\s+eggs/i.test(matchedFood.servingLabel)
        ) {
          adjustedQty = Math.round((quantity / 2) * 100) / 100;
        }

        items.push({
          id: `nl-item-${idx}-${matchedFood.id}`,
          rawSegment: segment,
          parsedQuery: query,
          quantity: adjustedQty,
          unit,
          cookingFatKind: 'none',
          cookingFatTsp: 0,
          selectedFoodId: matchedFood.id,
          candidates,
          needsDisambiguation: false,
        });
        return;
      }
    }

    // 3. Search READY_TO_EAT_FOOD_CATALOG + full FOOD_CATALOG for best candidate matches
    const readyMatches = filterAndRankFoods(READY_TO_EAT_FOOD_CATALOG, {
      query: normalizedQuery,
      scope: 'curated',
      preferredCategory: category,
    }).slice(0, 4);

    const labMatches =
      readyMatches.length < 4
        ? filterAndRankFoods(FOOD_CATALOG, {
            query: normalizedQuery,
            scope: 'all',
            preferredCategory: category,
          })
            .filter((f) => !readyMatches.some((r) => r.id === f.id))
            .slice(0, 4 - readyMatches.length)
        : [];

    const allCandidateFoods = [...readyMatches, ...labMatches];
    const candidates: NaturalLanguageCandidate[] = allCandidateFoods.map((food) => ({
      food,
      reasonLabel: food.source === 'curated' || food.source === 'fitlife-global-dish' ? 'Prepared dish' : 'Catalog match',
    }));

    const referenceFood = candidates[0]?.food;
    const unit = mapRawUnitToHouseholdUnit(rawUnit, referenceFood);

    items.push({
      id: `nl-item-${idx}`,
      rawSegment: segment,
      parsedQuery: query,
      quantity,
      unit,
      cookingFatKind: 'none',
      cookingFatTsp: 0,
      selectedFoodId: null,
      candidates,
      needsDisambiguation: true,
      disambiguationPrompt:
        candidates.length > 0
          ? 'Select the closest match below to confirm nutrition:'
          : 'No catalog match found — enter custom nutrition or refine text:',
    });
  });

  return {
    rawText: cleaned,
    category,
    items,
  };
}

/**
 * Evaluates a `NaturalLanguageMealItem` into a concrete `ParsedMealDraft` once
 * `selectedFoodId` or `manualDraft` has been chosen by the user.
 * Unconfirmed items evaluate to `resolvedDraft: null, isReadyToLog: false` (never guessing!).
 */
export function evaluateNaturalLanguageItem(
  item: NaturalLanguageMealItem,
  category: MealCategory
): EvaluatedNaturalLanguageItem {
  if (item.manualDraft && !item.manualDraft.requiresReview) {
    return {
      item,
      resolvedDraft: { ...item.manualDraft, category, requiresReview: false },
      isReadyToLog: true,
    };
  }

  if (!item.selectedFoodId) {
    return { item, resolvedDraft: null, isReadyToLog: false };
  }

  const food = FOOD_BY_ID.get(item.selectedFoodId);
  if (!food) {
    return { item, resolvedDraft: null, isReadyToLog: false };
  }

  const safeUnit: HouseholdUnit = item.unit === 'serving' || item.unit === 'grams' || item.unit === 'katori' || item.unit === 'glass' || item.unit === 'tbsp' || item.unit === 'tsp' || item.unit === 'roti'
    ? item.unit
    : 'serving';

  const safeQuantity =
    safeUnit === 'grams' && item.quantity <= 10
      ? Math.round(item.quantity * (food.servingGrams ?? 100))
      : Math.max(0.25, item.quantity);

  const cookingFatGrams = item.cookingFatKind === 'none' ? 0 : item.cookingFatTsp * 4.5;

  const computed = computePortionNutrition({
    food,
    unit: safeUnit,
    quantity: safeQuantity,
    cookingFatKind: item.cookingFatKind,
    cookingFatGrams,
  });

  const resolvedDraft: ParsedMealDraft = {
    name: food.name,
    servingLabel: computed.servingLabel,
    calories: computed.calories,
    proteinG: computed.proteinG,
    carbsG: computed.carbsG,
    fatG: computed.fatG,
    fiberG: computed.fiberG,
    ...(computed.sugarG !== undefined ? { sugarG: computed.sugarG } : {}),
    ...(computed.sodiumMg !== undefined ? { sodiumMg: computed.sodiumMg } : {}),
    nutritionNote: computed.nutritionNote,
    category,
    requiresReview: false,
    source: 'catalog',
    matchedFoodId: food.id,
  };

  return {
    item,
    resolvedDraft,
    isReadyToLog: true,
  };
}
