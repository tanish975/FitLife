import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MotionEntry } from './MotionEntry';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { FOOD_CATALOG } from '../data/FoodCatalog';
import { isLaboratoryPer100gFood } from '../data/WorldAtlasMeta';
import { FoodItem, LoggedMeal, MealCategory } from '../data/types';
import {
  HouseholdUnit,
  WeightBasis,
  buildIngredientFromPortion,
  buildMealFromRecipe,
  computePortionNutrition,
  computeRecipeNutrition,
  filterAndRankFoods,
  supportsRawCookedToggle,
} from '../domain/IndianNutrition';
import type { CustomRecipe, RecipeIngredient } from '../domain/PersonalFeatures';

const CATEGORIES: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const SERVING_UNIT_PRESETS = ['katori', 'serving', 'plate', 'thepla', 'rotli', 'piece', 'glass'];

interface RecipeBuilderModalProps {
  initial?: CustomRecipe | null;
  defaultCategory: MealCategory;
  onSave: (
    draft: Omit<CustomRecipe, 'id' | 'updatedAt' | 'deleted'> & { id?: string }
  ) => boolean;
  onLogMeal?: (draft: Omit<LoggedMeal, 'id' | 'dateKey' | 'timestamp'>) => void;
  onClose: () => void;
}

export const RecipeBuilderModal: React.FC<RecipeBuilderModalProps> = ({
  initial,
  defaultCategory,
  onSave,
  onLogMeal,
  onClose,
}) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<MealCategory>(
    initial?.defaultCategory ?? defaultCategory
  );
  const [servingsYield, setServingsYield] = useState<string>(
    String(initial?.servingsYield ?? 4)
  );
  const [servingUnitLabel, setServingUnitLabel] = useState<string>(
    initial?.servingUnitLabel ?? 'katori'
  );
  const [cookedWeightText, setCookedWeightText] = useState<string>(
    initial?.cookedWeightG ? String(initial.cookedWeightG) : ''
  );
  const [cookingFatType, setCookingFatType] = useState<'none' | 'oil' | 'ghee'>(
    initial?.cookingFatType ?? 'oil'
  );
  const [cookingFatText, setCookingFatText] = useState<string>(
    String(initial?.cookingFatGrams ?? 0)
  );
  const [notes, setNotes] = useState<string>(initial?.notes ?? '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initial?.ingredients ?? []
  );

  const [ingQuery, setIngQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [ingUnit, setIngUnit] = useState<HouseholdUnit>('grams');
  const [ingQtyText, setIngQtyText] = useState<string>('100');
  const [ingBasis, setIngBasis] = useState<WeightBasis>('raw');

  const [showManualIng, setShowManualIng] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('100g');
  const [manualCals, setManualCals] = useState('');
  const [manualProt, setManualProt] = useState('0');
  const [manualCarbs, setManualCarbs] = useState('0');
  const [manualFat, setManualFat] = useState('0');
  const [manualFiber, setManualFiber] = useState('0');

  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  useAccessibleDialog(true, dialogRef, onClose);

  const matchingFoods = useMemo(() => {
    if (!ingQuery.trim()) return [];
    return filterAndRankFoods(FOOD_CATALOG, {
      query: ingQuery,
      scope: 'all',
    }).slice(0, 6);
  }, [ingQuery]);

  const handleSelectIngredientFood = (food: FoodItem) => {
    setSelectedFood(food);
    setIngQuery('');
    const hasRaw = supportsRawCookedToggle(food) && Boolean(food.isRaw);
    const isLab = isLaboratoryPer100gFood(food);
    setIngBasis(hasRaw ? 'raw' : 'as_served');
    setIngUnit(isLab ? 'grams' : 'serving');
    setIngQtyText(isLab ? '100' : '1');
  };

  const handleConfirmSelectedFood = () => {
    if (!selectedFood) return;
    const qty = Number(ingQtyText);
    if (!Number.isFinite(qty) || qty <= 0 || qty > 5000) {
      setError('Enter an ingredient amount between 0.1 and 5,000.');
      return;
    }
    const portion = computePortionNutrition({
      food: selectedFood,
      unit: ingUnit,
      quantity: qty,
      basis: ingBasis,
    });
    const id = `ing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const row = buildIngredientFromPortion(id, selectedFood, portion, ingBasis);
    setIngredients((prev) => [...prev, row]);
    setSelectedFood(null);
    setError('');
  };

  const handleAddManualIngredient = () => {
    const cleanName = manualName.trim();
    const cals = Number(manualCals);
    const prot = Number(manualProt);
    const carbs = Number(manualCarbs);
    const fat = Number(manualFat);
    const fiber = Number(manualFiber);
    if (
      !cleanName ||
      !manualCals.trim() ||
      ![cals, prot, carbs, fat, fiber].every((v) => Number.isFinite(v) && v >= 0 && v <= 5000)
    ) {
      setError('Provide manual ingredient name and non-negative calories/macros.');
      return;
    }
    const row: RecipeIngredient = {
      id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName.slice(0, 280),
      amountLabel: (manualAmount.trim() || '1 serving').slice(0, 180),
      calories: Math.round(cals),
      proteinG: Math.round(prot * 10) / 10,
      carbsG: Math.round(carbs * 10) / 10,
      fatG: Math.round(fat * 10) / 10,
      fiberG: Math.round(fiber * 10) / 10,
    };
    setIngredients((prev) => [...prev, row]);
    setManualName('');
    setManualAmount('100g');
    setManualCals('');
    setManualProt('0');
    setManualCarbs('0');
    setManualFat('0');
    setManualFiber('0');
    setShowManualIng(false);
    setError('');
  };

  const parsedYield = Number(servingsYield);
  const validYield = Number.isFinite(parsedYield) && parsedYield >= 0.1 ? parsedYield : 1;
  const parsedFatGrams = Number(cookingFatText);
  const validFatGrams =
    cookingFatType !== 'none' && Number.isFinite(parsedFatGrams) && parsedFatGrams > 0
      ? parsedFatGrams
      : 0;

  const summary = useMemo(
    () =>
      computeRecipeNutrition({
        ingredients,
        servingsYield: validYield,
        cookingFatType: validFatGrams > 0 ? cookingFatType : 'none',
        cookingFatGrams: validFatGrams,
      }),
    [ingredients, validYield, cookingFatType, validFatGrams]
  );

  const buildRecipeDraft = ():
    | (Omit<CustomRecipe, 'id' | 'updatedAt' | 'deleted'> & { id?: string })
    | null => {
    const cleanName = name.trim();
    const cleanUnit = servingUnitLabel.trim() || 'serving';
    if (!cleanName) {
      setError('Give your recipe a name (for example, Homemade Gujarati Dal).');
      return null;
    }
    if (!Number.isFinite(parsedYield) || parsedYield < 0.1 || parsedYield > 200) {
      setError('Batch yield must be between 0.1 and 200 servings.');
      return null;
    }
    if (ingredients.length === 0) {
      setError('Add at least one ingredient to calculate recipe nutrition.');
      return null;
    }
    const cookedW = cookedWeightText.trim() ? Number(cookedWeightText) : undefined;
    if (cookedW !== undefined && (!Number.isFinite(cookedW) || cookedW < 1 || cookedW > 50000)) {
      setError('Total cooked weight must be between 1g and 50,000g (or leave blank).');
      return null;
    }
    return {
      ...(initial?.id ? { id: initial.id } : {}),
      name: cleanName.slice(0, 280),
      defaultCategory: category,
      servingsYield: Math.round(parsedYield * 10) / 10,
      servingUnitLabel: cleanUnit.slice(0, 60),
      ...(cookedW !== undefined ? { cookedWeightG: Math.round(cookedW) } : {}),
      cookingFatType: validFatGrams > 0 ? cookingFatType : 'none',
      cookingFatGrams: Math.round(validFatGrams * 10) / 10,
      ...(notes.trim() ? { notes: notes.trim().slice(0, 280) } : {}),
      ingredients,
    };
  };

  const handleSubmit = (e: React.FormEvent, alsoLogServing = false) => {
    e.preventDefault();
    const draft = buildRecipeDraft();
    if (!draft) return;
    const ok = onSave(draft);
    if (!ok) return;
    if (alsoLogServing && onLogMeal) {
      const fullRecipe: CustomRecipe = {
        ...draft,
        id: draft.id ?? 'temp-recipe',
        updatedAt: Date.now(),
        deleted: false,
      };
      onLogMeal(buildMealFromRecipe(fullRecipe, { category, servings: 1 }));
    }
    onClose();
  };

  return createPortal(
    <MotionEntry className="meal-editor-overlay" onClick={onClose}>
      <MotionEntry
        ref={dialogRef}
        className="meal-editor portion-sheet"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="recipe-builder-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="meal-editor-heading">
          <div>
            <span className="training-eyebrow">CUSTOM RECIPE</span>
            <h2 id="recipe-builder-title">
              {initial ? 'Edit home recipe' : 'Create custom recipe'}
            </h2>
          </div>
          <button
            type="button"
            data-dialog-focus
            onClick={onClose}
            aria-label="Close recipe builder"
          >
            <X size={19} />
          </button>
        </div>

        <p>
          Combine raw IFCT 2017 staples, curated dishes, and batch cooking oil/ghee for exact per-katori or per-piece nutrition.
        </p>

        <form onSubmit={(e) => handleSubmit(e, false)} className="meal-editor-form">
          <label>
            Recipe name
            <input
              required
              maxLength={140}
              placeholder="e.g. Homemade Gujarati Tuver Dal"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
            />
          </label>

          <div className="meal-nutrient-grid">
            <label>
              Batch yield (servings)
              <input
                type="number"
                inputMode="decimal"
                min="0.5"
                max="200"
                step="any"
                aria-label="Batch yield servings"
                value={servingsYield}
                onChange={(e) => setServingsYield(e.target.value)}
              />
            </label>
            <label>
              Serving unit name
              <input
                list="recipe-serving-units"
                maxLength={50}
                aria-label="Serving unit name"
                value={servingUnitLabel}
                onChange={(e) => setServingUnitLabel(e.target.value)}
              />
              <datalist id="recipe-serving-units">
                {SERVING_UNIT_PRESETS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </label>
            <label>
              Default meal slot
              <select
                aria-label="Default meal slot"
                value={category}
                onChange={(e) => setCategory(e.target.value as MealCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cooked pot weight (g · optional)
              <input
                type="number"
                inputMode="decimal"
                min="1"
                max="50000"
                placeholder="e.g. 600"
                aria-label="Cooked pot weight in grams"
                value={cookedWeightText}
                onChange={(e) => setCookedWeightText(e.target.value)}
              />
            </label>
          </div>

          <div className="portion-fieldset">
            <span className="portion-section-label">Ingredients ({ingredients.length})</span>

            {ingredients.length > 0 && (
              <div className="recipe-ing-list">
                {ingredients.map((ing) => (
                  <div key={ing.id} className="recipe-ing-row">
                    <div className="min-w-0">
                      <div className="recipe-ing-name">{ing.name}</div>
                      <div className="recipe-ing-meta">
                        {ing.amountLabel} · {ing.calories} kcal · P {ing.proteinG}g · C{' '}
                        {ing.carbsG}g · F {ing.fatG}g
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ingredient ${ing.name}`}
                      onClick={() =>
                        setIngredients((prev) => prev.filter((item) => item.id !== ing.id))
                      }
                      className="recipe-ing-remove"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedFood ? (
              <div className="recipe-selected-box">
                <div className="recipe-ing-name">
                  Adding: {selectedFood.name}{' '}
                  {selectedFood.ifctCode ? `(${selectedFood.ifctCode})` : ''}
                </div>
                {supportsRawCookedToggle(selectedFood) && selectedFood.isRaw && (
                  <div className="portion-chip-row">
                    <button
                      type="button"
                      aria-pressed={ingBasis === 'raw'}
                      onClick={() => setIngBasis('raw')}
                      className={ingBasis === 'raw' ? 'portion-subchip active' : 'portion-subchip'}
                    >
                      Weighed raw/dry
                    </button>
                    <button
                      type="button"
                      aria-pressed={ingBasis === 'cooked'}
                      onClick={() => setIngBasis('cooked')}
                      className={
                        ingBasis === 'cooked' ? 'portion-subchip active' : 'portion-subchip'
                      }
                    >
                      Weighed cooked
                    </button>
                  </div>
                )}
                <div className="meal-nutrient-grid">
                  <label>
                    Unit
                    <select
                      aria-label="Ingredient unit"
                      value={ingUnit}
                      onChange={(e) => {
                        const next = e.target.value as HouseholdUnit;
                        setIngUnit(next);
                        setIngQtyText(next === 'grams' ? '100' : '1');
                      }}
                    >
                      <option value="grams">Grams (g)</option>
                      {selectedFood.source !== 'ifct2017' && (
                        <option value="serving">Catalog serving</option>
                      )}
                      <option value="katori">Medium katori (150ml)</option>
                      <option value="glass">Standard glass (200ml)</option>
                      <option value="tbsp">Tablespoon (tbsp)</option>
                      <option value="tsp">Teaspoon (tsp)</option>
                      <option value="roti">Medium roti (40g)</option>
                    </select>
                  </label>
                  <label>
                    Amount
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.1"
                      max="5000"
                      step="any"
                      aria-label="Ingredient amount"
                      value={ingQtyText}
                      onChange={(e) => setIngQtyText(e.target.value)}
                    />
                  </label>
                </div>
                <div className="portion-chip-row">
                  <button
                    type="button"
                    onClick={() => setSelectedFood(null)}
                    className="portion-subchip"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSelectedFood}
                    className="portion-chip active"
                  >
                    Add ingredient to recipe
                  </button>
                </div>
              </div>
            ) : (
              <div className="recipe-search-wrap">
                <label>
                  Search IFCT 2017 & curated ingredients
                  <input
                    type="search"
                    placeholder="Search toor dal, atta, bajri, jaggery, paneer, dudhi..."
                    aria-label="Search IFCT 2017 and curated ingredients"
                    value={ingQuery}
                    onChange={(e) => setIngQuery(e.target.value)}
                  />
                </label>
                {matchingFoods.length > 0 && (
                  <div className="recipe-search-results">
                    {matchingFoods.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => handleSelectIngredientFood(food)}
                        className="recipe-search-option"
                      >
                        <span>
                          <strong>{food.name}</strong>{' '}
                          {food.ifctCode ? `· IFCT ${food.ifctCode}` : ''}
                        </span>
                        <small>
                          {food.calories} kcal / {food.servingLabel}
                        </small>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowManualIng((v) => !v)}
                  className="portion-subchip"
                >
                  {showManualIng ? 'Hide manual label entry' : '+ Add manual label ingredient'}
                </button>
              </div>
            )}

            {showManualIng && (
              <div className="recipe-selected-box">
                <div className="meal-nutrient-grid">
                  <label>
                    Manual item name
                    <input
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="e.g. Packaged besan"
                    />
                  </label>
                  <label>
                    Amount used
                    <input
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      placeholder="e.g. 50g"
                    />
                  </label>
                  <label>
                    Calories (kcal)
                    <input
                      type="number"
                      inputMode="decimal"
                      value={manualCals}
                      onChange={(e) => setManualCals(e.target.value)}
                    />
                  </label>
                  <label>
                    Protein (g)
                    <input
                      type="number"
                      inputMode="decimal"
                      value={manualProt}
                      onChange={(e) => setManualProt(e.target.value)}
                    />
                  </label>
                  <label>
                    Carbs (g)
                    <input
                      type="number"
                      inputMode="decimal"
                      value={manualCarbs}
                      onChange={(e) => setManualCarbs(e.target.value)}
                    />
                  </label>
                  <label>
                    Fat (g)
                    <input
                      type="number"
                      inputMode="decimal"
                      value={manualFat}
                      onChange={(e) => setManualFat(e.target.value)}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleAddManualIngredient}
                  className="portion-chip active"
                >
                  Add manual ingredient
                </button>
              </div>
            )}
          </div>

          <div className="portion-fieldset">
            <span className="portion-section-label">Batch cooking oil / ghee (whole pot)</span>
            <div className="meal-nutrient-grid">
              <label>
                Fat type
                <select
                  aria-label="Batch fat type"
                  value={cookingFatType}
                  onChange={(e) =>
                    setCookingFatType(e.target.value as 'none' | 'oil' | 'ghee')
                  }
                >
                  <option value="oil">Cooking oil (groundnut / sunflower)</option>
                  <option value="ghee">Ghee</option>
                  <option value="none">No added oil/ghee</option>
                </select>
              </label>
              <label>
                Grams in whole batch
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="500"
                  step="any"
                  aria-label="Batch cooking fat in grams"
                  disabled={cookingFatType === 'none'}
                  value={cookingFatType === 'none' ? '0' : cookingFatText}
                  onChange={(e) => setCookingFatText(e.target.value)}
                />
              </label>
            </div>
            {cookingFatType !== 'none' && (
              <div className="portion-preset-row">
                {[
                  { label: '0g', grams: 0 },
                  { label: '1 tsp (4.5g)', grams: 4.5 },
                  { label: '2 tsp (9g)', grams: 9 },
                  { label: '1 tbsp (13.5g)', grams: 13.5 },
                  { label: '2 tbsp (27g)', grams: 27 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setCookingFatText(String(p.grams))}
                    className={
                      Math.abs(Number(cookingFatText) - p.grams) < 0.2
                        ? 'portion-subchip active'
                        : 'portion-subchip'
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label>
            Cooking note · optional
            <input
              maxLength={240}
              placeholder="e.g. Homestyle Gujarati tadka with mustard, curry leaves & jaggery"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <div className="portion-summary-card" aria-live="polite">
            <div className="portion-summary-top">
              <div className="min-w-0">
                <div className="portion-summary-label">
                  Per 1 {servingUnitLabel || 'serving'} (of {validYield} batch)
                </div>
                <div className="portion-summary-note">
                  Whole batch: {summary.batchCalories} kcal · P {summary.batchProteinG}g · C{' '}
                  {summary.batchCarbsG}g · F {summary.batchFatG}g
                </div>
              </div>
              <div className="portion-summary-kcal">
                <strong>{summary.perServingCalories}</strong> <span>kcal</span>
              </div>
            </div>
            <div className="portion-macro-strip">
              <span>P {summary.perServingProteinG}g</span>
              <span>C {summary.perServingCarbsG}g</span>
              <span>F {summary.perServingFatG}g</span>
              <span>Fib {summary.perServingFiberG}g</span>
            </div>
          </div>

          {error && (
            <p className="meal-editor-error" role="alert">
              {error}
            </p>
          )}

          <div className="portion-action-row">
            {onLogMeal && (
              <button
                type="button"
                className="portion-secondary-btn"
                onClick={(e) => handleSubmit(e, true)}
              >
                Save & log 1
              </button>
            )}
            <button type="submit" className="meal-editor-save">
              Save recipe
            </button>
          </div>
        </form>
      </MotionEntry>
    </MotionEntry>,
    document.body
  );
};

interface RecipeLogSheetProps {
  recipe: CustomRecipe;
  initialCategory: MealCategory;
  onLogMeal: (draft: Omit<LoggedMeal, 'id' | 'dateKey' | 'timestamp'>) => void;
  onClose: () => void;
}

export const RecipeLogSheet: React.FC<RecipeLogSheetProps> = ({
  recipe,
  initialCategory,
  onLogMeal,
  onClose,
}) => {
  const [category, setCategory] = useState<MealCategory>(initialCategory);
  const [mode, setMode] = useState<'servings' | 'grams'>('servings');
  const [servingsText, setServingsText] = useState('1');
  const [gramsText, setGramsText] = useState(
    recipe.cookedWeightG
      ? String(Math.round(recipe.cookedWeightG / Math.max(recipe.servingsYield, 1)))
      : '150'
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  useAccessibleDialog(true, dialogRef, onClose);

  const preview = useMemo(() => {
    const srv = Number(servingsText);
    const g = Number(gramsText);
    return buildMealFromRecipe(recipe, {
      category,
      ...(mode === 'grams' && recipe.cookedWeightG
        ? { cookedGrams: Number.isFinite(g) && g > 0 ? g : 100 }
        : { servings: Number.isFinite(srv) && srv > 0 ? srv : 1 }),
    });
  }, [recipe, category, mode, servingsText, gramsText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogMeal(preview);
    onClose();
  };

  return createPortal(
    <MotionEntry className="meal-editor-overlay" onClick={onClose}>
      <MotionEntry
        ref={dialogRef}
        className="meal-editor portion-sheet"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="recipe-log-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="meal-editor-heading">
          <div>
            <span className="training-eyebrow">LOG RECIPE</span>
            <h2 id="recipe-log-title">{recipe.name}</h2>
          </div>
          <button
            type="button"
            data-dialog-focus
            onClick={onClose}
            aria-label="Close recipe logger"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="meal-editor-form">
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

          {recipe.cookedWeightG && (
            <div className="portion-chip-row">
              <button
                type="button"
                aria-pressed={mode === 'servings'}
                onClick={() => setMode('servings')}
                className={mode === 'servings' ? 'portion-chip active' : 'portion-chip'}
              >
                By {recipe.servingUnitLabel}
              </button>
              <button
                type="button"
                aria-pressed={mode === 'grams'}
                onClick={() => setMode('grams')}
                className={mode === 'grams' ? 'portion-chip active' : 'portion-chip'}
              >
                By cooked grams
              </button>
            </div>
          )}

          {mode === 'grams' && recipe.cookedWeightG ? (
            <label>
              Cooked weight eaten (g · batch is {recipe.cookedWeightG}g)
              <input
                type="number"
                inputMode="decimal"
                min="1"
                max="5000"
                step="any"
                aria-label="Cooked weight eaten in grams"
                value={gramsText}
                onChange={(e) => setGramsText(e.target.value)}
              />
            </label>
          ) : (
            <div className="portion-fieldset">
              <label>
                Servings ({recipe.servingUnitLabel})
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.25"
                  max="50"
                  step="any"
                  aria-label="Recipe servings eaten"
                  value={servingsText}
                  onChange={(e) => setServingsText(e.target.value)}
                />
              </label>
              <div className="portion-preset-row">
                {[0.5, 1, 1.5, 2, 3].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setServingsText(String(q))}
                    className={
                      Number(servingsText) === q ? 'portion-subchip active' : 'portion-subchip'
                    }
                  >
                    {q}×
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="portion-summary-card" aria-live="polite">
            <div className="portion-summary-top">
              <div className="min-w-0">
                <div className="portion-summary-label">{preview.servingLabel}</div>
                {preview.nutritionNote && (
                  <div className="portion-summary-note">{preview.nutritionNote}</div>
                )}
              </div>
              <div className="portion-summary-kcal">
                <strong>{preview.calories}</strong> <span>kcal</span>
              </div>
            </div>
            <div className="portion-macro-strip">
              <span>P {preview.proteinG}g</span>
              <span>C {preview.carbsG}g</span>
              <span>F {preview.fatG}g</span>
              <span>Fib {preview.fiberG}g</span>
            </div>
          </div>

          <button type="submit" className="meal-editor-save">
            Log to {category}
          </button>
        </form>
      </MotionEntry>
    </MotionEntry>,
    document.body
  );
};
