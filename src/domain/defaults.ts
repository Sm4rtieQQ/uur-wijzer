import type { ThemeId } from './types'

/** Standaardwaarden voor nieuwe profielen en als fallback bij ongeldige data. */
export const DEFAULT_START_TIME = '09:00'
export const DEFAULT_END_TIME = '17:00'
export const DEFAULT_CONTRACT_HOURS = 32
export const DEFAULT_THEME: ThemeId = 'system'
export const DEFAULT_REMINDER_TIME = '09:00'

/**
 * Vaste set accentkleuren die per profiel gekozen kan worden.
 *
 * De volgorde bepaalt de indeling van de kleurkeuze (drie per rij):
 * rood/oranje/geel, groen/teal/blauw, paars/roze/grijs.
 *
 * De gekozen kleur geldt in zowel het lichte als het donkere thema; de
 * tekstkleur op de accent-achtergrond wordt automatisch bepaald op basis van
 * de helderheid (zie `state/useTheme.ts`).
 */
export const ACCENT_COLOR_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '#b91c1c', label: 'Rood' },
  { value: '#c2410c', label: 'Oranje' },
  { value: '#ca8a04', label: 'Geel' },
  { value: '#15803d', label: 'Groen' },
  { value: '#0f766e', label: 'Teal' },
  { value: '#2563eb', label: 'Blauw' },
  { value: '#7c3aed', label: 'Paars' },
  { value: '#db2777', label: 'Roze' },
  { value: '#4b5563', label: 'Grijs' },
]

/**
 * Standaard accentkleur voor nieuwe profielen en als fallback bij ongeldige
 * data. Bewust Blauw en niet de eerste kleur uit de lijst.
 */
export const DEFAULT_ACCENT_COLOR = '#2563eb'

/** Nederlandse korte dagaanduidingen, maandag t/m zondag. */
export const WEEKDAY_SHORT_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'] as const

/** Nederlandse volledige dagnamen, maandag t/m zondag. */
export const WEEKDAY_LONG_LABELS = [
  'maandag',
  'dinsdag',
  'woensdag',
  'donderdag',
  'vrijdag',
  'zaterdag',
  'zondag',
] as const

/** Beschikbare thema's met Nederlandse labels. */
export const THEME_OPTIONS: ReadonlyArray<{ id: ThemeId; label: string }> = [
  { id: 'light', label: 'Licht' },
  { id: 'dark', label: 'Donker' },
  { id: 'system', label: 'Systeem' },
]
