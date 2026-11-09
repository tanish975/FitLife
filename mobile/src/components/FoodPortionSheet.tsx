import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MotionEntry } from './MotionEntry';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { FoodItem, LoggedMeal, MealCategory } from '../data/types';
import {
  ALLERGEN_FLAG_LABELS,
  DIETARY_FLAG_LABELS,
  EDIBLE_CATEGORY_MAP,
  FOOD_SOURCE_AUTHORITY_LABELS,
  WORLD_REGION_MAP,
  computeFoodDensityInsights,
  isLaboratoryPer100gFood,
} from '../data/WorldAtlasMeta';
import {
  COOKING_FAT_LABELS,
  COOKING_FAT_PRESETS,
  CookingFatKind,
  GLASS_LABELS,
  GlassSize,
  HouseholdUnit,
  KATORI_LABELS,
  KatoriSize,
  PREPARATION_YIELD_CONFIG,
  ROTI_STYLE_LABELS,
  RotiStyle,
  WeightBasis,
  computePortionNutrition,
  getDefaultPortionSetup,
  getEffectiveDietaryFlags,
  getEffectiveEdibleCategory,
  getEffectiveWorldRegion,
  getFoodPreparationProfile,
  supportsRawCookedToggle,
} from '../domain/IndianNutrition';

interface FoodPortionSheetProps {
  food: FoodItem;
  initialCategory: MealCategory;
  onLogMeal: (draft: Omit<LoggedMeal, 'id' | 'dateKey' | 'timestamp'>) => void;
  onSaveTemplate?: (draft: Omit<LoggedMeal, 'id' | 'dateKey' | 'timestamp'>) => void;
  onClose: () => void;
}

const CATEGORIES: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const UNIT_OPTIONS: { id: HouseholdUnit; label: string }[] = [
  { id: 'serving', label: 'Serving' },
  { id: 'katori', label: 'Katori' },
  { id: 'glass', label: 'Glass' },
  { id: 'roti', label: 'Roti' },
  { id: 'tbsp', label: 'Tbsp' },
  { id: 'tsp', label: 'Tsp' },
  { id: 'grams', label: 'Grams' },
];

