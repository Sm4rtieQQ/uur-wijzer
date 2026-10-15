import { describe, expect, it } from 'vitest'
import { parseStoredData } from './parseStoredData'
import { SCHEMA_VERSION, type Profile, type Registration, type WeekRecord } from '../domain/types'

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'p1',
    name: 'Bakkerij Jansen',
    contractMinutes: 1920,
    defaultStartTime: '08:00',
    defaultEndTime: '16:30',
    theme: 'dark',
    reminders: { enabled: true, days: [1, 3], time: '07:30' },
    ...overrides,
  }
}

function createRegistration(overrides: Partial<Registration> = {}): Registration {
  return {
    id: 'r1',
    profileId: 'p1',
    date: '2026-10-12',
    startTime: '08:00',
    endTime: '16:00',
    ...overrides,
  }
}

function createWeek(overrides: Partial<WeekRecord> = {}): WeekRecord {
  return { profileId: 'p1', isoYear: 2026, isoWeek: 42, contractMinutes: 1920, isVacation: false, ...overrides }
}

function stored(payload: unknown): string {
  return JSON.stringify(payload)
}

describe('parseStoredData', () => {
  it('geeft lege data zonder opgeslagen gegevens', () => {
    const result = parseStoredData(null)
    expect(result.hasUsableData).toBe(false)
    expect(result.data.profiles).toEqual([])
    expect(result.data.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.issues).toEqual([])
  })

  it('leest geldige gegevens integraal in', () => {
    const result = parseStoredData(
      stored({
        schemaVersion: SCHEMA_VERSION,
        username: 'Martin',
        profiles: [createProfile()],
        registrations: [createRegistration()],
        weeks: [createWeek({ isVacation: true })],
        lastProfileId: 'p1',
      }),
    )

    expect(result.issues).toEqual([])
    expect(result.hasUsableData).toBe(true)
    expect(result.data.username).toBe('Martin')
    expect(result.data.profiles).toHaveLength(1)
    expect(result.data.profiles[0]?.reminders).toEqual({ enabled: true, days: [1, 3], time: '07:30' })
    expect(result.data.registrations).toHaveLength(1)
    expect(result.data.weeks[0]?.isVacation).toBe(true)
    expect(result.data.lastProfileId).toBe('p1')
  })

  it('vangt onleesbare JSON op en meldt dit', () => {
    const result = parseStoredData('{niet geldig')
    expect(result.hasUsableData).toBe(false)
    expect(result.data.profiles).toEqual([])
    expect(result.issues[0]).toContain('niet worden gelezen')
  })

  it('vangt een onverwacht formaat op', () => {
    expect(parseStoredData('[1,2,3]').hasUsableData).toBe(false)
    expect(parseStoredData('"tekst"').hasUsableData).toBe(false)
    expect(parseStoredData('null').hasUsableData).toBe(false)
  })

  it('slaat kapotte profielen over en herstelt ongeldige standaardtijden', () => {
    const result = parseStoredData(
      stored({
        profiles: [
          { id: 'p1', name: 'Goed bedrijf' },
          { id: '', name: 'Zonder id' },
          { name: 'Zonder id en leeg' },
          { id: 'p3', name: 'Foute tijden', defaultStartTime: '25:00', defaultEndTime: 'abc' },
        ],
        registrations: [],
        weeks: [],
      }),
    )

    expect(result.data.profiles.map((profile) => profile.id)).toEqual(['p1', 'p3'])
    expect(result.data.profiles[0]?.defaultStartTime).toBe('09:00')
    expect(result.data.profiles[1]?.defaultStartTime).toBe('09:00')
    expect(result.data.profiles[1]?.defaultEndTime).toBe('17:00')
    expect(result.issues.length).toBeGreaterThanOrEqual(3)
  })

  it('slaat ongeldige registraties over en meldt ze', () => {
    const result = parseStoredData(
      stored({
        profiles: [createProfile()],
        registrations: [
          createRegistration({ id: 'ok' }),
          createRegistration({ id: 'future-time', endTime: '07:00' }),
          createRegistration({ id: 'bad-date', date: '2026-02-30' }),
          createRegistration({ id: 'missing-profile', profileId: 'onbekend' }),
          createRegistration({ id: 'ok' }),
        ],
        weeks: [],
      }),
    )

    expect(result.data.registrations.map((registration) => registration.id)).toEqual(['ok'])
    expect(result.issues.some((issue) => issue.includes('ongeldige tijden'))).toBe(true)
    expect(result.issues.some((issue) => issue.includes('ontbrekende of ongeldige gegevens'))).toBe(true)
    expect(result.issues.some((issue) => issue.includes('onbekend profiel'))).toBe(true)
  })

  it('slaat weken met een ongeldig weeknummer jaar of profiel over', () => {
    const result = parseStoredData(
      stored({
        profiles: [createProfile()],
        registrations: [],
        weeks: [
          createWeek(),
          createWeek({ isoWeek: 99 }),
          createWeek({ isoYear: 2027, isoWeek: 53 }),
          createWeek({ profileId: 'onbekend' }),
          createWeek({ isoYear: 2026, isoWeek: 41 }),
        ],
      }),
    )

    expect(result.data.weeks.map((week) => week.isoWeek)).toEqual([42, 41])
    expect(result.issues.some((issue) => issue.includes('ongeldige week'))).toBe(true)
    expect(result.issues.some((issue) => issue.includes('onbekend profiel'))).toBe(true)
  })

  it('ontdubbelt profielen, registraties en weekgegevens', () => {
    const result = parseStoredData(
      stored({
        profiles: [createProfile(), createProfile()],
        registrations: [createRegistration(), createRegistration()],
        weeks: [createWeek(), createWeek()],
      }),
    )

    expect(result.data.profiles).toHaveLength(1)
    expect(result.data.registrations).toHaveLength(1)
    expect(result.data.weeks).toHaveLength(1)
    expect(result.issues.some((issue) => issue.includes('Dubbel profiel'))).toBe(true)
  })

  it('zet een verwijzing naar een verdwenen profiel op null', () => {
    const result = parseStoredData(stored({ profiles: [createProfile()], lastProfileId: 'verdwenen' }))
    expect(result.data.lastProfileId).toBeNull()
    expect(result.issues.some((issue) => issue.includes('laatst gebruikte profiel'))).toBe(true)
  })

  it('waarschuwt bij een nieuwere schemaversie maar laadt de gegevens', () => {
    const result = parseStoredData(stored({ schemaVersion: SCHEMA_VERSION + 1, profiles: [createProfile()] }))
    expect(result.data.profiles).toHaveLength(1)
    expect(result.issues.some((issue) => issue.includes('nieuwer'))).toBe(true)
  })

  it('migreert ontbrekende of oudere schemaversies naar de huidige versie', () => {
    for (const schemaVersion of [undefined, 0, -1, 'onbekend']) {
      const result = parseStoredData(stored({ schemaVersion, profiles: [createProfile()] }))
      expect(result.data.schemaVersion).toBe(SCHEMA_VERSION)
      expect(result.data.profiles).toHaveLength(1)
    }
  })

  it('negeert pauzevelden bij de migratie van versie 1 naar 2', () => {
    const result = parseStoredData(
      stored({
        schemaVersion: 1,
        profiles: [{ ...createProfile(), defaultBreakMinutes: 30 }],
        registrations: [{ ...createRegistration(), breakMinutes: 30 }],
      }),
    )

    expect(result.issues).toEqual([])
    expect(result.data.schemaVersion).toBe(SCHEMA_VERSION)
    // De pauzevelden worden niet overgenomen; de overige gegevens blijven intact.
    expect(result.data.profiles[0]).toEqual(createProfile())
    expect(result.data.registrations[0]).toEqual(createRegistration())
  })

  it('herstelt ongeldige herinneringsinstellingen', () => {
    const result = parseStoredData(
      stored({
        profiles: [
          createProfile({ reminders: { enabled: true, days: [1, 9, 1] as never, time: 'kwart voor zeven' } }),
          { ...createProfile({ id: 'p2' }), reminders: 'onzin' },
        ],
      }),
    )

    expect(result.data.profiles[0]?.reminders).toEqual({ enabled: true, days: [1], time: '09:00' })
    expect(result.data.profiles[1]?.reminders).toEqual({ enabled: false, days: [], time: '09:00' })
  })

  it('behandelt ontbrekende lijsten en een niet-tekstuele gebruikersnaam zonder crash', () => {
    const result = parseStoredData(stored({ username: 42 }))
    expect(result.data.username).toBe('')
    expect(result.data.profiles).toEqual([])
    expect(result.issues.some((issue) => issue.includes('profielenlijst'))).toBe(true)
  })
})
