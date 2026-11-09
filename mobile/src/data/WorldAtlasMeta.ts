import type {
  EdibleCategoryId,
  FoodAllergenFlag,
  FoodDietaryFlag,
  FoodItem,
  FoodMicronutrients,
  FoodSourceKind,
  WorldRegionId,
} from './types';

export interface WorldRegionMeta {
  id: WorldRegionId;
  label: string;
  shortLabel: string;
  countriesSample: string;
}

export const WORLD_REGIONS: WorldRegionMeta[] = [
  { id: 'global', label: 'Global Whole Staples', shortLabel: 'Global Staples', countriesSample: 'Universal plants, grains, seafood & proteins' },
  { id: 'south-asia', label: 'South Asia', shortLabel: 'South Asia', countriesSample: 'India, Gujarat, Sri Lanka, Nepal, Pakistan, Bangladesh, Bhutan, Maldives' },
  { id: 'east-asia', label: 'East Asia', shortLabel: 'East Asia', countriesSample: 'Japan, China, South Korea, Taiwan, Mongolia' },
  { id: 'southeast-asia', label: 'Southeast Asia', shortLabel: 'SE Asia', countriesSample: 'Thailand, Vietnam, Indonesia, Malaysia, Philippines, Singapore, Cambodia, Myanmar' },
  { id: 'central-asia-caucasus', label: 'Central Asia & Caucasus', shortLabel: 'Central Asia', countriesSample: 'Uzbekistan, Kazakhstan, Georgia, Armenia, Azerbaijan, Kyrgyzstan' },
  { id: 'middle-east', label: 'Middle East, Levant & Persia', shortLabel: 'Middle East', countriesSample: 'Lebanon, Turkey, Iran, Palestine, Syria, Jordan, Saudi Arabia, UAE, Yemen' },
  { id: 'north-africa', label: 'North Africa & Maghreb', shortLabel: 'North Africa', countriesSample: 'Morocco, Egypt, Tunisia, Algeria, Sudan' },
  { id: 'west-africa', label: 'West & Central Africa', shortLabel: 'West Africa', countriesSample: 'Nigeria, Ghana, Senegal, Côte d’Ivoire, Cameroon, Mali' },
  { id: 'east-southern-africa', label: 'East, Horn & Southern Africa', shortLabel: 'East & S. Africa', countriesSample: 'Ethiopia, Eritrea, Kenya, Tanzania, Uganda, South Africa, Madagascar' },
  { id: 'mediterranean-europe', label: 'Mediterranean Europe', shortLabel: 'Mediterranean', countriesSample: 'Italy, Spain, Greece, Portugal, Cyprus' },
  { id: 'western-central-europe', label: 'Western & Central Europe', shortLabel: 'W. & C. Europe', countriesSample: 'France, UK, Ireland, Germany, Switzerland, Austria, Belgium, Netherlands' },
  { id: 'nordic-baltic', label: 'Nordic & Baltic Europe', shortLabel: 'Nordic & Baltic', countriesSample: 'Sweden, Norway, Denmark, Finland, Iceland, Estonia, Lithuania, Latvia' },
  { id: 'eastern-europe', label: 'Eastern Europe & Balkans', shortLabel: 'Eastern Europe', countriesSample: 'Poland, Ukraine, Romania, Serbia, Bulgaria, Hungary, Croatia' },
  { id: 'north-america', label: 'North America & Indigenous', shortLabel: 'North America', countriesSample: 'United States, Canada, Native American & Alaska Native' },
  { id: 'mexico-central-america-caribbean', label: 'Mexico, Central America & Caribbean', shortLabel: 'Mexico & Caribbean', countriesSample: 'Mexico, Costa Rica, El Salvador, Guatemala, Jamaica, Cuba, Puerto Rico, Trinidad' },
  { id: 'south-america', label: 'South America, Brazil & Andes', shortLabel: 'South America', countriesSample: 'Brazil, Peru, Argentina, Colombia, Venezuela, Chile, Ecuador, Bolivia' },
  { id: 'oceania-pacific', label: 'Oceania & Pacific Islands', shortLabel: 'Oceania & Pacific', countriesSample: 'Australia, New Zealand / Aotearoa, Fiji, Samoa, Polynesia, Hawaii' },
];

export const WORLD_REGION_MAP: Record<WorldRegionId, WorldRegionMeta> = Object.fromEntries(
  WORLD_REGIONS.map((r) => [r.id, r])
) as Record<WorldRegionId, WorldRegionMeta>;

