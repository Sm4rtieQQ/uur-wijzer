import type { IsoDate, IsoWeekday } from './types'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Zet een ISO-datumstring om naar een `Date` op UTC-middernacht.
 * Rekenen in UTC voorkomt problemen met zomertijd en tijdzones.
 */
export function isoDateToUtcDate(iso: IsoDate): Date {
  const parts = iso.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  return new Date(Date.UTC(year, month - 1, day))
}

/** Zet een `Date` (UTC) om naar een ISO-datumstring. */
export function utcDateToIsoDate(date: Date): IsoDate {
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Huidige lokale datum als ISO-string. */
export function todayIsoDate(now: Date = new Date()): IsoDate {
  const year = String(now.getFullYear()).padStart(4, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Controleert of een waarde een bestaande kalenderdatum in ISO-notatie is. */
export function isValidIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    return false
  }
  const date = isoDateToUtcDate(value)
  return utcDateToIsoDate(date) === value
}

/** Telt een aantal dagen bij een ISO-datum op (negatief mag). */
export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = isoDateToUtcDate(iso)
  return utcDateToIsoDate(new Date(date.getTime() + days * MS_PER_DAY))
}

/** Verschil in hele dagen tussen twee ISO-datums (`b - a`). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((isoDateToUtcDate(b).getTime() - isoDateToUtcDate(a).getTime()) / MS_PER_DAY)
}

/** Vergelijkt twee ISO-datums: -1 (a eerder), 0 (gelijk), 1 (a later). */
export function compareIsoDates(a: IsoDate, b: IsoDate): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/** ISO-weekdag (1 = maandag t/m 7 = zondag). */
export function isoWeekdayOf(iso: IsoDate): IsoWeekday {
  const day = isoDateToUtcDate(iso).getUTCDay()
  return (day === 0 ? 7 : day) as IsoWeekday
}

/** Maandag van de week waarin de datum valt. */
export function startOfWeek(iso: IsoDate): IsoDate {
  return addDays(iso, -(isoWeekdayOf(iso) - 1))
}

/** Nederlandse weergave van een datum als `d-m-jjjj`. */
export function formatDateDutch(iso: IsoDate): string {
  const parts = iso.split('-')
  const year = parts[0] ?? ''
  const month = parts[1] ?? ''
  const day = parts[2] ?? ''
  return `${Number(day)}-${Number(month)}-${year}`
}

/** Nederlandse weergave van een datumbereik als `d-m-jjjj t/m d-m-jjjj`. */
export function formatDateRangeDutch(from: IsoDate, to: IsoDate): string {
  return `${formatDateDutch(from)} t/m ${formatDateDutch(to)}`
}
