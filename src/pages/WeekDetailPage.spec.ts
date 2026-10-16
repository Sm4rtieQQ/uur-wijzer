import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WeekDetailPage from './WeekDetailPage.vue'
import { resetAppStoreForTests, useAppStore, type AppStore } from '../state/appStore'
import { findWeekRecord } from '../domain/weeks'
import { findButton, mountPage, requireElement, submitForm, expectUniqueContainerIds, requireContainer } from '../testing/testHelpers'

const now = new Date(2026, 9, 15, 10, 0)
let store: AppStore

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  localStorage.clear()
  resetAppStoreForTests()
  store = useAppStore()
  store.setUsername('Martin')
})

afterEach(() => {
  vi.useRealTimers()
})

function seedProfile(contractMinutes = 1920) {
  return store.createProfile({
    name: 'Bakkerij Jansen',
    contractMinutes,
    defaultStartTime: '08:00',
    defaultEndTime: '16:30',
    accentColor: '#2563eb',
  })
}

function mountWeekDetail(isoYear = 2026, isoWeek = 42) {
  return mountPage(WeekDetailPage, { isoYear, isoWeek })
}

describe('WeekDetailPage', () => {
  it('toont weeknummer, datumbereik, totalen en dagsommen', () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '16:00' })
    store.addRegistration(profile.id, { date: '2026-10-14', startTime: '09:00', endTime: '12:30' })

    const wrapper = mountWeekDetail()
    expect(wrapper.text()).toContain('Week 42')
    expect(wrapper.text()).toContain('12-10-2026 t/m 18-10-2026')
    expect(wrapper.text()).toContain('11u 30m') // 8u + 3u30m
    expect(wrapper.text()).toContain('-20u 30m') // 11u30m gewerkt min 32u contract
    expect(wrapper.findAll('.uw-day-cell')).toHaveLength(7)
  })

  it('toont registraties chronologisch van oudste naar nieuwste', () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-14', startTime: '09:00', endTime: '12:00' })
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '12:00' })

    const wrapper = mountWeekDetail()
    const items = wrapper.findAll('.uw-list > li')
    expect(items).toHaveLength(2)
    expect(items[0]?.text()).toContain('12-10-2026')
    expect(items[1]?.text()).toContain('14-10-2026')
  })

  it('past het weekcontract aan zonder het profielcontract te wijzigen', async () => {
    const profile = seedProfile()
    const wrapper = mountWeekDetail()

    await requireElement(wrapper, '#week-contract').setValue('20')
    await findButton(wrapper, 'Opslaan').trigger('click')

    const week = findWeekRecord(store.state.data.weeks, profile.id, { isoYear: 2026, isoWeek: 42 })
    expect(week?.contractMinutes).toBe(1200)
    // Het profielcontract blijft ongewijzigd; alleen deze week is aangepast.
    expect(store.activeProfile.value?.contractMinutes).toBe(1920)
    expect(wrapper.text()).toContain('Weekcontract opgeslagen.')
  })

  it('toont een foutmelding bij ongeldige contracturen', async () => {
    seedProfile()
    const wrapper = mountWeekDetail()

    await requireElement(wrapper, '#week-contract').setValue('veel')
    await findButton(wrapper, 'Opslaan').trigger('click')

    expect(wrapper.text()).toContain('Vul de contracturen in als getal')
  })

  it('toont ziekte-uren pas bij meer dan nul', () => {
    const profile = seedProfile()
    const wrapper = mountWeekDetail()
    expect(wrapper.text()).not.toContain('Ziekte-uren')

    store.setWeekSick(profile.id, { isoYear: 2026, isoWeek: 42 }, 240)
    const withSick = mountWeekDetail()
    expect(withSick.text()).toContain('Ziekte-uren')
    expect(withSick.text()).toContain('4u')
  })

  it('bewerkt ziekte-uren via dezelfde dialoog als het dashboard', async () => {
    const profile = seedProfile()
    store.setWeekSick(profile.id, { isoYear: 2026, isoWeek: 42 }, 240)

    const wrapper = mountWeekDetail()
    await findButton(wrapper, 'Ziekte registreren').trigger('click')

    expect((requireElement(wrapper, '#sickness-hours').element as HTMLInputElement).value).toBe('4')
    await requireElement(wrapper, '#sickness-hours').setValue('6,5')
    await submitForm(wrapper)

    expect(findWeekRecord(store.state.data.weeks, profile.id, { isoYear: 2026, isoWeek: 42 })?.sickMinutes).toBe(390)
    expect(wrapper.find('#sickness-hours').exists()).toBe(false)
  })

  it('geeft de weekcontainers en registratie-items een name en id', async () => {
    const profile = seedProfile()
    const registration = store.addRegistration(profile.id, {
      date: '2026-10-12',
      startTime: '08:00',
      endTime: '12:00',
    })

    const wrapper = mountWeekDetail()

    for (const containerId of [
      'weekDetailPage',
      'weekDetailHeader',
      'weekBalance',
      'weekDaySummary',
      'weekContract',
      'weekActions',
      'weekRegistrations',
      `registration-${registration.id}`,
    ]) {
      requireContainer(wrapper, containerId)
    }
    expectUniqueContainerIds(wrapper)
  })

  it('werkt een registratie bij via het formulier', async () => {
    const profile = seedProfile()
    const registration = store.addRegistration(profile.id, {
      date: '2026-10-12',
      startTime: '08:00',
      endTime: '12:00',
    })

    const wrapper = mountWeekDetail()
    await findButton(wrapper, 'Aanpassen').trigger('click')
    await requireElement(wrapper, '#registration-end').setValue('14:00')
    await wrapper.find('form').trigger('submit')

    const updated = store.state.data.registrations.find((item) => item.id === registration.id)
    expect(updated?.endTime).toBe('14:00')
    expect(wrapper.text()).toContain('6u')
  })

  it('weigert bij het wijzigen een tijdvak dat een andere registratie overlapt', async () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '12:00' })
    const later = store.addRegistration(profile.id, { date: '2026-10-12', startTime: '13:00', endTime: '17:00' })

    const wrapper = mountWeekDetail()
    // De tweede registratie (13:00–17:00) aanpassen naar 08:00–13:00: dat overlapt de eerste.
    await findButton(wrapper, 'Aanpassen', 1).trigger('click')
    await requireElement(wrapper, '#registration-start').setValue('08:00')
    await requireElement(wrapper, '#registration-end').setValue('13:00')
    await submitForm(wrapper)

    expect(wrapper.text()).toContain('overlapt met een bestaande registratie van 08:00 tot 12:00')
    const unchanged = store.state.data.registrations.find((item) => item.id === later.id)
    expect(unchanged?.startTime).toBe('13:00')
    expect(unchanged?.endTime).toBe('17:00')
  })

  it('verwijdert een registratie pas na bevestiging', async () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '12:00' })

    const wrapper = mountWeekDetail()
    await findButton(wrapper, 'Verwijderen').trigger('click')

    // Eerst annuleren: de registratie blijft bestaan.
    await findButton(wrapper, 'Annuleren').trigger('click')
    expect(store.state.data.registrations).toHaveLength(1)

    await findButton(wrapper, 'Verwijderen').trigger('click')
    await findButton(wrapper, 'Verwijderen', 1).trigger('click')
    expect(store.state.data.registrations).toHaveLength(0)
    expect(wrapper.text()).toContain('Deze week heeft nog geen registraties.')
  })

  it('ondersteunt het markeren en weer uitzetten van een vakantieweek', async () => {
    const profile = seedProfile()
    const wrapper = mountWeekDetail()

    await requireElement(wrapper, 'input[type="checkbox"]').setValue(true)
    expect(findWeekRecord(store.state.data.weeks, profile.id, { isoYear: 2026, isoWeek: 42 })?.isVacation).toBe(true)
    expect(wrapper.text()).toContain('Vakantie')
    expect(wrapper.text()).toContain('Effectief contract: 0m')

    await requireElement(wrapper, 'input[type="checkbox"]').setValue(false)
    expect(findWeekRecord(store.state.data.weeks, profile.id, { isoYear: 2026, isoWeek: 42 })?.isVacation).toBe(false)
    expect(wrapper.text()).toContain('Effectief contract: 32u')
  })

  it('toont een lege week zonder registraties', () => {
    seedProfile()
    const wrapper = mountWeekDetail(2026, 10)
    expect(wrapper.text()).toContain('Week 10')
    expect(wrapper.text()).toContain('Deze week heeft nog geen registraties.')
  })
})
