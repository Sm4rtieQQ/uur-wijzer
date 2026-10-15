import { describe, expect, it } from 'vitest'
import {
  addIsoWeeks,
  compareIsoWeeks,
  formatIsoWeekLabel,
  getIsoWeek,
  isoWeekDates,
  isoWeekDifference,
  isoWeekEnd,
  isoWeekKey,
  isoWeekStart,
  isoWeeksInYear,
  isValidIsoWeek,
} from './isoWeek'

describe('getIsoWeek', () => {
  it('bepaalt het weeknummer binnen een gewoon jaar', () => {
    expect(getIsoWeek('2026-01-01')).toEqual({ isoYear: 2026, isoWeek: 1 })
    expect(getIsoWeek('2026-10-15')).toEqual({ isoYear: 2026, isoWeek: 42 })
    expect(getIsoWeek('2026-10-12')).toEqual({ isoYear: 2026, isoWeek: 42 })
    expect(getIsoWeek('2026-10-18')).toEqual({ isoYear: 2026, isoWeek: 42 })
    expect(getIsoWeek('2026-10-19')).toEqual({ isoYear: 2026, isoWeek: 43 })
  })

  it('houdt rekening met het verschil tussen kalenderjaar en ISO-weekjaar', () => {
    expect(getIsoWeek('2021-01-01')).toEqual({ isoYear: 2020, isoWeek: 53 })
    expect(getIsoWeek('2020-12-31')).toEqual({ isoYear: 2020, isoWeek: 53 })
    expect(getIsoWeek('2019-12-30')).toEqual({ isoYear: 2020, isoWeek: 1 })
    expect(getIsoWeek('2027-01-01')).toEqual({ isoYear: 2026, isoWeek: 53 })
    expect(getIsoWeek('2021-01-04')).toEqual({ isoYear: 2021, isoWeek: 1 })
  })
})

describe('isoWeeksInYear', () => {
  it('geeft 52 of 53 weken', () => {
    expect(isoWeeksInYear(2015)).toBe(53)
    expect(isoWeeksInYear(2020)).toBe(53)
    expect(isoWeeksInYear(2021)).toBe(52)
    expect(isoWeeksInYear(2026)).toBe(53)
    expect(isoWeeksInYear(2027)).toBe(52)
  })
})

describe('weekgrenzen', () => {
  it('berekent maandag en zondag van een week', () => {
    expect(isoWeekStart(2026, 42)).toBe('2026-10-12')
    expect(isoWeekEnd(2026, 42)).toBe('2026-10-18')
    expect(isoWeekStart(2026, 1)).toBe('2025-12-29')
    expect(isoWeekEnd(2026, 1)).toBe('2026-01-04')
  })

  it('geeft alle zeven dagen van de week', () => {
    const dates = isoWeekDates(2026, 42)
    expect(dates).toHaveLength(7)
    expect(dates[0]).toBe('2026-10-12')
    expect(dates[6]).toBe('2026-10-18')
  })

  it('is consistent met getIsoWeek', () => {
    for (const year of [2020, 2021, 2024, 2025, 2026, 2027]) {
      for (const week of [1, 2, 26, isoWeeksInYear(year)]) {
        expect(getIsoWeek(isoWeekStart(year, week))).toEqual({ isoYear: year, isoWeek: week })
        expect(getIsoWeek(isoWeekEnd(year, week))).toEqual({ isoYear: year, isoWeek: week })
      }
    }
  })
})

describe('weekvergelijking en -rekenen', () => {
  it('vergelijkt weken chronologisch', () => {
    expect(compareIsoWeeks({ isoYear: 2026, isoWeek: 5 }, { isoYear: 2026, isoWeek: 6 })).toBe(-1)
    expect(compareIsoWeeks({ isoYear: 2026, isoWeek: 5 }, { isoYear: 2026, isoWeek: 5 })).toBe(0)
    expect(compareIsoWeeks({ isoYear: 2027, isoWeek: 1 }, { isoYear: 2026, isoWeek: 53 })).toBe(1)
  })

  it('berekent verschillen over de jaarwisseling', () => {
    expect(isoWeekDifference({ isoYear: 2025, isoWeek: 52 }, { isoYear: 2026, isoWeek: 1 })).toBe(1)
    expect(isoWeekDifference({ isoYear: 2026, isoWeek: 1 }, { isoYear: 2025, isoWeek: 52 })).toBe(-1)
  })

  it('telt weken op', () => {
    expect(addIsoWeeks({ isoYear: 2025, isoWeek: 52 }, 1)).toEqual({ isoYear: 2026, isoWeek: 1 })
    expect(addIsoWeeks({ isoYear: 2026, isoWeek: 1 }, -1)).toEqual({ isoYear: 2025, isoWeek: 52 })
    expect(addIsoWeeks({ isoYear: 2026, isoWeek: 52 }, 1)).toEqual({ isoYear: 2026, isoWeek: 53 })
  })
})

describe('hulpfuncties', () => {
  it('maakt weeksleutels en labels', () => {
    expect(isoWeekKey(2026, 5)).toBe('2026-05')
    expect(formatIsoWeekLabel(2026, 5)).toBe('week 5 (2026)')
  })

  it('valideert weeknummers', () => {
    expect(isValidIsoWeek(2026, 53)).toBe(true)
    expect(isValidIsoWeek(2027, 53)).toBe(false)
    expect(isValidIsoWeek(2026, 0)).toBe(false)
    expect(isValidIsoWeek(2026, 54)).toBe(false)
  })
})
