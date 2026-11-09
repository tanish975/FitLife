import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : join(root, 'scripts/data/ifct2017-nutrients.csv');
const outPath = join(root, 'src/data/IfctCatalog.ts');

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
  const rawHeaders = parseCsvLine(lines[0]).map((h) => {
    const idx = h.lastIndexOf(';');
    return (idx >= 0 ? h.slice(idx + 1) : h).trim();
  });
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    for (let i = 0; i < rawHeaders.length; i += 1) {
      row[rawHeaders[i]] = (values[i] ?? '').trim();
    }
    return row;
  });
}

const round1 = (value) => Math.round(Number(value) * 10) / 10;

const EXTRA_ALIASES_BY_CODE = {
  A001: ['rajgira', 'rajagaro', 'ramdana'],
  A002: ['rajgira', 'rajagaro', 'ramdana'],
  A003: ['bajri', 'pearl millet'],
  A004: ['jav', 'jau'],
  A005: ['juvar', 'sorghum'],
  A006: ['makai', 'makka', 'corn flour'],
  A007: ['lili makai', 'corn'],
  A008: ['sweet corn', 'lili makai'],
  A010: ['nachni', 'bavato', 'finger millet'],
  A011: ['poha', 'paunva', 'paua', 'aval', 'flattened rice'],
  A012: ['mamra', 'murmura', 'kurmura', 'puffed rice'],
  A013: ['brown rice', 'kathai chokha'],
  A014: ['parboiled rice', 'bafela chokha', 'ukda chawal'],
  A015: ['white rice', 'raw rice', 'chokha', 'chawal'],
  A018: ['maida', 'maido', 'all purpose flour'],
  A019: ['atta', 'chapati flour', 'rotli lot', 'ghaun no lot', 'whole wheat flour'],
  A020: ['ghaun', 'gehun'],
  A021: ['dalia', 'fada', 'lapsi', 'broken wheat', 'cracked wheat'],
  A022: ['soji', 'rava', 'suji'],
  A023: ['sevai', 'seviyan', 'ghaun ni sev'],
  A024: ['roasted vermicelli', 'roasted seviyan'],
  B001: ['chana dal', 'chana ni dal', 'split bengal gram'],
  B002: ['kala chana', 'deshi chana', 'brown chickpeas'],
  B003: ['urad dal', 'adadia dal', 'aadad ni dal', 'split black gram'],
  B004: ['whole urad', 'kali urad', 'black matpe'],
  B005: ['chora', 'lobia', 'black eyed pea'],
  B006: ['safed chora', 'lobia', 'white cowpea'],
  B007: ['val', 'vaal', 'hyacinth bean'],
  B008: ['val', 'vaal'],
  B009: ['safed val', 'vaal papdi'],
  B010: ['moong dal', 'mag ni dal', 'mung dal', 'yellow moong dal'],
  B011: ['whole moong', 'akha mag', 'green moong'],
  B012: ['kulthi', 'kalthi'],
  B013: ['masoor dal', 'red lentil', 'masur dal'],
  B014: ['akha masoor', 'whole masoor'],
  B016: ['math', 'matki', 'moth'],
  B017: ['vatana', 'safed vatana', 'dried peas'],
  B018: ['rajma', 'kidney beans'],
  B019: ['rajma', 'kidney beans'],
  B020: ['rajma', 'lal rajma', 'red kidney beans'],
  B021: ['toor dal', 'tuver dal', 'tuvar dal', 'arhar dal', 'pigeon pea dal'],
  B022: ['akhi tuver', 'whole pigeon pea'],
  B024: ['soybean', 'soya'],
  B025: ['soybean', 'white soya'],
  C019: ['methi bhaji', 'fenugreek leaves'],
  C030: ['palak', 'spinach'],
  D016: ['dudhi', 'lauki', 'bottle gourd'],
  D017: ['dudhi', 'lauki', 'bottle gourd'],
  D018: ['ringan', 'baingan', 'eggplant'],
  D050: ['bhinda', 'bhindi', 'okra', 'ladies finger'],
  D074: ['tameta', 'tamatar'],
  F007: ['batata', 'bataka', 'aloo'],
  F008: ['batata', 'bataka', 'aloo'],
  F009: ['batata', 'bataka', 'aloo'],
  F013: ['shakkariya', 'shakarkand', 'sweet potato'],
  H007: ['badam'],
  H008: ['kaju'],
  H009: ['singdana', 'mungfali', 'peanut'],
  H015: ['akhrot'],
  I001: ['gol', 'gur', 'gud', 'cane jaggery'],
  I002: ['sherdi no ras', 'ganne ka ras'],
  K002: ['nariyal pani', 'tender coconut water'],
  L001: ['bhains nu dudh', 'buffalo milk'],
  L002: ['gay nu dudh', 'cow milk'],
  L003: ['cottage cheese', 'indian paneer'],
  L004: ['mawa', 'khoya'],
  T001: ['nariyal tel'],
  T004: ['til tel', 'sesame oil', 'gingelly'],
  T005: ['singtel', 'peanut oil'],
  T006: ['sarso tel', 'rai nu tel'],
  T012: ['surajmukhi tel'],
  T013: ['desi ghee', 'clarified butter'],
};

