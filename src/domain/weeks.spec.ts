import { describe, expect, it } from 'vitest'
import type { AppData, Profile, Registration, WeekRecord } from './types'
import {
  availableIsoYears,
  buildWeekSummary,
  dailyMinutesForWeek,
  effectiveContractMinutes,
  findWeekRecord,
  overviewIsoWeeks,
  registrationsOnDate,
  relevantIsoWeeks,
  yearBalance,
} from './weeks'

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-1',
    name: 'Bakkerij Jansen',
    contractMinutes: 1920,
    defaultStartTime: '09:00',
    defaultEndTime: '17:00',
    accentColor: '#2563eb',
    reminders: { enabled: false, days: [], time: '09:00' },
    ...overrides,
  }
}

function createRegistration(overrides: Partial<Registration> = {}): Registration {
  return {
    id: `reg-${Math.random().toString(36).slice(2, 8)}`,
    profileId: 'profile-1',
    date: '2026-10-12',
    startTime: '09:00',
    endTime: '17:00',
    ...overrides,
  }
}

function createAppData(overrides: Partial<AppData> = {}): AppData {
  return {
    schemaVersion: 3,
    username: 'Martin',
    theme: 'system',
    profiles: [createProfile()],
    registrations: [],
    weeks: [],
    lastProfileId: 'profile-1',
    ...overrides,
  }
}

/** Maakt een weekrecord met defaults; overschrijf alleen wat relevant is. */
function createWeekRecord(overrides: Partial<WeekRecord> = {}): WeekRecord {
  return {
    profileId: 'profile-1',
    isoYear: 2026,
    isoWeek: 42,
    contractMinutes: 1920,
    isVacation: false,
    sickMinutes: 0,
    ...overrides,
  }
}

describe('effectiveContractMinutes', () => {
  it('gebruikt het weekrecord als dat bestaat', () => {
    const profile = createProfile({ contractMinutes: 1920 })
    const week: WeekRecord = { profileId: 'profile-1', isoYear: 2026, isoWeek: 42, contractMinutes: 1200, isVacation: false, sickMinutes: 0 }
    expect(effectiveContractMinutes(week, profile)).toBe(1200)
  })

  it('valt terug op het profiel zonder weekrecord', () => {
    expect(effectiveContractMinutes(undefined, createProfile({ contractMinutes: 1440 }))).toBe(1440)
  })

  it('geeft nul contracturen bij een vakantieweek', () => {
    const profile = createProfile({ contractMinutes: 1920 })
    const week: WeekRecord = { profileId: 'profile-1', isoYear: 2026, isoWeek: 42, contractMinutes: 1920, isVacation: true, sickMinutes: 0 }
    expect(effectiveContractMinutes(week, profile)).toBe(0)
  })
})

describe('findWeekRecord', () => {
  it('zoekt op profiel en ISO-week', () => {
    const weeks: WeekRecord[] = [
      { profileId: 'profile-1', isoYear: 2026, isoWeek: 42, contractMinutes: 1920, isVacation: false, sickMinutes: 0 },
      { profileId: 'profile-2', isoYear: 2026, isoWeek: 42, contractMinutes: 960, isVacation: false, sickMinutes: 0 },
    ]
    expect(findWeekRecord(weeks, 'profile-2', { isoYear: 2026, isoWeek: 42 })?.contractMinutes).toBe(960)
    expect(findWeekRecord(weeks, 'profile-3', { isoYear: 2026, isoWeek: 42 })).toBeUndefined()
  })
})

describe('meerdere registraties op dezelfde dag', () => {
  it('telt de gewerkte tijd van alle registraties op', () => {
    const registrations = [
      createRegistration({ startTime: '08:00', endTime: '12:00' }),
      createRegistration({ startTime: '13:00', endTime: '17:00' }),
    ]
    const data = createAppData({ registrations })
    const summary = buildWeekSummary(data, createProfile(), { isoYear: 2026, isoWeek: 42 })

    expect(summary.registrationCount).toBe(2)
    expect(summary.workedMinutes).toBe(240 + 240)
    expect(summary.dailyMinutes[0]).toBe(480)
  })

  it('sorteert registraties van een dag op starttijd', () => {
    const data = createAppData({
      registrations: [
        createRegistration({ id: 'b', startTime: '13:00' }),
        createRegistration({ id: 'a', startTime: '08:00' }),
      ],
    })
    expect(registrationsOnDate(data.registrations, 'profile-1', '2026-10-12').map((r) => r.id)).toEqual(['a', 'b'])
  })
})