export interface EdibleCategoryMeta {
  id: EdibleCategoryId;
  label: string;
  shortLabel: string;
}

export const EDIBLE_CATEGORIES: EdibleCategoryMeta[] = [
  { id: 'prepared-dishes', label: 'Prepared Regional Dishes & Soups', shortLabel: 'Dishes & Soups' },
  { id: 'grains-cereals', label: 'Grains, Cereals, Millets & Breads', shortLabel: 'Grains & Breads' },
  { id: 'roots-tubers', label: 'Roots, Tubers, Plantains & Starchy Plants', shortLabel: 'Roots & Tubers' },
  { id: 'legumes-pulses', label: 'Legumes, Pulses, Beans & Soy/Tofu', shortLabel: 'Legumes & Soy' },
  { id: 'vegetables-greens', label: 'Vegetables, Leafy Greens, Gourds & Cacti', shortLabel: 'Vegetables' },
  { id: 'fruits-berries', label: 'Fruits, Berries, Citrus & Tropicals', shortLabel: 'Fruits & Berries' },
  { id: 'mushrooms-fungi', label: 'Edible Mushrooms & Culinary Fungi', shortLabel: 'Mushrooms' },
  { id: 'seaweeds-algae', label: 'Seaweeds, Kelp & Microalgae', shortLabel: 'Seaweeds & Algae' },
  { id: 'nuts-seeds', label: 'Nuts, Seeds, Kernels & Tahini/Pastes', shortLabel: 'Nuts & Seeds' },
  { id: 'dairy-cheeses', label: 'Milk, Fermented Dairy & World Cheeses', shortLabel: 'Dairy & Cheeses' },
  { id: 'eggs', label: 'Eggs & Egg Preparations', shortLabel: 'Eggs' },
  { id: 'poultry-fowl', label: 'Poultry & Game Birds', shortLabel: 'Poultry' },
  { id: 'fish-seafood', label: 'Marine & Freshwater Fish & Shellfish', shortLabel: 'Fish & Seafood' },
  { id: 'meats-game', label: 'Meats, Organ Meats, Game & Traditional Proteins', shortLabel: 'Meats & Game' },
  { id: 'oils-fats', label: 'Culinary Oils, Ghee & Fats', shortLabel: 'Oils & Fats' },
  { id: 'herbs-spices-condiments', label: 'Herbs, Spices, Ferments & Condiments', shortLabel: 'Spices & Ferments' },
  { id: 'beverages-infusions', label: 'Teas, Coffees, Broths & Traditional Drinks', shortLabel: 'Beverages' },
  { id: 'sweets-bakery', label: 'Traditional Sweets & Bakery', shortLabel: 'Sweets & Bakery' },
];

export const EDIBLE_CATEGORY_MAP: Record<EdibleCategoryId, EdibleCategoryMeta> = Object.fromEntries(
  EDIBLE_CATEGORIES.map((c) => [c.id, c])
) as Record<EdibleCategoryId, EdibleCategoryMeta>;

