import { compareIsoDates, todayIsoDate } from './date'
import { getIsoWeek, isoWeekDates, isoWeekEnd, isoWeekKey, isoWeekStart, type IsoWeekRef } from './isoWeek'
import { elapsedMinutes } from './time'
import type { AppData, IsoDate, Profile, Registration, WeekRecord } from './types'

/** Samenvatting van één week, afgeleid uit brongegevens. */
export interface WeekSummary {
  isoYear: number
  isoWeek: number
  startDate: IsoDate
  endDate: IsoDate
  /** Effectieve contracturen in minuten (0 bij vakantie). */
  contractMinutes: number
  /** Vastgelegde contracturen in minuten, ook bij vakantie. */
  storedContractMinutes: number
  workedMinutes: number
  /** Gewerkte uren minus contracturen. */
  balanceMinutes: number
  /** Zeven dagsommen (maandag t/m zondag) in minuten. */
  dailyMinutes: number[]
  registrationCount: number
  isVacation: boolean
}

/** Effectieve contracturen van een week: 0 bij vakantie, anders het weekrecord of het profiel. */
export function effectiveContractMinutes(weekRecord: WeekRecord | undefined, profile: Profile): number {
  if (!weekRecord) return profile.contractMinutes
  if (weekRecord.isVacation) return 0
  return weekRecord.contractMinutes
}

/** Zoekt het weekrecord van een profiel in een specifieke ISO-week. */
export function findWeekRecord(
  weeks: WeekRecord[],
  profileId: string,
  ref: IsoWeekRef,
): WeekRecord | undefined {
  return weeks.find(
    (week) => week.profileId === profileId && week.isoYear === ref.isoYear && week.isoWeek === ref.isoWeek,
  )
}