describe('weeksamenvatting', () => {
  it('berekent dagsommen, totaal en saldo', () => {
    const registrations = [
      createRegistration({ date: '2026-10-12', startTime: '09:00', endTime: '17:00' }),
      createRegistration({ date: '2026-10-14', startTime: '09:00', endTime: '12:30' }),
    ]
    const data = createAppData({
      registrations,
      weeks: [{ profileId: 'profile-1', isoYear: 2026, isoWeek: 42, contractMinutes: 1200, isVacation: false, sickMinutes: 0 }],
    })

    const summary = buildWeekSummary(data, createProfile(), { isoYear: 2026, isoWeek: 42 })
    expect(summary.startDate).toBe('2026-10-12')
    expect(summary.endDate).toBe('2026-10-18')
    expect(summary.dailyMinutes).toEqual([480, 0, 210, 0, 0, 0, 0])
    expect(summary.workedMinutes).toBe(690)
    expect(summary.contractMinutes).toBe(1200)
    expect(summary.balanceMinutes).toBe(-510)
    expect(summary.isVacation).toBe(false)
  })

  it('laat een vakantieweek meetellen met nul contracturen', () => {
    const data = createAppData({
      registrations: [createRegistration({ date: '2026-10-12', startTime: '09:00', endTime: '17:00' })],
      weeks: [{ profileId: 'profile-1', isoYear: 2026, isoWeek: 42, contractMinutes: 1920, isVacation: true, sickMinutes: 0 }],
    })
    const summary = buildWeekSummary(data, createProfile(), { isoYear: 2026, isoWeek: 42 })
    expect(summary.isVacation).toBe(true)
    expect(summary.contractMinutes).toBe(0)
    expect(summary.storedContractMinutes).toBe(1920)
    expect(summary.balanceMinutes).toBe(480)
  })

  it('telt ziekte-uren mee in het saldo', () => {
    const data = createAppData({
      registrations: [createRegistration({ date: '2026-10-12', startTime: '09:00', endTime: '17:00' })],
      weeks: [
        createWeekRecord({ contractMinutes: 1200, sickMinutes: 480 }),
      ],
    })
    const summary = buildWeekSummary(data, createProfile(), { isoYear: 2026, isoWeek: 42 })
    expect(summary.workedMinutes).toBe(480)
    expect(summary.sickMinutes).toBe(480)
    expect(summary.contractMinutes).toBe(1200)
    // saldo = gewerkt + ziekte − contract = 480 + 480 − 1200 = −240
    expect(summary.balanceMinutes).toBe(-240)
  })

  it('negeert ziekte niet in een vakantieweek (contract is dan 0)', () => {
    const data = createAppData({
      weeks: [createWeekRecord({ isVacation: true, contractMinutes: 1920, sickMinutes: 300 })],
    })
    const summary = buildWeekSummary(data, createProfile(), { isoYear: 2026, isoWeek: 42 })
    expect(summary.balanceMinutes).toBe(300)
  })

  it('negeert registraties van andere profielen', () => {
    const data = createAppData({
      registrations: [createRegistration({ profileId: 'profile-2', date: '2026-10-12' })],
    })
    expect(buildWeekSummary(data, createProfile(), { isoYear: 2026, isoWeek: 42 }).workedMinutes).toBe(0)
  })

  it('telt registraties van week 1 van het volgende kalenderjaar niet mee', () => {
    const data = createAppData({
      registrations: [createRegistration({ date: '2027-01-01' })],
    })
    expect(buildWeekSummary(data, createProfile(), { isoYear: 2026, isoWeek: 42 }).workedMinutes).toBe(0)
    // 1 januari 2027 hoort bij ISO-week 53 van 2026, niet bij ISO-week 1 van 2027.
    expect(buildWeekSummary(data, createProfile(), { isoYear: 2026, isoWeek: 53 }).workedMinutes).toBe(480)
    expect(buildWeekSummary(data, createProfile(), { isoYear: 2027, isoWeek: 1 }).workedMinutes).toBe(0)
  })
})

describe('dailyMinutesForWeek', () => {
  it('geeft zeven waarden met maandag als eerste', () => {
    const registrations = [createRegistration({ date: '2026-10-18', startTime: '10:00', endTime: '14:00' })]
    expect(dailyMinutesForWeek(registrations, { isoYear: 2026, isoWeek: 42 })).toEqual([0, 0, 0, 0, 0, 0, 240])
  })
})