/** Country ISO-3166-1 alpha-2 to searchable English country & culinary demonym terms. */
export const COUNTRY_SEARCH_TERMS: Record<string, { name: string; terms: string }> = {
  IN: { name: 'India', terms: 'india indian bharat hindustani' },
  LK: { name: 'Sri Lanka', terms: 'sri lanka sri lankan ceylon sinhala tamil' },
  NP: { name: 'Nepal', terms: 'nepal nepali nepalese himalayan' },
  PK: { name: 'Pakistan', terms: 'pakistan pakistani punjabi sindhi pashtun' },
  BD: { name: 'Bangladesh', terms: 'bangladesh bangladeshi bengali' },
  BT: { name: 'Bhutan', terms: 'bhutan bhutanese' },
  MV: { name: 'Maldives', terms: 'maldives maldivian dhivehi' },
  JP: { name: 'Japan', terms: 'japan japanese nihon washoku' },
  CN: { name: 'China', terms: 'china chinese cantonese sichuan szechuan dimsum' },
  KR: { name: 'South Korea', terms: 'korea korean hansik' },
  TW: { name: 'Taiwan', terms: 'taiwan taiwanese' },
  MN: { name: 'Mongolia', terms: 'mongolia mongolian' },
  TH: { name: 'Thailand', terms: 'thailand thai siam' },
  VN: { name: 'Vietnam', terms: 'vietnam vietnamese' },
  ID: { name: 'Indonesia', terms: 'indonesia indonesian javanese padang balinese' },
  MY: { name: 'Malaysia', terms: 'malaysia malaysian malay nyonya' },
  SG: { name: 'Singapore', terms: 'singapore singaporean hawker' },
  PH: { name: 'Philippines', terms: 'philippines filipino pinoy tagalog' },
  KH: { name: 'Cambodia', terms: 'cambodia cambodian khmer' },
  MM: { name: 'Myanmar', terms: 'myanmar burma burmese' },
  UZ: { name: 'Uzbekistan', terms: 'uzbekistan uzbek central asian' },
  KZ: { name: 'Kazakhstan', terms: 'kazakhstan kazakh' },
  KG: { name: 'Kyrgyzstan', terms: 'kyrgyzstan kyrgyz' },
  GE: { name: 'Georgia', terms: 'georgia georgian caucasian' },
  AM: { name: 'Armenia', terms: 'armenia armenian' },
  AZ: { name: 'Azerbaijan', terms: 'azerbaijan azerbaijani azeri' },
  LB: { name: 'Lebanon', terms: 'lebanon lebanese levantine' },
  PS: { name: 'Palestine', terms: 'palestine palestinian levantine' },
  SY: { name: 'Syria', terms: 'syria syrian levantine' },
  JO: { name: 'Jordan', terms: 'jordan jordanian levantine' },
  TR: { name: 'Turkey', terms: 'turkey turkish anatolian ottoman' },
  IR: { name: 'Iran', terms: 'iran iranian persian' },
  SA: { name: 'Saudi Arabia', terms: 'saudi arabia arabian khaleeji gulf' },
  AE: { name: 'UAE', terms: 'uae emirati arabian gulf' },
  YE: { name: 'Yemen', terms: 'yemen yemeni' },
  MA: { name: 'Morocco', terms: 'morocco moroccan maghreb' },
  DZ: { name: 'Algeria', terms: 'algeria algerian maghreb' },
  TN: { name: 'Tunisia', terms: 'tunisia tunisian maghreb' },
  EG: { name: 'Egypt', terms: 'egypt egyptian' },
  SD: { name: 'Sudan', terms: 'sudan sudanese' },
  NG: { name: 'Nigeria', terms: 'nigeria nigerian yoruba igbo hausa west african' },
  GH: { name: 'Ghana', terms: 'ghana ghanaian west african' },
  SN: { name: 'Senegal', terms: 'senegal senegalese wolof west african' },
  CI: { name: 'Côte d’Ivoire', terms: 'ivory coast ivorian cote divoire west african' },
  CM: { name: 'Cameroon', terms: 'cameroon cameroonian central african' },
  ML: { name: 'Mali', terms: 'mali malian west african' },
  ET: { name: 'Ethiopia', terms: 'ethiopia ethiopian habesha horn of africa' },
  ER: { name: 'Eritrea', terms: 'eritrea eritrean habesha' },
  KE: { name: 'Kenya', terms: 'kenya kenyan swahili east african' },
  TZ: { name: 'Tanzania', terms: 'tanzania tanzanian swahili zanzibar east african' },
  UG: { name: 'Uganda', terms: 'uganda ugandan east african' },
  ZA: { name: 'South Africa', terms: 'south africa south african cape malay' },
  ZW: { name: 'Zimbabwe', terms: 'zimbabwe zimbabwean southern african' },
  MG: { name: 'Madagascar', terms: 'madagascar malagasy' },
  IT: { name: 'Italy', terms: 'italy italian mediterranean' },
  ES: { name: 'Spain', terms: 'spain spanish catalan basque andalusian mediterranean' },
  GR: { name: 'Greece', terms: 'greece greek hellenic mediterranean' },
  PT: { name: 'Portugal', terms: 'portugal portuguese lusophone' },
  CY: { name: 'Cyprus', terms: 'cyprus cypriot mediterranean' },
  FR: { name: 'France', terms: 'france french ciqual provencal breton' },
  BE: { name: 'Belgium', terms: 'belgium belgian' },
  GB: { name: 'United Kingdom', terms: 'uk british english scottish welsh' },
  IE: { name: 'Ireland', terms: 'ireland irish' },
  NL: { name: 'Netherlands', terms: 'netherlands dutch' },
  DE: { name: 'Germany', terms: 'germany german bavarian' },
  AT: { name: 'Austria', terms: 'austria austrian viennese' },
  CH: { name: 'Switzerland', terms: 'switzerland swiss alpine' },
  SE: { name: 'Sweden', terms: 'sweden swedish nordic scandinavian' },
  NO: { name: 'Norway', terms: 'norway norwegian nordic scandinavian' },
  DK: { name: 'Denmark', terms: 'denmark danish nordic scandinavian' },
  FI: { name: 'Finland', terms: 'finland finnish nordic' },
  IS: { name: 'Iceland', terms: 'iceland icelandic nordic' },
  EE: { name: 'Estonia', terms: 'estonia estonian baltic' },
  LT: { name: 'Lithuania', terms: 'lithuania lithuanian baltic' },
  LV: { name: 'Latvia', terms: 'latvia latvian baltic' },
  PL: { name: 'Poland', terms: 'poland polish slavic' },
  UA: { name: 'Ukraine', terms: 'ukraine ukrainian slavic' },
  RO: { name: 'Romania', terms: 'romania romanian' },
  RS: { name: 'Serbia', terms: 'serbia serbian balkan' },
  BG: { name: 'Bulgaria', terms: 'bulgaria bulgarian balkan' },
  BA: { name: 'Bosnia & Herzegovina', terms: 'bosnia bosnian balkan' },
  HU: { name: 'Hungary', terms: 'hungary hungarian magyar' },
  US: { name: 'United States', terms: 'usa american united states' },
  CA: { name: 'Canada', terms: 'canada canadian quebecois' },
  MX: { name: 'Mexico', terms: 'mexico mexican oaxacan yucatecan' },
  CR: { name: 'Costa Rica', terms: 'costa rica costa rican tico central american' },
  SV: { name: 'El Salvador', terms: 'el salvador salvadoran central american' },
  GT: { name: 'Guatemala', terms: 'guatemala guatemalan mayan central american' },
  JM: { name: 'Jamaica', terms: 'jamaica jamaican caribbean west indian' },
  CU: { name: 'Cuba', terms: 'cuba cuban caribbean' },
  PR: { name: 'Puerto Rico', terms: 'puerto rico puerto rican boricua caribbean' },
  DO: { name: 'Dominican Republic', terms: 'dominican caribbean' },
  TT: { name: 'Trinidad & Tobago', terms: 'trinidad trinidadian trini caribbean' },
  HT: { name: 'Haiti', terms: 'haiti haitian caribbean' },
  BR: { name: 'Brazil', terms: 'brazil brazilian brasil taco bahian amazonian' },
  PE: { name: 'Peru', terms: 'peru peruvian andean nikkei' },
  CO: { name: 'Colombia', terms: 'colombia colombian andean' },
  VE: { name: 'Venezuela', terms: 'venezuela venezuelan' },
  EC: { name: 'Ecuador', terms: 'ecuador ecuadorian andean' },
  BO: { name: 'Bolivia', terms: 'bolivia bolivian andean' },
  AR: { name: 'Argentina', terms: 'argentina argentine argentinian gaucho' },
  CL: { name: 'Chile', terms: 'chile chilean' },
  UY: { name: 'Uruguay', terms: 'uruguay uruguayan' },
  AU: { name: 'Australia', terms: 'australia australian aussie' },
  NZ: { name: 'New Zealand', terms: 'new zealand aotearoa maori kiwi' },
  FJ: { name: 'Fiji', terms: 'fiji fijian pacific islander' },
  WS: { name: 'Samoa', terms: 'samoa samoan polynesian pacific' },
  PF: { name: 'Polynesia', terms: 'polynesia polynesian tahitian hawaiian pacific' },
};

