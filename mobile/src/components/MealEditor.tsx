import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ParsedMealDraft } from '../domain/MealTextParser';
import { MealCategory } from '../data/types';

type Field = 'calories' | 'proteinG' | 'carbsG' | 'fatG' | 'fiberG';
const NUMBERS: { key: Field; label: string; max: number; step: string }[] = [
  { key: 'calories', label: 'Calories (kcal)', max: 10000, step: '1' },
  { key: 'proteinG', label: 'Protein (g)', max: 2000, step: '0.1' },
  { key: 'carbsG', label: 'Carbohydrates (g)', max: 2000, step: '0.1' },
  { key: 'fatG', label: 'Fat (g)', max: 2000, step: '0.1' },
  { key: 'fiberG', label: 'Fiber (g)', max: 2000, step: '0.1' },
];

interface Props {
  title: string;
  initial?: ParsedMealDraft;
  category: MealCategory;
  onClose: () => void;
  onSave: (draft: ParsedMealDraft) => void | Promise<void>;
}

/** Nutrition entered by the user applies to the amount eaten, not per 100g. */
export const MealEditor: React.FC<Props> = ({ title, initial, category, onClose, onSave }) => {
  const [name, setName] = useState(initial?.name || '');
  const [serving, setServing] = useState(initial?.servingLabel || '');
  const [mealCategory, setMealCategory] = useState<MealCategory>(initial?.category || category);
  const [numbers, setNumbers] = useState<Record<Field, string>>(() => Object.fromEntries(NUMBERS.map(({ key }) => [key, initial && !initial.requiresReview ? String(initial[key]) : ''])) as Record<Field, string>);
  const [sugar, setSugar] = useState(initial?.sugarG === undefined ? '' : String(initial.sugarG));
  const [sodium, setSodium] = useState(initial?.sodiumMg === undefined ? '' : String(initial.sodiumMg));
  const [note, setNote] = useState(initial?.nutritionNote || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => document.getElementById('meal-editor-close')?.focus(), 50);
    const closeOnBack = (event: Event) => { if (event.defaultPrevented) return; event.preventDefault(); onClose(); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } };
    window.addEventListener('fitlife-back', closeOnBack); document.addEventListener('keydown', closeOnEscape);
    return () => { window.clearTimeout(timer); window.removeEventListener('fitlife-back', closeOnBack); document.removeEventListener('keydown', closeOnEscape); if (previous?.isConnected) previous.focus(); };
  }, [onClose]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(NUMBERS.map(({ key }) => [key, Number(numbers[key])])) as Record<Field, number>;
    if (!name.trim() || !serving.trim() || NUMBERS.some(({ key, max }) => !numbers[key].trim() || !Number.isFinite(values[key]) || values[key] < 0 || values[key] > max)) {
      setError('Enter the food, amount eaten and all five nutrition values. Use 0 only when the value is zero.'); return;
    }
    const sugarValue = sugar.trim() ? Number(sugar) : undefined;
    const sodiumValue = sodium.trim() ? Number(sodium) : undefined;
    if ((sugarValue !== undefined && (!Number.isFinite(sugarValue) || sugarValue < 0 || sugarValue > 2000)) || (sodiumValue !== undefined && (!Number.isFinite(sodiumValue) || sodiumValue < 0 || sodiumValue > 100000))) { setError('Check the optional sugar and sodium values.'); return; }
    setBusy(true); setError('');
    try {
      await onSave({ name: name.trim().slice(0, 120), servingLabel: serving.trim().slice(0, 100), category: mealCategory, ...values, sugarG: sugarValue, sodiumMg: sodiumValue, nutritionNote: note.trim() || undefined, requiresReview: false, source: 'manual' });
    } catch { setError('Could not save this meal. Your existing data was kept.'); }
    finally { setBusy(false); }
  };

  return <div className="meal-editor-overlay" onClick={onClose}>
    <div className="meal-editor" role="dialog" aria-modal="true" aria-labelledby="meal-editor-title" onClick={(event) => event.stopPropagation()}>
      <div className="meal-editor-heading"><div><span className="training-eyebrow">YOUR MEAL</span><h2 id="meal-editor-title">{title}</h2></div><button type="button" id="meal-editor-close" aria-label="Close meal editor" onClick={onClose}><X size={19} /></button></div>
      <p>Enter nutrition for the amount you ate. Use a package label or reliable food source; recipes and brands vary.</p>
      <form onSubmit={submit} className="meal-editor-form">
        <label>Food or meal name<input autoComplete="off" maxLength={120} required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. homemade dal" /></label>
        <label>Amount eaten<input maxLength={100} required value={serving} onChange={e => setServing(e.target.value)} placeholder="e.g. 1 bowl or 200 g" /></label>
        <label>Meal<select value={mealCategory} onChange={e => setMealCategory(e.target.value as MealCategory)}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select></label>
        <div className="meal-nutrient-grid">{NUMBERS.map(({ key, label, max, step }) => <label key={key}>{label}<input type="number" inputMode="decimal" min="0" max={max} step={step} required value={numbers[key]} onChange={e => setNumbers(prev => ({ ...prev, [key]: e.target.value }))} placeholder="0" /></label>)}</div>
        <div className="meal-nutrient-grid"><label>Sugar (g) · optional<input type="number" inputMode="decimal" min="0" max="2000" step="0.1" value={sugar} onChange={e => setSugar(e.target.value)} placeholder="Unknown" /></label><label>Sodium (mg) · optional<input type="number" inputMode="decimal" min="0" max="100000" step="0.1" value={sodium} onChange={e => setSodium(e.target.value)} placeholder="Unknown" /></label></div>
        <label>Nutrition source or notes · optional<input maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. package label, recipe" /></label>
        <p className="meal-optional-hint">Leave optional fields blank when unknown; blank is not treated as zero.</p>
        {error && <p className="meal-editor-error" role="alert">{error}</p>}
        <button className="meal-editor-save" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save nutrition details'}</button>
      </form>
    </div>
  </div>;
};
