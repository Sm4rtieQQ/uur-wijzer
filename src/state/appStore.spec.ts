import { beforeEach, describe, expect, it } from 'vitest'
import { createAppStore, type AppStore } from './appStore'
import { loadAppData, type StorageLike } from '../storage/appStorage'
import { buildWeekSummary, findWeekRecord } from '../domain/weeks'
import { todayIsoDate } from '../domain/date'
import type { NewProfileData } from './appStore'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

const profileInput: NewProfileData = {
  name: 'Bakkerij Jansen',
  contractMinutes: 1920,
  defaultStartTime: '08:00',
  defaultEndTime: '16:30',
  accentColor: '#2563eb',
}

let storage: MemoryStorage
let store: AppStore

beforeEach(() => {
  storage = new MemoryStorage()
  store = createAppStore(storage)
})

describe('profielen', () => {
  it('start leeg zonder opgeslagen gegevens', () => {
    expect(store.state.data.profiles).toEqual([])
    expect(store.activeProfile.value).toBeNull()
  })

  it('maakt een profiel aan en selecteert het', () => {
    const profile = store.createProfile(profileInput)
    expect(profile.name).toBe('Bakkerij Jansen')
    expect(store.activeProfile.value?.id).toBe(profile.id)
    expect(loadAppData(storage).data.profiles).toHaveLength(1)
  })

  it('wijzigt profielgegevens en bewaart ze', () => {
    const profile = store.createProfile(profileInput)
    store.updateProfile(profile.id, { name: 'Bakkerij De Vries', defaultEndTime: '16:00' })

    const reloaded = loadAppData(storage).data.profiles[0]
    expect(reloaded?.name).toBe('Bakkerij De Vries')
    expect(reloaded?.defaultEndTime).toBe('16:00')
  })

  it('negeert wijzigingen aan een onbekend profiel', () => {
    expect(store.updateProfile('onbekend', { name: 'X' })).toBeNull()
  })

  it('gebruikt de gebruikersnaam voor de hele app', () => {
    store.setUsername('  Martin  ')
    expect(store.state.data.username).toBe('Martin')
  })

  it('wisselt van profiel', () => {
    const first = store.createProfile(profileInput)
    const second = store.createProfile({ ...profileInput, name: 'Bezorgdienst Piet' })

    store.selectProfile(first.id)
    expect(store.activeProfile.value?.id).toBe(first.id)
    store.selectProfile(second.id)
    expect(store.activeProfile.value?.id).toBe(second.id)
    store.selectProfile(null)
    expect(store.activeProfile.value).toBeNull()
    store.selectProfile('onbekend')
    expect(store.activeProfile.value).toBeNull()
  })

  it('weigert het selecteren van een onbekend profiel', () => {
    const profile = store.createProfile(profileInput)
    store.selectProfile('bestaat-niet')
    expect(store.activeProfile.value?.id).toBe(profile.id)
  })
})

