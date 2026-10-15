import { beforeEach, describe, expect, it, vi } from 'vitest'
import { decideReminder, describeReminderReason, type ReminderContext } from './reminders'
import { buildReminderContext, createBrowserNotifier, startReminderScheduler, type Notifier } from './reminderScheduler'
import { createAppStore, type AppStore } from '../state/appStore'
import type { StorageLike } from '../storage/appStorage'
import type { Profile } from '../domain/types'

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

/** 15 oktober 2026 is een donderdag (ISO-weekdag 4). */
const thursday = new Date(2026, 9, 15, 9, 30)

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'p1',
    name: 'Bakkerij Jansen',
    contractMinutes: 1920,
    defaultStartTime: '08:00',
    defaultEndTime: '16:30',
    theme: 'light',
    reminders: { enabled: true, days: [4], time: '09:00' },
    ...overrides,
  }
}

function createContext(overrides: Partial<ReminderContext> = {}): ReminderContext {
  return {
    now: thursday,
    today: '2026-10-15',
    profile: createProfile(),
    weekIsVacation: false,
    hasRegistrationToday: false,
    lastSentDate: null,
    ...overrides,
  }
}

describe('decideReminder', () => {
  it('stuurt een herinnering op een ingestelde dag na de ingestelde tijd', () => {
    expect(decideReminder(createContext())).toEqual({ shouldSend: true, reason: 'send' })
  })

  it('stuurt niets als herinneringen uit staan', () => {
    const context = createContext({ profile: createProfile({ reminders: { enabled: false, days: [4], time: '09:00' } }) })
    expect(decideReminder(context).reason).toBe('disabled')
  })

  it('stuurt niets op een dag die niet is ingesteld', () => {
    const context = createContext({ profile: createProfile({ reminders: { enabled: true, days: [1, 2], time: '09:00' } }) })
    expect(decideReminder(context).reason).toBe('not-a-reminder-day')
  })

  it('stuurt niets voor de ingestelde tijd', () => {
    const context = createContext({ now: new Date(2026, 9, 15, 8, 15) })
    expect(decideReminder(context).reason).toBe('before-time')
  })

  it('stuurt niets als er al een registratie is gedaan', () => {
    expect(decideReminder(createContext({ hasRegistrationToday: true })).reason).toBe('already-registered')
  })

  it('stuurt niet twee keer op dezelfde dag', () => {
    expect(decideReminder(createContext({ lastSentDate: '2026-10-15' })).reason).toBe('already-sent')
    expect(decideReminder(createContext({ lastSentDate: '2026-10-14' })).shouldSend).toBe(true)
  })

  it('ondersteunt een ongeldige herinneringstijd zonder te versturen', () => {
    const context = createContext({ profile: createProfile({ reminders: { enabled: true, days: [4], time: 'kwart voor' } }) })
    expect(decideReminder(context).reason).toBe('invalid-time')
  })

  it('geeft een Nederlandse toelichting bij elke uitkomst', () => {
    for (const reason of ['send', 'disabled', 'invalid-time', 'not-a-reminder-day', 'vacation-week', 'already-registered', 'before-time', 'already-sent'] as const) {
      expect(describeReminderReason(reason).length).toBeGreaterThan(0)
    }
  })
})

