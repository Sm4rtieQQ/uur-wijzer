import { beforeEach, describe, expect, it } from 'vitest'
import { currentRoute, guardRoute, hasUsableProfile, navigate, resolveStartRoute, routeRequiresProfile } from './router'
import { createAppStore } from '../state/appStore'
import type { StorageLike } from '../storage/appStorage'

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

const profileInput = {
  name: 'Bakkerij Jansen',
  contractMinutes: 1920,
  defaultStartTime: '08:00',
  defaultEndTime: '16:30',
  theme: 'light' as const,
}

beforeEach(() => {
  currentRoute.value = { name: 'dashboard' }
})

describe('resolveStartRoute', () => {
  it('opent de profielpagina als er nog geen gegevens zijn', () => {
    const store = createAppStore(new MemoryStorage())
    expect(resolveStartRoute(store)).toEqual({ name: 'profiles' })
  })

  it('opent de profielpagina als de gebruikersnaam ontbreekt', () => {
    const store = createAppStore(new MemoryStorage())
    store.createProfile(profileInput)
    store.setUsername('')
    expect(resolveStartRoute(store)).toEqual({ name: 'profiles' })
  })

  it('opent de profielpagina als er geen profiel is geselecteerd', () => {
    const store = createAppStore(new MemoryStorage())
    store.setUsername('Martin')
    store.createProfile(profileInput)
    store.selectProfile(null)
    expect(resolveStartRoute(store)).toEqual({ name: 'profiles' })
  })

  it('opent het dashboard van het laatst gebruikte profiel', () => {
    const store = createAppStore(new MemoryStorage())
    store.setUsername('Martin')
    store.createProfile(profileInput)
    expect(resolveStartRoute(store)).toEqual({ name: 'dashboard' })
  })
})

describe('opstartgedrag bij opgeslagen gegevens', () => {
  it('opent het dashboard bij geldige opgeslagen data', () => {
    const storage = new MemoryStorage()
    const first = createAppStore(storage)
    first.setUsername('Martin')
    first.createProfile(profileInput)

    const reloaded = createAppStore(storage)
    expect(hasUsableProfile(reloaded)).toBe(true)
    expect(resolveStartRoute(reloaded)).toEqual({ name: 'dashboard' })
  })

  it('opent de profielpagina als het laatst gebruikte profiel verdwenen is', () => {
    const storage = new MemoryStorage()
    const first = createAppStore(storage)
    first.setUsername('Martin')
    const profile = first.createProfile(profileInput)
    first.deleteProfile(profile.id)

    const reloaded = createAppStore(storage)
    expect(hasUsableProfile(reloaded)).toBe(false)
    expect(resolveStartRoute(reloaded)).toEqual({ name: 'profiles' })
  })
})

describe('guardRoute', () => {
  it('valt terug op profielkeuze zonder actief profiel', () => {
    const store = createAppStore(new MemoryStorage())
    currentRoute.value = { name: 'settings' }
    guardRoute(store)
    expect(currentRoute.value).toEqual({ name: 'profiles' })
  })

  it('laat profielschermen staan als er wel een profiel is', () => {
    const store = createAppStore(new MemoryStorage())
    store.setUsername('Martin')
    store.createProfile(profileInput)
    currentRoute.value = { name: 'settings' }
    guardRoute(store)
    expect(currentRoute.value).toEqual({ name: 'settings' })
  })

  it('kent de route-eisen', () => {
    expect(routeRequiresProfile({ name: 'profiles' })).toBe(false)
    expect(routeRequiresProfile({ name: 'new-profile' })).toBe(false)
    expect(routeRequiresProfile({ name: 'dashboard' })).toBe(true)
    expect(routeRequiresProfile({ name: 'overview' })).toBe(true)
    expect(routeRequiresProfile({ name: 'settings' })).toBe(true)
    expect(routeRequiresProfile({ name: 'week-detail', isoYear: 2026, isoWeek: 42 })).toBe(true)
  })
})

describe('navigate', () => {
  it('zet de huidige route', () => {
    navigate({ name: 'overview' })
    expect(currentRoute.value).toEqual({ name: 'overview' })
    navigate({ name: 'week-detail', isoYear: 2026, isoWeek: 42 })
    expect(currentRoute.value).toEqual({ name: 'week-detail', isoYear: 2026, isoWeek: 42 })
  })
})
