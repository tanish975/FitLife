import React, { useMemo, useState } from 'react';
import { Heart, Pencil, Plus, Search, Sparkles, Trash2, Utensils, X } from 'lucide-react';
import { MealShortcuts } from '../components/MealShortcuts';
import { isDemoId } from '../domain/CloudSync';
import { useFitLife } from '../data/FitLifeStore';
import { FOOD_CATALOG } from '../data/FoodCatalog';
import { LoggedMeal, MealCategory } from '../data/types';
import { parseMealFreeText, ParsedMealDraft } from '../domain/MealTextParser';
import { MealEditor } from '../components/MealEditor';
import { SegmentedSelector } from '../components/SegmentedSelector';
import { PressScale } from '../components/PressScale';
import { EmptyState } from '../components/EmptyState';
import { AnimatedCounter } from '../components/AnimatedCounter';

const CATEGORIES: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const CATALOG_PAGE_SIZE = 5;
type EditingMeal = { kind: 'new'; initial?: ParsedMealDraft } | { kind: 'quick'; index: number; initial: ParsedMealDraft } | { kind: 'logged'; id: string; initial: LoggedMeal } | { kind: 'repeat'; initial: ParsedMealDraft };

export const MealsScreen: React.FC = () => {
  const { profile, settings, todayMeals, macroTargets, logFoodItem, logQuickAddMeals, editMeal, removeMeal, toggleSavedMeal } = useFitLife();
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>('Breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(CATALOG_PAGE_SIZE);
  const [quickAddText, setQuickAddText] = useState('');
  const [draftOverrides, setDraftOverrides] = useState<Record<number, ParsedMealDraft>>({});
  const [editing, setEditing] = useState<EditingMeal | null>(null);
  const [showAllToday, setShowAllToday] = useState(false);
  const repeatMeal = (meal: LoggedMeal) => setEditing({ kind:'repeat', initial:{ ...meal, category:selectedCategory, requiresReview:false, source:'manual' } });
  const favoriteMealIds = new Set((settings.savedMeals || []).filter(x => !x.deleted).map(x => x.meal.id));
  const updateQuickText = (text: string) => { setQuickAddText(text); setDraftOverrides({}); };
  const updateSearch = (value: string) => { setSearchQuery(value); setVisibleCount(CATALOG_PAGE_SIZE); };
  const updateCategory = (value: MealCategory) => { setSelectedCategory(value); setVisibleCount(CATALOG_PAGE_SIZE); setDraftOverrides(prev => Object.fromEntries(Object.entries(prev).map(([key, draft]) => [key, { ...draft, category: value }]))); };

  const parsedQuickDrafts = useMemo(
    () => parseMealFreeText(quickAddText, selectedCategory).map((draft, index) => draftOverrides[index] || draft),
    [quickAddText, selectedCategory, draftOverrides]
  );

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedQuickDrafts.length === 0 || parsedQuickDrafts.some((draft) => draft.requiresReview)) return;
    logQuickAddMeals(parsedQuickDrafts);
    updateQuickText('');
  };

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return [...FOOD_CATALOG].sort((a, b) => {
        const aCat = a.defaultCategory === selectedCategory ? 0 : 1;
        const bCat = b.defaultCategory === selectedCategory ? 0 : 1;
        return aCat - bCat;
      });
    }
    return FOOD_CATALOG.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)) ||
        item.defaultCategory.toLowerCase().includes(q)
    );
  }, [searchQuery, selectedCategory]);

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

  return (
    <div className="space-y-4 px-4 pb-28 pt-2 animate-screen-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-[#F4F1EA]">Meals</h1>
          <p className="text-xs text-[#84877F]">Food, in one place.</p>
        </div>
        <div className="rounded-2xl border border-[#3E634B] bg-[#213026] px-3 py-1.5 text-right">
          <div className="text-[0.625rem] font-medium text-[#7BB38F]">Today’s Intake</div>
          <div className="font-heading text-xs font-bold text-[#F4F1EA]">
            <AnimatedCounter value={todayCalories} /> {profile.onboarded ? `/ ${macroTargets.calories} kcal` : 'kcal logged'}
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
      <div className="rounded-[26px] border border-[#3E634B] bg-[#1E2520] p-4" data-guide-target="meals-quick" aria-label="Quick add a meal">
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
            placeholder='Try "2 eggs and a banana" or "150g chicken & rice"'
            className="min-w-0 flex-1 rounded-2xl border border-[#2F3A33] bg-[#141916] px-3.5 py-2.5 text-xs text-[#F4F1EA] outline-none placeholder:text-[#636961] focus:border-[#6BA37E]"
          />
          <PressScale scaleDown={0.94}>
            <button
              type="submit"
              disabled={parsedQuickDrafts.length === 0 || parsedQuickDrafts.some((draft) => draft.requiresReview)}
              className="rounded-2xl bg-[#528B67] hover:bg-[#5E9A74] px-4 py-2.5 text-xs font-bold text-[#F4F1EA] disabled:opacity-40"
            >
              Add {parsedQuickDrafts.length > 0 ? `(${parsedQuickDrafts.length})` : ''}
            </button>
          </PressScale>
        </form>

        <p className="mt-2 text-[0.6875rem] leading-relaxed text-[#B8B5AD]">Values are estimates. Check each food and portion before logging.</p>

        {/* Review every amount and nutrient before adding; unknown foods never get invented values. */}
        {parsedQuickDrafts.length > 0 && <div className="meal-draft-list" aria-label="Meal preview">
          {parsedQuickDrafts.map((draft, index) => <div key={index} className="meal-draft">
            <div><strong>{draft.name}</strong><small>{draft.servingLabel}</small><small>{draft.requiresReview ? 'Nutrition details needed' : `${draft.calories} kcal · P ${draft.proteinG}g · C ${draft.carbsG}g · F ${draft.fatG}g · Fiber ${draft.fiberG}g`}</small></div>
            <button type="button" aria-label={`Review nutrition for ${draft.name}`} onClick={() => setEditing({ kind: 'quick', index, initial: draft })}>{draft.requiresReview ? 'Add details' : 'Review'}</button>
          </div>)}
        </div>}

        {/* Preset 1-Tap Quick Phrases */}
        {!quickAddText && (
          <details className="meal-examples"><summary>Examples</summary><div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              '2 eggs and a banana',
              '1 bowl oats & whey shake',
              '150g grilled chicken and brown rice',
              '2 rotis and palak paneer',
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
          </div></details>
        )}
      </div>

      <div className="meal-add-row"><div><strong>Add your own food</strong><span>Use a label or recipe.</span></div><button type="button" onClick={() => setEditing({ kind: 'new' })}><Plus size={16} /> Custom meal</button></div>
      <MealShortcuts onRepeat={repeatMeal} />

      {/* Today's Logged Meals List */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-sm font-semibold text-[#F4F1EA]">
            Logged Today ({todayMeals.length})
          </h2>
          <span className="text-xs text-[#84877F]">{todayCalories} kcal total</span>
        </div>

        {todayMeals.length === 0 ? (
          <EmptyState
            title="No Meals Logged Today"
            subtitle="Search foods below or use Quick add."
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
                      {m.servingLabel} · {m.calories} kcal · P:{m.proteinG}g · C:{m.carbsG}g · F:{m.fatG}g · Fiber:{m.fiberG}g{m.sugarG !== undefined ? ` · Sugar:${m.sugarG}g` : ''}{m.sodiumMg !== undefined ? ` · Sodium:${m.sodiumMg}mg` : ''}
                    </p>
                  </div>
                </div>

                <div className="meal-row-actions">
                  {!isDemoId(m.id) && <button type="button" aria-label={`${favoriteMealIds.has(m.id) ? 'Remove' : 'Add'} ${m.name} ${favoriteMealIds.has(m.id) ? 'from' : 'to'} favorite meals`} aria-pressed={favoriteMealIds.has(m.id)} onClick={() => toggleSavedMeal(m)}><Heart size={16} fill={favoriteMealIds.has(m.id) ? 'currentColor' : 'none'}/></button>}
                  <button type="button" aria-label={`Edit ${m.name}`} onClick={() => setEditing({ kind: 'logged', id: m.id, initial: m })}><Pencil size={15} /></button>
                  <button type="button" aria-label={`Remove ${m.name}`} onClick={() => removeMeal(m.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {todayMeals.length > 3 && <button type="button" className="meal-shortcut-more" onClick={() => setShowAllToday(v => !v)}>{showAllToday ? 'Show fewer meals' : `Show all ${todayMeals.length} meals`}</button>}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative" data-guide-target="meals-search" aria-label="Search foods">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#84877F]" />
        <input
          type="text"
          aria-label="Search foods"
          value={searchQuery}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder={`Search ${FOOD_CATALOG.length} foods (oats, paneer, chicken...)`}
          className="w-full rounded-2xl border border-[#2F3A33] bg-[#1E2520] py-2.5 pl-10 pr-9 text-xs text-[#F4F1EA] outline-none placeholder:text-[#636961] focus:border-[#6BA37E]"
        />
        {searchQuery && (
          <button
            onClick={() => updateSearch('')}
            aria-label="Clear food search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#84877F] hover:text-[#F4F1EA]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Food results update immediately; the page itself is the only vertical scroller. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-xs font-semibold uppercase tracking-wider text-[#84877F]">
            {searchQuery ? `Search Results (${filteredCatalog.length})` : `${selectedCategory} & Popular Foods`}
          </h2>
          <span className="text-[0.6875rem] text-[#7BB38F]">Tap item to log →</span>
        </div>

        {filteredCatalog.length === 0 ? (
          <EmptyState
            title="No Matching Foods Found"
            subtitle="Add your own food and enter values from a package or reliable source."
            actionLabel="Add custom meal"
            onAction={() => setEditing({ kind: 'new', initial: { name: searchQuery, servingLabel: '', category: selectedCategory, calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, requiresReview: true, source: 'unknown' } })}
          />
        ) : (
          <div>
          <div className="space-y-2 pr-0.5" data-testid="food-catalog-list">
            {filteredCatalog.slice(0, visibleCount).map((item) => (
              <PressScale
                key={item.id}
                onClick={() => logFoodItem(item, selectedCategory)}
                className="flex items-center justify-between rounded-[22px] border border-[#2F3A33] bg-[#1E2520] p-3.5 hover:border-[#528B67]"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate font-heading text-xs font-semibold text-[#F4F1EA]">
                      {item.name}
                    </h4>
                    <span className="rounded-md bg-[#2A332D] px-1.5 py-0.5 text-[0.5625rem] font-medium text-[#B8B5AD]">
                      {item.defaultCategory}
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
                    <div className="text-[0.625rem] font-semibold text-[#7BB38F]">+10 XP</div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#528B67] text-[#F4F1EA]">
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                  </div>
                </div>
              </PressScale>
            ))}
          </div>
          <p className="catalog-count" aria-live="polite">Showing {Math.min(visibleCount, filteredCatalog.length)} of {filteredCatalog.length} foods</p>
          {visibleCount < filteredCatalog.length && (
            <button type="button" className="catalog-more" onClick={() => setVisibleCount((count) => count + CATALOG_PAGE_SIZE)}>
              Show more foods ({filteredCatalog.length - visibleCount} remaining)
            </button>
          )}
          </div>
        )}
      </div>

      <details className="meal-about"><summary>About nutrition data</summary><p>FitLife tracks energy, protein, carbohydrates, fat and fiber. Sugar, sodium and a source are optional. Vitamins, most minerals and allergens are not tracked. Values vary by food and portion.</p></details>
      {editing && <MealEditor key={editing.kind === 'quick' ? `quick-${editing.index}` : editing.kind === 'logged' ? editing.id : 'new'}
        title={editing.kind === 'new' ? 'Add a custom meal' : editing.kind === 'repeat' ? 'Log again' : 'Review meal details'} initial={editing.initial} category={selectedCategory} portionScaling={editing.kind === 'repeat'}
        onClose={() => setEditing(null)} onSave={async (draft) => {
          if (editing.kind === 'quick') setDraftOverrides((previous) => ({ ...previous, [editing.index]: draft }));
          else if (editing.kind === 'logged') { if (!(await editMeal(editing.id, draft))) throw new Error('edit failed'); }
          else logQuickAddMeals([draft]);
          setEditing(null);
        }} />}
    </div>
  );
};
