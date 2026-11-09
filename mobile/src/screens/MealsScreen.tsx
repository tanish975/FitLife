import React, { useMemo, useState } from 'react';
import {
  BookmarkPlus,
  ChefHat,
  Heart,
  Pencil,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { MealShortcuts } from '../components/MealShortcuts';
import { FoodPortionSheet } from '../components/FoodPortionSheet';
import { RecipeBuilderModal, RecipeLogSheet } from '../components/RecipeBuilderModal';
import { isDemoId } from '../domain/CloudSync';
import { useFitLife } from '../data/FitLifeStore';
import {
  FOOD_CATALOG,
  READY_TO_EAT_FOOD_CATALOG,
} from '../data/FoodCatalog';
import { GLOBAL_LAB_FOOD_CATALOG } from '../data/FitLifeFoodDb';
import { IFCT_CATALOG, IFCT_GROUPS } from '../data/IfctCatalog';
import { WORLD_CULINARY_ATLAS } from '../data/WorldCulinaryAtlas';
import {
  DIETARY_FLAG_LABELS,
  EDIBLE_CATEGORIES,
  EDIBLE_CATEGORY_MAP,
  WORLD_REGIONS,
  isLaboratoryPer100gFood,
} from '../data/WorldAtlasMeta';
import {
  EdibleCategoryId,
  FoodDietaryFlag,
  FoodItem,
  LoggedMeal,
  MealCategory,
  WorldRegionId,
} from '../data/types';
import { parseMealFreeText, ParsedMealDraft } from '../domain/MealTextParser';
import {
  CatalogScopeFilter,
  filterAndRankFoods,
  getEffectiveEdibleCategory,
} from '../domain/IndianNutrition';
import type { CustomRecipe, SavedMeal } from '../domain/PersonalFeatures';
import { MealEditor } from '../components/MealEditor';
import { SegmentedSelector } from '../components/SegmentedSelector';
import { PressScale } from '../components/PressScale';
import { EmptyState } from '../components/EmptyState';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { NaturalLanguageConfirmModal } from '../components/NaturalLanguageConfirmModal';
import { analyzeNaturalLanguageMeal, type NaturalLanguageMealItem } from '../domain/NaturalLanguageMealLogger';

const CATEGORIES: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const CATALOG_PAGE_SIZE = 5;

type EditingMeal =
  | { kind: 'new'; initial?: ParsedMealDraft }
  | { kind: 'quick'; index: number; initial: ParsedMealDraft }
  | { kind: 'logged'; id: string; initial: LoggedMeal }
  | { kind: 'repeat'; initial: ParsedMealDraft }
  | { kind: 'saved_new'; initial?: ParsedMealDraft }
  | { kind: 'saved_edit'; savedId: string; initial: ParsedMealDraft };

export const MealsScreen: React.FC = () => {
  const {
    settings,
    todayMeals,
    macroTargets,
    logFoodItem,
    logQuickAddMeals,
    editMeal,
    removeMeal,
    toggleSavedMeal,
    saveMealTemplate,
    editSavedMeal,
    saveCustomRecipe,
  } = useFitLife();

  const [selectedCategory, setSelectedCategory] = useState<MealCategory>('Breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogScope, setCatalogScope] = useState<CatalogScopeFilter>('all');
  const [ifctGroupFilter, setIfctGroupFilter] = useState<string>('all');
  const [worldRegionFilter, setWorldRegionFilter] = useState<WorldRegionId | 'all'>('all');
  const [edibleCategoryFilter, setEdibleCategoryFilter] = useState<EdibleCategoryId | 'all'>('all');
  const [dietaryFilter, setDietaryFilter] = useState<FoodDietaryFlag | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(CATALOG_PAGE_SIZE);
  const [quickAddText, setQuickAddText] = useState('');
  const [draftOverrides, setDraftOverrides] = useState<Record<number, ParsedMealDraft>>({});
  const [editing, setEditing] = useState<EditingMeal | null>(null);
  const [portionFood, setPortionFood] = useState<FoodItem | null>(null);
  const [recipeModal, setRecipeModal] = useState<{ open: true; initial?: CustomRecipe } | null>(
    null
  );
  const [loggingRecipe, setLoggingRecipe] = useState<CustomRecipe | null>(null);
  const [showAllToday, setShowAllToday] = useState(false);
  const [lastRemovedMeal, setLastRemovedMeal] = useState<LoggedMeal | null>(null);
  const [nlModalOpen, setNlModalOpen] = useState(false);

  const repeatMeal = (meal: LoggedMeal) =>
    setEditing({
      kind: 'repeat',
      initial: { ...meal, category: selectedCategory, requiresReview: false, source: 'manual' },
    });

  const favoriteMealIds = new Set(
    (settings.savedMeals || []).filter((x) => !x.deleted).map((x) => x.meal.id)
  );

  const updateQuickText = (text: string) => {
    setQuickAddText(text);
    setDraftOverrides({});
  };

  const updateSearch = (value: string) => {
    setSearchQuery(value);
    setVisibleCount(CATALOG_PAGE_SIZE);
  };

  const updateCategory = (value: MealCategory) => {
    setSelectedCategory(value);
    setVisibleCount(CATALOG_PAGE_SIZE);
    setDraftOverrides((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, draft]) => [key, { ...draft, category: value }])
      )
    );
  };

  const parsedQuickDrafts = useMemo(
    () =>
      parseMealFreeText(quickAddText, selectedCategory).map(
        (draft, index) => draftOverrides[index] || draft
      ),
    [quickAddText, selectedCategory, draftOverrides]
  );

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      parsedQuickDrafts.length === 0 ||
      parsedQuickDrafts.some((draft) => draft.requiresReview)
    ) {
      return;
    }
    logQuickAddMeals(parsedQuickDrafts);
    updateQuickText('');
  };

  const filteredCatalog = useMemo(
    () =>
      filterAndRankFoods(FOOD_CATALOG, {
        query: searchQuery,
        scope: catalogScope,
        ifctGroup: ifctGroupFilter,
        worldRegion: worldRegionFilter,
        edibleCategory: edibleCategoryFilter,
        dietaryFlag: dietaryFilter,
        preferredCategory: selectedCategory,
      }),
    [
      searchQuery,
      catalogScope,
      ifctGroupFilter,
      worldRegionFilter,
      edibleCategoryFilter,
      dietaryFilter,
      selectedCategory,
    ]
  );

  const todayCalories = useMemo(
    () => todayMeals.reduce((s, m) => s + m.calories, 0),
    [todayMeals]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<MealCategory, number> = {
      Breakfast: 0,
      Lunch: 0,
      Dinner: 0,
      Snack: 0,
    };
    for (const m of todayMeals) {
      counts[m.category] = (counts[m.category] || 0) + 1;
    }
    return counts;
  }, [todayMeals]);

  const realMealsInSelectedCategory = useMemo(
    () => todayMeals.filter((m) => m.category === selectedCategory && !isDemoId(m.id)),
    [todayMeals, selectedCategory]
  );

  const handleSaveCategoryCombo = () => {
    if (realMealsInSelectedCategory.length < 2) return;
    const round1 = (n: number) => Math.round(n * 10) / 10;
    const names = realMealsInSelectedCategory.map((m) => m.name);
    const comboName = `${selectedCategory} Combo: ${names.slice(0, 3).join(' + ')}${
      names.length > 3 ? ` (+${names.length - 3})` : ''
    }`.slice(0, 120);
    const comboServing = realMealsInSelectedCategory
      .map((m) => `${m.name} (${m.servingLabel})`)
      .join(' + ')
      .slice(0, 260);
    saveMealTemplate({
      name: comboName,
      servingLabel: comboServing,
      category: selectedCategory,
      calories: Math.round(
        realMealsInSelectedCategory.reduce((s, m) => s + m.calories, 0)
      ),
      proteinG: round1(
        realMealsInSelectedCategory.reduce((s, m) => s + m.proteinG, 0)
      ),
      carbsG: round1(
        realMealsInSelectedCategory.reduce((s, m) => s + m.carbsG, 0)
      ),
      fatG: round1(realMealsInSelectedCategory.reduce((s, m) => s + m.fatG, 0)),
      fiberG: round1(
        realMealsInSelectedCategory.reduce((s, m) => s + m.fiberG, 0)
      ),
      nutritionNote: `Saved ${selectedCategory.toLowerCase()} combination (${realMealsInSelectedCategory.length} items)`,
    });
  };

  const handleRemoveWithUndo = (meal: LoggedMeal) => {
    setLastRemovedMeal(meal);
    removeMeal(meal.id);
  };

  const handleUndoRemove = () => {
    if (!lastRemovedMeal) return;
    logQuickAddMeals([
      {
        name: lastRemovedMeal.name,
        servingLabel: lastRemovedMeal.servingLabel,
        category: lastRemovedMeal.category,
        calories: lastRemovedMeal.calories,
        proteinG: lastRemovedMeal.proteinG,
        carbsG: lastRemovedMeal.carbsG,
        fatG: lastRemovedMeal.fatG,
        fiberG: lastRemovedMeal.fiberG,
        sugarG: lastRemovedMeal.sugarG,
        sodiumMg: lastRemovedMeal.sodiumMg,
        nutritionNote: lastRemovedMeal.nutritionNote,
        requiresReview: false,
        source: 'manual',
      },
    ]);
    setLastRemovedMeal(null);
  };

  const handleLogDraftObject = (draft: Omit<LoggedMeal, 'id' | 'dateKey' | 'timestamp'>) => {
    logQuickAddMeals([
      {
        ...draft,
        requiresReview: false,
        source: 'catalog',
      },
    ]);
  };

  const handleNlConfirm = (items: NaturalLanguageMealItem[]) => {
    setNlModalOpen(false);
  };

  const handlePrimaryCatalogTap = (item: FoodItem) => {
    // Per-100g laboratory references (IFCT 2017, USDA SR28, UNICAMP TACO, ANSES CIQUAL)
    // open the portion + raw/cooked + cooking-fat + micronutrient sheet so users never confuse raw 100g with cooked.
    if (isLaboratoryPer100gFood(item)) {
      setPortionFood(item);
      return;
    }
    logFoodItem(item, selectedCategory);
  };

  return (
    <div className="space-y-4 px-4 pb-28 pt-2 animate-screen-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-[#F4F1EA]">Meals</h1>
          <p className="text-xs text-[#84877F]">Indian & global nutrition, in one place.</p>
        </div>
        <div className="rounded-2xl border border-[#3E634B] bg-[#213026] px-3 py-1.5 text-right">
          <div className="text-[0.625rem] font-medium text-[#7BB38F]">Today’s Intake</div>
          <div className="font-heading text-xs font-bold text-[#F4F1EA]">
            <AnimatedCounter value={todayCalories} />{' '}
            {macroTargets ? `/ ${macroTargets.calories} kcal` : 'kcal logged'}
          </div>
        </div>
      </div>

      {/* Category Selector */}
      <div data-guide-target="meals-category" aria-label="Meal category">
        <SegmentedSelector<MealCategory>
          scrollable
          options={CATEGORIES.map((c) => ({
            value: c,
            label: c,
            badge: categoryCounts[c] > 0 ? categoryCounts[c] : undefined,
          }))}
          selected={selectedCategory}
          onChange={updateCategory}
        />
      </div>

      {/* Quick-Add Natural Text Parser Card */}
      <div
        className="rounded-[26px] border border-[#3E634B] bg-[#1E2520] p-4"
        data-guide-target="meals-quick"
        aria-label="Quick add a meal"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7BB38F]">
            <Sparkles className="h-3.5 w-3.5" /> Quick add a meal
          </span>
          <span className="text-[0.625rem] text-[#84877F]">Logging to {selectedCategory}</span>
        </div>

        <form onSubmit={handleQuickAddSubmit} className="flex gap-2">
          <input
            type="text"
            aria-label="Describe a meal"
            value={quickAddText}
            onChange={(e) => updateQuickText(e.target.value)}
            placeholder='Try "1 katori gujarati dal and 2 rotis"'
            className="min-w-0 flex-1 rounded-2xl border border-[#2F3A33] bg-[#141916] px-3.5 py-2.5 text-xs text-[#F4F1EA] outline-none placeholder:text-[#636961] focus:border-[#6BA37E]"
          />
          <PressScale scaleDown={0.94}>
            <button
              type="submit"
              disabled={
                parsedQuickDrafts.length === 0 ||
                parsedQuickDrafts.some((draft) => draft.requiresReview)
              }
              className="rounded-2xl bg-[#528B67] hover:bg-[#5E9A74] px-4 py-2.5 text-xs font-bold text-[#F4F1EA] disabled:opacity-40"
            >
              Add {parsedQuickDrafts.length > 0 ? `(${parsedQuickDrafts.length})` : ''}
            </button>
          </PressScale>
        </form>

        <p className="mt-2 text-[0.6875rem] leading-relaxed text-[#B8B5AD]">
          Supports katori, glass, tbsp, tsp, roti, and grams. Ambiguous raw-vs-cooked or preparation queries ask for review instead of guessing.
        </p>

        {/* Review every amount and nutrient before adding; unknown foods never get invented values. */}
        {parsedQuickDrafts.length > 0 && (
          <div className="meal-draft-list" aria-label="Meal preview">
            {parsedQuickDrafts.map((draft, index) => (
              <div key={index} className="meal-draft">
                <div>
                  <strong>{draft.name}</strong>
                  <small>{draft.servingLabel}</small>
                  <small>
                    {draft.requiresReview
                      ? 'Nutrition details needed'
                      : `${draft.calories} kcal · P ${draft.proteinG}g · C ${draft.carbsG}g · F ${draft.fatG}g · Fiber ${draft.fiberG}g`}
                  </small>
                </div>
                <button
                  type="button"
                  aria-label={`Review nutrition for ${draft.name}`}
                  onClick={() => setEditing({ kind: 'quick', index, initial: draft })}
                >
                  {draft.requiresReview ? 'Add details' : 'Review'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Preset 1-Tap Quick Phrases */}
        {!quickAddText && (
          <details className="meal-examples">
            <summary>Examples</summary>
            <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                '1 katori gujarati dal and 2 thin gujarati rotli',
                '2 methi thepla and 1 glass chaas',
                '2 boiled eggs and a banana',
                '2 rotis with 1 tsp ghee',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => updateQuickText(sample)}
                  className="shrink-0 rounded-full border border-[#2F3A33] bg-[#141916] px-2.5 py-1 text-[0.625rem] text-[#B8B5AD] hover:border-[#528B67] hover:text-[#7BB38F]"
                >
                  “{sample}”
                </button>
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="meal-add-row">
        <div>
          <strong>Add your own food or recipe</strong>
          <span>Use a package label or build a multi-ingredient home recipe.</span>
        </div>
        <div className="meal-add-buttons">
          <button type="button" onClick={() => setRecipeModal({ open: true })}>
            <ChefHat size={15} /> Recipe
          </button>
          <button type="button" onClick={() => setEditing({ kind: 'new' })}>
            <Plus size={16} /> Custom meal
          </button>
          <button
            type="button"
            aria-label="Open natural-language meal confirmation"
            onClick={() => setNlModalOpen(true)}
            className="meal-combo-btn"
          >
            <Sparkles size={13} /> Confirm by voice/text
          </button>
        </div>
      </div>

      <MealShortcuts
        onRepeat={repeatMeal}
        onNewSavedMeal={() => setEditing({ kind: 'saved_new' })}
        onEditSavedMeal={(saved: SavedMeal) =>
          setEditing({
            kind: 'saved_edit',
            savedId: saved.id,
            initial: { ...saved.meal, requiresReview: false, source: 'manual' },
          })
        }
        onCreateRecipe={() => setRecipeModal({ open: true })}
        onEditRecipe={(recipe) => setRecipeModal({ open: true, initial: recipe })}
        onLogRecipe={(recipe) => setLoggingRecipe(recipe)}
      />

      {/* Today's Logged Meals List */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">
            Logged Today ({todayMeals.length})
          </h2>
          <div className="flex items-center gap-2">
            {realMealsInSelectedCategory.length >= 2 && (
              <button
                type="button"
                onClick={handleSaveCategoryCombo}
                className="meal-combo-btn"
              >
                <BookmarkPlus size={13} /> Save {selectedCategory} combo
              </button>
            )}
            <span className="text-xs text-[#84877F]">{todayCalories} kcal total</span>
          </div>
        </div>

        {lastRemovedMeal && (
          <div className="meal-undo-bar" role="status">
            <span>Removed {lastRemovedMeal.name}</span>
            <button type="button" onClick={handleUndoRemove}>
              <RotateCcw size={13} /> Undo
            </button>
          </div>
        )}

        {todayMeals.length === 0 ? (
          <EmptyState
            title="No Meals Logged Today"
            subtitle="Search curated & IFCT 2017 foods below or use Quick add."
          />
        ) : (
          <div className="space-y-2">
            {todayMeals.slice(0, showAllToday ? todayMeals.length : 3).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-[22px] border border-[#2F3A33] bg-[#141916] p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#213026] text-[#7BB38F] border border-[#3E634B]">
                    <Utensils className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="truncate font-heading text-xs font-semibold text-[#F4F1EA]">
                        {m.name}
                      </h4>
                      <span className="rounded bg-[#213026] px-1.5 py-0.5 text-[0.5625rem] font-semibold text-[#7BB38F]">
                        {m.category}
                      </span>
                    </div>
                    <p className="truncate text-[0.6875rem] text-[#84877F]">
                      {m.servingLabel} · {m.calories} kcal · P:{m.proteinG}g · C:{m.carbsG}g · F:
                      {m.fatG}g · Fiber:{m.fiberG}g
                      {m.sugarG !== undefined ? ` · Sugar:${m.sugarG}g` : ''}
                      {m.sodiumMg !== undefined ? ` · Sodium:${m.sodiumMg}mg` : ''}
                    </p>
                  </div>
                </div>

                <div className="meal-row-actions">
                  {!isDemoId(m.id) && (
                    <button
                      type="button"
                      aria-label={`${favoriteMealIds.has(m.id) ? 'Remove' : 'Add'} ${m.name} ${
                        favoriteMealIds.has(m.id) ? 'from' : 'to'
                      } favorite meals`}
                      aria-pressed={favoriteMealIds.has(m.id)}
                      onClick={() => toggleSavedMeal(m)}
                    >
                      <Heart
                        size={16}
                        fill={favoriteMealIds.has(m.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Edit ${m.name}`}
                    onClick={() => setEditing({ kind: 'logged', id: m.id, initial: m })}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${m.name}`}
                    onClick={() => handleRemoveWithUndo(m)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {todayMeals.length > 3 && (
              <button
                type="button"
                className="meal-shortcut-more"
                onClick={() => setShowAllToday((v) => !v)}
              >
                {showAllToday ? 'Show fewer meals' : `Show all ${todayMeals.length} meals`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search Bar & FitLife FoodDB Atlas Filters */}
      <div className="space-y-2.5">
        <div className="relative" data-guide-target="meals-search" aria-label="Search foods">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#84877F]" />
          <input
            type="text"
            aria-label="Search foods"
            value={searchQuery}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder={`Search ${FOOD_CATALOG.length} global & Indian foods, countries, or codes (rotli, ramen, jollof, acai, quinoa...)`}
            className="w-full rounded-2xl border border-[#2F3A33] bg-[#1E2520] py-2.5 pl-10 pr-11 text-xs text-[#F4F1EA] outline-none placeholder:text-[#636961] focus:border-[#6BA37E]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => updateSearch('')}
              aria-label="Clear food search"
              className="catalog-clear-btn"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="catalog-filter-bar" role="group" aria-label="Filter food source">
          {(
            [
              { id: 'all', label: `All (${FOOD_CATALOG.length})` },
              { id: 'curated', label: `Curated (${READY_TO_EAT_FOOD_CATALOG.length})` },
              { id: 'world-atlas', label: `World Atlas (${WORLD_CULINARY_ATLAS.length})` },
              { id: 'gujarati', label: 'Gujarati' },
              { id: 'ifct', label: `IFCT 2017 (${IFCT_CATALOG.length})` },
              { id: 'global-lab', label: `Global Lab (${GLOBAL_LAB_FOOD_CATALOG.length})` },
            ] as { id: CatalogScopeFilter; label: string }[]
          ).map((scope) => (
            <button
              key={scope.id}
              type="button"
              aria-pressed={catalogScope === scope.id}
              onClick={() => {
                setCatalogScope(scope.id);
                if (scope.id !== 'ifct') setIfctGroupFilter('all');
                setVisibleCount(CATALOG_PAGE_SIZE);
              }}
              className={catalogScope === scope.id ? 'catalog-pill active' : 'catalog-pill'}
            >
              {scope.label}
            </button>
          ))}
        </div>

        <div className="catalog-atlas-grid">
          <label className="catalog-group-filter">
            <span className="sr-only">Filter by world region</span>
            <select
              aria-label="Filter by world region"
              value={worldRegionFilter}
              onChange={(e) => {
                setWorldRegionFilter(e.target.value as WorldRegionId | 'all');
                setVisibleCount(CATALOG_PAGE_SIZE);
              }}
            >
              <option value="all">All 17 world regions & countries</option>
              {WORLD_REGIONS.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.label} ({reg.countriesSample.split(',').slice(0, 3).join(', ')})
                </option>
              ))}
            </select>
          </label>

          <label className="catalog-group-filter">
            <span className="sr-only">Filter by edible category</span>
            <select
              aria-label="Filter by edible category"
              value={edibleCategoryFilter}
              onChange={(e) => {
                setEdibleCategoryFilter(e.target.value as EdibleCategoryId | 'all');
                setVisibleCount(CATALOG_PAGE_SIZE);
              }}
            >
              <option value="all">All 18 edible categories</option>
              {EDIBLE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>

          <label className="catalog-group-filter">
            <span className="sr-only">Filter by dietary preference</span>
            <select
              aria-label="Filter by dietary preference"
              value={dietaryFilter}
              onChange={(e) => {
                setDietaryFilter(e.target.value as FoodDietaryFlag | 'all');
                setVisibleCount(CATALOG_PAGE_SIZE);
              }}
            >
              <option value="all">All dietary patterns</option>
              {(
                [
                  'vegetarian',
                  'vegan',
                  'high-protein',
                  'high-fiber',
                  'gluten-free',
                  'dairy-free',
                  'pescatarian',
                  'fermented',
                ] as FoodDietaryFlag[]
              ).map((flag) => (
                <option key={flag} value={flag}>
                  {DIETARY_FLAG_LABELS[flag]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {catalogScope === 'ifct' && (
          <label className="catalog-group-filter">
            <span className="sr-only">Filter by IFCT food group</span>
            <select
              aria-label="Filter by IFCT food group"
              value={ifctGroupFilter}
              onChange={(e) => {
                setIfctGroupFilter(e.target.value);
                setVisibleCount(CATALOG_PAGE_SIZE);
              }}
            >
              <option value="all">All 20 ICMR-NIN IFCT food groups</option>
              {IFCT_GROUPS.map((grp) => (
                <option key={grp} value={grp}>
                  IFCT: {grp}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Food results update immediately; the page itself is the only vertical scroller. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-xs font-semibold uppercase tracking-wider text-[#84877F]">
            {searchQuery
              ? `Search Results (${filteredCatalog.length})`
              : catalogScope === 'ifct'
              ? `ICMR-NIN IFCT 2017 (${filteredCatalog.length})`
              : catalogScope === 'world-atlas'
              ? `World Culinary Atlas (${filteredCatalog.length})`
              : catalogScope === 'global-lab'
              ? `USDA · TACO · CIQUAL Lab (${filteredCatalog.length})`
              : catalogScope === 'gujarati'
              ? `Gujarati Dishes & Staples (${filteredCatalog.length})`
              : `${selectedCategory} & Global FoodDB (${filteredCatalog.length})`}
          </h2>
          <span className="text-[0.6875rem] text-[#7BB38F]">Tap to log · Scale for info/portion</span>
        </div>

        {filteredCatalog.length === 0 ? (
          <EmptyState
            title="No Matching Foods Found"
            subtitle="Add your own food and enter values from a package or reliable source."
            actionLabel="Add custom meal"
            onAction={() =>
              setEditing({
                kind: 'new',
                initial: {
                  name: searchQuery,
                  servingLabel: '',
                  category: selectedCategory,
                  calories: 0,
                  proteinG: 0,
                  carbsG: 0,
                  fatG: 0,
                  fiberG: 0,
                  requiresReview: true,
                  source: 'unknown',
                },
              })
            }
          />
        ) : (
          <div>
            <p className="text-xs leading-relaxed text-[#B8B5AD]">
              FitLife FoodDB unifies curated world & Indian dishes with ICMR-NIN IFCT 2017, USDA SR28, UNICAMP TACO, and ANSES CIQUAL per-100g laboratory references; tap the scale icon on any food for micronutrients, allergens, household portions, raw vs cooked yields, and cooking fat.
            </p>
            <div className="space-y-2 pr-0.5 mt-2" data-testid="food-catalog-list">
              {filteredCatalog.slice(0, visibleCount).map((item) => {
                const isLab = isLaboratoryPer100gFood(item);
                const catLabel =
                  EDIBLE_CATEGORY_MAP[getEffectiveEdibleCategory(item)]?.shortLabel ?? item.defaultCategory;
                return (
                  <div
                    key={item.id}
                    data-food-id={item.id}
                    className="food-catalog-row rounded-[22px] border border-[#2F3A33] bg-[#1E2520] hover:border-[#528B67]"
                  >
                    <PressScale
                      onClick={() => handlePrimaryCatalogTap(item)}
                      className="food-open flex flex-1 min-w-0 items-center justify-between p-3.5"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="truncate font-heading text-xs font-semibold text-[#F4F1EA]">
                            {item.name}
                          </h4>
                          {item.ifctCode ? (
                            <span className="rounded-md bg-[#213026] border border-[#3E634B] px-1.5 py-0.5 text-[0.5625rem] font-semibold text-[#7BB38F]">
                              IFCT {item.ifctCode}
                            </span>
                          ) : item.sourceCode ? (
                            <span className="rounded-md bg-[#213026] border border-[#3E634B] px-1.5 py-0.5 text-[0.5625rem] font-semibold text-[#7BB38F]">
                              {item.sourceCode}
                            </span>
                          ) : (
                            <span className="rounded-md bg-[#2A332D] px-1.5 py-0.5 text-[0.5625rem] font-medium text-[#B8B5AD]">
                              {item.defaultCategory}
                            </span>
                          )}
                          <span className="rounded-md bg-[#2A332D] px-1.5 py-0.5 text-[0.5625rem] font-medium text-[#B8B5AD]">
                            {item.originLabel ? item.originLabel.split('·')[0].trim() : catLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[0.6875rem] text-[#84877F]">
                          {item.servingLabel} ·{' '}
                          <span className="text-[#7BB38F]">P:{item.proteinG}g</span>{' '}
                          <span className="text-[#D8C39E]">C:{item.carbsG}g</span>{' '}
                          <span className="text-[#E0B467]">F:{item.fatG}g</span>{' '}
                          <span>Fiber:{item.fiberG}g</span>
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <div className="text-right">
                          <div className="font-heading text-xs font-bold text-[#F4F1EA]">
                            {item.calories} kcal
                          </div>
                          <div className="text-[0.625rem] font-semibold text-[#7BB38F]">
                            {isLab ? 'Portion →' : '+10 XP'}
                          </div>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#528B67] text-[#F4F1EA]">
                          <Plus className="h-4 w-4 stroke-[2.5]" />
                        </div>
                      </div>
                    </PressScale>

                    <button
                      type="button"
                      className="food-portion-btn"
                      aria-label={`Portion, raw or cooked, and oil for ${item.name}`}
                      onClick={() => setPortionFood(item)}
                    >
                      <Scale size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="catalog-count" aria-live="polite">
              Showing {Math.min(visibleCount, filteredCatalog.length)} of {filteredCatalog.length}{' '}
              foods
            </p>
            {visibleCount < filteredCatalog.length && (
              <button
                type="button"
                className="catalog-more"
                onClick={() => setVisibleCount((count) => count + CATALOG_PAGE_SIZE)}
              >
                Show more foods ({filteredCatalog.length - visibleCount} remaining)
              </button>
            )}
          </div>
        )}
      </div>

      <details className="meal-about">
        <summary>About FitLife FoodDB & global scientific sources</summary>
        <p>
          FitLife FoodDB covers {FOOD_CATALOG.length} foods across 17 world regions, 85+ countries, and 18 edible categories — combining FitLife’s World & Indian Culinary Atlas with four open laboratory tables: ICMR-NIN IFCT 2017 (India, MIT), USDA ARS SR28 (U.S. Public Domain), UNICAMP TACO 4th Ed. (Brazil, MIT), and ANSES CIQUAL (France/EU, Open Licence 2.0 / MIT). Tap the scale icon on any food to inspect micronutrients, dietary/allergen flags, raw-vs-cooked hydration yields, and added cooking fat.
        </p>
      </details>

      {portionFood && (
        <FoodPortionSheet
          food={portionFood}
          initialCategory={selectedCategory}
          onLogMeal={handleLogDraftObject}
          onSaveTemplate={(draft) => saveMealTemplate(draft)}
          onClose={() => setPortionFood(null)}
        />
      )}

      {recipeModal && (
        <RecipeBuilderModal
          initial={recipeModal.initial}
          defaultCategory={selectedCategory}
          onSave={saveCustomRecipe}
          onLogMeal={handleLogDraftObject}
          onClose={() => setRecipeModal(null)}
        />
      )}

      {loggingRecipe && (
        <RecipeLogSheet
          recipe={loggingRecipe}
          initialCategory={selectedCategory}
          onLogMeal={handleLogDraftObject}
          onClose={() => setLoggingRecipe(null)}
        />
      )}

      {editing && (
        <MealEditor
          key={
            editing.kind === 'quick'
              ? `quick-${editing.index}`
              : editing.kind === 'logged'
              ? editing.id
              : editing.kind === 'saved_edit'
              ? editing.savedId
              : editing.kind
          }
          title={
            editing.kind === 'new'
              ? 'Add a custom meal'
              : editing.kind === 'saved_new'
              ? 'Save a meal template'
              : editing.kind === 'saved_edit'
              ? 'Edit saved meal'
              : editing.kind === 'repeat'
              ? 'Log again'
              : 'Review meal details'
          }
          initial={editing.initial}
          category={selectedCategory}
          portionScaling={editing.kind === 'repeat'}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            if (editing.kind === 'quick') {
              setDraftOverrides((previous) => ({ ...previous, [editing.index]: draft }));
            } else if (editing.kind === 'logged') {
              if (!(await editMeal(editing.id, draft))) throw new Error('edit failed');
            } else if (editing.kind === 'saved_new') {
              if (
                !saveMealTemplate({
                  name: draft.name,
                  servingLabel: draft.servingLabel,
                  category: draft.category,
                  calories: draft.calories,
                  proteinG: draft.proteinG,
                  carbsG: draft.carbsG,
                  fatG: draft.fatG,
                  fiberG: draft.fiberG,
                  sugarG: draft.sugarG,
                  sodiumMg: draft.sodiumMg,
                  nutritionNote: draft.nutritionNote,
                })
              ) {
                throw new Error('save template failed');
              }
            } else if (editing.kind === 'saved_edit') {
              if (
                !editSavedMeal(editing.savedId, {
                  name: draft.name,
                  servingLabel: draft.servingLabel,
                  category: draft.category,
                  calories: draft.calories,
                  proteinG: draft.proteinG,
                  carbsG: draft.carbsG,
                  fatG: draft.fatG,
                  fiberG: draft.fiberG,
                  sugarG: draft.sugarG,
                  sodiumMg: draft.sodiumMg,
                  nutritionNote: draft.nutritionNote,
                })
              ) {
                throw new Error('edit template failed');
              }
            } else {
              logQuickAddMeals([draft]);
            }
            setEditing(null);
          }}
        />
      )}

      <NaturalLanguageConfirmModal
        open={nlModalOpen}
        onClose={() => setNlModalOpen(false)}
        onAnalyze={(rawText, category) => {
          setNlModalOpen(true);
        }}
        onConfirmItems={handleNlConfirm}
      />
    </div>
  );
};
