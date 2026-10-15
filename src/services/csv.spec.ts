import { describe, expect, it } from 'vitest'
import { CSV_COLUMNS, exportToCsv, importFromCsv, parseCsv } from './csv'
import { createEmptyData } from '../storage/parseStoredData'
import { buildWeekSummary } from '../domain/weeks'
import type { AppData, Profile, Registration, WeekRecord } from '../domain/types'
import { SCHEMA_VERSION } from '../domain/types'

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-1',
    name: 'Bakkerij Jansen',
    contractMinutes: 1950,
    defaultStartTime: '08:00',
    defaultEndTime: '16:30',
    theme: 'dark',
    reminders: { enabled: true, days: [1, 3, 5], time: '07:30' },
    ...overrides,
  }
}

function createRegistration(overrides: Partial<Registration> = {}): Registration {
  return {
    id: 'registration-1',
    profileId: 'profile-1',
    date: '2026-10-12',
    startTime: '08:00',
    endTime: '16:00',
    ...overrides,
  }
}

function createWeek(overrides: Partial<WeekRecord> = {}): WeekRecord {
  return { profileId: 'profile-1', isoYear: 2026, isoWeek: 42, contractMinutes: 1950, isVacation: false, ...overrides }
}

function createData(overrides: Partial<AppData> = {}): AppData {
  return {
    ...createEmptyData(),
    username: 'Martin',
    profiles: [createProfile()],
    registrations: [createRegistration()],
    weeks: [createWeek()],
    lastProfileId: 'profile-1',
    ...overrides,
  }
}

/**
 * Voegt aan een export de legacy-kolom `break_minutes` toe met de gegeven
 * waarde, zoals een exportbestand van schemaversie 1 eruitzag.
 */
function withLegacyBreakColumn(csv: string, value: string): string {
  return parseCsv(csv)
    .map((row, index) => [...row, index === 0 ? 'break_minutes' : value].join(','))
    .join('\r\n')
}

describe('parseCsv', () => {
  it('leest velden, aanhalingstekens en regeleinden', () => {
    const rows = parseCsv('a,b\r\n"1,2","3""4"\r\nx,y\n')
    expect(rows).toEqual([
      ['a', 'b'],
      ['1,2', '3"4'],
      ['x', 'y'],
    ])
  })

  it('negeert een BOM en lege regels', () => {
    expect(parseCsv('\uFEFFa,b\r\n\r\n')).toEqual([['a', 'b']])
  })

  it('leest een laatste regel zonder regeleinde', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('geeft een lege lijst voor lege tekst', () => {
    expect(parseCsv('')).toEqual([])
  })
})

describe('exportToCsv', () => {
  it('schrijft een BOM, een kopregel en een meta-rij', () => {
    const csv = exportToCsv(createData())
    expect(csv.startsWith('\uFEFF')).toBe(true)
    const rows = parseCsv(csv)
    expect(rows[0]).toEqual([...CSV_COLUMNS])
    expect(rows[1]?.[0]).toBe('meta')
    expect(rows[1]?.[2]).toBe('Martin')
  })

  it('bevat profiel-, registratie- en weekgegevens', () => {
    const rows = parseCsv(exportToCsv(createData({ weeks: [createWeek({ isVacation: true })] })))
    const types = rows.slice(2).map((row) => row[0])
    expect(types).toEqual(['profile', 'week', 'registration'])
  })

  it('laat weken zonder eigen informatie weg', () => {
    const rows = parseCsv(exportToCsv(createData()))
    expect(rows.filter((row) => row[0] === 'week')).toHaveLength(0)
  })

  it('gebruikt een punt als decimaalteken en sluit komma\'s in namen af', () => {
    const csv = exportToCsv(
      createData({ profiles: [createProfile({ name: 'Jansen, Bakkerij', contractMinutes: 1950 })] }),
    )
    expect(csv).toContain('"Jansen, Bakkerij"')
    expect(csv).toContain('32.5')
  })

  it('is als CSV opnieuw te lezen (rondgaand)', () => {
    const data = createData({
      profiles: [createProfile(), createProfile({ id: 'profile-2', name: 'Bezorgdienst Piet', theme: 'light' })],
      registrations: [createRegistration(), createRegistration({ id: 'registration-2', profileId: 'profile-2' })],
      weeks: [
        createWeek({ isVacation: true }),
        createWeek({ profileId: 'profile-2', contractMinutes: 600 }),
        createWeek({ profileId: 'profile-2', isoWeek: 43, contractMinutes: 600 }),
      ],
    })

    const result = importFromCsv(exportToCsv(data), createEmptyData())
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.profiles).toHaveLength(2)
    expect(result.data.registrations).toHaveLength(2)
    expect(result.data.username).toBe('Martin')
    expect(result.data.profiles[0]?.reminders.days).toEqual([1, 3, 5])
    // Vakantieweek van profiel 1 plus twee afwijkende weekcontracten van profiel 2.
    expect(result.data.weeks).toHaveLength(3)
  })
})

