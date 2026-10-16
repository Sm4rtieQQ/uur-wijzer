import { describe, expect, it } from 'vitest'
import {
  findOverlappingRegistration,
  validateProfileInput,
  validateRegistrationInput,
  validateReminderSettings,
  validateSickHours,
  type ProfileFormInput,
  type RegistrationFormInput,
} from './validation'
import type { Registration } from './types'

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
  accentColor: '#2563eb',
}

describe('validateRegistrationInput — overlap binnen één profiel', () => {
  function registration(overrides: Partial<Registration> = {}): Registration {
    return {
      id: 'r1',
      profileId: 'p1',
      date: '2026-10-15',
      startTime: '10:00',
      endTime: '15:00',
      ...overrides,
    }
  }

  it('weigert een tijdvak dat een bestaande registratie overlapt', () => {
    const result = validateRegistrationInput(
      { date: '2026-10-15', startTime: '13:00', endTime: '16:00' },
      '2026-10-15',
      { existingRegistrations: [registration()] },
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.overlap).toContain('overlapt')
      expect(result.errors.overlap).toContain('10:00 tot 15:00')
      expect(result.errors.overlap).toContain('15-10-2026')
    }
  })

  it('weigert ook een tijdvak dat volledig binnen een bestaande registratie valt', () => {
    const result = validateRegistrationInput(
      { date: '2026-10-15', startTime: '11:00', endTime: '12:00' },
      '2026-10-15',
      { existingRegistrations: [registration()] },
    )
    expect(result.ok).toBe(false)
  })

  it('staat direct aansluitende tijden toe', () => {
    const result = validateRegistrationInput(
      { date: '2026-10-15', startTime: '15:00', endTime: '16:00' },
      '2026-10-15',
      { existingRegistrations: [registration()] },
    )
    expect(result.ok).toBe(true)
  })

  it('negeert registraties op een andere dag', () => {
    const result = validateRegistrationInput(
      { date: '2026-10-14', startTime: '13:00', endTime: '16:00' },
      '2026-10-15',
      { existingRegistrations: [registration()] },
    )
    expect(result.ok).toBe(true)
  })

  it('sluit de registratie die wordt gewijzigd uit van de controle', () => {
    const result = validateRegistrationInput(
      { date: '2026-10-15', startTime: '11:00', endTime: '14:00' },
      '2026-10-15',
      { existingRegistrations: [registration()], excludeRegistrationId: 'r1' },
    )
    expect(result.ok).toBe(true)
  })

  it('vindt geen overlap bij ongeldige of lege tijdvakken', () => {
    const context = { existingRegistrations: [registration()] }
    expect(findOverlappingRegistration('2026-10-15', '16:00', '10:00', context)).toBeNull()
    expect(findOverlappingRegistration('2026-10-15', '', '', context)).toBeNull()
  })
})

describe('validateProfileInput', () => {
  it('accepteert geldige invoer en trimt de naam', () => {
    const result = validateProfileInput(validProfile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('Bakkerij Jansen')
      expect(result.value.contractMinutes).toBe(1950)
      expect(result.value.accentColor).toBe('#2563eb')
    }
  })

  it('weigert een accentkleur buiten de vaste set', () => {
    const result = validateProfileInput({ ...validProfile, accentColor: '#123456' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.accentColor).toContain('accentkleur')
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

describe('validateSickHours', () => {
  it('accepteert uren met komma of punt en zet ze om naar minuten', () => {
    const eight = validateSickHours('8')
    expect(eight.ok).toBe(true)
    if (eight.ok) expect(eight.value).toEqual({ sickMinutes: 480 })
    expect(validateSickHours('7,5').ok).toBe(true)
    expect(validateSickHours('7.5').ok).toBe(true)
  })

  it('accepteert 0 uur (verwijderen van ziekte)', () => {
    const result = validateSickHours('0')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.sickMinutes).toBe(0)
  })

  it('weigert lege en ongeldige invoer', () => {
    for (const value of ['', 'abc', '-4']) {
      const result = validateSickHours(value)
      expect(result.ok).toBe(false)
    }
  })

  it('weigert meer dan 168 uur per week', () => {
    const result = validateSickHours('169')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.sickHours).toContain('168')
  })
})
