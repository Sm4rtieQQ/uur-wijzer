import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import ProfilePage from './ProfilePage.vue'
import NewProfilePage from './NewProfilePage.vue'
import { resetAppStoreForTests, useAppStore, type AppStore } from '../state/appStore'
import { currentRoute } from '../router/router'
import { exportToCsv } from '../services/csv'
import { createEmptyData } from '../storage/parseStoredData'
import { ACCENT_COLOR_OPTIONS } from '../domain/defaults'
import { findButton, mountPage, requireElement, submitForm, expectUniqueContainerIds, requireContainer } from '../testing/testHelpers'
import type { AppData } from '../domain/types'

const now = new Date(2026, 9, 15, 10, 0)
let store: AppStore

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  localStorage.clear()
  resetAppStoreForTests()
  store = useAppStore()
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

/** Simuleert het kiezen van een bestand in een file-input. */
async function selectFile(wrapper: ReturnType<typeof mountPage>, name: string, content: string) {
  const input = requireElement(wrapper, '#import-file')
  const file = new File([content], name, { type: 'text/csv' })
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

describe('ProfilePage', () => {
  it('vraagt alleen om een gebruikersnaam zolang die niet is ingevuld', async () => {
    seedProfile()
    const wrapper = mountPage(ProfilePage)

    // Zonder gebruikersnaam: alleen het invulformulier, geen begroeting.
    expect(wrapper.text()).not.toContain('Hallo')
    expect(wrapper.findAll('.uw-list-item')).toHaveLength(1)

    await requireElement(wrapper, '#username').setValue('Martin')
    await submitForm(wrapper)

    expect(store.state.data.username).toBe('Martin')
    // Na het opslaen verdwijnt het formulier en komt de begroeting tevoorschijn.
    expect(wrapper.find('#username').exists()).toBe(false)
    expect(wrapper.text()).toContain('Hallo, Martin!')
    // De profielen blijven staan.
    expect(wrapper.findAll('.uw-list-item')).toHaveLength(1)
  })

  it('toont de begroeting zonder formulier als de gebruikersnaam bekend is', () => {
    store.setUsername('Martin')
    seedProfile()
    const wrapper = mountPage(ProfilePage)

    expect(wrapper.text()).toContain('Hallo, Martin!')
    expect(wrapper.find('#username').exists()).toBe(false)
    expect(wrapper.text()).toContain('Bakkerij Jansen')
    // oude 'Laatst gebruikt'-badge is verwijderd.
    expect(wrapper.text()).not.toContain('Laatst gebruikt')
  })

  it('kiest een profiel en opent het dashboard', async () => {
    const profile = seedProfile()
    const wrapper = mountPage(ProfilePage)

    await findButton(wrapper, 'Bakkerij Jansen').trigger('click')

    expect(store.activeProfile.value?.id).toBe(profile.id)
    expect(currentRoute.value).toEqual({ name: 'dashboard' })
  })

  it('opent de pagina voor een nieuw profiel', async () => {
    const wrapper = mountPage(ProfilePage)
    await findButton(wrapper, 'Nieuw profiel').trigger('click')
    expect(currentRoute.value).toEqual({ name: 'new-profile' })
  })

  it('geeft de profielpagina en de profielitems een name en id', () => {
    store.setUsername('Martin')
    const profile = seedProfile()
    const wrapper = mountPage(ProfilePage)

    for (const containerId of ['profilesPage', 'profilesHeader', 'profileList', `profile-${profile.id}`]) {
      requireContainer(wrapper, containerId)
    }
    expectUniqueContainerIds(wrapper)
  })

  it('toont boven de profiellijst het label "Selecteer een profiel"', () => {
    store.setUsername('Martin')
    seedProfile()
    const wrapper = mountPage(ProfilePage)

    expect(wrapper.text()).toContain('Selecteer een profiel')
  })

  it('toont het klokdecor in de banner van de profielpagina', () => {
    store.setUsername('Martin')
    seedProfile()
    const wrapper = mountPage(ProfilePage)

    const dial = requireElement(wrapper, '.uw-banner-dial')
    expect(dial.attributes('aria-hidden')).toBe('true')
  })
})

describe('NewProfilePage', () => {
  it('geeft de nieuw-profielpagina containers een name en id', () => {
    const wrapper = mountPage(NewProfilePage)

    for (const containerId of ['newProfilePage', 'newProfileHeader', 'newProfileForm', 'profileImport']) {
      requireContainer(wrapper, containerId)
    }
    expectUniqueContainerIds(wrapper)
  })

  it('toont alle negen accentkleuren als keuzerondjes zonder zichtbare tekst', () => {
    const wrapper = mountPage(NewProfilePage)

    expect(ACCENT_COLOR_OPTIONS).toHaveLength(9)
    const swatches = wrapper.findAll('.uw-swatch')
    expect(swatches).toHaveLength(ACCENT_COLOR_OPTIONS.length)

    const inputs = wrapper.findAll('input[name="profile-accent"]')
    expect(inputs.map((input) => input.attributes('aria-label'))).toEqual(
      ACCENT_COLOR_OPTIONS.map((option) => option.label),
    )
    for (const option of ACCENT_COLOR_OPTIONS) {
      expect(requireElement(wrapper, `#profile-accent-${option.value.slice(1)}`).exists()).toBe(true)
    }
    // De kleurnamen staan niet meer als zichtbare tekst in het formulier.
    for (const option of ACCENT_COLOR_OPTIONS) {
      expect(wrapper.text()).not.toContain(option.label)
    }
  })

  it('geeft elke kleurtegel zijn eigen kleur mee voor de selectie-outline', () => {
    const wrapper = mountPage(NewProfilePage)

    for (const option of ACCENT_COLOR_OPTIONS) {
      const dot = requireElement(wrapper, `#profile-accent-${option.value.slice(1)} + .uw-swatch-dot`)
      expect(dot.attributes('style')).toContain(`--uw-swatch-color: ${option.value}`)
      expect(dot.attributes('style')).toContain(option.value)
    }
  })

  it('toont Nederlandse foutmeldingen bij lege verplichte velden', async () => {
    const wrapper = mountPage(NewProfilePage)

    await requireElement(wrapper, '#profile-name').setValue('')
    await submitForm(wrapper)

    expect(wrapper.text()).toContain('Vul de naam van de werkgever in.')
    expect(store.state.data.profiles).toHaveLength(0)
  })

  it('maakt een profiel aan en opent het dashboard', async () => {
    const wrapper = mountPage(NewProfilePage)

    await requireElement(wrapper, '#profile-name').setValue('Bakkerij Jansen')
    await requireElement(wrapper, '#profile-contract').setValue('32,5')
    await requireElement(wrapper, '#profile-start').setValue('08:00')
    await requireElement(wrapper, '#profile-end').setValue('16:30')
    await requireElement(wrapper, '#profile-accent-7c3aed').setValue(true)
    await submitForm(wrapper)

    expect(store.state.data.profiles).toHaveLength(1)
    expect(store.state.data.profiles[0]?.name).toBe('Bakkerij Jansen')
    expect(store.state.data.profiles[0]?.contractMinutes).toBe(1950)
    expect(store.state.data.profiles[0]?.accentColor).toBe('#7c3aed')
    expect(currentRoute.value).toEqual({ name: 'dashboard' })
  })

  it('weigert een eindtijd die niet later is dan de starttijd', async () => {
    const wrapper = mountPage(NewProfilePage)

    await requireElement(wrapper, '#profile-name').setValue('Bakkerij Jansen')
    await requireElement(wrapper, '#profile-start').setValue('16:00')
    await requireElement(wrapper, '#profile-end').setValue('08:00')
    await submitForm(wrapper)

    expect(wrapper.text()).toContain('De standaard eindtijd moet later zijn dan de standaard starttijd')
    expect(store.state.data.profiles).toHaveLength(0)
  })

  it('importeert profielen en registraties uit een CSV-bestand', async () => {
    const incoming: AppData = {
      ...createEmptyData(),
      username: 'Martin',
      profiles: [
        {
          id: 'profile-import',
          name: 'Bezorgdienst Piet',
          contractMinutes: 960,
          defaultStartTime: '10:00',
          defaultEndTime: '14:00',
          accentColor: '#2563eb',
          reminders: { enabled: false, days: [], time: '09:00' },
        },
      ],
      registrations: [
        {
          id: 'registration-import',
          profileId: 'profile-import',
          date: '2026-10-13',
          startTime: '10:00',
          endTime: '14:00',
        },
      ],
    }

    const wrapper = mountPage(NewProfilePage)
    await selectFile(wrapper, 'export.csv', exportToCsv(incoming))

    expect(store.state.data.profiles.map((profile) => profile.name)).toContain('Bezorgdienst Piet')
    expect(store.state.data.registrations).toHaveLength(1)
    expect(wrapper.text()).toContain('Import voltooid.')
    expect(wrapper.text()).toContain('Toegevoegd: Bezorgdienst Piet.')
  })

  it('toont begrijpelijke fouten en wijzigt niets bij een ongeldige import', async () => {
    const profile = seedProfile()
    store.addRegistration(profile.id, { date: '2026-10-12', startTime: '08:00', endTime: '12:00' })

    const wrapper = mountPage(NewProfilePage)
    await selectFile(wrapper, 'kapot.csv', 'record,verkeerd\r\nprofile,x\r\n')

    expect(wrapper.text()).toContain('Het bestand is niet geïmporteerd')
    expect(store.state.data.profiles).toHaveLength(1)
    expect(store.state.data.registrations).toHaveLength(1)
  })

  it('slaat bestaande profielen over bij een dubbele import', async () => {
    const profile = seedProfile()

    const wrapper = mountPage(NewProfilePage)
    await selectFile(wrapper, 'export.csv', exportToCsv(store.state.data))

    expect(store.state.data.profiles).toHaveLength(1)
    expect(store.state.data.profiles[0]?.id).toBe(profile.id)
    expect(wrapper.text()).toContain('Overgeslagen (bestaat al): Bakkerij Jansen.')
  })
})