describe('importFromCsv', () => {
  it('importeert een volledig bestand', () => {
    const exported = exportToCsv(createData({ weeks: [createWeek({ isVacation: true })] }))
    const result = importFromCsv(exported, createEmptyData())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summary.importedProfiles).toEqual(['Bakkerij Jansen'])
    expect(result.summary.importedRegistrations).toBe(1)
    expect(result.summary.importedWeeks).toBe(1)
    expect(result.data.profiles[0]?.theme).toBe('dark')
    expect(result.data.weeks[0]?.isVacation).toBe(true)
  })

  it('is idempotent: tweemaal importeren levert geen dubbele gegevens', () => {
    const exported = exportToCsv(createData({ weeks: [createWeek({ isVacation: true })] }))
    const first = importFromCsv(exported, createEmptyData())
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const second = importFromCsv(exported, first.data)
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.data.profiles).toHaveLength(1)
    expect(second.data.registrations).toHaveLength(1)
    expect(second.data.weeks).toHaveLength(1)
    expect(second.summary.skippedProfiles).toEqual(['Bakkerij Jansen'])
    expect(second.summary.importedRegistrations).toBe(0)
  })

  it('slaat bestaande profielen over maar importeert nieuwe profielen erbij', () => {
    const existing = createData()
    const incoming = exportToCsv(
      createData({
        profiles: [createProfile(), createProfile({ id: 'profile-2', name: 'Bezorgdienst Piet' })],
        registrations: [
          createRegistration(),
          createRegistration({ id: 'registration-2', profileId: 'profile-2', date: '2026-10-13' }),
        ],
        weeks: [createWeek({ profileId: 'profile-2', contractMinutes: 600 })],
      }),
    )

    const result = importFromCsv(incoming, existing)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.profiles.map((profile) => profile.id)).toEqual(['profile-1', 'profile-2'])
    expect(result.data.registrations.map((registration) => registration.id)).toEqual([
      'registration-1',
      'registration-2',
    ])
    expect(result.summary.skippedProfiles).toEqual(['Bakkerij Jansen'])
  })

  it('wijzigt niets bij een fout in het bestand', () => {
    const exported = exportToCsv(createData())
    const broken = exported.replace('2026-10-12', '2026-02-30')

    const result = importFromCsv(broken, createEmptyData())
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]).toContain('datum')
  })

  it('weigert een bestand met ontbrekende kolommen', () => {
    const result = importFromCsv('record,blog\r\nprofile,x\r\n', createEmptyData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toContain('mist de volgende kolommen')
  })

  it('weigert een leeg bestand', () => {
    const result = importFromCsv('', createEmptyData())
    expect(result.ok).toBe(false)
  })

  it('weigert een bestand van een nieuwere schemaversie', () => {
    const csv = exportToCsv(createData()).replace(`meta,${SCHEMA_VERSION}`, 'meta,99')
    const result = importFromCsv(csv, createEmptyData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toContain('nieuwere versie')
  })

  it('weigert dubbele profiel-id\'s en registratie-id\'s in het bestand', () => {
    const rows = parseCsv(exportToCsv(createData()))
    const profileRow = rows.find((row) => row[0] === 'profile') ?? []
    const registrationRow = rows.find((row) => row[0] === 'registration') ?? []
    const corrupted = [...rows, profileRow, registrationRow]
      .map((row: string[]) => row.join(','))
      .join('\r\n')

    const result = importFromCsv(corrupted, createEmptyData())
    expect(result.ok).toBe(false)
  })

  it('weigert registraties van een onbekend profiel', () => {
    const rows = parseCsv(exportToCsv(createData()))
    const withOrphan = [
      ...rows.filter((row) => row[0] !== 'registration'),
      rows.find((row) => row[0] === 'registration')?.map((value) => (value === 'profile-1' ? 'onbekend' : value)) ?? [],
    ]
      .map((row) => row.join(','))
      .join('\r\n')

    const result = importFromCsv(withOrphan, createEmptyData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0]).toContain('onbekend profiel')
  })

  it('negeert onbekende rijtypen met een waarschuwing', () => {
    const csv = `${exportToCsv(createData())}toekomstig,onbekend\r\n`
    const result = importFromCsv(csv, createEmptyData())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summary.warnings.some((warning) => warning.includes('onbekend rijtype'))).toBe(true)
  })

  it('neemt de gebruikersnaam alleen over als er nog geen is ingesteld', () => {
    const exported = exportToCsv(createData({ username: 'UitBestand' }))

    const empty = importFromCsv(exported, createEmptyData())
    expect(empty.ok).toBe(true)
    if (empty.ok) expect(empty.data.username).toBe('UitBestand')

    const existing = createData({ username: 'Bestaand', profiles: [], registrations: [], weeks: [] })
    const withExisting = importFromCsv(exported, existing)
    expect(withExisting.ok).toBe(true)
    if (withExisting.ok) {
      expect(withExisting.data.username).toBe('Bestaand')
      expect(withExisting.summary.warnings.some((warning) => warning.includes('gebruikersnaam'))).toBe(true)
    }
  })

  it('vult ontbrekende weekgegevens aan voor geïmporteerde registraties', () => {
    const data = createData({ weeks: [] })
    const result = importFromCsv(exportToCsv(data), createEmptyData())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.weeks).toHaveLength(1)
    expect(result.data.weeks[0]?.isoWeek).toBe(42)
    expect(result.data.weeks[0]?.contractMinutes).toBe(1950)

    const profile = result.data.profiles[0]!
    const summary = buildWeekSummary(result.data, profile, { isoYear: 2026, isoWeek: 42 })
    // 08:00–16:00 zonder pauze is de volledige 8 uur.
    expect(summary.workedMinutes).toBe(480)
  })

  it('negeert pauzekolommen van versie 1 met een waarschuwing', () => {
    // Voeg de legacy-kolom `break_minutes` toe met een pauzetijd van 30 minuten.
    const csv = withLegacyBreakColumn(exportToCsv(createData()), '30')
    const result = importFromCsv(csv, createEmptyData())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summary.warnings.some((warning) => warning.includes('pauze'))).toBe(true)
    // De pauze wordt genegeerd: de registratie telt 08:00–16:00 volledig.
    expect(result.data.registrations[0]).toEqual(createRegistration())
  })

  it('waarschuwt niet als de pauzekolommen leeg zijn', () => {
    const csv = withLegacyBreakColumn(exportToCsv(createData()), '')
    const result = importFromCsv(csv, createEmptyData())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summary.warnings.some((warning) => warning.includes('pauze'))).toBe(false)
  })

  it('weigert ongeldige profielgegevens en weekcontracten', () => {
    const csv = [
      CSV_COLUMNS.join(','),
      'meta,1,,,',
      'profile,,,Fout bedrijf,veel,08:00,16:30,30,light,false,,09:00',
      'profile,p9,Controle,,08:00,16:30,30,light,false,,09:00',
    ].join('\r\n')

    const result = importFromCsv(csv, createEmptyData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })
})
