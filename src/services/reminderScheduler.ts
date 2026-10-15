import { formatDateDutch, todayIsoDate } from '../domain/date'
import { getIsoWeek } from '../domain/isoWeek'
import { findWeekRecord } from '../domain/weeks'
import type { Profile } from '../domain/types'
import type { AppStore } from '../state/appStore'
import { decideReminder, type ReminderDecision } from './reminders'

/** Toestemming voor meldingen, of het ontbreken daarvan. */
export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

/** Verstuurt meldingen namens de app. */
export interface Notifier {
  isSupported(): boolean
  permission(): NotificationPermissionState
  requestPermission(): Promise<NotificationPermissionState>
  notify(title: string, body: string): void
}

/** Notifier op basis van de Notification API van de browser. */
export function createBrowserNotifier(): Notifier {
  const supported = typeof window !== 'undefined' && 'Notification' in window

  return {
    isSupported: () => supported,
    permission: () => {
      if (!supported) return 'unsupported'
      return Notification.permission as NotificationPermissionState
    },
    requestPermission: async () => {
      if (!supported) return 'unsupported'
      try {
        return (await Notification.requestPermission()) as NotificationPermissionState
      } catch {
        return 'denied'
      }
    },
    notify: (title, body) => {
      if (!supported || Notification.permission !== 'granted') return
      try {
        new Notification(title, { body })
      } catch {
        // Mislukte meldingen mogen de app nooit blokkeren.
      }
    },
  }
}

/** Bouwt de context voor de herinneringsbeoordeling van het actieve profiel. */
export function buildReminderContext(
  store: AppStore,
  profile: Profile,
  now: Date = new Date(),
): { decision: ReminderDecision; today: string } {
  const today = todayIsoDate(now)
  const weekRecord = findWeekRecord(store.state.data.weeks, profile.id, getIsoWeek(today))
  const hasRegistrationToday = store.state.data.registrations.some(
    (registration) => registration.profileId === profile.id && registration.date === today,
  )

  return {
    today,
    decision: decideReminder({
      now,
      today,
      profile,
      weekIsVacation: weekRecord?.isVacation ?? false,
      hasRegistrationToday,
      lastSentDate: store.state.reminderLog[profile.id] ?? null,
    }),
  }
}

export interface ReminderSchedulerOptions {
  store: AppStore
  notifier: Notifier
  /** Interval tussen controles in milliseconden (standaard 60 seconden). */
  intervalMs?: number
  /** Momentopname-functie, handig voor tests. */
  now?: () => Date
}

export interface ReminderScheduler {
  /** Voert één controle uit en geeft de uitkomst terug. */
  tick(): ReminderDecision | null
  stop(): void
}

/**
 * Verstuurt herinneringen zolang de app geopend is.
 *
 * Beperking: in een gewone webomgeving is plannen op de achtergrond (app
 * gesloten) niet betrouwbaar mogelijk. Deze scheduler controleert daarom
 * periodiek terwijl de app open is; voor echte achtergrondmeldingen is een
 * Android-implementatie via Capacitor nodig.
 */
export function startReminderScheduler(options: ReminderSchedulerOptions): ReminderScheduler {
  const { store, notifier } = options
  const intervalMs = options.intervalMs ?? 60_000
  const now = options.now ?? (() => new Date())

  const tick = (): ReminderDecision | null => {
    const profile = store.activeProfile.value
    if (!profile) return null

    const { decision, today } = buildReminderContext(store, profile, now())
    if (decision.shouldSend) {
      notifier.notify(
        'Herinnering: uren registreren',
        `Je hebt op ${formatDateDutch(today)} nog geen uren geregistreerd voor ${profile.name}.`,
      )
      store.markReminderSent(profile.id, today)
    }
    return decision
  }

  const timer = setInterval(tick, intervalMs)
  const onVisible = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') tick()
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisible)
  }
  tick()

  return {
    tick,
    stop: () => {
      clearInterval(timer)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible)
      }
    },
  }
}