const EDIBLE_CATEGORY_BY_PREFIX = {
  A: 'grains-cereals',
  B: 'legumes-pulses',
  C: 'vegetables-greens',
  D: 'vegetables-greens',
  E: 'fruits-berries',
  F: 'roots-tubers',
  G: 'herbs-spices-condiments',
  H: 'nuts-seeds',
  I: 'sweets-bakery',
  J: 'mushrooms-fungi',
  K: 'beverages-infusions',
  L: 'dairy-cheeses',
  M: 'eggs',
  N: 'poultry-fowl',
  O: 'meats-game',
  P: 'fish-seafood',
  Q: 'fish-seafood',
  R: 'fish-seafood',
  S: 'fish-seafood',
  T: 'oils-fats',
};

function extractVernacularAliases(lang, code) {
  const aliases = new Set(EXTRA_ALIASES_BY_CODE[code] ?? []);
  const patterns = [
    /(?:^|;\s*)G\.\s*([^;.]+)/g,
    /(?:^|;\s*)H\.\s*([^;.]+)/g,
    /(?:^|;\s*)E\.\s*([^;.]+)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(lang)) !== null) {
      for (const piece of m[1].split(',')) {
        const cleaned = piece.trim();
        if (cleaned.length >= 2 && cleaned.length <= 50) {
          aliases.add(cleaned);
        }
      }
    }
  }
  return [...aliases];
}

function classifyPreparation(row) {
  const code = row.code;
  const prefix = code[0];
  const lower = row.name.toLowerCase();

  if (prefix === 'T') return { preparationProfile: 'cooking_fat_oil', isRaw: false };
  if (prefix === 'K' || code === 'I002' || code === 'L001' || code === 'L002') {
    return { preparationProfile: 'liquid_dairy_beverage', isRaw: false };
  }
  if (prefix === 'L') return { preparationProfile: 'ready_to_eat', isRaw: false };
  if (prefix === 'E' || prefix === 'G' || prefix === 'H' || prefix === 'I') {
    return { preparationProfile: 'ready_to_eat', isRaw: false };
  }
  if (prefix === 'M') {
    const cooked = lower.includes('boiled') || lower.includes('omlet');
    return {
      preparationProfile: cooked ? 'ready_to_eat' : 'raw_meat_seafood',
      isRaw: !cooked,
    };
  }
  if (['N', 'O', 'P', 'Q', 'R', 'S'].includes(prefix)) {
    return { preparationProfile: 'raw_meat_seafood', isRaw: true };
  }
  if (['C', 'D', 'F', 'J'].includes(prefix)) {
    return { preparationProfile: 'raw_vegetable_tuber', isRaw: true };
  }
  if (prefix === 'B') {
    const isSplitDal = /\bdal\b/i.test(row.name);
    return {
      preparationProfile: isSplitDal ? 'raw_dal' : 'raw_whole_legume',
      isRaw: true,
    };
  }
  if (prefix === 'A') {
    if (code === 'A011') return { preparationProfile: 'raw_poha', isRaw: true };
    if (code === 'A012') return { preparationProfile: 'ready_to_eat', isRaw: false };
    if (code === 'A007' || code === 'A008') return { preparationProfile: 'raw_vegetable_tuber', isRaw: true };
    if (['A021', 'A022', 'A023', 'A024'].includes(code)) {
      return { preparationProfile: 'raw_semolina_dalia', isRaw: true };
    }
    if (['A009', 'A013', 'A014', 'A015', 'A016', 'A017'].includes(code)) {
      return { preparationProfile: 'raw_rice_grain', isRaw: true };
    }
    return { preparationProfile: 'raw_flour_roti', isRaw: true };
  }
  return { preparationProfile: 'ready_to_eat', isRaw: false };
}

