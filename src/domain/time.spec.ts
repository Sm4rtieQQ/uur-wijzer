import { describe, expect, it } from 'vitest'
import {
  elapsedMinutes,
  formatDuration,
  formatSignedDuration,
  hoursToMinutes,
  isValidTimeOfDay,
  minutesToHours,
  parseTimeOfDay,
  timeOfDayFromMinutes,
} from './time'

describe('isValidTimeOfDay', () => {
  it('accepteert 24-uursnotatie', () => {
    expect(isValidTimeOfDay('00:00')).toBe(true)
    expect(isValidTimeOfDay('23:59')).toBe(true)
    expect(isValidTimeOfDay('07:05')).toBe(true)
  })

  it('weigert ongeldige waarden', () => {
    expect(isValidTimeOfDay('24:00')).toBe(false)
    expect(isValidTimeOfDay('8:00')).toBe(false)
    expect(isValidTimeOfDay('08:60')).toBe(false)
    expect(isValidTimeOfDay('')).toBe(false)
    expect(isValidTimeOfDay('08.00')).toBe(false)
  })
})

describe('parseTimeOfDay en timeOfDayFromMinutes', () => {
  it('zet tijd om naar minuten en terug', () => {
    expect(parseTimeOfDay('08:30')).toBe(510)
    expect(parseTimeOfDay('00:00')).toBe(0)
    expect(parseTimeOfDay('onbekend')).toBeNull()
    expect(timeOfDayFromMinutes(510)).toBe('08:30')
    expect(timeOfDayFromMinutes(0)).toBe('00:00')
  })
})

describe('elapsedMinutes', () => {
  it('berekent de verstreken tijd', () => {
    expect(elapsedMinutes('09:00', '17:30')).toBe(510)
    expect(elapsedMinutes('00:00', '23:59')).toBe(1439)
  })

  it('weigert ongeldige of omgekeerde tijden', () => {
    expect(elapsedMinutes('17:00', '09:00')).toBeNull()
    expect(elapsedMinutes('09:00', '09:00')).toBeNull()
    expect(elapsedMinutes('09:00', 'niet')).toBeNull()
  })

  it('ondersteunt geen diensten over middernacht', () => {
    expect(elapsedMinutes('23:00', '01:00')).toBeNull()
  })
})

describe('eenheden omzetten', () => {
  it('zet uren om naar minuten', () => {
    expect(hoursToMinutes(32)).toBe(1920)
    expect(hoursToMinutes(32.5)).toBe(1950)
    expect(hoursToMinutes(0)).toBe(0)
  })

  it('zet minuten om naar uren', () => {
    expect(minutesToHours(1950)).toBe(32.5)
    expect(minutesToHours(1920)).toBe(32)
  })
})

describe('opmaak van duur', () => {
  it('toont leesbare duurnotatie', () => {
    expect(formatDuration(450)).toBe('7u 30m')
    expect(formatDuration(480)).toBe('8u')
    expect(formatDuration(45)).toBe('45m')
    expect(formatDuration(0)).toBe('0m')
  })

  it('toont saldo met teken', () => {
    expect(formatSignedDuration(450)).toBe('+7u 30m')
    expect(formatSignedDuration(-120)).toBe('-2u')
    expect(formatSignedDuration(0)).toBe('+0m')
  })
})
