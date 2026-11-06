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
 * Splits free text like "2 boiled eggs and a banana" or "150g grilled chicken breast"
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
      // A measured amount of a dish whose label contains a dry ingredient
      // cannot be assumed to be the dry amount. Likewise, a count of an item
      // cannot automatically mean that many multi-item combo servings.
      const dryBasisUnclear = !!measure && /\b(dry|uncooked|raw)\b/i.test(matched.servingLabel);
      const compositeCount = !measure && !quantityUnit && multiplier !== 1 && /[+&]/.test(matched.servingLabel);
      const requiresReview = !match.exact || (!!measure && (!matchingMeasure || dryBasisUnclear)) || !unitMatches || compositeCount;
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
        servingLabel: measure ? `${measure.amount} ${measure.unit}` : quantityUnit
          ? `${Number(multiplier.toPrecision(6))} ${quantityUnit}${multiplier !== 1 && !['tbsp', 'tsp'].includes(quantityUnit) ? 's' : ''}`
          : `${Number(multiplier.toPrecision(6))} × ${titleCase}`,
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

/** Only explicitly reviewed aliases for simple entries may auto-fill values.
 * Search tags are discovery terms, not proof that two foods are equivalent.
 * All other phrases stay user-entered and require nutrition details. */
function findBestFoodMatch(query: string): { item: FoodItem; exact: boolean } | null {
  const normalize = (value: string) => value.toLowerCase().replace(/s\b/g, '').replace(/\s+/g, ' ').trim();
  const normalized = normalize(query);
  if (!normalized) return null;
  const safeAliases: Record<string, string[]> = {
    'food-eggs': ['boiled egg'],
    'food-banana': ['banana'],
    'food-peanut-butter': ['peanut butter'],
    'food-chicken-breast': ['grilled chicken breast'],
    'food-roti': ['roti', 'chapati', 'phulka'],
    'food-apple': ['apple'],
  };
  const matches = FOOD_CATALOG.filter(item => normalize(item.name) === normalized ||
    (safeAliases[item.id] || []).some(alias => normalize(alias) === normalized));
  return matches.length === 1 ? { item: matches[0], exact: true } : null;
}
