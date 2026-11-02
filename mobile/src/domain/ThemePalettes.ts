export type ThemeMode = 'light' | 'dark';

export type PaletteId =
  | 'matcha_oat'
  | 'coastal_eucalyptus'
  | 'terracotta_olive'
  | 'nordic_fjord'
  | 'kyoto_cedar';

export type CornerStyle = 'sharp' | 'organic' | 'pebble';
export type MotionStyle = 'spring' | 'gentle' | 'reduced';
export type DensityStyle = 'compact' | 'comfortable' | 'spacious';

export interface ThemeColors {
  bgOuter: string;
  bgBase: string;
  bgCard: string;
  bgHero: string;
  bgRecessed: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  accentPrimary: string;
  accentPrimaryHover: string;
  accentPrimaryText: string;
  accentPrimarySoft: string;
  accentSecondary: string;
  accentSecondaryText: string;
  accentSecondarySoft: string;
  accentWarm: string;
  accentWarmText: string;
  accentWarmSoft: string;
  accentCool: string;
  accentCoolText: string;
  accentCoolSoft: string;
  ringTrack: string;
}

export interface PaletteDefinition {
  id: PaletteId;
  name: string;
  tagline: string;
  swatches: [string, string, string, string];
  light: ThemeColors;
  dark: ThemeColors;
}