describe('relevantIsoWeeks', () => {
  it('neemt weken met gegevens op, inclusief lege tussenliggende weken en de huidige week', () => {
    const data = createAppData({
      registrations: [createRegistration({ date: '2026-01-07' })],
      weeks: [{ profileId: 'profile-1', isoYear: 2026, isoWeek: 10, contractMinutes: 1920, isVacation: false, sickMinutes: 0 }],
    })
    const weeks = relevantIsoWeeks(data, 'profile-1', 2026, '2026-10-15')
    expect(weeks).toEqual([
      { isoYear: 2026, isoWeek: 2 },
      { isoYear: 2026, isoWeek: 10 },
      { isoYear: 2026, isoWeek: 42 },
    ])
  })

  it('toont geen toekomstige weken', () => {
    const data = createAppData()
    const weeks = relevantIsoWeeks(data, 'profile-1', 2026, '2026-10-15')
    expect(weeks).toEqual([{ isoYear: 2026, isoWeek: 42 }])
  })

  it('geeft niets terug voor een toekomstig ISO-weekjaar', () => {
    expect(relevantIsoWeeks(createAppData(), 'profile-1', 2027, '2026-10-15')).toEqual([])
  })

  it('sorteert op weeknummer, oudste eerst', () => {
    const data = createAppData({
      weeks: [
        { profileId: 'profile-1', isoYear: 2026, isoWeek: 30, contractMinutes: 1920, isVacation: false, sickMinutes: 0 },
        { profileId: 'profile-1', isoYear: 2026, isoWeek: 5, contractMinutes: 1920, isVacation: false, sickMinutes: 0 },
      ],
    })
    expect(relevantIsoWeeks(data, 'profile-1', 2026, '2026-10-15').map((w) => w.isoWeek)).toEqual([5, 30, 42])
  })
})

describe('overviewIsoWeeks', () => {
  it('vult de lege weken aan tussen de eerste week met gegevens en de huidige week', () => {
    const data = createAppData({
      registrations: [createRegistration({ date: '2026-01-07' })],
    })
    const weeks = overviewIsoWeeks(data, 'profile-1', 2026, '2026-10-15')
    expect(weeks).toHaveLength(41)
    expect(weeks[0]).toEqual({ isoYear: 2026, isoWeek: 42 })
    expect(weeks.at(-1)).toEqual({ isoYear: 2026, isoWeek: 2 })
  })

  it('vult niets aan vóór de eerste week met gegevens', () => {
    const data = createAppData({
      // 2026-03-18 valt in ISO-week 12.
      registrations: [createRegistration({ date: '2026-03-18' })],
    })
    const weeks = overviewIsoWeeks(data, 'profile-1', 2026, '2026-10-15')
    expect(weeks[weeks.length - 1]?.isoWeek).toBe(12)
  })

  it('laat een verlaten jaar bij de weken met gegevens', () => {
    const data = createAppData({
      registrations: [createRegistration({ date: '2025-03-04' })],
    })
    expect(overviewIsoWeeks(data, 'profile-1', 2025, '2026-10-15')).toEqual([{ isoYear: 2025, isoWeek: 10 }])
  })

  it('vult geen toekomstige weken', () => {
    const data = createAppData({
      registrations: [createRegistration({ date: '2026-01-07' })],
    })
    const weeks = overviewIsoWeeks(data, 'profile-1', 2026, '2026-10-15')
    expect(weeks.some((week) => week.isoWeek > 42)).toBe(false)
  })

  it('laat het jaarsaldo van lege weken onveranderd', () => {
    const data = createAppData({
      registrations: [createRegistration({ date: '2026-01-07' })],
    })
    // Week 2 (8u − 32u) plus de huidige week (0 − 32u). De 39 opgevulde lege
    // weken tellen niet mee: 0 − contract zou als verlies meetellen.
    expect(yearBalance(data, createProfile(), 2026, '2026-10-15')).toBe(-1440 - 1920)
  })
})

describe('yearBalance', () => {
  it('telt gewerkte uren min contracturen over de relevante weken', () => {
    const data = createAppData({
      registrations: [
        createRegistration({ date: '2026-10-12', startTime: '09:00', endTime: '17:00' }),
        createRegistration({ date: '2026-10-13', startTime: '09:00', endTime: '17:00' }),
      ],
      weeks: [{ profileId: 'profile-1', isoYear: 2026, isoWeek: 42, contractMinutes: 1200, isVacation: false, sickMinutes: 0 }],
    })
    expect(yearBalance(data, createProfile(), 2026, '2026-10-15')).toBe(960 - 1200)
  })

  it('telt ziekte-uren mee in het jaarsaldo', () => {
    const data = createAppData({
      registrations: [createRegistration({ date: '2026-10-12', startTime: '09:00', endTime: '17:00' })],
      weeks: [createWeekRecord({ contractMinutes: 1200, sickMinutes: 480 })],
    })
    // (480 gewerkt + 480 ziekte − 1200 contract) = −240
    expect(yearBalance(data, createProfile(), 2026, '2026-10-15')).toBe(-240)
  })

  it('negeert weken zonder gegevens en toekomstige weken', () => {
    const data = createAppData()
    expect(yearBalance(data, createProfile(), 2026, '2026-10-15')).toBe(-1920)
    expect(yearBalance(data, createProfile(), 2027, '2026-10-15')).toBe(0)
  })
})

describe('availableIsoYears', () => {
  it('geeft jaren met gegevens plus het huidige jaar, nieuwste eerst', () => {
    const data = createAppData({
      registrations: [createRegistration({ date: '2024-03-04' }), createRegistration({ date: '2025-06-02' })],
    })
    expect(availableIsoYears(data, 'profile-1', '2026-10-15')).toEqual([2026, 2025, 2024])
  })
})
