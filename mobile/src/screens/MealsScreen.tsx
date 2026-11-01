import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Sparkles, Trash2, Utensils, X } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { FOOD_CATALOG } from '../data/FoodCatalog';
import { MealCategory } from '../data/types';
import { parseMealFreeText } from '../domain/MealTextParser';
import { SegmentedSelector } from '../components/SegmentedSelector';
import { PressScale } from '../components/PressScale';
import { Shimmer } from '../components/Shimmer';
import { EmptyState } from '../components/EmptyState';
import { AnimatedCounter } from '../components/AnimatedCounter';

const CATEGORIES: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export const MealsScreen: React.FC = () => {
  const { todayMeals, macroTargets, logFoodItem, logQuickAddMeals, removeMeal } = useFitLife();
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>('Breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');

  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(() => setIsSearching(false), 320);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const parsedQuickDrafts = useMemo(
    () => parseMealFreeText(quickAddText, selectedCategory),
    [quickAddText, selectedCategory]
  );

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedQuickDrafts.length === 0) return;
    logQuickAddMeals(parsedQuickDrafts);
    setQuickAddText('');
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
          <h1 className="font-heading text-xl font-bold text-[#F4F1EA]">Meals & Nutrition</h1>
          <p className="text-xs text-[#84877F]">
            Tap any food to log (+10 XP) or quick-parse natural text
          </p>
        </div>
        <div className="rounded-2xl border border-[#3E634B] bg-[#213026] px-3 py-1.5 text-right">
          <div className="text-[10px] font-medium text-[#7BB38F]">Today’s Intake</div>
          <div className="font-heading text-xs font-bold text-[#F4F1EA]">
            <AnimatedCounter value={todayCalories} /> / {macroTargets.calories} kcal
          </div>
        </div>
      </div>

      {/* Category Selector */}
      <SegmentedSelector<MealCategory>
        scrollable
        options={CATEGORIES.map((c) => ({
          value: c,
          label: c,
          badge: categoryCounts[c] > 0 ? categoryCounts[c] : undefined,
        }))}
        selected={selectedCategory}
        onChange={setSelectedCategory}
      />

      {/* Quick-Add Natural Text Parser Card */}
      <div className="rounded-[26px] border border-[#3E634B] bg-[#1E2520] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7BB38F]">
            <Sparkles className="h-3.5 w-3.5" /> Quick Add Free-Text Parser
          </span>
          <span className="text-[10px] text-[#84877F]">Logging to {selectedCategory}</span>
        </div>

        <form onSubmit={handleQuickAddSubmit} className="flex gap-2">
          <input
            type="text"
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            placeholder='Try "2 eggs and a banana" or "150g chicken & rice"'
            className="min-w-0 flex-1 rounded-2xl border border-[#2F3A33] bg-[#141916] px-3.5 py-2.5 text-xs text-[#F4F1EA] outline-none placeholder:text-[#636961] focus:border-[#6BA37E]"
          />
          <PressScale scaleDown={0.94}>
            <button
              type="submit"
              disabled={parsedQuickDrafts.length === 0}
              className="rounded-2xl bg-[#528B67] hover:bg-[#5E9A74] px-4 py-2.5 text-xs font-bold text-[#F4F1EA] disabled:opacity-40"
            >
              Add {parsedQuickDrafts.length > 0 ? `(${parsedQuickDrafts.length})` : ''}
            </button>
          </PressScale>
        </form>

        <p className="mt-2 text-[11px] leading-relaxed text-[#B8B5AD]">Nutrition values are estimates. Unrecognized foods use a generic placeholder; review before adding.</p>

        {/* Live Parsed Chips Preview */}
        {parsedQuickDrafts.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-[#2F3A33]">
            {parsedQuickDrafts.map((d, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#213026] border border-[#3E634B] px-2.5 py-1 text-[11px] font-medium text-[#7BB38F]"
              >
                <span>{d.name}</span>
                <strong className="text-[#F4F1EA]">{d.calories} kcal</strong>
              </span>
            ))}
          </div>
        )}

        {/* Preset 1-Tap Quick Phrases */}
        {!quickAddText && (
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              '2 eggs and a banana',
              '1 bowl oats & whey shake',
              '150g grilled chicken and brown rice',
              '2 rotis and palak paneer',
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setQuickAddText(sample)}
                className="shrink-0 rounded-full border border-[#2F3A33] bg-[#141916] px-2.5 py-1 text-[10px] text-[#B8B5AD] hover:border-[#528B67] hover:text-[#7BB38F]"
              >
                “{sample}”
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#84877F]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search 32+ foods (oats, paneer, chicken, idli, salmon...)"
          className="w-full rounded-2xl border border-[#2F3A33] bg-[#1E2520] py-2.5 pl-10 pr-9 text-xs text-[#F4F1EA] outline-none placeholder:text-[#636961] focus:border-[#6BA37E]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#84877F] hover:text-[#F4F1EA]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Food Search Results or Shimmer Skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-xs font-semibold uppercase tracking-wider text-[#84877F]">
            {searchQuery ? `Search Results (${filteredCatalog.length})` : `${selectedCategory} & Popular Foods`}
          </h2>
          <span className="text-[11px] text-[#7BB38F]">Tap item to log →</span>
        </div>

        {isSearching ? (
          <Shimmer count={4} />
        ) : filteredCatalog.length === 0 ? (
          <EmptyState
            title="No Matching Foods Found"
            subtitle={`Use the Quick Add box above to log "${searchQuery}" with a clearly labelled generic nutrition estimate.`}
            actionLabel={`Quick Add "${searchQuery}"`}
            onAction={() => {
              const drafts = parseMealFreeText(searchQuery, selectedCategory);
              logQuickAddMeals(drafts);
              setSearchQuery('');
            }}
          />
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
            {filteredCatalog.map((item) => (
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
                    <span className="rounded-md bg-[#2A332D] px-1.5 py-0.5 text-[9px] font-medium text-[#B8B5AD]">
                      {item.defaultCategory}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#84877F]">
                    {item.servingLabel} ·{' '}
                    <span className="text-[#7BB38F]">P:{item.proteinG}g</span>{' '}
                    <span className="text-[#D8C39E]">C:{item.carbsG}g</span>{' '}
                    <span className="text-[#E0B467]">F:{item.fatG}g</span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <div className="font-heading text-xs font-bold text-[#F4F1EA]">
                      {item.calories} kcal
                    </div>
                    <div className="text-[10px] font-semibold text-[#7BB38F]">+10 XP</div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#528B67] text-[#F4F1EA]">
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                  </div>
                </div>
              </PressScale>
            ))}
          </div>
        )}
      </div>

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
            subtitle="Tap any food above or enter a phrase in Quick Add to track your macros."
          />
        ) : (
          <div className="space-y-2">
            {todayMeals.map((m) => (
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
                      <span className="rounded bg-[#213026] px-1.5 py-0.5 text-[9px] font-semibold text-[#7BB38F]">
                        {m.category}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-[#84877F]">
                      {m.calories} kcal · P:{Math.round(m.proteinG)}g · C:{Math.round(m.carbsG)}g · F:{Math.round(m.fatG)}g
                    </p>
                  </div>
                </div>

                <PressScale
                  onClick={() => removeMeal(m.id)}
                  ariaLabel={`Remove ${m.name}`}
                  className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#33241E] text-[#DE9473] hover:bg-[#422D25]"
                >
                  <Trash2 className="h-4 w-4" />
                </PressScale>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
