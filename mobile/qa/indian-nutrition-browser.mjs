// Fictional offline data and simulated native bridge for Indian nutrition, IFCT 2017,
// household portions, raw/cooked conversions, oil/ghee estimation, saved meals & custom recipes.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { installNativeFixture, nativeApp } from './mock-native.mjs';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await installNativeFixture(page);
  await page.goto(nativeApp, { waitUntil: 'domcontentloaded' });
  await page.getByText("Today's overview").first().waitFor({ timeout: 20000 });

  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Meals', exact: true }).click();
  await page.getByRole('heading', { name: 'Meals', exact: true }).waitFor();

  // 1. Discover IFCT 2017 & Gujarati staples, log cooked toor dal katori + 1 tsp ghee
  await page.getByRole('button', { name: /IFCT 2017/ }).click();
  await page.getByLabel('Search foods').fill('tuver dal');
  await page.locator('[data-food-id="ifct-b021"] .food-open').click();

  const portionDialog = page.getByRole('dialog', { name: 'Red gram, dal' });
  await portionDialog.waitFor();
  assert.equal(await portionDialog.getByRole('button', { name: 'Cooked / prepared' }).getAttribute('aria-pressed'), 'true');
  assert.equal(await portionDialog.getByRole('button', { name: 'Katori', exact: true }).getAttribute('aria-pressed'), 'true');
  await portionDialog.getByRole('button', { name: /1 tsp \+41/ }).click();
  assert((await portionDialog.innerText()).includes('173'));
  await portionDialog.getByRole('button', { name: /Log to/ }).click();
  await portionDialog.waitFor({ state: 'detached' });

  // 2. Quick-add Gujarati household combo
  await page.getByLabel('Describe a meal').fill('2 thin gujarati rotli and 1 glass masala chaas');
  await page.getByRole('button', { name: 'Add (2)' }).click();

  // 3. Edit & Delete with Undo on logged meals
  await page.getByRole('button', { name: 'Remove Masala Chaas (Spiced Buttermilk)' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  assert(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('fitlife_meals_v1') || '[]').some((m) =>
        m.name.includes('Masala Chaas')
      )
    ),
    'Undo restores removed meal'
  );

  // 4. Create, log, edit, and remove a Custom Recipe with tombstone retention
  await page.getByRole('button', { name: /^Recipes/ }).click();
  await page.getByRole('button', { name: 'Create recipe' }).click();
  const recipeDialog = page.getByRole('dialog', { name: 'Create custom recipe' });
  await recipeDialog.waitFor();
  await recipeDialog.getByPlaceholder(/Homemade Gujarati Tuver Dal/).fill('Ba Methi Thepla');
  await recipeDialog.getByLabel('Batch yield servings').fill('6');
  await recipeDialog.getByLabel('Serving unit name').fill('thepla');
  await recipeDialog.getByLabel('Search IFCT 2017 and curated ingredients').fill('wheat atta');
  await recipeDialog.locator('.recipe-search-option').first().click();
  await recipeDialog.getByLabel('Ingredient amount').fill('180');
  await recipeDialog.getByRole('button', { name: 'Add ingredient to recipe' }).click();
  await recipeDialog.getByRole('button', { name: '1 tbsp (13.5g)' }).click();
  await recipeDialog.getByRole('button', { name: 'Save & log 1' }).click();
  await recipeDialog.waitFor({ state: 'detached' });

  assert(
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('fitlife_settings_v2') || '{}');
      return s.customRecipes?.some((r) => r.name === 'Ba Methi Thepla' && !r.deleted);
    }),
    'Custom recipe saved to settings'
  );

  await page.getByRole('button', { name: 'Remove recipe Ba Methi Thepla' }).click();
  assert(
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('fitlife_settings_v2') || '{}');
      return s.customRecipes?.some((r) => r.name === 'Ba Methi Thepla' && r.deleted === true);
    }),
    'Removed recipe retains sync tombstone'
  );

  // 5. Horizontal fit at 320px through 1280px
  for (const width of [320, 360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    const size = await page.evaluate(() => ({
      w: document.documentElement.clientWidth,
      s: document.documentElement.scrollWidth,
    }));
    assert(size.s <= size.w + 1, `No horizontal overflow on Meals at ${width}px: ${JSON.stringify(size)}`);
  }

  assert.deepEqual(errors, [], `No uncaught page errors: ${errors.join('; ')}`);
  await context.close();
  console.log('PASS browser: IFCT 2017, household portions, raw/cooked, oil/ghee, undo delete, saved meals & custom recipes');
} finally {
  await browser.close();
}
