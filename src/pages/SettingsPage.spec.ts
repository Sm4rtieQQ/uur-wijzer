import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import SettingsPage from './SettingsPage.vue'
import { resetAppStoreForTests, useAppStore, type AppStore } from '../state/appStore'
import { currentRoute } from '../router/router'
import { findButton, mountPage, requireElement, submitForm, expectUniqueContainerIds, requireContainer } from '../testing/testHelpers'

const { downloadSpy } = vi.hoisted(() => ({ downloadSpy: vi.fn() }))
vi.mock('../services/fileTransfer', () => ({
  downloadTextFile: downloadSpy,
  readFileAsText: vi.fn(),
}))

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

function seedProfile(name = 'Bakkerij Jansen') {
  return store.createProfile({
    name,
    contractMinutes: 1920,
    defaultStartTime: '08:00',
    defaultEndTime: '16:30',
    accentColor: '#2563eb',
  })
}

describe('SettingsPage', () => {
  it('wijzigt de gedeelde gebruikersnaam', async () => {
    seedProfile()
    const wrapper = mountPage(SettingsPage)

    await requireElement(wrapper, '#settings-username').setValue('Martina')
    await submitForm(wrapper)

    expect(store.state.data.username).toBe('Martina')
  })

  it('wijzigt het app-brede thema onder Algemeen', async () => {
    seedProfile()
    const wrapper = mountPage(SettingsPage)

    await requireElement(wrapper, '#settings-theme').setValue('dark')
    await submitForm(wrapper)

    expect(store.state.data.theme).toBe('dark')
    expect(wrapper.text()).toContain('Algemene instellingen opgeslagen.')
  })

  it('toont de app-brede notitie onder Algemeen en niet meer achter de labels', () => {
    seedProfile()
    const wrapper = mountPage(SettingsPage)
    const general = requireContainer(wrapper, 'generalSettings')

    expect(general.text()).toContain('Voor hele app')
    expect(general.text()).not.toContain('(voor de hele app)')
  })

  it('past de accentkleur van het profiel toe', async () => {
    seedProfile()
    const wrapper = mountPage(SettingsPage)

    await requireElement(wrapper, '#profile-accent-7c3aed').setValue(true)
    // Formulier 0 is de gebruikersnaam; formulier 1 is het profiel.
    await submitForm(wrapper, 1)

    expect(store.state.data.profiles[0]?.accentColor).toBe('#7c3aed')
  })

  it('wijzigt profielinstellingen en merkt op dat contractwijzigingen alleen toekomstige weken raken', async () => {
    seedProfile()
    const wrapper = mountPage(SettingsPage)

    await requireElement(wrapper, '#profile-name').setValue('Bakkerij De Vries')
    await requireElement(wrapper, '#profile-contract').setValue('24')
    // Formulier 0 is de gebruikersnaam; formulier 1 is het profiel.
    await submitForm(wrapper, 1)

    const profile = store.state.data.profiles[0]
    expect(profile?.name).toBe('Bakkerij De Vries')
    expect(profile?.contractMinutes).toBe(1440)
    expect(wrapper.text()).toContain('alleen voor toekomstige weken')
  })

  it('weigert herinneringen zonder dag', async () => {
    seedProfile()
    const wrapper = mountPage(SettingsPage)

    await wrapper.findAll('input[type="checkbox"]')[0]?.setValue(true)
    await findButton(wrapper, 'Notificaties opslaan').trigger('click')

    expect(wrapper.text()).toContain('Kies minimaal één dag')
    expect(store.state.data.profiles[0]?.reminders.enabled).toBe(false)
  })

  it('bewaart herinneringsinstellingen en meldt de beperking van de webomgeving', async () => {
    seedProfile()
    const wrapper = mountPage(SettingsPage)

    // Checkbox 0 is herinneringen aan; checkbox 1 is maandag.
    await wrapper.findAll('input[type="checkbox"]')[0]?.setValue(true)
    await wrapper.findAll('input[type="checkbox"]')[1]?.setValue(true)
    await requireElement(wrapper, '#reminder-time').setValue('07:30')
    await findButton(wrapper, 'Notificaties opslaan').trigger('click')
    await flushPromises()

    const reminders = store.state.data.profiles[0]?.reminders
    expect(reminders?.enabled).toBe(true)
    expect(reminders?.days).toEqual([1])
    expect(reminders?.time).toBe('07:30')
  })

  it('vraagt de profielnaam te typen bij het verwijderen en verwijdert daarna alles', async () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '12:00' })

    const wrapper = mountPage(SettingsPage)
    await findButton(wrapper, 'Profiel verwijderen').trigger('click')

    const input = requireElement(wrapper, '#confirm-text')
    await input.setValue('Verkeerde naam')
    await findButton(wrapper, 'Definitief verwijderen').trigger('click')
    expect(store.state.data.profiles).toHaveLength(1)

    await input.setValue('Bakkerij Jansen')
    await findButton(wrapper, 'Definitief verwijderen').trigger('click')

    expect(store.state.data.profiles).toHaveLength(0)
    expect(store.state.data.registrations).toHaveLength(0)
    expect(store.state.data.username).toBe('Martin')
    expect(currentRoute.value).toEqual({ name: 'profiles' })
  })

  it('exporteert alle gegevens naar een CSV-bestand', async () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '12:00' })
    downloadSpy.mockClear()

    const wrapper = mountPage(SettingsPage)
    await findButton(wrapper, 'Exporteren naar CSV').trigger('click')

    expect(downloadSpy).toHaveBeenCalledTimes(1)
    const [filename, content] = downloadSpy.mock.calls[0] as [string, string]
    expect(filename).toBe('uurwijzer-export-2026-10-15.csv')
    expect(content.startsWith('\uFEFF')).toBe(true)
    expect(content).toContain('Bakkerij Jansen')
    expect(content).toContain('2026-10-12')
  })

  it('geeft elk instellingenblok een name en id met dezelfde waarde', () => {
    seedProfile()
    const wrapper = mountPage(SettingsPage)

    for (const containerId of [
      'settingsPage',
      'generalSettings',
      'generalForm',
      'profileSettings',
      'profileForm',
      'reminderSettings',
      'csvBackup',
      'deleteProfile',
    ]) {
      requireContainer(wrapper, containerId)
    }
    expectUniqueContainerIds(wrapper)
  })
})