export const FOOD_SOURCE_AUTHORITY_LABELS: Record<FoodSourceKind, string> = {
  curated: 'FitLife Curated & ICMR-NIN Derived',
  ifct2017: 'ICMR-NIN IFCT 2017 (India Lab)',
  'usda-sr28': 'USDA ARS SR28 (Public Domain Lab)',
  'taco-brazil': 'UNICAMP TACO 4th Ed. (Brazil Lab)',
  'ciqual-france': 'ANSES CIQUAL (France/EU Lab)',
  'fitlife-global-dish': 'FitLife Global Culinary Atlas',
};

export const DIETARY_FLAG_LABELS: Record<FoodDietaryFlag, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  eggetarian: 'Contains Egg',
  pescatarian: 'Fish / Seafood',
  'gluten-free': 'Gluten-Free',
  'dairy-free': 'Dairy-Free',
  'high-protein': 'High Protein',
  'high-fiber': 'High Fiber',
  fermented: 'Fermented',
};

export const ALLERGEN_FLAG_LABELS: Record<FoodAllergenFlag, string> = {
  milk: 'Milk / Dairy',
  egg: 'Egg',
  fish: 'Fish',
  shellfish: 'Shellfish',
  'tree-nut': 'Tree Nut',
  peanut: 'Peanut',
  'wheat-gluten': 'Wheat / Gluten',
  soy: 'Soy',
  sesame: 'Sesame',
};

