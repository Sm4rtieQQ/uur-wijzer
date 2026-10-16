import { ACCENT_COLOR_OPTIONS, DEFAULT_ACCENT_COLOR, DEFAULT_END_TIME, DEFAULT_REMINDER_TIME, DEFAULT_START_TIME, DEFAULT_THEME } from '../domain/defaults'
import { isValidIsoDate } from '../domain/date'
import { isValidIsoWeek } from '../domain/isoWeek'
import { elapsedMinutes, isValidTimeOfDay } from '../domain/time'
import { SCHEMA_VERSION, type AppData, type IsoWeekday, type Profile, type Registration, type ReminderSettings, type ThemeId, type WeekRecord } from '../domain/types'

/** Resultaat van het lezen van opgeslagen data. */
export interface ParsedStoredData {
  data: AppData
  /** Menselijk leesbare meldingen over overgeslagen of herstelde gegevens. */
  issues: string[]
  /** Is er geldige opgeslagen data gevonden? */
  hasUsableData: boolean
}

/** Lege appdata met de huidige schemaversie. */
export function createEmptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    username: '',
    theme: DEFAULT_THEME,
    profiles: [],
    registrations: [],
    weeks: [],
    lastProfileId: null,
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function readNonNegativeInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const rounded = Math.round(value)
  return rounded < 0 ? fallback : rounded
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function readTheme(value: unknown): ThemeId {
  return value === 'light' || value === 'dark' || value === 'system' ? value : DEFAULT_THEME
}

/** Leest een accentkleur; onbekende of ongeldige waarden vallen terug op de standaard. */
function readAccentColor(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_ACCENT_COLOR
  const normalized = value.trim().toLowerCase()
  const isKnown = ACCENT_COLOR_OPTIONS.some((option) => option.value === normalized)
  return isKnown ? normalized : DEFAULT_ACCENT_COLOR
}

function parseReminderSettings(value: unknown): ReminderSettings {
  const record = asRecord(value)
  if (!record) {
    return { enabled: false, days: [], time: DEFAULT_REMINDER_TIME }
  }
  const rawDays = Array.isArray(record['days']) ? record['days'] : []
  const days = [...new Set(rawDays.filter((day): day is IsoWeekday => typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 7))].sort((a, b) => a - b)
  const time = readString(record['time'], DEFAULT_REMINDER_TIME)
  return {
    enabled: readBoolean(record['enabled'], false),
    days,
    time: isValidTimeOfDay(time) ? time : DEFAULT_REMINDER_TIME,
  }
}

function parseProfile(value: unknown, issues: string[]): Profile | null {
  const record = asRecord(value)
  if (!record) {
    issues.push('Een profiel kon niet worden gelezen en is overgeslagen.')
    return null
  }
  const id = readNonEmptyString(record['id'])
  const name = readNonEmptyString(record['name'])
  if (!id || !name) {
    issues.push('Een profiel zonder geldige id of naam is overgeslagen.')
    return null
  }

  const defaultStartTime = readString(record['defaultStartTime'], DEFAULT_START_TIME)
  const defaultEndTime = readString(record['defaultEndTime'], DEFAULT_END_TIME)
  const timesValid =
    isValidTimeOfDay(defaultStartTime) &&
    isValidTimeOfDay(defaultEndTime) &&
    elapsedMinutes(defaultStartTime, defaultEndTime) !== null
  if (!timesValid) {
    issues.push(`De standaardtijden van profiel "${name}" waren ongeldig en zijn hersteld.`)
  }

  return {
    id,
    name,
    contractMinutes: readNonNegativeInteger(record['contractMinutes'], 0),
    defaultStartTime: timesValid ? defaultStartTime : DEFAULT_START_TIME,
    defaultEndTime: timesValid ? defaultEndTime : DEFAULT_END_TIME,
    accentColor: readAccentColor(record['accentColor']),
    reminders: parseReminderSettings(record['reminders']),
  }
}

function parseRegistration(value: unknown, issues: string[]): Registration | null {
  const record = asRecord(value)
  if (!record) {
    issues.push('Een registratie kon niet worden gelezen en is overgeslagen.')
    return null
  }
  const id = readNonEmptyString(record['id'])
  const profileId = readNonEmptyString(record['profileId'])
  const date = readNonEmptyString(record['date'])
  const startTime = readNonEmptyString(record['startTime'])
  const endTime = readNonEmptyString(record['endTime'])

  if (!id || !profileId || !date || !startTime || !endTime || !isValidIsoDate(date)) {
    issues.push('Een registratie met ontbrekende of ongeldige gegevens is overgeslagen.')
    return null
  }
  if (elapsedMinutes(startTime, endTime) === null) {
    issues.push(`Registratie van ${date} had ongeldige tijden en is overgeslagen.`)
    return null
  }

  return { id, profileId, date, startTime, endTime }
}