describe('vakantieweken en herinneringen', () => {
  it('verstuurt niets in een vakantieweek', () => {
    expect(decideReminder(createContext({ weekIsVacation: true }))).toEqual({
      shouldSend: false,
      reason: 'vacation-week',
    })
  })

  it('laat herinneringen weer toe als de vakantiemarkering verdwijnt', () => {
    const vacation = decideReminder(createContext({ weekIsVacation: true }))
    const restored = decideReminder(createContext({ weekIsVacation: false }))
    expect(vacation.shouldSend).toBe(false)
    expect(restored.shouldSend).toBe(true)
  })

  it('onderbouwt dit ook via de appstate (vakantie markeren onderdrukt de controle)', () => {
    const store = createAppStore(new MemoryStorage())
    const profile = store.createProfile({
      name: 'Bakkerij Jansen',
      contractMinutes: 1920,
      defaultStartTime: '08:00',
      defaultEndTime: '16:30',
      theme: 'light',
      reminders: { enabled: true, days: [4], time: '09:00' },
    })

    const before = buildReminderContext(store, store.activeProfile.value!, thursday)
    expect(before.decision.shouldSend).toBe(true)

    store.setWeekVacation(profile.id, { isoYear: 2026, isoWeek: 42 }, true)
    const during = buildReminderContext(store, store.activeProfile.value!, thursday)
    expect(during.decision.reason).toBe('vacation-week')

    store.setWeekVacation(profile.id, { isoYear: 2026, isoWeek: 42 }, false)
    const after = buildReminderContext(store, store.activeProfile.value!, thursday)
    expect(after.decision.shouldSend).toBe(true)
  })

  it('houdt rekening met een registratie van vandaag', () => {
    const store = createAppStore(new MemoryStorage())
    const profile = store.createProfile({
      name: 'Bakkerij Jansen',
      contractMinutes: 1920,
      defaultStartTime: '08:00',
      defaultEndTime: '16:30',
      theme: 'light',
      reminders: { enabled: true, days: [4], time: '09:00' },
    })
    store.addRegistration(profile.id, { date: '2026-10-15', startTime: '08:00', endTime: '12:00' })

    expect(buildReminderContext(store, profile, thursday).decision.reason).toBe('already-registered')
  })
})

describe('startReminderScheduler', () => {
  let store: AppStore
  let notifications: Array<{ title: string; body: string }>
  let notifier: Notifier

  beforeEach(() => {
    vi.useFakeTimers()
    store = createAppStore(new MemoryStorage())
    store.setUsername('Martin')
    store.createProfile({
      name: 'Bakkerij Jansen',
      contractMinutes: 1920,
      defaultStartTime: '08:00',
      defaultEndTime: '16:30',
      theme: 'light',
      reminders: { enabled: true, days: [4], time: '09:00' },
    })
    notifications = []
    notifier = {
      isSupported: () => true,
      permission: () => 'granted',
      requestPermission: async () => 'granted',
      notify: (title, body) => notifications.push({ title, body }),
    }
  })

  it('verstuurt één melding en onthoudt dat voor die dag', () => {
    const scheduler = startReminderScheduler({ store, notifier, now: () => thursday, intervalMs: 1000 })
    expect(notifications).toHaveLength(1)
    expect(notifications[0]?.body).toContain('15-10-2026')

    vi.advanceTimersByTime(5000)
    expect(notifications).toHaveLength(1)
    scheduler.stop()
    vi.useRealTimers()
  })

  it('verstuurt niets in een vakantieweek en weer wel na het uitzetten van de vakantie', () => {
    const profile = store.activeProfile.value!
    store.setWeekVacation(profile.id, { isoYear: 2026, isoWeek: 42 }, true)

    const scheduler = startReminderScheduler({ store, notifier, now: () => thursday, intervalMs: 1000 })
    expect(notifications).toHaveLength(0)

    // De vakantiemarkering weghalen op een volgende dag zonder eerdere melding.
    store.setWeekVacation(profile.id, { isoYear: 2026, isoWeek: 42 }, false)
    scheduler.tick()
    expect(notifications).toHaveLength(1)
    scheduler.stop()
    vi.useRealTimers()
  })

  it('doet niets zonder actief profiel', () => {
    store.selectProfile(null)
    const scheduler = startReminderScheduler({ store, notifier, now: () => thursday, intervalMs: 1000 })
    expect(notifications).toHaveLength(0)
    scheduler.stop()
    vi.useRealTimers()
  })
})

describe('createBrowserNotifier', () => {
  it('meldt dat meldingen niet ondersteund worden als de Notification API ontbreekt', () => {
    const originalNotification = (globalThis as { Notification?: unknown }).Notification
    // happy-dom levert Notification mogelijk niet; forceer het ontbreken.
    delete (globalThis as { Notification?: unknown }).Notification

    const notifier = createBrowserNotifier()
    expect(notifier.isSupported()).toBe(false)
    expect(notifier.permission()).toBe('unsupported')
    notifier.notify('titel', 'bericht')

    if (originalNotification !== undefined) {
      ;(globalThis as { Notification?: unknown }).Notification = originalNotification
    }
  })
})