/** Returns true when a food item is a per-100g laboratory reference that requires portion selection first. */
export function isLaboratoryPer100gFood(food: FoodItem): boolean {
  return (
    food.source === 'ifct2017' ||
    food.source === 'usda-sr28' ||
    food.source === 'taco-brazil' ||
    food.source === 'ciqual-france'
  );
}

/** Scales micronutrients proportionally from the catalog item's base servingGrams to rawEquivalentGrams. */
export function scaleFoodMicronutrients(
  food: FoodItem,
  rawEquivalentGrams: number,
  baseServingGrams: number
): FoodMicronutrients | undefined {
  if (!food.micronutrients || baseServingGrams <= 0 || rawEquivalentGrams <= 0) {
    return undefined;
  }
  const factor = rawEquivalentGrams / baseServingGrams;
  const r1 = (v: number | undefined) =>
    v !== undefined ? Math.round(v * factor * 10) / 10 : undefined;
  const m = food.micronutrients;
  return {
    ...(m.saturatedFatG !== undefined ? { saturatedFatG: r1(m.saturatedFatG) } : {}),
    ...(m.cholesterolMg !== undefined ? { cholesterolMg: Math.round(m.cholesterolMg * factor) } : {}),
    ...(m.calciumMg !== undefined ? { calciumMg: Math.round(m.calciumMg * factor) } : {}),
    ...(m.ironMg !== undefined ? { ironMg: r1(m.ironMg) } : {}),
    ...(m.magnesiumMg !== undefined ? { magnesiumMg: Math.round(m.magnesiumMg * factor) } : {}),
    ...(m.potassiumMg !== undefined ? { potassiumMg: Math.round(m.potassiumMg * factor) } : {}),
    ...(m.zincMg !== undefined ? { zincMg: r1(m.zincMg) } : {}),
    ...(m.vitaminCMg !== undefined ? { vitaminCMg: r1(m.vitaminCMg) } : {}),
    ...(m.vitaminB12Ug !== undefined ? { vitaminB12Ug: r1(m.vitaminB12Ug) } : {}),
    ...(m.folateUg !== undefined ? { folateUg: Math.round(m.folateUg * factor) } : {}),
    ...(m.vitaminDUg !== undefined ? { vitaminDUg: r1(m.vitaminDUg) } : {}),
    ...(m.vitaminAUg !== undefined ? { vitaminAUg: Math.round(m.vitaminAUg * factor) } : {}),
    ...(m.caffeineMg !== undefined ? { caffeineMg: Math.round(m.caffeineMg * factor) } : {}),
  };
}

export interface FoodDensityInsights {
  kcalPer100g: number;
  energyDensityBand: 'Very Low' | 'Low' | 'Moderate' | 'Energy-Dense';
  proteinPer100Kcal: number;
}

export function computeFoodDensityInsights(
  calories: number,
  proteinG: number,
  grams: number
): FoodDensityInsights {
  const safeGrams = grams > 0 ? grams : 100;
  const kcalPer100g = Math.round((calories / safeGrams) * 100);
  const band: FoodDensityInsights['energyDensityBand'] =
    kcalPer100g < 70
      ? 'Very Low'
      : kcalPer100g < 150
      ? 'Low'
      : kcalPer100g < 300
      ? 'Moderate'
      : 'Energy-Dense';
  const proteinPer100Kcal =
    calories > 0 ? Math.round((proteinG / calories) * 100 * 10) / 10 : 0;
  return {
    kcalPer100g,
    energyDensityBand: band,
    proteinPer100Kcal,
  };
}
