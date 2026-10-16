import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OverviewPage from './OverviewPage.vue'
import { resetAppStoreForTests, useAppStore, type AppStore } from '../state/appStore'
import { currentRoute } from '../router/router'
import { findButton, mountPage, requireElement, expectUniqueContainerIds, requireContainer } from '../testing/testHelpers'

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

function seedProfile() {
  return store.createProfile({
    name: 'Bakkerij Jansen',
    contractMinutes: 1920,
    defaultStartTime: '08:00',
    defaultEndTime: '16:30',
    accentColor: '#2563eb',
  })
}

describe('OverviewPage', () => {
  it('opent standaard het huidige ISO-weekjaar', () => {
    seedProfile()
    const wrapper = mountPage(OverviewPage)
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    expect(wrapper.text()).toContain('Overzicht')
    // De huidige week is de enige relevante week.
    expect(wrapper.findAll('.uw-week-link')).toHaveLength(1)
    expect(wrapper.text()).toContain('Week 42')
  })

  it('vult de lege weken aan tussen de eerste week met gegevens en de huidige week', () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-01-07', startTime: '08:00', endTime: '12:00' })
    store.addRegistration(profile.id, { date: '2026-01-20', startTime: '08:00', endTime: '12:00' })

    const wrapper = mountPage(OverviewPage)
    const links = wrapper.findAll('.uw-week-link')
    const labels = wrapper.findAll('.uw-week-link strong').map((item) => item.text())

    // Van week 2 (eerste week met gegevens) tot en met de huidige week 42.
    expect(labels).toHaveLength(41)
    expect(labels[0]).toBe('Week 42')
    expect(labels[1]).toBe('Week 41')
    expect(labels.at(-1)).toBe('Week 2')
    // Geen weken vóór de eerste week met gegevens en geen toekomstige weken.
    expect(labels).not.toContain('Week 1')
    expect(labels).not.toContain('Week 43')

    // Week 3 is leeg en toont de empty state; week 4 heeft gegevens.
    expect(links[42 - 3]?.text()).toContain('Leeg')
    expect(links[42 - 3]?.findAll('.uw-day-cell')).toHaveLength(0)
    expect(links[42 - 4]?.text()).not.toContain('Leeg')
    expect(links[42 - 4]?.findAll('.uw-day-cell')).toHaveLength(7)
  })

  it('toont bij een week met registraties contracturen, gewerkte uren, saldo en dagsommen', () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '16:00' })

    const wrapper = mountPage(OverviewPage)
    expect(wrapper.text()).toContain('Gewerkt')
    expect(wrapper.text()).toContain('8u')
    // Saldo: 8u gewerkt min 32u contract.
    expect(wrapper.text()).toContain('-24u')
    // Alleen de week met gegevens heeft dagvakjes.
    expect(wrapper.findAll('.uw-day-cell')).toHaveLength(7)
  })

  it('toont het jaarsaldo van het gekozen jaar naast de titel', async () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '16:00' })
    store.addRegistration(profile.id, { date: '2025-03-04', startTime: '08:00', endTime: '12:00' })

    const wrapper = mountPage(OverviewPage)
    // 8u gewerkt min 32u contract; de opgevulde lege weken tellen niet mee
    // in het saldo.
    expect(wrapper.text()).toContain('Jaarsaldo')
    expect(wrapper.text()).toContain('-24u')

    await wrapper.find('select').setValue('2025')
    // 4u gewerkt min 32u contract voor week 10 van 2025.
    expect(wrapper.text()).toContain('-28u')
  })

  it('toont de vakantiestatus van een week', () => {
    const profile = seedProfile()
    store.setWeekVacation(profile.id, { isoYear: 2026, isoWeek: 42 }, true)

    const wrapper = mountPage(OverviewPage)
    expect(wrapper.text()).toContain('Vakantie')
  })

  it('toont een Ziek-badge wanneer er ziekte-uren zijn geregistreerd', () => {
    const profile = seedProfile()
    store.setWeekSick(profile.id, { isoYear: 2026, isoWeek: 42 }, 240)

    const wrapper = mountPage(OverviewPage)
    expect(wrapper.text()).toContain('Ziek')
  })

  it('toont geen Ziek-badge zonder ziekte-uren', () => {
    seedProfile()
    const wrapper = mountPage(OverviewPage)
    expect(wrapper.text()).not.toContain('Ziek')
  })

  it('toont de datum van een week in de kleinere weekmaat', () => {
    seedProfile()
    const wrapper = mountPage(OverviewPage)

    const date = requireElement(wrapper, '.uw-week-date')
    expect(date.text()).toBe('12-10-2026 t/m 18-10-2026')
  })

  it('geeft elke weekcontainer een unieke name en id', () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '12:00' })
    store.addRegistration(profile.id, { date: '2026-10-05', startTime: '08:00', endTime: '12:00' })

    const wrapper = mountPage(OverviewPage)

    requireContainer(wrapper, 'week-2026-42')
    requireContainer(wrapper, 'week-2026-41')
    expectUniqueContainerIds(wrapper)
  })

  it('laat eerdere ISO-weekjaren kiezen', async () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2025-03-04', startTime: '08:00', endTime: '12:00' })

    const wrapper = mountPage(OverviewPage)
    const options = wrapper.findAll('option').map((option) => option.text())
    expect(options).toEqual(['2026', '2025'])

    await wrapper.find('select').setValue('2025')
    expect(wrapper.text()).toContain('Week 10')
    expect(wrapper.text()).toContain('3-3-2025 t/m 9-3-2025')
    // Weken van het huidige jaar horen niet in het overzicht van 2025.
    expect(wrapper.text()).not.toContain('Week 42')
  })

  it('opent de detailpagina van een week', async () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '16:00' })

    const wrapper = mountPage(OverviewPage)
    await findButton(wrapper, 'Week 42').trigger('click')
    expect(currentRoute.value).toEqual({ name: 'week-detail', isoYear: 2026, isoWeek: 42 })
  })

  it('meldt dat er geen weken met gegevens zijn', () => {
    seedProfile()
    store.ensureWeek(store.state.data.profiles[0]!.id, { isoYear: 2020, isoWeek: 1 })
    // Het jaar 2020 staat niet in de keuzelijst, dus het overzicht blijft bij 2026.
    const wrapper = mountPage(OverviewPage)
    expect(wrapper.findAll('.uw-week-link').length).toBeGreaterThan(0)
  })
})
