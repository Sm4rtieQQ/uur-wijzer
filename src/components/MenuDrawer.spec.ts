import { beforeEach, describe, expect, it } from 'vitest'
import MenuDrawer from './MenuDrawer.vue'
import { resetAppStoreForTests, useAppStore } from '../state/appStore'
import { currentRoute } from '../router/router'
import { findButton, mountPage, requireElement, expectUniqueContainerIds, requireContainer } from '../testing/testHelpers'

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

describe('MenuDrawer', () => {
  it('toont eerst het profielblok en daarna de menukoppen op volgorde', () => {
    const wrapper = mountPage(MenuDrawer, { open: true })

    expect(requireElement(wrapper, '.uw-eyebrow').text()).toBe('Martin')
    // Zelfde titelopmaak als in de app-header (`.uw-profile-title`).
    expect(requireElement(wrapper, '.uw-profile-title').text()).toBe('Bakkerij Jansen')
    expect(wrapper.findAll('.uw-nav-button').map((item) => item.text())).toEqual([
      'Dashboard',
      'Overzicht',
      'Instellingen',
    ])
  })

  it('navigeert naar een scherm en sluit het menu', async () => {
    const wrapper = mountPage(MenuDrawer, { open: true })

    await findButton(wrapper, 'Overzicht').trigger('click')

    expect(currentRoute.value).toEqual({ name: 'overview' })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('sluit met Escape en bij een klik buiten de container', async () => {
    const escapeWrapper = mountPage(MenuDrawer, { open: true })
    await requireElement(escapeWrapper, '.uw-dialog').trigger('keydown', { key: 'Escape' })
    expect(escapeWrapper.emitted('close')).toHaveLength(1)

    const backdropWrapper = mountPage(MenuDrawer, { open: true })
    await requireElement(backdropWrapper, '.uw-dialog-backdrop').trigger('click')
    expect(backdropWrapper.emitted('close')).toHaveLength(1)
  })

  it('toont geen sluitknop', () => {
    const wrapper = mountPage(MenuDrawer, { open: true })
    expect(wrapper.findAll('button').map((item) => item.text())).not.toContain('Sluiten')
  })

  it('sluit de lade met de Terug-knop onder de menu-items', async () => {
    const wrapper = mountPage(MenuDrawer, { open: true })

    // Terug staat ná de drie menu-items en niet in het <nav>-menu zelf.
    expect(wrapper.findAll('.uw-dialog button').map((item) => item.text())).toEqual([
      'Dashboard',
      'Overzicht',
      'Instellingen',
      'Terug',
    ])
    expect(requireElement(wrapper, '.uw-nav-back').element.tagName).toBe('BUTTON')

    await findButton(wrapper, 'Terug').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('geeft de ladecontainer een name en id', () => {
    const wrapper = mountPage(MenuDrawer, { open: true })

    requireContainer(wrapper, 'menuDrawer')
    expectUniqueContainerIds(wrapper)
  })
})
