import React, { useMemo, useState } from 'react';
import { ChefHat, Heart, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { isDemoId } from '../domain/CloudSync';
import { computeRecipeNutrition } from '../domain/IndianNutrition';
import type { CustomRecipe, SavedMeal } from '../domain/PersonalFeatures';
import type { LoggedMeal } from '../data/types';

interface MealShortcutsProps {
  onRepeat: (meal: LoggedMeal) => void;
  onNewSavedMeal?: () => void;
  onEditSavedMeal?: (saved: SavedMeal) => void;
  onCreateRecipe?: () => void;
  onEditRecipe?: (recipe: CustomRecipe) => void;
  onLogRecipe?: (recipe: CustomRecipe) => void;
}

export const MealShortcuts: React.FC<MealShortcutsProps> = ({
  onRepeat,
  onNewSavedMeal,
  onEditSavedMeal,
  onCreateRecipe,
  onEditRecipe,
  onLogRecipe,
}) => {
  const { meals, settings, toggleSavedMeal, removeCustomRecipe } = useFitLife();
  const [tab, setTab] = useState<'recent' | 'favorites' | 'recipes'>('recent');
  const [expanded, setExpanded] = useState(false);

  const savedEntries = useMemo(
    () => (settings.savedMeals || []).filter((x) => !x.deleted),
    [settings.savedMeals]
  );
  const favorites = useMemo(() => savedEntries.map((x) => x.meal), [savedEntries]);
  const favoriteIds = useMemo(() => new Set(favorites.map((x) => x.id)), [favorites]);

  const activeRecipes = useMemo(
    () =>
      (settings.customRecipes || [])
        .filter((r) => !r.deleted)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [settings.customRecipes]
  );

  const recent = useMemo(() => {
    const seen = new Set<string>();
    return [...meals]
      .filter((m) => !isDemoId(m.id))
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter((m) => {
        const signature = `${m.name.toLowerCase()}|${m.servingLabel.toLowerCase()}|${m.calories}|${m.proteinG}|${m.carbsG}|${m.fatG}|${m.fiberG}`;
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
      });
  }, [meals]);

  const list = tab === 'favorites' ? favorites : recent;

  return (
    <section
      className="meal-shortcuts"
      aria-labelledby="meal-shortcuts-title"
      data-guide-target="meals-shortcuts"
    >
      <div className="meal-shortcuts-heading">
        <h2 id="meal-shortcuts-title">Your meals</h2>
        <div role="group" aria-label="Meal shortcuts">
          <button
            type="button"
            aria-pressed={tab === 'recent'}
            onClick={() => {
              setTab('recent');
              setExpanded(false);
            }}
          >
            Recent
          </button>
          <button
            type="button"
            aria-pressed={tab === 'favorites'}
            onClick={() => {
              setTab('favorites');
              setExpanded(false);
            }}
          >
            Favorites
          </button>
          <button
            type="button"
            aria-pressed={tab === 'recipes'}
            onClick={() => {
              setTab('recipes');
              setExpanded(false);
            }}
          >
            Recipes{activeRecipes.length > 0 ? ` (${activeRecipes.length})` : ''}
          </button>
        </div>
      </div>

      {tab === 'recipes' ? (
        <div>
          {activeRecipes.length > 0 ? (
            <div className="meal-shortcut-list">
              {activeRecipes
                .slice(0, expanded ? activeRecipes.length : 4)
                .map((recipe) => {
                  const summary = computeRecipeNutrition(recipe);
                  return (
                    <div className="meal-shortcut" key={recipe.id}>
                      <div>
                        <strong>{recipe.name}</strong>
                        <small>
                          Makes {recipe.servingsYield} {recipe.servingUnitLabel} ·{' '}
                          {summary.perServingCalories} kcal/{recipe.servingUnitLabel} · P{' '}
                          {summary.perServingProteinG}g
                        </small>
                      </div>
                      {onLogRecipe && (
                        <button
                          type="button"
                          className="meal-repeat"
                          onClick={() => onLogRecipe(recipe)}
                          aria-label={`Log recipe ${recipe.name}`}
                        >
                          <ChefHat size={15} /> Log
                        </button>
                      )}
                      {onEditRecipe && (
                        <button
                          type="button"
                          className="meal-star"
                          onClick={() => onEditRecipe(recipe)}
                          aria-label={`Edit recipe ${recipe.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="meal-star"
                        onClick={() => removeCustomRecipe(recipe.id)}
                        aria-label={`Remove recipe ${recipe.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="meal-shortcut-empty">
              Build home recipes (dal, thepla, khichdi, shaak) from IFCT 2017 ingredients and batch cooking oil/ghee.
            </p>
          )}
          <div className="meal-shortcut-footer">
            {activeRecipes.length > 4 && (
              <button
                className="meal-shortcut-more"
                type="button"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Show less' : `Show all ${activeRecipes.length}`}
              </button>
            )}
            {onCreateRecipe && (
              <button
                type="button"
                className="meal-shortcut-action"
                onClick={onCreateRecipe}
              >
                <Plus size={14} /> Create recipe
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {list.length ? (
            <div className="meal-shortcut-list">
              {list.slice(0, expanded ? list.length : 3).map((meal) => {
                const savedEntry =
                  tab === 'favorites'
                    ? savedEntries.find((s) => s.meal.id === meal.id)
                    : undefined;
                return (
                  <div className="meal-shortcut" key={meal.id}>
                    <div>
                      <strong>{meal.name}</strong>
                      <small>
                        {meal.servingLabel} · {Math.round(meal.calories)} kcal
                      </small>
                    </div>
                    <button
                      type="button"
                      className="meal-repeat"
                      onClick={() => onRepeat(meal)}
                      aria-label={`Log ${meal.name} again`}
                    >
                      <RotateCcw size={15} /> Log again
                    </button>
                    {tab === 'favorites' && savedEntry && onEditSavedMeal && (
                      <button
                        type="button"
                        className="meal-star"
                        aria-label={`Edit saved meal ${meal.name}`}
                        onClick={() => onEditSavedMeal(savedEntry)}
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="meal-star"
                      aria-label={`${favoriteIds.has(meal.id) ? 'Remove' : 'Add'} ${meal.name} ${
                        favoriteIds.has(meal.id) ? 'from' : 'to'
                      } favorite meals`}
                      aria-pressed={favoriteIds.has(meal.id)}
                      onClick={() => toggleSavedMeal(meal)}
                    >
                      <Heart
                        size={18}
                        fill={favoriteIds.has(meal.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="meal-shortcut-empty">
              {tab === 'recent'
                ? 'Your recent meals will appear here.'
                : 'Star a logged meal or save a template here.'}
            </p>
          )}
          <div className="meal-shortcut-footer">
            {list.length > 3 && (
              <button
                className="meal-shortcut-more"
                type="button"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Show less' : `Show all ${list.length}`}
              </button>
            )}
            {tab === 'favorites' && onNewSavedMeal && (
              <button
                type="button"
                className="meal-shortcut-action"
                onClick={onNewSavedMeal}
              >
                <Plus size={14} /> Save meal template
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
