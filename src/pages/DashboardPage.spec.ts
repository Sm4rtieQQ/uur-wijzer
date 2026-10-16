import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from './DashboardPage.vue'
import { resetAppStoreForTests, useAppStore, type AppStore } from '../state/appStore'
import { currentRoute } from '../router/router'
import { findButton, mountPage, requireElement, submitForm, expectUniqueContainerIds, requireContainer } from '../testing/testHelpers'
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
    accentColor: '#2563eb',
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

  it('weigert een registratie die overlapt met een bestaande registratie', async () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-15', startTime: '08:00', endTime: '12:00' })

    const wrapper = mountPage(DashboardPage)
    await findButton(wrapper, 'Uren registreren').trigger('click')
    await requireElement(wrapper, '#registration-start').setValue('10:00')
    await requireElement(wrapper, '#registration-end').setValue('15:00')
    await submitForm(wrapper)

    expect(wrapper.text()).toContain('overlapt met een bestaande registratie van 08:00 tot 12:00')
    // Niets opgeslagen en de dialoog blijft open zodat de gebruiker kan aanpassen.
    expect(store.state.data.registrations).toHaveLength(1)
    expect(wrapper.find('#registration-start').exists()).toBe(true)
  })

  it('staat een registratie toe die niet overlapt', async () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-15', startTime: '08:00', endTime: '12:00' })

    const wrapper = mountPage(DashboardPage)
    await findButton(wrapper, 'Uren registreren').trigger('click')
    await requireElement(wrapper, '#registration-start').setValue('12:00')
    await requireElement(wrapper, '#registration-end').setValue('16:00')
    await submitForm(wrapper)

    expect(store.state.data.registrations).toHaveLength(2)
    expect(wrapper.find('#registration-start').exists()).toBe(false)
  })

  it('navigeert naar de detailpagina van de week', async () => {
    seedProfile()
    const wrapper = mountPage(DashboardPage)

    await findButton(wrapper, 'Weekdetails').trigger('click')
    expect(currentRoute.value).toEqual({ name: 'week-detail', isoYear: 2026, isoWeek: 42 })
  })

  it('opent de ziektedialoog en legt ziekte-uren vast voor de huidige week', async () => {
    const profile = seedProfile()
    const wrapper = mountPage(DashboardPage)

    await findButton(wrapper, 'Ziekte registreren').trigger('click')
    expect(requireElement(wrapper, '#sickness-hours').element).toBeInstanceOf(HTMLInputElement)

    await requireElement(wrapper, '#sickness-hours').setValue('7,5')
    await submitForm(wrapper)

    const ref = getIsoWeek('2026-10-15')
    expect(findWeekRecord(store.state.data.weeks, profile.id, ref)?.sickMinutes).toBe(450)
    // Dialoog sluit na het opslaan.
    expect(wrapper.find('#sickness-hours').exists()).toBe(false)
  })

  it('toont een Nederlandse foutmelding bij ongeldige ziekte-uren', async () => {
    seedProfile()
    const wrapper = mountPage(DashboardPage)

    await findButton(wrapper, 'Ziekte registreren').trigger('click')
    await requireElement(wrapper, '#sickness-hours').setValue('veel')
    await submitForm(wrapper)

    expect(wrapper.text()).toContain('Vul de ziekte-uren in als getal')
    expect(store.state.data.weeks.find((week) => week.sickMinutes !== 0)).toBeUndefined()
  })

  it('verwijdert ziekte-uren weer met 0', async () => {
    const profile = seedProfile()
    const ref = getIsoWeek('2026-10-15')
    store.setWeekSick(profile.id, ref, 240)

    const wrapper = mountPage(DashboardPage)
    await findButton(wrapper, 'Ziekte registreren').trigger('click')

    // Bestaande waarde staat als uitgangspunt in het formulier.
    expect((requireElement(wrapper, '#sickness-hours').element as HTMLInputElement).value).toBe('4')

    await requireElement(wrapper, '#sickness-hours').setValue('0')
    await submitForm(wrapper)

    expect(findWeekRecord(store.state.data.weeks, profile.id, ref)?.sickMinutes).toBe(0)
  })

  it('toont ziekte-uren in de contractkaart en verrekent ze in het saldo', () => {
    const profile = seedProfile()
    const ref = getIsoWeek('2026-10-15')
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '09:00', endTime: '17:00' })
    store.setWeekSick(profile.id, ref, 480)

    const wrapper = mountPage(DashboardPage)
    const contractCard = wrapper
      .findAll('.uw-card')
      .find((card) => card.text().includes('Uren volgens contract'))

    expect(contractCard?.text()).toContain('Ziekte')
    // 8u gewerkt + 8u ziekte − 32u contract = −16u.
    expect(contractCard?.text()).toContain('-16u')
  })

  it('toont geen ziekteregel zonder ziekte-uren', () => {
    seedProfile()
    const wrapper = mountPage(DashboardPage)
    const contractCard = wrapper
      .findAll('.uw-card')
      .find((card) => card.text().includes('Uren volgens contract'))

    expect(contractCard?.text()).not.toContain('Ziekte')
  })

  it('zet de registratieknop op volle breedte en de weekknoppen even breed', () => {
    seedProfile()
    const wrapper = mountPage(DashboardPage)

    const register = findButton(wrapper, 'Uren registreren')
    expect(register.classes()).toContain('uw-button--primary')
    expect(register.classes()).toContain('uw-button--block')

    const row = requireElement(wrapper, '.uw-button-row')
    expect(row.findAll('button').map((item) => item.text())).toEqual(['Weekdetails', 'Ziekte registreren'])
  })

  it('geeft elke betekenisvolle container een name en id met dezelfde waarde', async () => {
    seedProfile()
    const wrapper = mountPage(DashboardPage)

    for (const containerId of [
      'dashboardPage',
      'weekHeader',
      'weekSummary',
      'weekDaySummary',
      'weekBalance',
      'yearBalance',
      'weekActions',
      'weekVacation',
    ]) {
      requireContainer(wrapper, containerId)
    }
    expectUniqueContainerIds(wrapper)

    await findButton(wrapper, 'Uren registreren').trigger('click')
    requireContainer(wrapper, 'registrationDialog')
    expectUniqueContainerIds(wrapper)

    await findButton(wrapper, 'Annuleren').trigger('click')
    await findButton(wrapper, 'Ziekte registreren').trigger('click')
    requireContainer(wrapper, 'sickness')
    expectUniqueContainerIds(wrapper)
  })

  it('vraagt om een profiel als er geen actief profiel is', () => {
    const wrapper = mountPage(DashboardPage)
    expect(wrapper.text()).toContain('Er is geen actief profiel')
  })
})