function classifyDefaultCategory(row) {
  const prefix = row.code[0];
  if (prefix === 'E' || prefix === 'M' || row.code === 'A011' || row.code === 'A021' || row.code === 'A022' || row.code === 'L001' || row.code === 'L002') {
    return 'Breakfast';
  }
  if (prefix === 'H' || prefix === 'K' || row.code === 'A012' || row.code === 'I002') {
    return 'Snack';
  }
  return 'Lunch';
}

function classifyDietaryAndAllergens(row, proteinG, fiberG) {
  const prefix = row.code[0];
  const low = row.name.toLowerCase();
  const dietaryFlags = [];
  const allergenFlags = [];

  const isDairy = prefix === 'L' || row.code === 'T013' || row.code === 'T014';
  const isEgg = prefix === 'M';
  const isFish = ['P', 'Q', 'R', 'S'].includes(prefix);
  const isShellfish = ['Q', 'R'].includes(prefix) || /prawn|shrimp|crab|lobster/i.test(low);
  const isMeatOrPoultry = prefix === 'N' || prefix === 'O';

  if (!isMeatOrPoultry && !isFish && !isEgg) {
    dietaryFlags.push('vegetarian');
    if (!isDairy) {
      dietaryFlags.push('vegan', 'dairy-free');
    }
  } else if (isEgg) {
    dietaryFlags.push('eggetarian', 'dairy-free');
  } else if (isFish) {
    dietaryFlags.push('pescatarian', 'dairy-free');
  } else {
    dietaryFlags.push('dairy-free');
  }

  const hasGluten = prefix === 'A' && /wheat|barley|maida|atta|semolina|vermicelli/i.test(low);
  if (hasGluten) allergenFlags.push('wheat-gluten');
  else dietaryFlags.push('gluten-free');

  if (isDairy) allergenFlags.push('milk');
  if (isEgg) allergenFlags.push('egg');
  if (['P', 'S'].includes(prefix) && !isShellfish) allergenFlags.push('fish');
  if (isShellfish) allergenFlags.push('shellfish');
  if (low.includes('groundnut') || low.includes('peanut')) allergenFlags.push('peanut');
  if (low.includes('soyabean') || low.includes('soybean')) allergenFlags.push('soy');
  if (low.includes('gingelly') || low.includes('sesame')) allergenFlags.push('sesame');
  if (prefix === 'H' && /almond|cashew|walnut|pistachio|pine|areca/i.test(low)) {
    allergenFlags.push('tree-nut');
  }

  if (proteinG >= 15) dietaryFlags.push('high-protein');
  if (fiberG >= 6) dietaryFlags.push('high-fiber');

  return { dietaryFlags, allergenFlags };
}

const rows = parseCsv(readFileSync(csvPath, 'utf8'));
if (rows.length !== 542) {
  throw new Error(`Expected 542 IFCT 2017 rows, found ${rows.length}`);
}

