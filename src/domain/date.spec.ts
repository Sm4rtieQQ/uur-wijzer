import { describe, expect, it } from 'vitest'
import {
  addDays,
  compareIsoDates,
  daysBetween,
  formatDateDutch,
  formatDateRangeDutch,
  isValidIsoDate,
  isoDateToUtcDate,
  isoWeekdayOf,
  startOfWeek,
  todayIsoDate,
  utcDateToIsoDate,
} from './date'

describe('isValidIsoDate', () => {
  it('accepteert bestaande datums', () => {
    expect(isValidIsoDate('2026-10-15')).toBe(true)
    expect(isValidIsoDate('2024-02-29')).toBe(true)
  })

  it('weigert onjuiste notaties en niet-bestaande datums', () => {
    expect(isValidIsoDate('15-10-2026')).toBe(false)
    expect(isValidIsoDate('2026-1-5')).toBe(false)
    expect(isValidIsoDate('2023-02-29')).toBe(false)
    expect(isValidIsoDate('2026-13-01')).toBe(false)
    expect(isValidIsoDate('')).toBe(false)
    expect(isValidIsoDate(20261015)).toBe(false)
    expect(isValidIsoDate(null)).toBe(false)
  })
})

describe('datumbewerkingen', () => {
  it('telt dagen op en af', () => {
    expect(addDays('2026-10-15', 1)).toBe('2026-10-16')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
  })

  it('berekent het verschil in dagen', () => {
    expect(daysBetween('2026-10-12', '2026-10-18')).toBe(6)
    expect(daysBetween('2026-10-18', '2026-10-12')).toBe(-6)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('vergelijkt datums', () => {
    expect(compareIsoDates('2026-10-15', '2026-10-15')).toBe(0)
    expect(compareIsoDates('2026-10-15', '2026-10-16')).toBe(-1)
    expect(compareIsoDates('2026-11-01', '2026-10-31')).toBe(1)
  })

  it('bepaalt de ISO-weekdag', () => {
    expect(isoWeekdayOf('2026-10-12')).toBe(1)
    expect(isoWeekdayOf('2026-10-15')).toBe(4)
    expect(isoWeekdayOf('2026-10-18')).toBe(7)
  })

  it('bepaalt de maandag van de week', () => {
    expect(startOfWeek('2026-10-15')).toBe('2026-10-12')
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12')
    expect(startOfWeek('2026-10-19')).toBe('2026-10-19')
  })
})

describe('UTC-omzetting', () => {
  it('is rondgaand en tijdzone-onafhankelijk', () => {
    expect(utcDateToIsoDate(isoDateToUtcDate('2026-10-15'))).toBe('2026-10-15')
    expect(isoDateToUtcDate('2026-10-15').toISOString()).toBe('2026-10-15T00:00:00.000Z')
  })
})

describe('opmaak', () => {
  it('toont datums als d-m-jjjj', () => {
    expect(formatDateDutch('2026-10-15')).toBe('15-10-2026')
    expect(formatDateDutch('2026-01-05')).toBe('5-1-2026')
  })

  it('toont datumbereiken', () => {
    expect(formatDateRangeDutch('2026-10-12', '2026-10-18')).toBe('12-10-2026 t/m 18-10-2026')
  })
})

describe('todayIsoDate', () => {
  it('gebruikt de lokale kalenderdatum', () => {
    expect(todayIsoDate(new Date(2026, 9, 15, 23, 30))).toBe('2026-10-15')
    expect(todayIsoDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })
})
