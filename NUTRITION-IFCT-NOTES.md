# Indian Nutrition, IFCT 2017, Household Portions & Custom Recipes Notes

## Overview

This upgrade expands FitLife's offline-first nutrition engine (`mobile/`) for Indian and Gujarati households while preserving all 32 original catalog items, Phase 0A truthfulness rules (zero invented values on ambiguous free-text entries), WCAG 2.1 AA contrast across all 5 solid palettes in light and dark mode, multi-device cloud sync, and AES-256-GCM encrypted backups.

## 1. ICMR-NIN IFCT 2017 Import (`mobile/scripts/import-ifct.mjs` → `mobile/src/data/IfctCatalog.ts`)

- Imported all **542** Indian staple foods across **20** ICMR-NIN food groups from MIT-licensed `@ifct2017/compositions@2.0.9` (source: T. Longvah et al., *Indian Food Composition Tables 2017*, ICMR-NIN, Hyderabad; attribution embedded in `mobile/public/licenses/IFCT2017-Compositions-MIT.txt` and standalone `FitLife-App.html`). Note: `ifct2017@2.1.2` was switched to `AGPL-3.0-or-later` upstream and was deliberately excluded in favor of the MIT-licensed `2.0.x` dataset, vendored without transitive `csv-parse` dependencies so `npm audit` remains at 0 vulnerabilities.
- **Exact unit conversions per 100g edible portion**:
  - Energy: `enerc` (kJ) converted via `enerc / 4.184` kcal.
  - **Table T (`T001`–`T014` Edible Oils and Fats, including `T013 Ghee` & `T005 Groundnut oil`)**: IFCT Table T reported fatty-acid profiles with `fatce = 100g` and `enerc = 0`. Rather than importing `0 kcal` for oils/ghee, energy is derived transparently at `fatce × 9 = 900 kcal/100g` with an explicit provenance note.
  - Macronutrients & moisture: `protcnt`, `choavldf` (available carbohydrate), `fatce`, `fibtg`, `fsugar`, and `water` in `g/100g`.
  - Sodium: `na` (`g/100g`) converted to `mg/100g` (`× 1000`).
- Extracted **Gujarati (`G.`)**, **Hindi (`H.`)**, and English vernacular aliases (`bajri`, `paunva`, `mamra`, `bavato`, `rajagaro`, `tuver dal`, `mag ni dal`, `singtel`, `gol`, `dudhi`, `bhinda`, `ringan`, etc.) for instant offline search.

## 2. Curated Indian & Gujarati Dishes (`mobile/src/data/CuratedIndianFoods.ts`)

- Added **36** prepared Indian & Gujarati dishes derived from IFCT 2017 ingredient weights plus documented homestyle cooking fat:
  - **Flatbreads**: Thin Gujarati rotli (dry & with 0.5 tsp ghee), bajri rotlo, jowar rotlo, crispy whole-wheat bhakhri, Gujarati methi thepla, homestyle plain/aloo/paneer parathas.
  - **Dals & Legumes**: Gujarati khatti-meethi tuver dal, homestyle yellow moong dal, masoor dal, Gujarati kadhi, rasawala mag, kala chana shaak, dal dhokli.
  - **Rice, Khichdi & Breakfasts**: Steamed white rice, Gujarati plain moong khichdi, vaghareli khichdi, batata poha, vegetable rava upma.
  - **Shaak & Steamed Farsan / Dairy**: Surti Gujarati undhiyu, sev tameta, bhinda nu shaak, dudhi chana dal, ringan no oro, steamed khaman dhokla, khatta dhokla (idada), vegetable handvo, steamed dudhi muthiya, khandvi, steamed patra, vagharela mamra, methi khakhra, masala chaas, homestyle cow-milk dahi.
- All **32** original `FOOD_CATALOG` entries remain byte-for-field unchanged in `ORIGINAL_FOOD_CATALOG` (`qa/legacy-foods.json`).