describe('weekcontracten', () => {
  it('maakt een week aan met de contracturen van het profiel', () => {
    const profile = store.createProfile(profileInput)
    const week = store.ensureWeek(profile.id, { isoYear: 2026, isoWeek: 42 })
    expect(week.contractMinutes).toBe(1920)
    expect(week.isVacation).toBe(false)
    expect(week.sickMinutes).toBe(0)

    // Tweemaal aanroepen levert geen tweede record op.
    expect(store.ensureWeek(profile.id, { isoYear: 2026, isoWeek: 42 })).toEqual(week)
    expect(store.state.data.weeks).toHaveLength(1)
  })

  it('past een contractwijziging alleen toe op toekomstige weken', () => {
    const profile = store.createProfile(profileInput)
    const current = store.ensureWeek(profile.id, { isoYear: 2026, isoWeek: 42 })
    const future = store.ensureWeek(profile.id, { isoYear: 2026, isoWeek: 50 })
    const past = store.ensureWeek(profile.id, { isoYear: 2026, isoWeek: 10 })
    store.setWeekContract(profile.id, { isoYear: 2026, isoWeek: 42 }, 1920)
    store.setWeekContract(profile.id, { isoYear: 2026, isoWeek: 50 }, 1920)
    store.setWeekContract(profile.id, { isoYear: 2026, isoWeek: 10 }, 1920)

    store.updateProfile(profile.id, { contractMinutes: 1200 })

    expect(current.contractMinutes).toBe(1920)
    expect(past.contractMinutes).toBe(1920)
    expect(future.contractMinutes).toBe(1200)
    expect(store.activeProfile.value?.contractMinutes).toBe(1200)
  })

  it('laat het profielcontract van een week met een handmatig weekcontract ongemoeid', () => {
    const profile = store.createProfile(profileInput)
    const future = store.ensureWeek(profile.id, { isoYear: 2026, isoWeek: 50 })
    store.setWeekContract(profile.id, { isoYear: 2026, isoWeek: 50 }, 600)

    store.updateProfile(profile.id, { contractMinutes: 1200 })
    expect(future.contractMinutes).toBe(600)
  })

  it('laat een handmatig weekcontract niet verdwijnen bij vakantie', () => {
    const profile = store.createProfile(profileInput)
    const ref = { isoYear: 2026, isoWeek: 42 }
    store.setWeekContract(profile.id, ref, 600)

    store.setWeekVacation(profile.id, ref, true)
    const vacationWeek = findWeekRecord(store.state.data.weeks, profile.id, ref)
    expect(vacationWeek?.isVacation).toBe(true)
    expect(vacationWeek?.contractMinutes).toBe(600)
    expect(buildWeekSummary(store.state.data, store.activeProfile.value!, ref).contractMinutes).toBe(0)

    store.setWeekVacation(profile.id, ref, false)
    const restored = findWeekRecord(store.state.data.weeks, profile.id, ref)
    expect(restored?.isVacation).toBe(false)
    expect(restored?.contractMinutes).toBe(600)
    expect(buildWeekSummary(store.state.data, store.activeProfile.value!, ref).contractMinutes).toBe(600)
  })

  it('materiaaltiseert de relevante weken van een jaar', () => {
    const profile = store.createProfile(profileInput)
    store.addRegistration(profile.id, {
      date: '2026-01-07',
      startTime: '08:00',
      endTime: '12:00',
    })
    store.ensureWeeksForYear(profile.id, 2026)

    const weeks = store.state.data.weeks.map((week) => week.isoWeek).sort((a, b) => a - b)
    expect(weeks).toContain(2)
    expect(weeks).toContain(42)
  })
})

describe('ziekte-uren', () => {
  it('leg ziekte-uren per week vast en telt ze in het saldo', () => {
    const profile = store.createProfile(profileInput)
    const ref = { isoYear: 2026, isoWeek: 42 }
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '16:00' })

    store.setWeekSick(profile.id, ref, 480)

    const week = findWeekRecord(store.state.data.weeks, profile.id, ref)
    expect(week?.sickMinutes).toBe(480)

    const summary = buildWeekSummary(store.state.data, profile, ref)
    // 480 gewerkt + 480 ziekte − 1920 contract = −960
    expect(summary.balanceMinutes).toBe(-960)
  })

  it('verwijdert ziekte-uren bij 0 en clampt negatieve waarden', () => {
    const profile = store.createProfile(profileInput)
    const ref = { isoYear: 2026, isoWeek: 42 }

    store.setWeekSick(profile.id, ref, 300)
    store.setWeekSick(profile.id, ref, 0)
    expect(findWeekRecord(store.state.data.weeks, profile.id, ref)?.sickMinutes).toBe(0)

    store.setWeekSick(profile.id, ref, -100)
    expect(findWeekRecord(store.state.data.weeks, profile.id, ref)?.sickMinutes).toBe(0)
  })

  it('bewaart ziekte-uren in de opslag', () => {
    const profile = store.createProfile(profileInput)
    const ref = { isoYear: 2026, isoWeek: 42 }
    store.setWeekSick(profile.id, ref, 240)

    expect(loadAppData(storage).data.weeks[0]?.sickMinutes).toBe(240)
  })
})

describe('app-thema', () => {
  it('wisselt het thema voor de hele app en bewaart het', () => {
    store.setTheme('dark')
    expect(store.state.data.theme).toBe('dark')
    expect(loadAppData(storage).data.theme).toBe('dark')
  })

  it('wijzigt de accentkleur van een profiel', () => {
    const profile = store.createProfile(profileInput)
    store.updateProfile(profile.id, { accentColor: '#7c3aed' })
    expect(store.activeProfile.value?.accentColor).toBe('#7c3aed')
  })
})