const items = rows.map((row) => {
  const code = row.code;
  const isTableT = code.startsWith('T');
  const enerc = Number(row.enerc);
  const fatG = round1(row.fatce);
  const calories = enerc > 0 ? round1(enerc / 4.184) : round1(fatG * 9);
  const proteinG = round1(row.protcnt);
  const carbsG = round1(row.choavldf);
  const fiberG = round1(row.fibtg);
  const moistureG = round1(row.water);
  const sugarG = isTableT ? undefined : round1(row.fsugar);
  const sodiumMg = isTableT ? undefined : round1(Number(row.na) * 1000);
  const { preparationProfile, isRaw } = classifyPreparation(row);
  const aliases = extractVernacularAliases(row.lang, code);
  const hasGujarati = /(?:^|;\s*)G\.\s*[^;.]+/.test(row.lang) || (EXTRA_ALIASES_BY_CODE[code]?.length ?? 0) > 0;
  const isVeg = !['M', 'N', 'O', 'P', 'Q', 'R', 'S'].includes(code[0]);

  const tags = ['ifct', 'ifct-2017', 'indian'];
  if (hasGujarati) tags.push('gujarati');
  if (isVeg) tags.push('vegetarian');
  if (proteinG >= 15) tags.push('high-protein');
  if (isRaw) tags.push('raw-ingredient');

  const micronutrients = {};
  const fasat = Number(row.fasat || 0);
  if (fasat > 0) micronutrients.saturatedFatG = round1(fasat);
  const chol = Number(row.cholc || 0) * 1000;
  if (chol > 0) micronutrients.cholesterolMg = Math.round(chol);
  const ca = Number(row.ca || 0) * 1000;
  if (!isTableT && ca > 0) micronutrients.calciumMg = Math.round(ca);
  const fe = Number(row.fe || 0) * 1000;
  if (!isTableT && fe > 0) micronutrients.ironMg = round1(fe);
  const mg = Number(row.mg || 0) * 1000;
  if (!isTableT && mg > 0) micronutrients.magnesiumMg = Math.round(mg);
  const k = Number(row.k || 0) * 1000;
  if (!isTableT && k > 0) micronutrients.potassiumMg = Math.round(k);
  const zn = Number(row.zn || 0) * 1000;
  if (!isTableT && zn > 0) micronutrients.zincMg = round1(zn);
  const vitc = Number(row.vitc || 0) * 1000;
  if (!isTableT && vitc > 0) micronutrients.vitaminCMg = round1(vitc);
  const fol = Number(row.folsum || 0) * 1000000;
  if (!isTableT && fol > 0) micronutrients.folateUg = Math.round(fol);

  const { dietaryFlags, allergenFlags } = classifyDietaryAndAllergens(row, proteinG, fiberG);

  const provenanceNote = isTableT
    ? `ICMR-NIN IFCT 2017 (${code}) · per 100g pure lipid (9 kcal/g fat; IFCT Table T reports fatty-acid profile)`
    : `ICMR-NIN IFCT 2017 (${code}) · per 100g ${isRaw ? 'raw edible portion, 0 added oil' : 'edible portion'}`;

  return {
    id: `ifct-${code.toLowerCase()}`,
    name: row.name,
    servingLabel: isRaw ? '100 g raw (IFCT 2017)' : '100 g edible (IFCT 2017)',
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    defaultCategory: classifyDefaultCategory(row),
    tags,
    source: 'ifct2017',
    sourceCode: `IFCT ${code}`,
    ifctCode: code,
    ifctGroup: row.grup,
    ...(row.scie ? { scientificName: row.scie } : {}),
    cuisineTag: hasGujarati ? 'gujarati' : 'indian',
    worldRegion: 'south-asia',
    countryCodes: ['IN'],
    originLabel: hasGujarati ? 'India & Gujarat · South Asia' : 'India · South Asia',
    edibleCategory: EDIBLE_CATEGORY_BY_PREFIX[code[0]] ?? 'vegetables-greens',
    edibleState: isRaw ? 'raw' : 'ready-to-eat',
    dietaryFlags,
    ...(allergenFlags.length ? { allergenFlags } : {}),
    ...(Object.keys(micronutrients).length ? { micronutrients } : {}),
    ...(aliases.length ? { aliases } : {}),
    servingGrams: 100,
    ...(sugarG !== undefined ? { sugarG } : {}),
    ...(sodiumMg !== undefined ? { sodiumMg } : {}),
    moistureG,
    preparationProfile,
    isRaw,
    provenanceNote,
  };
});

const groups = [...new Set(items.map((i) => i.ifctGroup))];

const tsOutput = `// AUTO-GENERATED by scripts/import-ifct.mjs from ICMR-NIN IFCT 2017 (@ifct2017/compositions@2.0.9, MIT).
// See public/licenses/IFCT2017-Compositions-MIT.txt for full license and attribution.
import type { FoodItem } from './types';

export const IFCT_GROUPS = ${JSON.stringify(groups, null, 2)} as const;
export type IfctGroup = (typeof IFCT_GROUPS)[number];

export const IFCT_CATALOG: FoodItem[] = ${JSON.stringify(items, null, 2)};
`;

writeFileSync(outPath, tsOutput);
console.log(`Generated ${items.length} IFCT 2017 foods across ${groups.length} food groups -> ${outPath}`);
