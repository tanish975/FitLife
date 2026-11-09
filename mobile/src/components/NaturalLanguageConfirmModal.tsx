import React, { useCallback, useMemo, useState } from 'react';
import { X, ChevronRight, Edit, CheckCircle, AlertCircle } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import {
  NaturalLanguageAnalysisResult,
  NaturalLanguageMealItem,
  evaluateNaturalLanguageItem,
  analyzeNaturalLanguageMeal,
} from '../domain/NaturalLanguageMealLogger';
import type { FoodItem } from '../data/types';
import { PressScale } from './PressScale';

interface Props {
  open: boolean;
  onClose: () => void;
  onAnalyze: (rawText: string, category: string) => void;
  onConfirmItems: (items: NaturalLanguageMealItem[]) => void;
}

const MINUTE_LABELS: Record<string, string> = {
  none: 'None',
  oil: 'Oil',
  ghee: 'Ghee',
  groundnut_oil: 'Groundnut oil',
  mustard_oil: 'Mustard oil',
  coconut_oil: 'Coconut oil',
};

export const NaturalLanguageConfirmModal: React.FC<Props> = ({
  open,
  onClose,
  onAnalyze,
  onConfirmItems,
}) => {
  const { logQuickAddMeals } = useFitLife();

  const [rawText, setRawText] = useState('');
  const [category, setCategory] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Breakfast');
  const [result, setResult] = useState<NaturalLanguageAnalysisResult | null>(null);
  const [evaluatedItems, setEvaluatedItems] = useState<Map<string, { resolved: any; ready: boolean }>>(new Map());
  const [error, setError] = useState('');

  const categories: { value: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'; label: string }[] = [
    { value: 'Breakfast', label: 'Breakfast' },
    { value: 'Lunch', label: 'Lunch' },
    { value: 'Dinner', label: 'Dinner' },
    { value: 'Snack', label: 'Snack' },
  ];

  const handleAnalyze = useCallback((text: string) => {
    if (!text.trim()) {
      setResult(null);
      setError('');
      return;
    }
    try {
      const analysis = analyzeNaturalLanguageMeal(text, category);
      setResult(analysis);
      setError('');
      const map = new Map<string, { resolved: any; ready: boolean }>();
      for (const item of analysis.items) {
        if (!item.needsDisambiguation && item.selectedFoodId) {
          const evalResult = evaluateNaturalLanguageItem(item, category);
          map.set(item.id, { resolved: evalResult.resolvedDraft, ready: evalResult.isReadyToLog });
        }
      }
      setEvaluatedItems(map);
    } catch {
      setError('Could not parse that meal. Try rewording it.');
      setResult(null);
    }
  }, [category]);

  const handleItemSelect = useCallback((itemId: string, foodId: string) => {
    if (!result) return;
    const item = result.items.find((i) => i.id === itemId);
    if (!item) return;
    const nextItems = result.items.map((i) =>
      i.id === itemId ? { ...i, selectedFoodId: foodId, needsDisambiguation: false } : i
    );
    setResult({ ...result, items: nextItems });
    const evalResult = evaluateNaturalLanguageItem(nextItems.find((i) => i.id === itemId)!, category);
    setEvaluatedItems((prev) => {
      const next = new Map(prev);
      next.set(itemId, { resolved: evalResult.resolvedDraft, ready: evalResult.isReadyToLog });
      return next;
    });
  }, [result, category]);

  const handleItemDeselect = useCallback((itemId: string) => {
    if (!result) return;
    const nextItems = result.items.map((i) =>
      i.id === itemId ? { ...i, selectedFoodId: null, needsDisambiguation: true } : i
    );
    setResult({ ...result, items: nextItems });
    setEvaluatedItems((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  }, [result]);

  const handleQuantityChange = useCallback((itemId: string, quantity: number) => {
    if (!result) return;
    const item = result.items.find((i) => i.id === itemId);
    if (!item) return;
    const nextItems = result.items.map((i) =>
      i.id === itemId ? { ...i, quantity: Math.max(0.25, quantity) } : i
    );
    setResult({ ...result, items: nextItems });
    const evalResult = evaluateNaturalLanguageItem(nextItems.find((i) => i.id === itemId)!, category);
    setEvaluatedItems((prev) => {
      const next = new Map(prev);
      next.set(itemId, { resolved: evalResult.resolvedDraft, ready: evalResult.isReadyToLog });
      return next;
    });
  }, [result, category]);

  const handleUnitChange = useCallback((itemId: string, unit: string) => {
    if (!result) return;
    const item = result.items.find((i) => i.id === itemId);
    if (!item) return;
    const nextItems = result.items.map((i) => i.id === itemId ? { ...i, unit: unit as any } : i);
    setResult({ ...result, items: nextItems });
    const evalResult = evaluateNaturalLanguageItem(nextItems.find((i) => i.id === itemId)!, category);
    setEvaluatedItems((prev) => {
      const next = new Map(prev);
      next.set(itemId, { resolved: evalResult.resolvedDraft, ready: evalResult.isReadyToLog });
      return next;
    });
  }, [result, category]);

  const handleFatChange = useCallback((itemId: string, fatKind: string, tsp: number) => {
    if (!result) return;
    const item = result.items.find((i) => i.id === itemId);
    if (!item) return;
    const nextItems = result.items.map((i) =>
      i.id === itemId ? { ...i, cookingFatKind: fatKind as any, cookingFatTsp: Math.max(0, tsp) } : i
    );
    setResult({ ...result, items: nextItems });
    const evalResult = evaluateNaturalLanguageItem(nextItems.find((i) => i.id === itemId)!, category);
    setEvaluatedItems((prev) => {
      const next = new Map(prev);
      next.set(itemId, { resolved: evalResult.resolvedDraft, ready: evalResult.isReadyToLog });
      return next;
    });
  }, [result, category]);

  const allReady = useMemo(() => {
    if (!result) return false;
    return result.items.every((item) => {
      const evalState = evaluatedItems.get(item.id);
      return !!evalState?.ready;
    });
  }, [result, evaluatedItems]);

  const totalCalories = useMemo(() => {
    if (!result) return 0;
    return result.items.reduce((sum, item) => {
      const state = evaluatedItems.get(item.id);
      return sum + (state?.resolved?.calories ?? 0);
    }, 0);
  }, [result, evaluatedItems]);

  const handleConfirm = () => {
    if (!result || !allReady) return;
    const drafts = result.items.map((item) => {
      const state = evaluatedItems.get(item.id)!;
      return state.resolved!;
    });
    onConfirmItems(result.items);
    logQuickAddMeals(drafts);
    onClose();
  };

  const getUnitOptions = (): { value: string; label: string }[] => [
    { value: 'serving', label: 'Serving' },
    { value: 'grams', label: 'Grams (g)' },
    { value: 'katori', label: 'Katori (bowl)' },
    { value: 'glass', label: 'Glass' },
    { value: 'tbsp', label: 'Tbsp' },
    { value: 'tsp', label: 'Tsp' },
    { value: 'roti', label: 'Roti' },
  ];

  const FAT_KINDS: { id: string; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'oil', label: 'Oil' },
    { id: 'ghee', label: 'Ghee' },
    { id: 'groundnut_oil', label: 'Groundnut oil' },
    { id: 'mustard_oil', label: 'Mustard oil' },
    { id: 'coconut_oil', label: 'Coconut oil' },
  ];

  if (!open) return null;

  const buttonClass = (selected: boolean) =>
    selected
      ? 'border-[#528B67] bg-[#213026] text-[#F4F1EA]'
      : 'border-[#2F3A33] bg-[#141916] text-[#B8B5AD] hover:border-[#528B67] hover:text-[#7BB38F]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Confirm natural-language meal">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-[#1E2520] border border-[#3E634B] rounded-[26px] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-bold text-[#F4F1EA]">Confirm meal</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-[#2F3A33] text-[#B8B5AD]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#84877F] mb-1">Describe what you ate</label>
            <input
              type="text"
              aria-label="Describe a meal"
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                handleAnalyze(e.target.value);
              }}
              placeholder='e.g. "2 roti, 1 katori dal"'
              className="w-full rounded-xl border border-[#2F3A33] bg-[#141916] px-3.5 py-2.5 text-xs text-[#F4F1EA] outline-none focus:border-[#6BA37E]"
            />
          </div>

          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  setCategory(cat.value);
                  handleAnalyze(rawText);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${category === cat.value ? 'bg-[#528B67] text-[#F4F1EA]' : 'border border-[#2F3A33] bg-[#141916] text-[#B8B5AD]'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-xl border border-[#7A4A4A] bg-[#3A2424] p-3">
              <div className="flex items-center gap-2 text-xs text-[#DE9473]">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {result && result.items.length > 0 && (
            <div className="border-t border-[#2F3A33] pt-3">
              <h3 className="text-xs font-semibold text-[#84877F] mb-3 uppercase tracking-wider">
                Review each item before logging
              </h3>
              <div className="space-y-3" aria-label="Meal preview">
                {result.items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-[22px] border p-3 ${
                      item.needsDisambiguation ? 'border-[#3E634B] bg-[#141916]' : 'border-[#528B67]/30 bg-[#151F19]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="truncate font-heading text-xs font-bold text-[#F4F1EA]">
                            {item.rawSegment}
                          </h4>
                          {item.needsDisambiguation && (
                            <span className="rounded-full border border-[#3E634B] bg-[#213026] px-2 py-0.5 text-[0.5625rem] font-semibold text-[#7BB38F]">
                              Choose preparation
                            </span>
                          )}
                        </div>
                        <p className="text-[0.625rem] text-[#84877F]">
                          {item.disambiguationPrompt || item.parsedQuery}
                        </p>
                      </div>
                      <span className="text-[#84877F]">{item.needsDisambiguation ? 'Pick one' : 'Ready'}</span>
                    </div>

                    {item.needsDisambiguation && (
                      <div className="space-y-1.5">
                        {item.candidates.map((candidate) => {
                          const selected = item.selectedFoodId === candidate.food.id;
                          return (
                            <button
                              key={candidate.food.id}
                              type="button"
                              onClick={() => handleItemSelect(item.id, candidate.food.id)}
                              className={`flex items-center justify-between w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors ${buttonClass(selected)}`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2A332D] text-[#7BB38F]">
                                  {selected ? <CheckCircle className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" stroke="currentColor" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-medium text-[#F4F1EA]">{candidate.food.name}</div>
                                  <div className="truncate text-[0.5625rem] text-[#84877F]">
                                    {candidate.reasonLabel} · {candidate.food.servingLabel}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[#D8C39E] font-semibold">{candidate.food.calories} kcal</span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setError('Custom nutrition entry is not yet available.')}
                          className="w-full rounded-xl border border-[#2F3A33] bg-[#141916] px-3 py-2 text-left text-xs text-[#B8B5AD] hover:border-[#528B67]"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" /> Enter custom nutrition
                        </button>
                      </div>
                    )}

                    {!item.needsDisambiguation && (
                      <div className="space-y-1.5 mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#84877F]">Quantity</span>
                          <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0.25)}
                            className="w-16 rounded border border-[#2F3A33] bg-[#141916] px-2 py-1 text-xs text-[#F4F1EA] outline-none focus:border-[#6BA37E]"
                          />
                              <span className="text-[#84877F]">{String(item.unit)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#84877F]">Cooking fat</span>
                          <div className="flex gap-1">
                            {FAT_KINDS.map((fat) => (
                              <button
                                key={fat.id}
                                type="button"
                                onClick={() => handleFatChange(item.id, fat.id, item.cookingFatTsp)}
                                className={`rounded border px-2 py-1 text-[0.5625rem] ${
                                  item.cookingFatKind === fat.id
                                    ? 'border-[#528B67] bg-[#213026] text-[#F4F1EA]'
                                    : 'border-[#2F3A33] bg-[#141916] text-[#84877F] hover:text-[#7BB38F]'
                                }`}
                              >
                                {MINUTE_LABELS[fat.id]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {(!item.needsDisambiguation || item.selectedFoodId) && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2F3A33]">
                        <span className="text-[0.625rem] font-semibold text-[#F4F1EA]">
                          Evaluated nutrition — confirm above
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-[#2F3A33] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#84877F]">Estimated total</span>
                <span className="font-heading text-sm font-bold text-[#F4F1EA]">{Math.round(totalCalories)} kcal</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#2F3A33] bg-[#141916] py-2.5 text-xs font-semibold text-[#B8B5AD] hover:border-[#528B67]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!allReady || !result}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-[#F4F1EA] transition-colors ${allReady && result ? 'bg-[#528B67] hover:bg-[#5E9A74]' : 'bg-[#2F3A33] text-[#636961] border border-[#2F3A33]'}`}
            >
              {allReady ? 'Log these meals' : 'Select all items first'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