export const FoodPortionSheet: React.FC<FoodPortionSheetProps> = ({
  food,
  initialCategory,
  onLogMeal,
  onSaveTemplate,
  onClose,
}) => {
  const defaults = useMemo(() => getDefaultPortionSetup(food), [food]);
  const profile = getFoodPreparationProfile(food);
  const hasRawCooked = supportsRawCookedToggle(food);
  const yieldConfig = PREPARATION_YIELD_CONFIG[profile];
  const isPureFat = profile === 'cooking_fat_oil';
  const isLabFood = isLaboratoryPer100gFood(food);

  const [category, setCategory] = useState<MealCategory>(initialCategory);
  const [unit, setUnit] = useState<HouseholdUnit>(defaults.unit);
  const [quantityText, setQuantityText] = useState<string>(String(defaults.quantity));
  const [katoriSize, setKatoriSize] = useState<KatoriSize>(defaults.katoriSize);
  const [glassSize, setGlassSize] = useState<GlassSize>(defaults.glassSize);
  const [rotiStyle, setRotiStyle] = useState<RotiStyle>(defaults.rotiStyle);
  const [basis, setBasis] = useState<WeightBasis>(defaults.basis);
  const [cookedPerRawRatio, setCookedPerRawRatio] = useState<number>(defaults.cookedPerRawRatio);
  const [cookingFatKind, setCookingFatKind] = useState<CookingFatKind>('ghee');
  const [cookingFatGrams, setCookingFatGrams] = useState<number>(0);
  const [customFatText, setCustomFatText] = useState<string>('0');
  const [error, setError] = useState<string>('');

  const dialogRef = useRef<HTMLDivElement>(null);
  useAccessibleDialog(true, dialogRef, onClose);

  const parsedQty = Number(quantityText);
  const validQty = Number.isFinite(parsedQty) && parsedQty > 0 && parsedQty <= 5000 ? parsedQty : 0;

  const result = useMemo(
    () =>
      computePortionNutrition({
        food,
        unit,
        quantity: validQty,
        katoriSize,
        glassSize,
        rotiStyle,
        basis,
        cookedPerRawRatio,
        cookingFatKind: isPureFat || cookingFatGrams <= 0 ? 'none' : cookingFatKind,
        cookingFatGrams: isPureFat ? 0 : cookingFatGrams,
      }),
    [
      food,
      unit,
      validQty,
      katoriSize,
      glassSize,
      rotiStyle,
      basis,
      cookedPerRawRatio,
      isPureFat,
      cookingFatKind,
      cookingFatGrams,
    ]
  );

  const visibleUnits = useMemo(
    () =>
      UNIT_OPTIONS.filter((opt) => {
        if (opt.id === 'serving' && isLabFood) return false;
        return true;
      }),
    [isLabFood]
  );

  const handleSwitchUnit = (nextUnit: HouseholdUnit) => {
    setUnit(nextUnit);
    setError('');
    if (nextUnit === 'grams') {
      setQuantityText(isLabFood ? '100' : String(Math.round(result.measuredGrams || 100)));
    } else if (unit === 'grams') {
      setQuantityText('1');
    }
  };

  const quickQuantities = unit === 'grams' ? [30, 50, 100, 150, 200] : [0.5, 1, 1.5, 2, 3];

  const regionMeta = WORLD_REGION_MAP[getEffectiveWorldRegion(food)];
  const categoryMeta = EDIBLE_CATEGORY_MAP[getEffectiveEdibleCategory(food)];
  const dietaryFlags = getEffectiveDietaryFlags(food);
  const density = computeFoodDensityInsights(
    result.calories,
    result.proteinG,
    result.measuredGrams || 100
  );

  const eyebrowLabel = food.ifctCode
    ? `IFCT 2017 · ${food.ifctCode}`
    : food.sourceCode
    ? food.sourceCode
    : 'HOUSEHOLD PORTION & FOOD INFO';

  const microEntries = useMemo(() => {
    const m = result.micronutrients;
    if (!m) return [];
    const items: { label: string; value: string }[] = [];
    if (m.saturatedFatG !== undefined) items.push({ label: 'Sat Fat', value: `${m.saturatedFatG}g` });
    if (m.cholesterolMg !== undefined && m.cholesterolMg > 0) {
      items.push({ label: 'Chol', value: `${m.cholesterolMg}mg` });
    }
    if (m.calciumMg !== undefined && m.calciumMg > 0) {
      items.push({ label: 'Calcium', value: `${m.calciumMg}mg` });
    }
    if (m.ironMg !== undefined && m.ironMg > 0) {
      items.push({ label: 'Iron', value: `${m.ironMg}mg` });
    }
    if (m.potassiumMg !== undefined && m.potassiumMg > 0) {
      items.push({ label: 'Potassium', value: `${m.potassiumMg}mg` });
    }
    if (m.magnesiumMg !== undefined && m.magnesiumMg > 0) {
      items.push({ label: 'Magnesium', value: `${m.magnesiumMg}mg` });
    }
    if (m.zincMg !== undefined && m.zincMg > 0) {
      items.push({ label: 'Zinc', value: `${m.zincMg}mg` });
    }
    if (m.vitaminCMg !== undefined && m.vitaminCMg > 0) {
      items.push({ label: 'Vit C', value: `${m.vitaminCMg}mg` });
    }
    if (m.folateUg !== undefined && m.folateUg > 0) {
      items.push({ label: 'Folate', value: `${m.folateUg}µg` });
    }
    if (m.vitaminB12Ug !== undefined && m.vitaminB12Ug > 0) {
      items.push({ label: 'Vit B12', value: `${m.vitaminB12Ug}µg` });
    }
    if (m.vitaminDUg !== undefined && m.vitaminDUg > 0) {
      items.push({ label: 'Vit D', value: `${m.vitaminDUg}µg` });
    }
    if (m.vitaminAUg !== undefined && m.vitaminAUg > 0) {
      items.push({ label: 'Vit A', value: `${m.vitaminAUg}µg` });
    }
    if (m.caffeineMg !== undefined && m.caffeineMg > 0) {
      items.push({ label: 'Caffeine', value: `${m.caffeineMg}mg` });
    }
    return items;
  }, [result.micronutrients]);

  const buildDraft = (): Omit<LoggedMeal, 'id' | 'dateKey' | 'timestamp'> | null => {
    if (validQty <= 0) {
      setError('Enter a portion amount greater than 0.');
      return null;
    }
    return {
      name: food.name,
      servingLabel: result.servingLabel,
      category,
      calories: result.calories,
      proteinG: result.proteinG,
      carbsG: result.carbsG,
      fatG: result.fatG,
      fiberG: result.fiberG,
      ...(result.sugarG !== undefined ? { sugarG: result.sugarG } : {}),
      ...(result.sodiumMg !== undefined ? { sodiumMg: result.sodiumMg } : {}),
      ...(result.nutritionNote ? { nutritionNote: result.nutritionNote } : {}),
    };
  };

  const handleLog = (e: React.FormEvent) => {
    e.preventDefault();
    const draft = buildDraft();
    if (!draft) return;
    onLogMeal(draft);
    onClose();
  };

  const handleSaveFavorite = () => {
    const draft = buildDraft();
    if (!draft || !onSaveTemplate) return;
    onSaveTemplate(draft);
  };

  return createPortal(
    <MotionEntry className="meal-editor-overlay" onClick={onClose}>
      <MotionEntry
        ref={dialogRef}
        className="meal-editor portion-sheet"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="portion-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="meal-editor-heading">
          <div className="min-w-0">
            <span className="training-eyebrow">{eyebrowLabel}</span>
            <h2 id="portion-sheet-title">{food.name}</h2>
            <small className="portion-vernacular">
              {food.originLabel ?? regionMeta.label} · {categoryMeta.shortLabel}
              {food.scientificName ? ` · ${food.scientificName}` : ''}
            </small>
            {food.aliases && food.aliases.length > 0 && (
              <small className="portion-vernacular">
                {food.aliases.slice(0, 4).join(' · ')}
              </small>
            )}
            {(dietaryFlags.length > 0 || (food.allergenFlags && food.allergenFlags.length > 0)) && (
              <div className="food-meta-badges" aria-label="Dietary and allergen information">
                {dietaryFlags.slice(0, 5).map((flag) => (
                  <span key={flag} className="food-meta-tag">
                    {DIETARY_FLAG_LABELS[flag]}
                  </span>
                ))}
                {(food.allergenFlags ?? []).map((alg) => (
                  <span key={alg} className="food-meta-tag allergen">
                    Contains {ALLERGEN_FLAG_LABELS[alg]}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            data-dialog-focus
            onClick={onClose}
            aria-label="Close portion options"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleLog} className="meal-editor-form portion-form">
          <div className="portion-fieldset">
            <span className="portion-section-label">Meal slot</span>
            <div className="portion-chip-row">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={category === cat}
                  onClick={() => setCategory(cat)}
                  className={category === cat ? 'portion-chip active' : 'portion-chip'}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {hasRawCooked && food.isRaw && yieldConfig && (
            <div className="portion-fieldset portion-state-box">
              <span className="portion-section-label">Raw vs cooked state</span>
              <div className="portion-chip-row">
                <button
                  type="button"
                  aria-pressed={basis === 'cooked'}
                  onClick={() => setBasis('cooked')}
                  className={basis === 'cooked' ? 'portion-chip active' : 'portion-chip'}
                >
                  Cooked / prepared
                </button>
                <button
                  type="button"
                  aria-pressed={basis === 'raw'}
                  onClick={() => setBasis('raw')}
                  className={basis === 'raw' ? 'portion-chip active' : 'portion-chip'}
                >
                  Raw / dry weight
                </button>
              </div>
              {yieldConfig.presets && basis === 'cooked' && (
                <div className="portion-preset-row">
                  {yieldConfig.presets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={Math.abs(cookedPerRawRatio - preset.ratio) < 0.05}
                      onClick={() => setCookedPerRawRatio(preset.ratio)}
                      className={
                        Math.abs(cookedPerRawRatio - preset.ratio) < 0.05
                          ? 'portion-subchip active'
                          : 'portion-subchip'
                      }
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="portion-helper-note">
                {result.rawEquivalentGrams !== undefined && result.cookedEquivalentGrams !== undefined
                  ? `${result.rawEquivalentGrams}g raw ↔ ${result.cookedEquivalentGrams}g cooked (${cookedPerRawRatio}× yield). ${yieldConfig.explanation}`
                  : yieldConfig.explanation}
              </p>
            </div>
          )}

          <div className="portion-fieldset">
            <span className="portion-section-label">Household portion</span>
            <div className="portion-chip-row">
              {visibleUnits.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={unit === opt.id}
                  onClick={() => handleSwitchUnit(opt.id)}
                  className={unit === opt.id ? 'portion-chip active' : 'portion-chip'}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {food.measuredPortions && food.measuredPortions.length > 0 && (
              <div className="portion-preset-row" aria-label="Measured household portions">
                {food.measuredPortions.map((mp) => {
                  const active =
                    unit === 'grams' && Math.abs(Number(quantityText) - mp.grams) < 0.2;
                  return (
                    <button
                      key={`${mp.label}-${mp.grams}`}
                      type="button"
                      onClick={() => {
                        setUnit('grams');
                        setQuantityText(String(mp.grams));
                        setError('');
                      }}
                      className={active ? 'portion-subchip active' : 'portion-subchip'}
                    >
                      {mp.label} ({mp.grams}g)
                    </button>
                  );
                })}
              </div>
            )}

            {unit === 'katori' && (
              <label>
                Katori size
                <select
                  aria-label="Katori size"
                  value={katoriSize}
                  onChange={(e) => setKatoriSize(e.target.value as KatoriSize)}
                >
                  {(Object.keys(KATORI_LABELS) as KatoriSize[]).map((sz) => (
                    <option key={sz} value={sz}>
                      {KATORI_LABELS[sz]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {unit === 'glass' && (
              <label>
                Glass size
                <select
                  aria-label="Glass size"
                  value={glassSize}
                  onChange={(e) => setGlassSize(e.target.value as GlassSize)}
                >
                  {(Object.keys(GLASS_LABELS) as GlassSize[]).map((sz) => (
                    <option key={sz} value={sz}>
                      {GLASS_LABELS[sz]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {unit === 'roti' && (
              <label>
                Flatbread style
                <select
                  aria-label="Flatbread style"
                  value={rotiStyle}
                  onChange={(e) => setRotiStyle(e.target.value as RotiStyle)}
                >
                  {(Object.keys(ROTI_STYLE_LABELS) as RotiStyle[]).map((st) => (
                    <option key={st} value={st}>
                      {ROTI_STYLE_LABELS[st]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              {unit === 'grams' ? 'Weight (grams)' : `Amount (${unit})`}
              <input
                type="number"
                inputMode="decimal"
                min="0.1"
                max="5000"
                step="any"
                aria-label={unit === 'grams' ? 'Weight in grams' : 'Portion quantity'}
                value={quantityText}
                onChange={(e) => {
                  setQuantityText(e.target.value);
                  setError('');
                }}
              />
            </label>

            <div className="portion-preset-row">
              {quickQuantities.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuantityText(String(q));
                    setError('');
                  }}
                  className={
                    Number(quantityText) === q ? 'portion-subchip active' : 'portion-subchip'
                  }
                >
                  {unit === 'grams' ? `${q}g` : `${q}×`}
                </button>
              ))}
            </div>
          </div>

          {!isPureFat && (
            <div className="portion-fieldset">
              <span className="portion-section-label">Oil / ghee estimation</span>
              <p className="portion-helper-note">
                {isLabFood
                  ? 'Laboratory staple values contain 0g added cooking fat. Add sautéing, tadka, or dressing oil/ghee if used:'
                  : 'Curated dishes include baseline homestyle fat. Add extra topper only if poured on top:'}
              </p>
              <label>
                Cooking fat type
                <select
                  aria-label="Cooking fat type"
                  value={cookingFatKind}
                  onChange={(e) => setCookingFatKind(e.target.value as CookingFatKind)}
                >
                  {(['ghee', 'groundnut_oil', 'oil', 'mustard_oil', 'coconut_oil'] as CookingFatKind[]).map(
                    (k) => (
                      <option key={k} value={k}>
                        {COOKING_FAT_LABELS[k]}
                      </option>
                    )
                  )}
                </select>
              </label>
              <div className="portion-chip-row">
                {COOKING_FAT_PRESETS.map((preset) => {
                  const selected = Math.abs(cookingFatGrams - preset.grams) < 0.15;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setCookingFatGrams(preset.grams);
                        setCustomFatText(String(preset.grams));
                      }}
                      className={selected ? 'portion-chip active' : 'portion-chip'}
                    >
                      {preset.label}
                      {preset.calories > 0 ? ` +${preset.calories}` : ''}
                    </button>
                  );
                })}
              </div>
              <label>
                Custom added fat (g · 1 tsp = 4.5g, 1 tbsp = 13.5g)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="200"
                  step="any"
                  aria-label="Custom added cooking fat in grams"
                  value={customFatText}
                  onChange={(e) => {
                    setCustomFatText(e.target.value);
                    const val = Number(e.target.value);
                    if (Number.isFinite(val) && val >= 0 && val <= 200) {
                      setCookingFatGrams(val);
                    }
                  }}
                />
              </label>
            </div>
          )}

          <div className="portion-summary-card" aria-live="polite">
            <div className="portion-summary-top">
              <div className="min-w-0">
                <div className="portion-summary-label">{result.servingLabel}</div>
                {result.nutritionNote && (
                  <div className="portion-summary-note">{result.nutritionNote}</div>
                )}
              </div>
              <div className="portion-summary-kcal">
                <strong>{result.calories}</strong> <span>kcal</span>
              </div>
            </div>
            <div className="portion-macro-strip">
              <span>P {result.proteinG}g</span>
              <span>C {result.carbsG}g</span>
              <span>F {result.fatG}g</span>
              <span>Fib {result.fiberG}g</span>
              {result.sugarG !== undefined && <span>Sug {result.sugarG}g</span>}
              {result.sodiumMg !== undefined && <span>Na {result.sodiumMg}mg</span>}
              {result.moistureG !== undefined && <span>Water {result.moistureG}g</span>}
            </div>

            <div className="food-density-strip">
              <span>
                Energy density: {density.kcalPer100g} kcal/100g ({density.energyDensityBand})
              </span>
              <span>Protein density: {density.proteinPer100Kcal}g / 100 kcal</span>
            </div>

            {microEntries.length > 0 && (
              <div className="food-micro-grid" aria-label="Micronutrients for selected portion">
                {microEntries.map((entry) => (
                  <div key={entry.label} className="food-micro-cell">
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </div>
            )}

            <div className="food-source-footnote">
              Source: {FOOD_SOURCE_AUTHORITY_LABELS[food.source ?? 'curated']}
              {food.provenanceNote ? ` · ${food.provenanceNote}` : ''}
            </div>
          </div>

          {error && (
            <p className="meal-editor-error" role="alert">
              {error}
            </p>
          )}

          <div className="portion-action-row">
            {onSaveTemplate && (
              <button type="button" className="portion-secondary-btn" onClick={handleSaveFavorite}>
                Save favorite
              </button>
            )}
            <button type="submit" className="meal-editor-save">
              Log to {category}
            </button>
          </div>
        </form>
      </MotionEntry>
    </MotionEntry>,
    document.body
  );
};