/** Alle registraties van een profiel op een datum, oudste starttijd eerst. */
export function registrationsOnDate(
  registrations: Registration[],
  profileId: string,
  date: IsoDate,
): Registration[] {
  return registrations
    .filter((registration) => registration.profileId === profileId && registration.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

/** Alle registraties van een profiel binnen een ISO-week, chronologisch. */
export function registrationsInWeek(
  registrations: Registration[],
  profileId: string,
  ref: IsoWeekRef,
): Registration[] {
  return registrations
    .filter((registration) => registration.profileId === profileId && isInIsoWeek(registration.date, ref))
    .sort(compareRegistrationsChronologically)
}

function isInIsoWeek(date: IsoDate, ref: IsoWeekRef): boolean {
  const week = getIsoWeek(date)
  return week.isoYear === ref.isoYear && week.isoWeek === ref.isoWeek
}

/** Sorteert registraties op datum en daarna op starttijd (oudste eerst). */
export function compareRegistrationsChronologically(a: Registration, b: Registration): number {
  const byDate = compareIsoDates(a.date, b.date)
  if (byDate !== 0) return byDate
  return a.startTime.localeCompare(b.startTime)
}

/** Gewerkte minuten van één registratie; `null` als de invoer onbruikbaar is. */
export function registrationWorkedMinutes(registration: Registration): number | null {
  return elapsedMinutes(registration.startTime, registration.endTime)
}

/** Som van de gewerkte minuten van een lijst registraties. */
export function sumWorkedMinutes(registrations: Registration[]): number {
  return registrations.reduce((total, registration) => {
    const minutes = registrationWorkedMinutes(registration)
    return minutes === null ? total : total + minutes
  }, 0)
}

/** Zeven dagsommen (maandag t/m zondag) voor een reeks registraties binnen één week. */
export function dailyMinutesForWeek(registrations: Registration[], ref: IsoWeekRef): number[] {
  const dates = isoWeekDates(ref.isoYear, ref.isoWeek)
  return dates.map((date) =>
    sumWorkedMinutes(registrations.filter((registration) => registration.date === date)),
  )
}

/** Bouwt een volledige weeksamenvatting op basis van brongegevens. */
export function buildWeekSummary(
  data: Pick<AppData, 'registrations' | 'weeks'>,
  profile: Profile,
  ref: IsoWeekRef,
): WeekSummary {
  const weekRecord = findWeekRecord(data.weeks, profile.id, ref)
  const registrations = registrationsInWeek(data.registrations, profile.id, ref)
  const worked = sumWorkedMinutes(registrations)
  const contractMinutes =
    weekRecord && weekRecord.isVacation ? 0 : (weekRecord?.contractMinutes ?? profile.contractMinutes)

  return {
    isoYear: ref.isoYear,
    isoWeek: ref.isoWeek,
    startDate: isoWeekStart(ref.isoYear, ref.isoWeek),
    endDate: isoWeekEnd(ref.isoYear, ref.isoWeek),
    contractMinutes,
    storedContractMinutes: weekRecord?.contractMinutes ?? profile.contractMinutes,
    workedMinutes: worked,
    balanceMinutes: worked - contractMinutes,
    dailyMinutes: dailyMinutesForWeek(registrations, ref),
    registrationCount: registrations.length,
    isVacation: weekRecord?.isVacation ?? false,
  }
}

/**
 * Weken van een ISO-weekjaar die relevant zijn voor het overzicht:
 * weken met registraties of weekgegevens, plus de huidige week als die in
 * hetzelfde ISO-weekjaar valt. Toekomstige weken worden uitgesloten.
 */
export function relevantIsoWeeks(data: Pick<AppData, 'registrations' | 'weeks'>, profileId: string, isoYear: number, today = todayIsoDate()): IsoWeekRef[] {
  const current = getIsoWeek(today)
  const keys = new Map<string, IsoWeekRef>()

  const add = (ref: IsoWeekRef) => {
    if (ref.isoYear !== isoYear) return
    const key = isoWeekKey(ref.isoYear, ref.isoWeek)
    keys.set(key, ref)
  }

  for (const registration of data.registrations) {
    if (registration.profileId !== profileId) continue
    add(getIsoWeek(registration.date))
  }
  for (const week of data.weeks) {
    if (week.profileId !== profileId) continue
    add({ isoYear: week.isoYear, isoWeek: week.isoWeek })
  }
  add(current)

  return [...keys.values()]
    .filter((ref) => compareIsoWeeksToDate(ref, today) <= 0)
    .sort((a, b) => (a.isoWeek === b.isoWeek ? 0 : a.isoWeek < b.isoWeek ? -1 : 1))
}

/**
 * Weken die het overzicht toont: de weken met gegevens, aangevuld met alle
 * lege weken ertussen, vanaf de eerste week met gegevens tot en met de
 * huidige week. Zo blijft zichtbaar dat er weken zijn waar niets is gewerkt.
 *
 * Let op: `relevantIsoWeeks` wordt hiervoor níet gebruikt, omdat die ook
 * bepaalt welke weken een weekrecord krijgen en welke weken in `yearBalance`
 * meetellen. Een lege week telt niet mee in het saldo (0 − contract zou
 * ten onrechte als verlies tellen), dus hier apart opvullen.
 */
export function overviewIsoWeeks(
  data: Pick<AppData, 'registrations' | 'weeks'>,
  profileId: string,
  isoYear: number,
  today = todayIsoDate(),
): IsoWeekRef[] {
  const withData = relevantIsoWeeks(data, profileId, isoYear, today)
  const current = getIsoWeek(today)

  // In een verlaten jaar valt er geen 'huidige week' binnen dat jaar; dan
  // blijft het overzicht bij de weken waar daadwerkelijk gegevens in staan.
  if (current.isoYear !== isoYear || withData.length === 0) return withData

  const filled = new Map(withData.map((ref) => [ref.isoWeek, ref]))
  const firstWeek = Math.min(...withData.map((ref) => ref.isoWeek))
  for (let week = firstWeek; week <= current.isoWeek; week += 1) {
    if (!filled.has(week)) filled.set(week, { isoYear, isoWeek: week })
  }

  return [...filled.values()].sort((a, b) => b.isoWeek - a.isoWeek)
}

/** Vergelijkt een ISO-week met een datum: -1 (week ligt ervoor), 0 (bevat datum), 1 (erna). */
export function compareIsoWeeksToDate(ref: IsoWeekRef, date: IsoDate): number {
  const weekOfDate = getIsoWeek(date)
  if (ref.isoYear !== weekOfDate.isoYear) return ref.isoYear < weekOfDate.isoYear ? -1 : 1
  if (ref.isoWeek !== weekOfDate.isoWeek) return ref.isoWeek < weekOfDate.isoWeek ? -1 : 1
  return 0
}

/**
 * Urensaldo over een ISO-weekjaar: som van (gewerkte uren − contracturen)
 * over alle relevante weken van dat jaar.
 */
export function yearBalance(
  data: Pick<AppData, 'registrations' | 'weeks'>,
  profile: Profile,
  isoYear: number,
  today = todayIsoDate(),
): number {
  return relevantIsoWeeks(data, profile.id, isoYear, today).reduce((total, ref) => {
    const summary = buildWeekSummary(data, profile, ref)
    return total + summary.balanceMinutes
  }, 0)
}

/** Beschikbare ISO-weekjaren met gegevens voor een profiel (nieuwste eerst). */
export function availableIsoYears(
  data: Pick<AppData, 'registrations' | 'weeks'>,
  profileId: string,
  today = todayIsoDate(),
): number[] {
  const years = new Set<number>()
  for (const registration of data.registrations) {
    if (registration.profileId !== profileId) continue
    years.add(getIsoWeek(registration.date).isoYear)
  }
  for (const week of data.weeks) {
    if (week.profileId !== profileId) continue
    years.add(week.isoYear)
  }
  years.add(getIsoWeek(today).isoYear)
  return [...years].sort((a, b) => b - a)
}