## 3. Household Portions, Raw-vs-Cooked Yields & Oil/Ghee Estimation (`mobile/src/domain/IndianNutrition.ts`, `FoodPortionSheet.tsx`)

- **Household units**:
  - `Katori`: Small (`100 ml`), Medium (`150 ml`), Large (`200 ml`) with food-density mapping (`~1.0 g/ml` for dals/rice/curries/dahi, `~0.85 g/ml` cooked poha, `~0.24 g/ml` puffed rice/mamra/makhana, `~0.80 g/ml` dry raw grains/dals).
  - `Glass`: Small (`150 ml`), Standard (`200 ml`), Tall (`250 ml`).
  - `Tablespoon (tbsp)` & `Teaspoon (tsp)`: Exact lipid mass (`13.5g / 122 kcal` per tbsp, `4.5g / 41 kcal` per tsp for oils & ghee; `16g/tbsp` nut butter; `15g/tbsp` liquids).
  - `Roti`: Thin Gujarati rotli (`28g`), Medium phulka/roti (`40g`), Thick roti/bhakhri (`55g`), Bajri/Jowar rotlo (`90g`) — works on both prepared flatbreads and raw IFCT flours (`1.45×` dough/roasting yield).
  - `Grams` & `Catalog serving` multipliers.
- **Explicit Raw-vs-Cooked State Handling**:
  - Converts between weighed raw/dry ingredients and cooked portions (`3.0×` steamed rice/millets, `3.75×` homestyle dal with `3.0×` thick / `5.0×` thin Gujarati dal presets, `2.6×` whole legumes, `2.0×` poha, `1.45×` flour-to-roti, `3.2×` semolina/dalia, `0.9×` cooked vegetables, `0.75×` cooked meat/seafood) while displaying both raw and cooked gram equivalents side-by-side.
  - Free-text Quick Add (`MealTextParser.ts`) supports explicit household phrases (`1 katori gujarati dal`, `2 thin gujarati rotli`, `2 glasses masala chaas`, `1 tsp ghee`, `100g raw toor dal`) while keeping ambiguous raw-vs-cooked queries (`100g toor dal`, `150g white rice`, `paneer`, `1 katori dal`, `1 paratha`) flagged for review (`requiresReview: true`, `calories: 0`).
- **Oil & Ghee Estimator**:
  - Supports `Ghee`, `Groundnut / Singtel`, `Cooking oil`, `Mustard oil`, and `Coconut oil` with quick presets (`0 tsp`, `½ tsp / +20 kcal`, `1 tsp / +41 kcal`, `2 tsp / +81 kcal`, `1 tbsp / +122 kcal`) and custom grams, clearly distinguishing 0-fat IFCT staples from homestyle curated dishes.

## 4. Meal Add/Edit/Delete, Saved Meals & Custom Recipes (`MealShortcuts.tsx`, `RecipeBuilderModal.tsx`, `MealEditor.tsx`, `PersonalFeatures.ts`, `FitLifeStore.tsx`)

- **Meal Add / Edit / Delete**:
  - Added household portion chips and `+ ½ tsp` / `+ 1 tsp` / `+ 1 tbsp` oil/ghee toppers inside `MealEditor`.
  - Added non-blocking 1-tap **Undo** banner on meal removal (restoring as a fresh row without violating cloud deletion tombstones).
  - Added **Save `[Category]` combo** when 2+ items are logged in a meal slot so full Indian thalis/plates can be saved and repeated in 1 tap.
- **Saved Meals & Custom Recipes**:
  - Upgraded `Your meals` (`Recent` | `Favorites` | `Recipes`) to support standalone saved-meal creation, in-place template editing, and multi-ingredient **Custom Recipes** (`RecipeBuilderModal` + `RecipeLogSheet`) with IFCT/curated ingredient search, batch cooking oil/ghee, per-serving & per-cooked-gram logging, deterministic LWW sync + deletion tombstones (`PersonalFeatures.ts`, `CloudSync.ts`), and AES-256-GCM encrypted backup/restore (`EncryptedBackup.ts`).
