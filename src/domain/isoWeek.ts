import { addDays, isoDateToUtcDate, isoWeekdayOf, utcDateToIsoDate } from './date'
import type { IsoDate } from './types'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_WEEK = 7 * MS_PER_DAY

/** ISO-weekjaar en weeknummer volgens ISO 8601. */
export interface IsoWeekRef {
  isoYear: number
  isoWeek: number
}

/** Donderdag in de week van 4 januari: bepalend voor het ISO-weekjaar. */
function firstThursdayOfYear(isoYear: number): Date {
  const januaryFourth = new Date(Date.UTC(isoYear, 0, 4))
  const weekday = januaryFourth.getUTCDay() === 0 ? 7 : januaryFourth.getUTCDay()
  return new Date(januaryFourth.getTime() + (4 - weekday) * MS_PER_DAY)
}

/** Maandag van week 1 van een ISO-weekjaar. */
function firstMondayOfYear(isoYear: number): Date {
  return new Date(firstThursdayOfYear(isoYear).getTime() - 3 * MS_PER_DAY)
}

/** Bepaalt ISO-weekjaar en weeknummer van een datum. */
export function getIsoWeek(iso: IsoDate): IsoWeekRef {
  const date = isoDateToUtcDate(iso)
  const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
  const thursday = new Date(date.getTime() + (4 - weekday) * MS_PER_DAY)
  const isoYear = thursday.getUTCFullYear()
  const week = Math.round((thursday.getTime() - firstThursdayOfYear(isoYear).getTime()) / MS_PER_WEEK) + 1
  return { isoYear, isoWeek: week }
}

/** Aantal weken (52 of 53) in een ISO-weekjaar. */
export function isoWeeksInYear(isoYear: number): number {
  return Math.round((firstMondayOfYear(isoYear + 1).getTime() - firstMondayOfYear(isoYear).getTime()) / MS_PER_WEEK)
}

/** Maandag van de opgegeven ISO-week. */
export function isoWeekStart(isoYear: number, isoWeek: number): IsoDate {
  const monday = new Date(firstMondayOfYear(isoYear).getTime() + (isoWeek - 1) * MS_PER_WEEK)
  return utcDateToIsoDate(monday)
}

/** Zondag van de opgegeven ISO-week. */
export function isoWeekEnd(isoYear: number, isoWeek: number): IsoDate {
  return addDays(isoWeekStart(isoYear, isoWeek), 6)
}

/** De zeven datums (maandag t/m zondag) van een ISO-week. */
export function isoWeekDates(isoYear: number, isoWeek: number): IsoDate[] {
  const monday = isoWeekStart(isoYear, isoWeek)
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(monday, offset))
}

/** Unieke sleutel voor een ISO-week, bijvoorbeeld `2026-05`. */
export function isoWeekKey(isoYear: number, isoWeek: number): string {
  return `${isoYear}-${String(isoWeek).padStart(2, '0')}`
}

/** Vergelijkt twee ISO-weken chronologisch: -1, 0 of 1. */
export function compareIsoWeeks(a: IsoWeekRef, b: IsoWeekRef): number {
  if (a.isoYear !== b.isoYear) return a.isoYear < b.isoYear ? -1 : 1
  if (a.isoWeek !== b.isoWeek) return a.isoWeek < b.isoWeek ? -1 : 1
  return 0
}

/** Verschil in hele weken tussen twee ISO-weken (`b - a`). */
export function isoWeekDifference(a: IsoWeekRef, b: IsoWeekRef): number {
  const startA = isoDateToUtcDate(isoWeekStart(a.isoYear, a.isoWeek)).getTime()
  const startB = isoDateToUtcDate(isoWeekStart(b.isoYear, b.isoWeek)).getTime()
  return Math.round((startB - startA) / MS_PER_WEEK)
}

/** Telt een aantal weken op bij een ISO-week. */
export function addIsoWeeks(ref: IsoWeekRef, weeks: number): IsoWeekRef {
  const monday = isoDateToUtcDate(isoWeekStart(ref.isoYear, ref.isoWeek))
  return getIsoWeek(utcDateToIsoDate(new Date(monday.getTime() + weeks * MS_PER_WEEK)))
}

/** Nederlandse weergave van een weeknummer, bijvoorbeeld `week 5`. */
export function formatIsoWeekLabel(isoYear: number, isoWeek: number): string {
  return `week ${isoWeek} (${isoYear})`
}

/** Controleert of een ISO-weeknummer bestaat binnen het opgegeven weekjaar. */
export function isValidIsoWeek(isoYear: number, isoWeek: number): boolean {
  return (
    Number.isInteger(isoYear) &&
    Number.isInteger(isoWeek) &&
    isoYear >= 1970 &&
    isoYear <= 9999 &&
    isoWeek >= 1 &&
    isoWeek <= isoWeeksInYear(isoYear)
  )
}

/** Bepaalt de weekdag van een datum binnen een ISO-week (1 = maandag). */
export function weekdayIndexInWeek(iso: IsoDate): number {
  return isoWeekdayOf(iso) - 1
}
