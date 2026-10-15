import { describe, expect, it } from 'vitest'
import {
  validateProfileInput,
  validateRegistrationInput,
  validateReminderSettings,
  type ProfileFormInput,
  type RegistrationFormInput,
} from './validation'

const validRegistration: RegistrationFormInput = {
  date: '2026-10-15',
  startTime: '09:00',
  endTime: '17:00',
}

describe('validateRegistrationInput', () => {
  it('accepteert geldige invoer', () => {
    const result = validateRegistrationInput(validRegistration, '2026-10-15')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({
        date: '2026-10-15',
        startTime: '09:00',
        endTime: '17:00',
      })
    }
  })

  it('weigert een datum in de toekomst', () => {
    const result = validateRegistrationInput({ ...validRegistration, date: '2026-10-16' }, '2026-10-15')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.date).toContain('toekomst')
  })

  it('accepteert vandaag als datum', () => {
    expect(validateRegistrationInput({ ...validRegistration, date: '2026-10-15' }, '2026-10-15').ok).toBe(true)
  })

  it('weigert ontbrekende en ongeldige datums', () => {
    const missing = validateRegistrationInput({ ...validRegistration, date: '' }, '2026-10-15')
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.errors.date).toContain('datum')

    const invalid = validateRegistrationInput({ ...validRegistration, date: '2026-02-30' }, '2026-10-15')
    expect(invalid.ok).toBe(false)
  })

  it('weigert een eindtijd die niet later is dan de starttijd', () => {
    const result = validateRegistrationInput({ ...validRegistration, endTime: '09:00' }, '2026-10-15')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.endTime).toContain('later')
  })

  it('geeft een begrijpelijke melding voor diensten over middernacht', () => {
    const result = validateRegistrationInput(
      { ...validRegistration, startTime: '22:00', endTime: '02:00' },
      '2026-10-15',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.endTime).toContain('middernacht')
  })

  it('weigert ongeldige tijden', () => {
    const result = validateRegistrationInput(
      { date: '2026-10-15', startTime: '9:00', endTime: '25:00' },
      '2026-10-15',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.startTime).toBeDefined()
      expect(result.errors.endTime).toBeDefined()
    }
  })
})

const validProfile: ProfileFormInput = {
  name: '  Bakkerij Jansen  ',
  contractHours: '32,5',
  defaultStartTime: '08:00',
  defaultEndTime: '16:30',
  theme: 'light',
}

describe('validateProfileInput', () => {
  it('accepteert geldige invoer en trimt de naam', () => {
    const result = validateProfileInput(validProfile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('Bakkerij Jansen')
      expect(result.value.contractMinutes).toBe(1950)
      expect(result.value.theme).toBe('light')
    }
  })

  it('weigert een ontbrekende naam', () => {
    const result = validateProfileInput({ ...validProfile, name: '   ' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.name).toContain('werkgever')
  })

  it('weigert ongeldige contracturen', () => {
    for (const hours of ['', 'abc', '-8', '200']) {
      const result = validateProfileInput({ ...validProfile, contractHours: hours })
      expect(result.ok).toBe(false)
    }
    expect(validateProfileInput({ ...validProfile, contractHours: '0' }).ok).toBe(true)
  })

  it('weigert ongeldige standaardtijden', () => {
    const result = validateProfileInput({ ...validProfile, defaultStartTime: '08:00', defaultEndTime: '07:00' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.defaultEndTime).toContain('later')
  })
})

describe('validateReminderSettings', () => {
  it('accepteert uitgeschakelde herinneringen zonder dagen', () => {
    expect(validateReminderSettings(false, [], '09:00').ok).toBe(true)
  })

  it('weigert ingeschakelde herinneringen zonder dagen', () => {
    const result = validateReminderSettings(true, [], '09:00')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.days).toBeDefined()
  })

  it('weigert een ongeldige tijd', () => {
    const result = validateReminderSettings(true, [1, 3], '9:00')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.time).toBeDefined()
  })

  it('ontdubbelt en sorteert dagen', () => {
    const result = validateReminderSettings(true, [5, 1, 5], '07:30')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.days).toEqual([1, 5])
  })
})
