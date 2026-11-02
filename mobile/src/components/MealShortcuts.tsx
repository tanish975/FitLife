import React, { useMemo, useState } from 'react';
import { Heart, RotateCcw } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { isDemoId } from '../domain/CloudSync';
import type { LoggedMeal } from '../data/types';

export const MealShortcuts: React.FC<{onRepeat: (meal: LoggedMeal) => void}> = ({onRepeat}) => {
  const { meals, settings, toggleSavedMeal } = useFitLife();
  const [tab, setTab] = useState<'recent'|'favorites'>('recent');
  const [expanded, setExpanded] = useState(false);
  const favorites = (settings.savedMeals || []).filter(x => !x.deleted).map(x => x.meal);
  const favoriteIds = new Set(favorites.map(x => x.id));
  const recent = useMemo(() => {
    const seen = new Set<string>();
    return [...meals].filter(m => !isDemoId(m.id)).sort((a,b) => b.timestamp-a.timestamp).filter(m => {
      const signature = `${m.name.toLowerCase()}|${m.servingLabel.toLowerCase()}|${m.calories}|${m.proteinG}|${m.carbsG}|${m.fatG}|${m.fiberG}`;
      if (seen.has(signature)) return false; seen.add(signature); return true;
    });
  }, [meals]);
  const list = tab === 'favorites' ? favorites : recent;
  return <section className="meal-shortcuts" aria-labelledby="meal-shortcuts-title" data-guide-target="meals-shortcuts">
    <div className="meal-shortcuts-heading"><h2 id="meal-shortcuts-title">Your meals</h2><div role="group" aria-label="Meal shortcuts"><button type="button" aria-pressed={tab === 'recent'} onClick={() => {setTab('recent');setExpanded(false);}}>Recent</button><button type="button" aria-pressed={tab === 'favorites'} onClick={() => {setTab('favorites');setExpanded(false);}}>Favorites</button></div></div>
    {list.length ? <div className="meal-shortcut-list">{list.slice(0,expanded ? list.length : 3).map(meal => <div className="meal-shortcut" key={meal.id}><div><strong>{meal.name}</strong><small>{meal.servingLabel} · {Math.round(meal.calories)} kcal</small></div><button type="button" className="meal-repeat" onClick={() => onRepeat(meal)} aria-label={`Log ${meal.name} again`}><RotateCcw size={15}/> Log again</button><button type="button" className="meal-star" aria-label={`${favoriteIds.has(meal.id) ? 'Remove' : 'Add'} ${meal.name} ${favoriteIds.has(meal.id) ? 'from' : 'to'} favorite meals`} aria-pressed={favoriteIds.has(meal.id)} onClick={() => toggleSavedMeal(meal)}><Heart size={18} fill={favoriteIds.has(meal.id) ? 'currentColor' : 'none'}/></button></div>)}</div>
      : <p className="meal-shortcut-empty">{tab === 'recent' ? 'Your recent meals will appear here.' : 'Star a logged meal to save it here.'}</p>}
    {list.length > 3 && <button className="meal-shortcut-more" type="button" onClick={() => setExpanded(v => !v)}>{expanded ? 'Show less' : `Show all ${list.length}`}</button>}
  </section>;
};
