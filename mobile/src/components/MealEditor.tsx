import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { MotionEntry } from './MotionEntry';
import { X } from 'lucide-react';
import { ParsedMealDraft } from '../domain/MealTextParser';
import { MealCategory } from '../data/types';

type Field = 'calories' | 'proteinG' | 'carbsG' | 'fatG' | 'fiberG';
const NUMBERS: { key: Field; label: string; max: number; step: string }[] = [
  { key: 'calories', label: 'Calories (kcal)', max: 10000, step: '0.1' },
  { key: 'proteinG', label: 'Protein (g)', max: 2000, step: '0.1' },
  { key: 'carbsG', label: 'Carbohydrates (g)', max: 2000, step: '0.1' },
  { key: 'fatG', label: 'Fat (g)', max: 2000, step: '0.1' },
  { key: 'fiberG', label: 'Fiber (g)', max: 2000, step: '0.1' },
];

interface Props {
  title: string;
  initial?: ParsedMealDraft;
  category: MealCategory;
  portionScaling?: boolean;
  onClose: () => void;
  onSave: (draft: ParsedMealDraft) => void | Promise<void>;
}

/** Nutrition entered by the user applies to the amount eaten, not per 100g. */
export const MealEditor: React.FC<Props> = ({ title, initial, category, portionScaling = false, onClose, onSave }) => {
  const [name, setName] = useState(initial?.name || '');
  const [serving, setServing] = useState(initial?.servingLabel || '');
  const [mealCategory, setMealCategory] = useState<MealCategory>(initial?.category || category);
  const [numbers, setNumbers] = useState<Record<Field, string>>(() => Object.fromEntries(NUMBERS.map(({ key }) => [key, initial && !initial.requiresReview ? String(initial[key]) : ''])) as Record<Field, string>);
  const [sugar, setSugar] = useState(initial?.sugarG === undefined ? '' : String(initial.sugarG));
  const [sodium, setSodium] = useState(initial?.sodiumMg === undefined ? '' : String(initial.sodiumMg));
  const [note, setNote] = useState(initial?.nutritionNote || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [multiplier, setMultiplier] = useState('1');
  const scalePortion = (raw: string) => {
    setMultiplier(raw);
    const factor = Number(raw);
    if (!initial || !Number.isFinite(factor) || factor < 0.1 || factor > 10) return;
    const scaled = (value: number) => Math.round(value * factor * 10) / 10;
    setNumbers(Object.fromEntries(NUMBERS.map(({key}) => [key, String(scaled(initial[key]))])) as Record<Field,string>);
    setSugar(initial.sugarG === undefined ? '' : String(scaled(initial.sugarG)));
    setSodium(initial.sodiumMg === undefined ? '' : String(scaled(initial.sodiumMg)));
    setServing(factor === 1 ? initial.servingLabel : `${factor} × ${initial.servingLabel}`.slice(0,100));
  };

  const applyCookingFatTopper = (grams: number, labelText: string) => {
    const addKcal = Math.round(grams * 9);
    const curCals = Number(numbers.calories);
    const curFat = Number(numbers.fatG);
    setNumbers((prev) => ({
      ...prev,
      calories: String(Math.round(((Number.isFinite(curCals) ? curCals : 0) + addKcal) * 10) / 10),
      fatG: String(Math.round(((Number.isFinite(curFat) ? curFat : 0) + grams) * 10) / 10),
      proteinG: prev.proteinG || '0',
      carbsG: prev.carbsG || '0',
      fiberG: prev.fiberG || '0',
    }));
    setServing((prev) => (prev ? `${prev} + ${labelText}` : labelText).slice(0, 100));
  };

  const dialog = useRef<HTMLDivElement>(null);
  const closeWhenReady = () => { if (!busy) onClose(); };
  useAccessibleDialog(true, dialog, closeWhenReady);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(NUMBERS.map(({ key }) => [key, Number(numbers[key])])) as Record<Field, number>;
    if (portionScaling && (!multiplier.trim() || !Number.isFinite(Number(multiplier)) || Number(multiplier) < 0.1 || Number(multiplier) > 10)) { setError('Enter a portion multiplier between 0.1 and 10.'); return; }
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

  return createPortal(<MotionEntry className="meal-editor-overlay" onClick={closeWhenReady}>
    <MotionEntry ref={dialog} className="meal-editor" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="meal-editor-title" onClick={(event) => event.stopPropagation()}>
      <div className="meal-editor-heading"><div><span className="training-eyebrow">YOUR MEAL</span><h2 id="meal-editor-title">{title}</h2></div><button type="button" id="meal-editor-close" data-dialog-focus aria-label="Close meal editor" disabled={busy} onClick={closeWhenReady}><X size={19} /></button></div>
      <p>Enter nutrition for the amount you ate. Use a package label or reliable food source; recipes and brands vary.</p>
      <form onSubmit={submit} className="meal-editor-form">
        {portionScaling && initial && <div className="meal-portion-scale"><label>Portion multiplier<input type="number" inputMode="decimal" min="0.1" max="10" step="0.1" value={multiplier} onChange={e => scalePortion(e.target.value)} /></label><small>Based on {initial.servingLabel}. Values scale proportionally; review and adjust them before saving.</small></div>}
        <label>Food or meal name<input autoComplete="off" maxLength={120} required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. homemade dal" /></label>
        <label>Amount eaten<input maxLength={100} required value={serving} onChange={e => setServing(e.target.value)} placeholder="e.g. 1 medium katori (150g), 1 glass (200ml), 2 rotis" /></label>
        <div className="portion-preset-row" aria-label="Household portion presets">
          {[
            '1 small katori (100g)',
            '1 medium katori (150g)',
            '1 large katori (200g)',
            '1 glass (200ml)',
            '1 tbsp (15ml)',
            '1 medium roti (40g)',
          ].map((preset) => (
            <button key={preset} type="button" className="portion-subchip" onClick={() => setServing(preset)}>
              {preset.replace(/\s*\([^)]+\)/, '')}
            </button>
          ))}
        </div>
        <label>Meal<select value={mealCategory} onChange={e => setMealCategory(e.target.value as MealCategory)}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select></label>
        <div className="meal-nutrient-grid">{NUMBERS.map(({ key, label, max, step }) => <label key={key}>{label}<input type="number" inputMode="decimal" min="0" max={max} step={step} required value={numbers[key]} onChange={e => setNumbers(prev => ({ ...prev, [key]: e.target.value }))} placeholder="0" /></label>)}</div>
        <div className="portion-preset-row" aria-label="Add cooking oil or ghee">
          <button type="button" className="portion-subchip" onClick={() => applyCookingFatTopper(2.25, '0.5 tsp ghee')}>+ ½ tsp ghee (+20 kcal)</button>
          <button type="button" className="portion-subchip" onClick={() => applyCookingFatTopper(4.5, '1 tsp oil')}>+ 1 tsp oil (+41 kcal)</button>
          <button type="button" className="portion-subchip" onClick={() => applyCookingFatTopper(4.5, '1 tsp ghee')}>+ 1 tsp ghee (+41 kcal)</button>
          <button type="button" className="portion-subchip" onClick={() => applyCookingFatTopper(13.5, '1 tbsp oil')}>+ 1 tbsp oil (+122 kcal)</button>
        </div>
        <div className="meal-nutrient-grid"><label>Sugar (g) · optional<input type="number" inputMode="decimal" min="0" max="2000" step="0.1" value={sugar} onChange={e => setSugar(e.target.value)} placeholder="Unknown" /></label><label>Sodium (mg) · optional<input type="number" inputMode="decimal" min="0" max="100000" step="0.1" value={sodium} onChange={e => setSodium(e.target.value)} placeholder="Unknown" /></label></div>
        <label>Nutrition source or notes · optional<input maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. package label, recipe" /></label>
        <p className="meal-optional-hint">Leave optional fields blank when unknown; blank is not treated as zero.</p>
        {error && <p className="meal-editor-error" role="alert">{error}</p>}
        <button className="meal-editor-save" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save nutrition details'}</button>
      </form>
    </MotionEntry>
  </MotionEntry>, document.body);
};
