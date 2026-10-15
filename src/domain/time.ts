import type { TimeOfDay } from './types'

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

/** Controleert of een waarde een geldig tijdstip in `HH:mm` is. */
export function isValidTimeOfDay(value: unknown): value is TimeOfDay {
  return typeof value === 'string' && TIME_PATTERN.test(value)
}

/** Zet `HH:mm` om naar minuten vanaf middernacht; `null` bij ongeldige invoer. */
export function parseTimeOfDay(value: string): number | null {
  if (!isValidTimeOfDay(value)) return null
  const parts = value.split(':')
  const hours = Number(parts[0])
  const minutes = Number(parts[1])
  return hours * 60 + minutes
}

/** Zet minuten vanaf middernacht om naar `HH:mm`. */
export function timeOfDayFromMinutes(minutes: number): TimeOfDay {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const rest = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

/**
 * Verstreken minuten tussen twee tijdstippen.
 * Geeft `null` als een van beide ongeldig is of als de eindtijd niet later is
 * dan de starttijd (diensten over middernacht worden niet ondersteund).
 */
export function elapsedMinutes(startTime: string, endTime: string): number | null {
  const start = parseTimeOfDay(startTime)
  const end = parseTimeOfDay(endTime)
  if (start === null || end === null) return null
  if (end <= start) return null
  return end - start
}

/** Contracturen in uren omzetten naar minuten (32,5 → 1950). */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60)
}

/** Minuten omzetten naar uren, afgerond op twee decimalen (1950 → 32,5). */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100
}

/** Leesbare duurnotatie, bijvoorbeeld `7u 30m`, `8u`, `45m`. */
export function formatDuration(minutes: number): string {
  const total = Math.round(Math.abs(minutes))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (hours === 0) return `${rest}m`
  if (rest === 0) return `${hours}u`
  return `${hours}u ${rest}m`
}

/** Duur met expliciet teken, bijvoorbeeld `+7u 30m` of `-2u`. */
export function formatSignedDuration(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+'
  return `${sign}${formatDuration(minutes)}`
}