export const NATURAL_PALETTES: Record<PaletteId, PaletteDefinition> = {
  matcha_oat: {
    id: 'matcha_oat',
    name: 'Matcha & Oat',
    tagline: 'Fresh botanical matcha leaf, warm oat milk & raw terracotta',
    swatches: ['#3B7A57', '#F5F2EB', '#C86D51', '#C5953A'],
    light: {
      bgOuter: '#E6E2D8',
      bgBase: '#F5F2EB',
      bgCard: '#FFFFFF',
      bgHero: '#E3EFE7',
      bgRecessed: '#ECE8DF',
      borderSubtle: '#DDD8CE',
      borderStrong: '#88B399',
      textPrimary: '#1C2621',
      textSecondary: '#4A5750',
      textMuted: '#5C6962',
      textOnAccent: '#FFFFFF',
      accentPrimary: '#3B7A57',
      accentPrimaryHover: '#316849',
      accentPrimaryText: '#2D6345',
      accentPrimarySoft: '#DFEFE5',
      accentSecondary: '#C86D51',
      accentSecondaryText: '#A04F37',
      accentSecondarySoft: '#F7E6E0',
      accentWarm: '#C5953A',
      accentWarmText: '#805E1A',
      accentWarmSoft: '#F6EFE0',
      accentCool: '#4E8279',
      accentCoolText: '#35665E',
      accentCoolSoft: '#E2F0ED',
      ringTrack: 'rgba(28, 38, 33, 0.10)',
    },
    dark: {
      bgOuter: '#0E120F',
      bgBase: '#151A17',
      bgCard: '#1E2520',
      bgHero: '#213026',
      bgRecessed: '#141916',
      borderSubtle: '#2F3A33',
      borderStrong: '#497A5B',
      textPrimary: '#F4F1EA',
      textSecondary: '#B8B5AD',
      textMuted: '#96978F',
      textOnAccent: '#F4F1EA',
      accentPrimary: '#528B67',
      accentPrimaryHover: '#5E9A74',
      accentPrimaryText: '#7BB38F',
      accentPrimarySoft: '#213026',
      accentSecondary: '#C47451',
      accentSecondaryText: '#DE9473',
      accentSecondarySoft: '#33241E',
      accentWarm: '#C89643',
      accentWarmText: '#E0B467',
      accentWarmSoft: '#2E2418',
      accentCool: '#5F8D85',
      accentCoolText: '#87B5AD',
      accentCoolSoft: '#1F2E2C',
      ringTrack: 'rgba(244, 241, 234, 0.10)',
    },
  },

  coastal_eucalyptus: {
    id: 'coastal_eucalyptus',
    name: 'Coastal Eucalyptus',
    tagline: 'Sea-salt mist, mineral eucalyptus & sunlit driftwood',
    swatches: ['#2E7773', '#F2F6F5', '#B88456', '#C46858'],
    light: {
      bgOuter: '#DEE7E5',
      bgBase: '#F2F6F5',
      bgCard: '#FFFFFF',
      bgHero: '#DFEFEF',
      bgRecessed: '#E6EEEC',
      borderSubtle: '#D2DFDC',
      borderStrong: '#7EB3B0',
      textPrimary: '#182625',
      textSecondary: '#465958',
      textMuted: '#586B6A',
      textOnAccent: '#FFFFFF',
      accentPrimary: '#2E7773',
      accentPrimaryHover: '#256360',
      accentPrimaryText: '#225E5B',
      accentPrimarySoft: '#DCF0EE',
      accentSecondary: '#C46858',
      accentSecondaryText: '#A34D3E',
      accentSecondarySoft: '#F8E6E3',
      accentWarm: '#B88456',
      accentWarmText: '#8C5E35',
      accentWarmSoft: '#F5ECE2',
      accentCool: '#4D7EA8',
      accentCoolText: '#346187',
      accentCoolSoft: '#E3EEF7',
      ringTrack: 'rgba(24, 38, 37, 0.10)',
    },
    dark: {
      bgOuter: '#0C1212',
      bgBase: '#131B1B',
      bgCard: '#1B2626',
      bgHero: '#1E3130',
      bgRecessed: '#111818',
      borderSubtle: '#2B3B3A',
      borderStrong: '#457D7A',
      textPrimary: '#EFF5F4',
      textSecondary: '#B2C0BE',
      textMuted: '#8A9B99',
      textOnAccent: '#EFF5F4',
      accentPrimary: '#458C88',
      accentPrimaryHover: '#529C98',
      accentPrimaryText: '#76BDB8',
      accentPrimarySoft: '#1E3130',
      accentSecondary: '#C77263',
      accentSecondaryText: '#E29587',
      accentSecondarySoft: '#342320',
      accentWarm: '#C49464',
      accentWarmText: '#DFB487',
      accentWarmSoft: '#2E261D',
      accentCool: '#5D8AA6',
      accentCoolText: '#8AB4CE',
      accentCoolSoft: '#1D2B34',
      ringTrack: 'rgba(239, 245, 244, 0.10)',
    },
  },

  terracotta_olive: {
    id: 'terracotta_olive',
    name: 'Terracotta & Olive',
    tagline: 'Mediterranean clay, sun-warmed limestone & olive leaf',
    swatches: ['#B85D3B', '#F8F3EC', '#5E7845', '#C7923E'],
    light: {
      bgOuter: '#EAE1D5',
      bgBase: '#F8F3EC',
      bgCard: '#FFFFFF',
      bgHero: '#F5E6DF',
      bgRecessed: '#EFE8DE',
      borderSubtle: '#E2D8CA',
      borderStrong: '#C8927B',
      textPrimary: '#261E1A',
      textSecondary: '#594D46',
      textMuted: '#71645C',
      textOnAccent: '#FFFFFF',
      accentPrimary: '#B85D3B',
      accentPrimaryHover: '#9E4D2F',
      accentPrimaryText: '#99492B',
      accentPrimarySoft: '#F6E4DC',
      accentSecondary: '#5E7845',
      accentSecondaryText: '#485E33',
      accentSecondarySoft: '#E6EFE0',
      accentWarm: '#C7923E',
      accentWarmText: '#855C1C',
      accentWarmSoft: '#F7EFE0',
      accentCool: '#6B7F78',
      accentCoolText: '#4E615B',
      accentCoolSoft: '#E6ECEA',
      ringTrack: 'rgba(38, 30, 26, 0.10)',
    },
    dark: {
      bgOuter: '#120F0D',
      bgBase: '#1A1614',
      bgCard: '#25201D',
      bgHero: '#33241E',
      bgRecessed: '#161210',
      borderSubtle: '#38302B',
      borderStrong: '#8A523B',
      textPrimary: '#F6F0E8',
      textSecondary: '#C2B7AC',
      textMuted: '#9B9086',
      textOnAccent: '#F6F0E8',
      accentPrimary: '#C46845',
      accentPrimaryHover: '#D47652',
      accentPrimaryText: '#E59576',
      accentPrimarySoft: '#33241E',
      accentSecondary: '#6F8C54',
      accentSecondaryText: '#97B57B',
      accentSecondarySoft: '#222B1B',
      accentWarm: '#CC9847',
      accentWarmText: '#E3B66B',
      accentWarmSoft: '#302719',
      accentCool: '#68877D',
      accentCoolText: '#91B0A6',
      accentCoolSoft: '#1F2926',
      ringTrack: 'rgba(246, 240, 232, 0.10)',
    },
  },

  nordic_fjord: {
    id: 'nordic_fjord',
    name: 'Nordic Fjord & Birch',
    tagline: 'Scandinavian fjord blue-slate, pale birch & lichen moss',
    swatches: ['#3A6878', '#F4F6F7', '#5C8566', '#C28744'],
    light: {
      bgOuter: '#DFE5E8',
      bgBase: '#F4F6F7',
      bgCard: '#FFFFFF',
      bgHero: '#E1ECF0',
      bgRecessed: '#E9EEF0',
      borderSubtle: '#D5DEE2',
      borderStrong: '#80A6B3',
      textPrimary: '#192328',
      textSecondary: '#495861',
      textMuted: '#5A6972',
      textOnAccent: '#FFFFFF',
      accentPrimary: '#3A6878',
      accentPrimaryHover: '#2E5563',
      accentPrimaryText: '#2C5463',
      accentPrimarySoft: '#DFECF0',
      accentSecondary: '#5C8566',
      accentSecondaryText: '#42664B',
      accentSecondarySoft: '#E3EFE6',
      accentWarm: '#C28744',
      accentWarmText: '#8F5F27',
      accentWarmSoft: '#F6ECE0',
      accentCool: '#6E7A85',
      accentCoolText: '#505B66',
      accentCoolSoft: '#E8ECEF',
      ringTrack: 'rgba(25, 35, 40, 0.10)',
    },
    dark: {
      bgOuter: '#0D1013',
      bgBase: '#14191D',
      bgCard: '#1C242A',
      bgHero: '#202E36',
      bgRecessed: '#11161A',
      borderSubtle: '#2C3840',
      borderStrong: '#4A788A',
      textPrimary: '#F0F4F6',
      textSecondary: '#B3C0C7',
      textMuted: '#8998A0',
      textOnAccent: '#F0F4F6',
      accentPrimary: '#4D8091',
      accentPrimaryHover: '#5B90A2',
      accentPrimaryText: '#82B4C4',
      accentPrimarySoft: '#202E36',
      accentSecondary: '#638F6D',
      accentSecondaryText: '#8AB895',
      accentSecondarySoft: '#1E2C22',
      accentWarm: '#C79150',
      accentWarmText: '#E0B075',
      accentWarmSoft: '#2E251A',
      accentCool: '#738594',
      accentCoolText: '#9EB0BF',
      accentCoolSoft: '#21282E',
      ringTrack: 'rgba(240, 244, 246, 0.10)',
    },
  },

  kyoto_cedar: {
    id: 'kyoto_cedar',
    name: 'Kyoto Cedar & Moss',
    tagline: 'Warm hinoki cedar wood, temple moss & handmade washi paper',
    swatches: ['#8A5E3B', '#F6F2EA', '#4D7856', '#C2674A'],
    light: {
      bgOuter: '#E8E1D3',
      bgBase: '#F6F2EA',
      bgCard: '#FFFFFF',
      bgHero: '#EFE7DA',
      bgRecessed: '#ECE5D8',
      borderSubtle: '#DFD6C7',
      borderStrong: '#B59476',
      textPrimary: '#241F1A',
      textSecondary: '#574E44',
      textMuted: '#6D6358',
      textOnAccent: '#FFFFFF',
      accentPrimary: '#8A5E3B',
      accentPrimaryHover: '#734D2F',
      accentPrimaryText: '#704A2C',
      accentPrimarySoft: '#F2E7DC',
      accentSecondary: '#4D7856',
      accentSecondaryText: '#375C3F',
      accentSecondarySoft: '#E2EFE4',
      accentWarm: '#C2674A',
      accentWarmText: '#994930',
      accentWarmSoft: '#F7E6E0',
      accentCool: '#5E7D78',
      accentCoolText: '#43615C',
      accentCoolSoft: '#E3ECEA',
      ringTrack: 'rgba(36, 31, 26, 0.10)',
    },
    dark: {
      bgOuter: '#110F0C',
      bgBase: '#181512',
      bgCard: '#24201B',
      bgHero: '#2E261E',
      bgRecessed: '#14120F',
      borderSubtle: '#363029',
      borderStrong: '#826042',
      textPrimary: '#F5F0E6',
      textSecondary: '#C2B8AA',
      textMuted: '#9A9083',
      textOnAccent: '#F5F0E6',
      accentPrimary: '#A3744D',
      accentPrimaryHover: '#B5835B',
      accentPrimaryText: '#D4A57D',
      accentPrimarySoft: '#2E261E',
      accentSecondary: '#5D8A66',
      accentSecondaryText: '#85B38E',
      accentSecondarySoft: '#1E2B21',
      accentWarm: '#C77256',
      accentWarmText: '#E3957B',
      accentWarmSoft: '#33221D',
      accentCool: '#668782',
      accentCoolText: '#8FB0AB',
      accentCoolSoft: '#1E2927',
      ringTrack: 'rgba(245, 240, 230, 0.10)',
    },
  },
};

export const CORNER_RADIUS_MAP: Record<CornerStyle, { card: string; button: string; label: string }> = {
  sharp: { card: '14px', button: '10px', label: 'Crisp (14px)' },
  organic: { card: '24px', button: '14px', label: 'Organic (24px)' },
  pebble: { card: '30px', button: '18px', label: 'Pebble (30px)' },
};
