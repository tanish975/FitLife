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
  category: MealCategory;
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
      const numMatch = queryPart.match(/^(\d+(?:\.\d+)?)\s*(?:cups?|bowls?|slices?|pieces?|scoops?|servings?|plates?|tbsp|tsp)?\s+(.*)$/i);
      if (numMatch) {
        multiplier = Math.max(0.25, Math.min(10, parseFloat(numMatch[1])));
        queryPart = numMatch[2].trim();
      } else {
        // Check word number like "two eggs" or "a banana"
        const wordMatch = queryPart.match(/^(a|an|one|two|three|four|five|six|half|couple)\s+(?:of\s+)?(?:cups?\s+of\s+|bowls?\s+of\s+)?(.*)$/i);
        if (wordMatch) {
          multiplier = NUMBER_WORDS[wordMatch[1].toLowerCase()] ?? 1;
          queryPart = wordMatch[2].trim();
        }
      }
    }

    if (!queryPart) continue;

    // Match against FOOD_CATALOG
    const matched = findBestFoodMatch(queryPart);
    if (matched) {
      // Catalog nutrition values are per labelled serving, not automatically per 100g.
      // Scale a mass/volume query against that serving when the label provides it.
      const servingMeasure = matched.servingLabel.match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
      const matchingMeasure = !!measure && !!servingMeasure && servingMeasure[2].toLowerCase() === measure.unit;
      const effectiveMultiplier = measure
        ? measure.amount / (matchingMeasure ? parseFloat(servingMeasure![1]) : 100)
        : multiplier;
      const displayQty = measure
        ? `${measure.amount} ${measure.unit}${matchingMeasure ? ` (catalog serving: ${matched.servingLabel})` : ` (assumes 100 ${measure.unit} per serving)`}`
        : effectiveMultiplier === 1 ? matched.servingLabel : `${Math.round(effectiveMultiplier * 10) / 10} × (${matched.servingLabel})`;

      results.push({
        name: measure ? `${measure.amount} ${measure.unit} ${matched.name}` : effectiveMultiplier !== 1 ? `${formatMultiplier(effectiveMultiplier)} ${matched.name}` : matched.name,
        servingLabel: displayQty,
        calories: Math.round(matched.calories * effectiveMultiplier),
        proteinG: Math.round(matched.proteinG * effectiveMultiplier * 10) / 10,
        carbsG: Math.round(matched.carbsG * effectiveMultiplier * 10) / 10,
        fatG: Math.round(matched.fatG * effectiveMultiplier * 10) / 10,
        fiberG: Math.round(matched.fiberG * effectiveMultiplier * 10) / 10,
        category: defaultCategory,
      });
    } else {
      // Fallback smart estimate for custom food name so quick-add always works
      const titleCase = queryPart
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      // Unknown foods have no reliable match: label the generic placeholder clearly.
      const estimateMultiplier = measure ? measure.amount / 100 : multiplier;
      const baseCalories = 160;
      results.push({
        name: `${measure ? `${measure.amount} ${measure.unit} ` : multiplier !== 1 ? `${formatMultiplier(multiplier)} ` : ''}${titleCase} (generic estimate)`,
        servingLabel: measure ? `${measure.amount} ${measure.unit} (generic 100 ${measure.unit} reference)` : `${Math.round(multiplier * 10) / 10} generic serving`,
        calories: Math.round(baseCalories * estimateMultiplier),
        proteinG: Math.round(9 * estimateMultiplier),
        carbsG: Math.round(18 * estimateMultiplier),
        fatG: Math.round(6 * estimateMultiplier),
        fiberG: Math.round(2.5 * estimateMultiplier),
        category: defaultCategory,
      });
    }
  }

  return results;
}

function formatMultiplier(n: number): string {
  return `${Math.round(n * 10) / 10}×`;
}

function findBestFoodMatch(query: string): FoodItem | null {
  const normalized = query.toLowerCase().replace(/s\b/g, '').trim();
  if (!normalized) return null;

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

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestScore >= 25 ? bestItem : null;
}
