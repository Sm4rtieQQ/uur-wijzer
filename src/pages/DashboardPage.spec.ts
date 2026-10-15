import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from './DashboardPage.vue'
import { resetAppStoreForTests, useAppStore, type AppStore } from '../state/appStore'
import { currentRoute } from '../router/router'
import { findButton, mountPage, requireElement, submitForm } from '../testing/testHelpers'
import { findWeekRecord } from '../domain/weeks'
import { getIsoWeek } from '../domain/isoWeek'

const now = new Date(2026, 9, 15, 10, 0)
let store: AppStore

function seedProfile(override: Partial<Parameters<AppStore['createProfile']>[0]> = {}) {
  return store.createProfile({
    name: 'Bakkerij Jansen',
    contractMinutes: 1920,
    defaultStartTime: '08:00',
    defaultEndTime: '16:30',
    theme: 'light',
    ...override,
  })
}

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

describe('DashboardPage', () => {
  it('toont de huidige ISO-week met datumbereik en contracturen', () => {
    const profile = seedProfile()
    const wrapper = mountPage(DashboardPage)

    expect(wrapper.text()).toContain('Week 42')
    expect(wrapper.text()).toContain('12-10-2026 t/m 18-10-2026')
    // Het jaartal staat als eyebrow boven het weeknummer.
    expect(requireElement(wrapper, '.uw-eyebrow').text()).toBe('2026')
    expect(wrapper.text()).toContain('Uren volgens contract')
    expect(wrapper.text()).toContain('32u')
    expect(wrapper.text()).toContain('Deze week bevat nog geen registraties.')
    expect(store.state.data.weeks).toHaveLength(1)
    expect(findWeekRecord(store.state.data.weeks, profile.id, getIsoWeek('2026-10-15'))?.contractMinutes).toBe(1920)
  })

  it('toont de gewerkte tijd en dagsommen zodra er registraties zijn', () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '16:00' })
    const wrapper = mountPage(DashboardPage)

    expect(wrapper.text()).toContain('Je hebt 8u gewerkt!')
    expect(wrapper.text()).toContain('8u')
    // Zeven dagvakjes met een korte dagaanduiding, zonder datum.
    const cells = wrapper.findAll('.uw-day-cell')
    expect(cells).toHaveLength(7)
    expect(cells[0]?.text()).toContain('ma')
    expect(cells[1]?.text()).toContain('di')
    expect(cells[0]?.text()).not.toContain('12-10-2026')
  })

  it('toont een compact urensaldo van het ISO-weekjaar met positief of negatief', () => {
    const profile = seedProfile({ contractMinutes: 600 })
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '16:00' })

    const wrapper = mountPage(DashboardPage)
    expect(wrapper.text()).toContain('Jaarsaldo (2026)')
    // 8u gewerkt tegen 10u contract is een negatief saldo.
    expect(wrapper.text()).toContain('-2u')
  })

  it('toont een positief jaarsaldo als er meer is gewerkt dan het contract', () => {
    const profile = seedProfile({ contractMinutes: 300 })
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '18:00' })

    const wrapper = mountPage(DashboardPage)
    // 10u gewerkt tegen 5u contract is een positief saldo.
    expect(wrapper.text()).toContain('+5u')
  })

  it('markeert de week als vakantie met nul contracturen', async () => {
    const profile = seedProfile()
    const wrapper = mountPage(DashboardPage)

    expect(requireElement(wrapper, 'label.uw-checkbox-row').text()).toBe('Vakantie')

    await requireElement(wrapper, 'input[type="checkbox"]').setValue(true)

    const week = findWeekRecord(store.state.data.weeks, profile.id, getIsoWeek('2026-10-15'))
    expect(week?.isVacation).toBe(true)
    expect(week?.contractMinutes).toBe(1920)
    expect(wrapper.text()).toContain('Vakantieweek')
    // Zonder contracturen (vakantieweek) is er geen contract-/saldocontainer.
    expect(wrapper.text()).not.toContain('Uren volgens contract')
    expect(wrapper.text()).toContain('+0m')
  })

  it('voegt via het formulier een registratie toe met de standaardwaarden van het profiel', async () => {
    const profile = seedProfile()
    const wrapper = mountPage(DashboardPage)

    await findButton(wrapper, 'Uren registreren').trigger('click')
    expect(requireElement(wrapper, '#registration-date').element).toBeInstanceOf(HTMLInputElement)

    await requireElement(wrapper, '#registration-date').setValue('2026-10-14')
    await requireElement(wrapper, '#registration-start').setValue('09:00')
    await requireElement(wrapper, '#registration-end').setValue('17:30')
    await submitForm(wrapper)

    expect(store.state.data.registrations).toHaveLength(1)
    expect(store.state.data.registrations[0]?.profileId).toBe(profile.id)
    // Gewerkte tijd is de volledige tijd tussen start en eind: 8u 30m.
    expect(wrapper.text()).toContain('Je hebt 8u 30m gewerkt!')
  })

  it('toont een Nederlandse foutmelding bij een ongeldige registratie', async () => {
    seedProfile()
    const wrapper = mountPage(DashboardPage)

    await findButton(wrapper, 'Uren registreren').trigger('click')
    await requireElement(wrapper, '#registration-date').setValue('2099-01-01')
    await submitForm(wrapper)

    expect(wrapper.text()).toContain('De datum mag niet in de toekomst liggen.')
    expect(store.state.data.registrations).toHaveLength(0)
  })

  it('navigeert naar de detailpagina van de week', async () => {
    seedProfile()
    const wrapper = mountPage(DashboardPage)

    await findButton(wrapper, 'Weekdetails').trigger('click')
    expect(currentRoute.value).toEqual({ name: 'week-detail', isoYear: 2026, isoWeek: 42 })
  })

  it('vraagt om een profiel als er geen actief profiel is', () => {
    const wrapper = mountPage(DashboardPage)
    expect(wrapper.text()).toContain('Er is geen actief profiel')
  })
})
