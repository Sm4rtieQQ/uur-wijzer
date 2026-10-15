import { isoWeekdayOf } from '../domain/date'
import { parseTimeOfDay } from '../domain/time'
import type { Profile } from '../domain/types'

/** Waarom een herinnering wel of niet wordt verstuurd. */
export type ReminderReason =
  | 'send'
  | 'disabled'
  | 'invalid-time'
  | 'not-a-reminder-day'
  | 'vacation-week'
  | 'already-registered'
  | 'before-time'
  | 'already-sent'

/** Uitkomst van de herinneringsbeoordeling. */
export interface ReminderDecision {
  shouldSend: boolean
  reason: ReminderReason
}

/** Alle gegevens die nodig zijn om te bepalen of een herinnering mag worden verstuurd. */
export interface ReminderContext {
  /** Actueel moment. */
  now: Date
  /** Lokale datum van vandaag (`yyyy-mm-dd`). */
  today: string
  profile: Profile
  /** Is de ISO-week van vandaag als vakantie gemarkeerd? */
  weekIsVacation: boolean
  /** Bestaat er al een registratie voor vandaag? */
  hasRegistrationToday: boolean
  /** Datum waarop voor dit profiel voor het laatst een herinnering is verstuurd. */
  lastSentDate: string | null
}

/**
 * Bepaalt of er nu een herinnering verstuurd mag worden.
 *
 * Vakantieweken onderdrukken herinneringen volledig, ook als ze voor het
 * profiel aanstaan. Zodra de vakantiemarkering verdwijnt, geldt de
 * profielinstelling weer.
 */
export function decideReminder(context: ReminderContext): ReminderDecision {
  const { profile, now, today } = context

  if (!profile.reminders.enabled) {
    return { shouldSend: false, reason: 'disabled' }
  }

  const reminderMinutes = parseTimeOfDay(profile.reminders.time)
  if (reminderMinutes === null) {
    return { shouldSend: false, reason: 'invalid-time' }
  }

  if (!profile.reminders.days.includes(isoWeekdayOf(today))) {
    return { shouldSend: false, reason: 'not-a-reminder-day' }
  }

  if (context.weekIsVacation) {
    return { shouldSend: false, reason: 'vacation-week' }
  }

  if (context.hasRegistrationToday) {
    return { shouldSend: false, reason: 'already-registered' }
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  if (nowMinutes < reminderMinutes) {
    return { shouldSend: false, reason: 'before-time' }
  }

  if (context.lastSentDate === today) {
    return { shouldSend: false, reason: 'already-sent' }
  }

  return { shouldSend: true, reason: 'send' }
}

/** Korte Nederlandse toelichting bij een uitkomst; handig voor de interface. */
export function describeReminderReason(reason: ReminderReason): string {
  switch (reason) {
    case 'send':
      return 'Herinnering wordt verstuurd.'
    case 'disabled':
      return 'Herinneringen staan uit voor dit profiel.'
    case 'invalid-time':
      return 'De ingestelde herinneringstijd is ongeldig.'
    case 'not-a-reminder-day':
      return 'Vandaag is geen herinneringsdag.'
    case 'vacation-week':
      return 'Deze week is vakantie; herinneringen zijn onderdrukt.'
    case 'already-registered':
      return 'Er is vandaag al een registratie gedaan.'
    case 'before-time':
      return 'Het is nog geen herinneringstijd.'
    case 'already-sent':
      return 'Er is vandaag al een herinnering verstuurd.'
  }
}