describe('registraties', () => {
  it('voegt meerdere registraties op één dag toe en telt ze op', () => {
    const profile = store.createProfile(profileInput)
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '12:00' })
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '13:00', endTime: '17:00' })

    const summary = buildWeekSummary(store.state.data, profile, { isoYear: 2026, isoWeek: 42 })
    expect(summary.registrationCount).toBe(2)
    expect(summary.workedMinutes).toBe(480)
    expect(summary.dailyMinutes[0]).toBe(480)
  })

  it('werkt beide weken bij als een registratie naar een andere datum verhuist', () => {
    const profile = store.createProfile(profileInput)
    const registration = store.addRegistration(profile.id, {
      date: '2026-10-12',
      startTime: '08:00',
      endTime: '12:00',
    })

    store.updateRegistration(registration.id, {
      date: '2026-10-19',
      startTime: '08:00',
      endTime: '12:00',
    })

    const oldWeek = buildWeekSummary(store.state.data, profile, { isoYear: 2026, isoWeek: 42 })
    const newWeek = buildWeekSummary(store.state.data, profile, { isoYear: 2026, isoWeek: 43 })
    expect(oldWeek.workedMinutes).toBe(0)
    expect(newWeek.workedMinutes).toBe(240)
    expect(loadAppData(storage).data.registrations[0]?.date).toBe('2026-10-19')
  })

  it('verwijdert een registratie en werkt de totalen bij', () => {
    const profile = store.createProfile(profileInput)
    const registration = store.addRegistration(profile.id, {
      date: '2026-10-12',
      startTime: '08:00',
      endTime: '12:00',
    })
    store.removeRegistration(registration.id)

    expect(store.state.data.registrations).toEqual([])
    expect(buildWeekSummary(store.state.data, profile, { isoYear: 2026, isoWeek: 42 }).workedMinutes).toBe(0)
  })

  it('geeft null terug bij het wijzigen van een onbekende registratie', () => {
    expect(
      store.updateRegistration('onbekend', { date: todayIsoDate(), startTime: '08:00', endTime: '09:00' }),
    ).toBeNull()
  })
})

describe('profiel verwijderen', () => {
  it('verwijdert het profiel met alle bijbehorende gegevens', () => {
    const keep = store.createProfile(profileInput)
    const remove = store.createProfile({ ...profileInput, name: 'Bezorgdienst Piet' })
    store.addRegistration(remove.id, { date: '2026-10-12', startTime: '08:00', endTime: '12:00' })
    store.addRegistration(keep.id, { date: '2026-10-12', startTime: '08:00', endTime: '12:00' })
    store.selectProfile(remove.id)

    store.deleteProfile(remove.id)

    expect(store.state.data.profiles.map((profile) => profile.id)).toEqual([keep.id])
    expect(store.state.data.registrations.every((registration) => registration.profileId === keep.id)).toBe(true)
    expect(store.state.data.weeks.every((week) => week.profileId === keep.id)).toBe(true)
    expect(store.state.data.lastProfileId).toBeNull()
    expect(store.state.reminderLog[remove.id]).toBeUndefined()
  })

  it('bewaart de gebruikersnaam bij het verwijderen', () => {
    const profile = store.createProfile(profileInput)
    store.setUsername('Martin')
    store.deleteProfile(profile.id)
    expect(store.state.data.username).toBe('Martin')
  })
})

describe('opslag', () => {
  it('meldt een mislukte opslag', () => {
    const failing = createAppStore({
      getItem: () => null,
      setItem: () => {
        throw new Error('vol')
      },
      removeItem: () => undefined,
    })
    failing.createProfile(profileInput)
    expect(failing.state.lastSaveFailed).toBe(true)
    expect(failing.state.issues.some((issue) => issue.includes('niet lokaal'))).toBe(true)
  })

  it('kan gegevens vervangen en opnieuw laden', () => {
    const profile = store.createProfile(profileInput)
    store.replaceData({ ...store.state.data, username: 'Herkomst' })
    expect(store.state.data.username).toBe('Herkomst')

    store.reload()
    expect(store.state.data.profiles.map((item) => item.id)).toEqual([profile.id])
  })
})
