import type { ThemeId } from './types'

/** Standaardwaarden voor nieuwe profielen en als fallback bij ongeldige data. */
export const DEFAULT_START_TIME = '09:00'
export const DEFAULT_END_TIME = '17:00'
export const DEFAULT_CONTRACT_HOURS = 32
export const DEFAULT_THEME: ThemeId = 'light'
export const DEFAULT_REMINDER_TIME = '09:00'

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