function parseWeekRecord(value: unknown, issues: string[]): WeekRecord | null {
  const record = asRecord(value)
  if (!record) {
    issues.push('Weekgegevens konden niet worden gelezen en zijn overgeslagen.')
    return null
  }
  const profileId = readNonEmptyString(record['profileId'])
  const isoYear = readNonNegativeInteger(record['isoYear'], 0)
  const isoWeek = readNonNegativeInteger(record['isoWeek'], 0)
  if (!profileId || !isValidIsoWeek(isoYear, isoWeek)) {
    issues.push('Weekgegevens met een ongeldige week of profiel zijn overgeslagen.')
    return null
  }
  return {
    profileId,
    isoYear,
    isoWeek,
    contractMinutes: readNonNegativeInteger(record['contractMinutes'], 0),
    isVacation: readBoolean(record['isVacation'], false),
    sickMinutes: readNonNegativeInteger(record['sickMinutes'], 0),
  }
}

/** Past oudere schemaversies aan naar de huidige versie; onbekende versies blijven ongemoeid. */
function migrate(raw: Record<string, unknown>, issues: string[]): Record<string, unknown> {
  const rawVersion = raw['schemaVersion']
  const version = typeof rawVersion === 'number' && Number.isInteger(rawVersion) ? rawVersion : 0

  if (version > SCHEMA_VERSION) {
    issues.push(
      `De opgeslagen gegevens hebben schemaversie ${version}, die nieuwer is dan deze app ondersteunt (${SCHEMA_VERSION}). De gegevens worden zoveel mogelijk geladen.`,
    )
    return raw
  }
  if (version >= SCHEMA_VERSION) {
    return raw
  }

  // Migraties van oudere versies komen hier stapsgewijs bij.
  // Versie 0 (geen of onbekende versie): structuur was identiek aan versie 1.
  // Versie 1 → 2: pauze vervalt. De velden `defaultBreakMinutes` (profiel) en
  // `breakMinutes` (registratie) worden bij het lezen genegeerd; de gewerkte
  // tijd is vanaf nu de verstreken tijd tussen start en eind.
  // Versie 2 → 3: het thema verhuist van het profiel naar de app (`theme`).
  // Het profielthema wordt bij het lezen genegeerd en het app-thema valt terug
  // op de standaard (`system`); ziekte-uren en accentkleur krijgen defaults.
  return { ...raw, schemaVersion: SCHEMA_VERSION }
}

/** Leest en valideert opgeslagen JSON defensief; onbruikbare onderdelen worden overgeslagen. */
export function parseStoredData(raw: string | null): ParsedStoredData {
  const issues: string[] = []
  if (raw === null || raw.trim() === '') {
    return { data: createEmptyData(), issues, hasUsableData: false }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    issues.push('De opgeslagen gegevens konden niet worden gelezen. Er wordt met lege gegevens gestart.')
    return { data: createEmptyData(), issues, hasUsableData: false }
  }

  const record = asRecord(parsed)
  if (!record) {
    issues.push('De opgeslagen gegevens hebben een onverwacht formaat. Er wordt met lege gegevens gestart.')
    return { data: createEmptyData(), issues, hasUsableData: false }
  }

  const migrated = migrate(record, issues)

  const rawProfiles = Array.isArray(migrated['profiles']) ? migrated['profiles'] : []
  if (!Array.isArray(migrated['profiles'])) {
    issues.push('De profielenlijst ontbrak of was ongeldig.')
  }
  const profiles: Profile[] = []
  const profileIds = new Set<string>()
  for (const value of rawProfiles) {
    const profile = parseProfile(value, issues)
    if (!profile) continue
    if (profileIds.has(profile.id)) {
      issues.push(`Dubbel profiel "${profile.name}" is overgeslagen.`)
      continue
    }
    profileIds.add(profile.id)
    profiles.push(profile)
  }

  const rawRegistrations = Array.isArray(migrated['registrations']) ? migrated['registrations'] : []
  const registrations: Registration[] = []
  const registrationIds = new Set<string>()
  for (const value of rawRegistrations) {
    const registration = parseRegistration(value, issues)
    if (!registration) continue
    if (registrationIds.has(registration.id)) continue
    if (!profileIds.has(registration.profileId)) {
      issues.push(`Registratie van ${registration.date} hoort bij een onbekend profiel en is overgeslagen.`)
      continue
    }
    registrationIds.add(registration.id)
    registrations.push(registration)
  }

  const rawWeeks = Array.isArray(migrated['weeks']) ? migrated['weeks'] : []
  const weeks: WeekRecord[] = []
  const weekKeys = new Set<string>()
  for (const value of rawWeeks) {
    const week = parseWeekRecord(value, issues)
    if (!week) continue
    if (!profileIds.has(week.profileId)) {
      issues.push(`Weekgegevens van ${week.isoYear}-${week.isoWeek} horen bij een onbekend profiel en zijn overgeslagen.`)
      continue
    }
    const key = `${week.profileId}:${week.isoYear}-${week.isoWeek}`
    if (weekKeys.has(key)) continue
    weekKeys.add(key)
    weeks.push(week)
  }

  const lastProfileId = readNonEmptyString(migrated['lastProfileId'])
  const resolvedLastProfileId = lastProfileId && profileIds.has(lastProfileId) ? lastProfileId : null
  if (lastProfileId && !resolvedLastProfileId) {
    issues.push('Het laatst gebruikte profiel bestaat niet meer.')
  }

  return {
    data: {
      schemaVersion: SCHEMA_VERSION,
      username: readString(migrated['username'], '').trim(),
      theme: readTheme(migrated['theme']),
      profiles,
      registrations,
      weeks,
      lastProfileId: resolvedLastProfileId,
    },
    issues,
    hasUsableData: true,
  }
}
