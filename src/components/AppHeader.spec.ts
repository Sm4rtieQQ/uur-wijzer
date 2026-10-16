import { beforeEach, describe, expect, it } from 'vitest'
import AppHeader from './AppHeader.vue'
import { resetAppStoreForTests, useAppStore } from '../state/appStore'
import { currentRoute } from '../router/router'
import { mountPage, requireElement, expectUniqueContainerIds, requireContainer } from '../testing/testHelpers'

beforeEach(() => {
  localStorage.clear()
  resetAppStoreForTests()
  currentRoute.value = { name: 'dashboard' }
  const store = useAppStore()
  store.setUsername('Martin')
  store.createProfile({
    name: 'Bakkerij Jansen',
    contractMinutes: 1920,
    defaultStartTime: '08:00',
    defaultEndTime: '16:30',
    accentColor: '#2563eb',
  })
})

describe('AppHeader', () => {
  it('toont de gebruikersnaam als eyebrow en de werkgever als titel', () => {
    const wrapper = mountPage(AppHeader, { menuOpen: false })

    expect(requireElement(wrapper, '.uw-eyebrow').text()).toBe('Martin')
    expect(requireElement(wrapper, '.uw-header-title strong').text()).toBe('Bakkerij Jansen')
    // De profieltitel gebruikt de gedeelde titelopmaak (ook in de menulade).
    expect(requireElement(wrapper, '.uw-header-title .uw-profile-title').text()).toBe('Bakkerij Jansen')
  })

  it('opent de profielpagina via de titel in de header', async () => {
    const wrapper = mountPage(AppHeader, { menuOpen: false })

    await requireElement(wrapper, '.uw-header-title').trigger('click')

    expect(currentRoute.value).toEqual({ name: 'profiles' })
  })

  it('vraagt de parent om het menu te openen', async () => {
    const wrapper = mountPage(AppHeader, { menuOpen: false })

    await requireElement(wrapper, '.uw-menu-button').trigger('click')

    expect(wrapper.emitted('openMenu')).toHaveLength(1)
  })

  it('geeft de headercontainer een name en id', () => {
    const wrapper = mountPage(AppHeader, { menuOpen: false })

    requireContainer(wrapper, 'appHeader')
    expectUniqueContainerIds(wrapper)
  })

  it('toont het klokdecor als decoratieve laag in de banner', () => {
    const wrapper = mountPage(AppHeader, { menuOpen: false })

    const dial = requireElement(wrapper, '.uw-banner-dial')
    expect(dial.attributes('aria-hidden')).toBe('true')
  })
})
