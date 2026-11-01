import { FoodItem, MealCategory } from '../data/types';
import { FOOD_CATALOG } from '../data/FoodCatalog';

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

/**
 * Splits free text like "2 eggs and a banana" or "150g grilled chicken, 1 cup brown rice & avocado"
 * into multiple logged meal items at once.
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

    // Check gram pattern like "150g chicken" or "200 g paneer"
    const gramMatch = queryPart.match(/^(\d+(?:\.\d+)?)\s*(grams|gram|g|ml)\b\s*(.*)$/i);
    if (gramMatch) {
      const amount = parseFloat(gramMatch[1]);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) continue;
      measure = { amount, unit: gramMatch[2].toLowerCase() === 'ml' ? 'ml' : 'g' };
      queryPart = gramMatch[3].trim();
    } else {
      // Check numeric prefix like "2 eggs" or "1.5 cups oats"
      const numMatch = queryPart.match(/^(\d+(?:\.\d+)?)\s+(?:(cups?|bowls?|slices?|pieces?|scoops?|servings?|plates?|tbsp|tsp)\s+)?(?:of\s+)?(.+)$/i);
      if (numMatch) {
        multiplier = parseFloat(numMatch[1]);
        if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 100) continue;
        quantityUnit = numMatch[2]?.toLowerCase().replace(/s$/, '') || null;
        queryPart = numMatch[3].trim();
      } else {
        // Check word number like "two eggs" or "a banana"
        const wordMatch = queryPart.match(/^(a|an|one|two|three|four|five|six|half|couple)\s+(?:of\s+)?(?:(cups?|bowls?|slices?|pieces?|scoops?|servings?|plates?|tbsp|tsp)\s+of\s+)?(.*)$/i);
        if (wordMatch) {
          multiplier = NUMBER_WORDS[wordMatch[1].toLowerCase()] ?? 1;
          quantityUnit = wordMatch[2]?.toLowerCase().replace(/s$/, '') || null;
          queryPart = wordMatch[3].trim();
        }
      }
    }

    if (!queryPart) continue;

    // Match against FOOD_CATALOG
    const match = findBestFoodMatch(queryPart);
    if (match) {
      const matched = match.item;
      // Catalog nutrition values are per labelled serving, not automatically per 100g.
      // Scale a mass/volume query against that serving when the label provides it.
      const servingMeasure = matched.servingLabel.match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
      const matchingMeasure = !!measure && !!servingMeasure && servingMeasure[2].toLowerCase() === measure.unit;
      const labelUnit = matched.servingLabel.match(/(\d+(?:\.\d+)?)\s*(cups?|bowls?|slices?|pieces?|scoops?|plates?|tbsp|tsp)\b/i);
      const unitMatches = !quantityUnit || quantityUnit === 'serving' || (!!labelUnit && labelUnit[2].toLowerCase().replace(/s$/, '') === quantityUnit);
      const conflictingPreparation = /\b(dry|uncooked|raw)\b/i.test(matched.servingLabel) && /\b(cooked|boiled|steamed)\b/i.test(segment);
      const requiresReview = !match.exact || (!!measure && (!matchingMeasure || conflictingPreparation)) || !unitMatches;
      const effectiveMultiplier = measure
        ? measure.amount / (matchingMeasure ? parseFloat(servingMeasure![1]) : 100)
        : quantityUnit && quantityUnit !== 'serving' && unitMatches ? multiplier / parseFloat(labelUnit![1]) : multiplier;
      const displayQty = measure
        ? `${measure.amount} ${measure.unit}${matchingMeasure ? ` (catalog serving: ${matched.servingLabel})` : ''}`
        : quantityUnit ? `${multiplier} ${quantityUnit}${multiplier !== 1 && !['tbsp', 'tsp'].includes(quantityUnit) ? 's' : ''}` : effectiveMultiplier === 1 ? matched.servingLabel : `${Number(effectiveMultiplier.toPrecision(6))} × (${matched.servingLabel})`;

      results.push({
        name: measure ? `${measure.amount} ${measure.unit} ${matched.name}` : effectiveMultiplier !== 1 ? `${formatMultiplier(effectiveMultiplier)} ${matched.name}` : matched.name,
        servingLabel: displayQty,
        calories: requiresReview ? 0 : Math.round(matched.calories * effectiveMultiplier),
        proteinG: requiresReview ? 0 : Math.round(matched.proteinG * effectiveMultiplier * 10) / 10,
        carbsG: requiresReview ? 0 : Math.round(matched.carbsG * effectiveMultiplier * 10) / 10,
        fatG: requiresReview ? 0 : Math.round(matched.fatG * effectiveMultiplier * 10) / 10,
        fiberG: requiresReview ? 0 : Math.round(matched.fiberG * effectiveMultiplier * 10) / 10,
        category: defaultCategory,
        requiresReview,
        source: 'catalog',
      });
    } else {
      // Do not fabricate nutrition for an unrecognized food. The user supplies
      // label or recipe values in the review form before it can be logged.
      const titleCase = queryPart.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      results.push({
        name: `${measure ? `${measure.amount} ${measure.unit} ` : multiplier !== 1 ? `${formatMultiplier(multiplier)} ` : ''}${titleCase}`,
        servingLabel: measure ? `${measure.amount} ${measure.unit}` : `${Math.round(multiplier * 10) / 10} ${quantityUnit || 'serving'}${multiplier !== 1 && !['tbsp', 'tsp'].includes(quantityUnit || '') ? 's' : ''}`,
        calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0,
        category: defaultCategory, requiresReview: true, source: 'unknown',
      });
    }
  }

  return results;
}

function formatMultiplier(n: number): string {
  return `${Number(n.toPrecision(6))}×`;
}

function findBestFoodMatch(query: string): { item: FoodItem; exact: boolean } | null {
  const normalized = query.toLowerCase().replace(/s\b/g, '').trim();
  if (!normalized) return null;

  const ambiguous = new Set(['protein','breakfast','lunch','dinner','snack','indian','fruit','vegetarian','vegan','meat','fish','seafood','salad','bread','wheat','rice','carbs','healthy','bowl','shake','omega','curry','nuts','chocolate','omelette','preworkout','paneer','moong','sambar','broccoli']);
  const exactTagCount = FOOD_CATALOG.filter(item => item.tags.some(tag => tag.toLowerCase().replace(/s\b/g, '') === normalized)).length;
  let bestScore = 0;
  let bestItem: FoodItem | null = null;

  for (const item of FOOD_CATALOG) {
    const itemName = item.name.toLowerCase().replace(/s\b/g, '');
    const tags = item.tags.map((t) => t.toLowerCase().replace(/s\b/g, ''));

    let score = 0;
    if (itemName === normalized || tags.includes(normalized)) {
      score = 100;
    } else if (itemName.includes(normalized) || normalized.includes(itemName)) {
      score = 75;
    } else {
      const words = normalized.split(/\s+/);
      for (const w of words) {
        if (w.length < 2) continue;
        if ( tags.some((t) => t === w) ) score += 45;
        else if (itemName.includes(w) || tags.some((t) => t.includes(w))) score += 30;
      }
    }

    if (!(itemName === normalized || tags.includes(normalized))) score = Math.min(90, score);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  const exactName = bestItem?.name.toLowerCase().replace(/s\b/g, '') === normalized;
  return bestItem && bestScore >= 25 ? { item: bestItem, exact: bestScore === 100 && (exactName || (!ambiguous.has(normalized) && exactTagCount === 1)) } : null;
}
