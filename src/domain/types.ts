/**
 * Datamodellen van UurWijzer.
 *
 * Let op de eenheden:
 * - datum: ISO-string `yyyy-mm-dd` (zie `date.ts`)
 * - tijd: 24-uursstring `HH:mm` (zie `time.ts`)
 * - duur en contracturen: hele minuten
 */

/** Datum in ISO-notatie `yyyy-mm-dd`. */
export type IsoDate = string

/** Tijdstip in 24-uursnotatie `HH:mm`. */
export type TimeOfDay = string

/** ISO-weekdag: 1 = maandag t/m 7 = zondag. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** Beschikbare app-thema's. */
export type ThemeId = 'light' | 'dark' | 'system'

/** Herinneringsinstellingen per profiel. */
export interface ReminderSettings {
  /** Staat de herinnering aan voor dit profiel? */
  enabled: boolean
  /** Weekdagen waarop een herinnering mag worden gestuurd. */
  days: IsoWeekday[]
  /** Tijdstip van de herinnering als `HH:mm`. */
  time: TimeOfDay
}

/** Profiel (een werkgever) met bijbehorende instellingen. */
export interface Profile {
  id: string
  /** Naam van werkgever/bedrijf; tevens de profielnaam. */
  name: string
  /** Contracturen per week, in minuten (32,5 uur = 1950). */
  contractMinutes: number
  defaultStartTime: TimeOfDay
  defaultEndTime: TimeOfDay
  /** Accentkleur van het profiel als hex-notatie (`#rrggbb`). */
  accentColor: string
  reminders: ReminderSettings
}

/** Eén gewerkte dienst. Gewerkte tijd is de verstreken tijd tussen start en eind. */
export interface Registration {
  id: string
  profileId: string
  date: IsoDate
  startTime: TimeOfDay
  endTime: TimeOfDay
}

/** Weekgegevens per profiel per ISO-week. */
export interface WeekRecord {
  profileId: string
  /** ISO-weekjaar (kan afwijken van het kalenderjaar). */
  isoYear: number
  /** ISO-weeknummer (1-53). */
  isoWeek: number
  /** Vastgelegde contracturen in minuten. */
  contractMinutes: number
  /** Vakantiemarkering; effectief contract is dan 0, bedrag blijft bewaard. */
  isVacation: boolean
  /** Geregistreerde ziekte-uren in minuten; telt mee in het saldo. */
  sickMinutes: number
}

/** Alle lokaal opgeslagen appdata. */
export interface AppData {
  schemaVersion: number
  /** Gedeelde gebruikersnaam voor de hele app. */
  username: string
  /** App-breed thema, gedeeld door alle profielen. */
  theme: ThemeId
  profiles: Profile[]
  registrations: Registration[]
  weeks: WeekRecord[]
  /** ID van het laatst geopende profiel. */
  lastProfileId: string | null
}

/** Huidige schemaversie van het opgeslagen formaat. */
export const SCHEMA_VERSION = 3

/** Uniforme resultaatvorm voor validaties. */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Partial<Record<string, string>> }
