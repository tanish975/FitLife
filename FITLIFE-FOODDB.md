# FitLife FoodDB v1 — Global & Regional Food Composition Database

## Engineering Verdict

Why FitLife builds its own unified, multi-authority, columnar offline food database rather than relying on crowdsourced barcode APIs or a single-country table:

1. **Offline & Sandboxed Single-File Invariant**: FitLife ships both as an Android WebView APK (`assets/index.html`) and as a standalone offline file (`FitLife-App.html`) verified inside `<iframe sandbox="allow-scripts">` with zero network requests. Multi-gigabyte crowdsourced dumps (e.g., Open Food Facts > 40 GB raw) cannot ship offline, and live network APIs fail offline and leak dietary queries.
2. **Truthfulness & Scientific Provenance (Phase 0A)**: Crowdsourced food logs routinely confuse `kJ` with `kcal` (`4.184×` error), swap `per serving` vs `per 100 g`, confuse `salt (g)` with `sodium (mg)`, and omit raw-vs-cooked hydration yields (`2×–5×` weight swing). Every record in **FitLife FoodDB** is anchored to an open scientific authority or derived deterministically from verified laboratory staple ingredients.
3. **Global Cultural Equity**: Neither USDA alone nor IFCT alone serves a global audience. Unifying **five open layers** gives authentic coverage across **all 17 world regions, 85+ countries, and all 18 biological & culinary edible categories**.
4. **Compact Columnar Packing + Sub-Millisecond Search**: Using dictionary string interning, dietary/allergen bitmasks, and WeakMap-cached token indexing, **2,745 rich foods** (with 21 nutrients, scientific names, household portions, and multilingual aliases) add only **~155 KB gzipped** to the bundle and search in **~0.95 ms**.

---

## Five Open Authorities Unified (`2,745` Foods)

| Layer | Items | Coverage | License |
| --- | ---: | --- | --- |
| **FitLife Legacy + Indian & Gujarati Curated** | `68` | Preserved 32 legacy items + 36 Indian & Gujarati home dishes | FitLife (MIT) |
| **FitLife World Culinary & Edible Atlas** | `115` | Iconic regional & national dishes across all 16 inhabited world culinary regions & 85+ countries | FitLife (MIT, lab-ingredient derived) |
| **ICMR-NIN IFCT 2017** (`src/data/IfctCatalog.ts`) | `542` | 20 Indian staple groups with Gujarati/Hindi/regional names, scientific names & micronutrients | MIT (`@ifct2017/compositions`) |
| **USDA ARS SR28** (`src/data/FitLifeFoodDb.ts`) | `1,718` | Global whole plants, grains, fungi, seaweeds, seafood, dairy, meats, spices & Indigenous foods + `WEIGHT.txt` household gram weights | U.S. Public Domain (`17 U.S.C. § 105` / `CC0`) |
| **UNICAMP TACO 4th Ed.** (`src/data/FitLifeFoodDb.ts`) | `203` | Brazilian, Amazonian & Latin American fruits, tubers, beans, cuts, cheeses & river fish | MIT (`raulfdm/taco-api`) |
| **ANSES CIQUAL** (`src/data/FitLifeFoodDb.ts`) | `99` | French, Mediterranean & European cheeses, breads, seafood & culinary preparations | Etalab Open Licence 2.0 / MIT (`waistline-ciqual`) |

Full attributions are embedded in `mobile/public/licenses/FitLife-FoodDB-Sources.txt`, `mobile/public/licenses/IFCT2017-Compositions-MIT.txt`, and `FitLife-App.html`.

---

## Rich Per-Food Schema

- **Identity & Origin**: `id`, `name`, `source`, `sourceCode`, `scientificName` (binomial), `aliases` (vernacular & local scripts), `worldRegion` (17 regions), `countryCodes` (ISO-3166-1 alpha-2 + searchable country/demonym index), `originLabel`, `edibleCategory` (18 biological/culinary categories), `edibleState`.
- **Macros & Hydration**: `calories`, `proteinG`, `carbsG`, `fatG`, `fiberG`, `sugarG`, `sodiumMg`, `moistureG`, energy density (`kcal/100g`), protein density (`g/100 kcal`).
- **Micronutrients (`FoodMicronutrients`, live-scaled per portion)**: `saturatedFatG`, `cholesterolMg`, `calciumMg`, `ironMg`, `magnesiumMg`, `potassiumMg`, `zincMg`, `vitaminCMg`, `vitaminB12Ug`, `folateUg`, `vitaminDUg`, `vitaminAUg`, `caffeineMg`.
- **Portions, Yield & Safety**: `measuredPortions` (laboratory `WEIGHT.txt` & cultural servings), `katori` / `glass` / `roti` / `tbsp` / `tsp` / `grams`, raw-vs-cooked hydration ratios, cooking oil/ghee estimation, `dietaryFlags` (9 flags), and `allergenFlags` (9 major allergens).

---

## Reproducible Build & Verification Commands

Run inside `mobile/`:

```bash
npm run import:ifct          # Regenerate 542 ICMR-NIN IFCT 2017 foods + micronutrients
npm run import:fooddb        # Compile 2,020 USDA + TACO + CIQUAL rows into columnar FitLifeFoodDb.ts
npm run build:standalone     # Typecheck, bundle & build offline FitLife-App.html
npm run test:global-fooddb   # Verify all 17 regions, 18 edible categories, micronutrients & <35ms search
npm run test:indian-nutrition
```
