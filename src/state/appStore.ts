import { computed, reactive, type ComputedRef } from 'vue'
import { todayIsoDate } from '../domain/date'
import { createId } from '../domain/id'
import { getIsoWeek, isoWeekKey, type IsoWeekRef } from '../domain/isoWeek'
import { compareIsoWeeksToDate, findWeekRecord, relevantIsoWeeks } from '../domain/weeks'
import type { AppData, Profile, Registration, ReminderSettings, ThemeId, WeekRecord } from '../domain/types'
import {
  getDefaultStorage,
  loadAppData,
  loadReminderLog,
  saveAppData,
  saveReminderLog,
  type StorageLike,
} from '../storage/appStorage'
import { createEmptyData } from '../storage/parseStoredData'

/** Wijzigbare profielvelden. */
export interface ProfileChanges {
  name?: string
  contractMinutes?: number
  defaultStartTime?: string
  defaultEndTime?: string
  theme?: ThemeId
  reminders?: ReminderSettings
}

/** Gegevens van een registratie zonder id. */
export interface RegistrationChanges {
  date: string
  startTime: string
  endTime: string
}

/** Reactieve appstate. */
export interface AppStoreState {
  data: AppData
  /** Meldingen over opgeslagen data die hersteld of overgeslagen is. */
  issues: string[]
  storageAvailable: boolean
  /** Mislukte de laatste opslagpoging? */
  lastSaveFailed: boolean
  /** Per profiel de datum waarop voor het laatst een herinnering is verstuurd. */
  reminderLog: Record<string, string>
}

/** Acties en afgeleide waarden van de app. */
export interface AppStore {
  state: AppStoreState
  activeProfile: ComputedRef<Profile | null>
  setUsername(username: string): void
  createProfile(input: NewProfileData): Profile
  updateProfile(profileId: string, changes: ProfileChanges): Profile | null
  deleteProfile(profileId: string): void
  selectProfile(profileId: string | null): void
  ensureWeek(profileId: string, ref: IsoWeekRef): WeekRecord
  ensureWeeksForYear(profileId: string, isoYear: number): void
  setWeekContract(profileId: string, ref: IsoWeekRef, contractMinutes: number): void
  setWeekVacation(profileId: string, ref: IsoWeekRef, isVacation: boolean): void
  addRegistration(profileId: string, changes: RegistrationChanges): Registration
  updateRegistration(registrationId: string, changes: RegistrationChanges): Registration | null
  removeRegistration(registrationId: string): void
  markReminderSent(profileId: string, date: string): void
  replaceData(data: AppData): void
  reload(): void
}

/** Gevalideerde gegevens voor een nieuw profiel. */
export interface NewProfileData {
  name: string
  contractMinutes: number
  defaultStartTime: string
  defaultEndTime: string
  theme: ThemeId
  reminders?: ReminderSettings
}

function defaultReminders(): ReminderSettings {
  return { enabled: false, days: [], time: '09:00' }
}

/**
 * Maakt de appstate met bijbehorende acties.
 *
 * Elke mutatie wordt direct opgeslagen. Weekgegevens worden lazy aangemaakt met
 * de dan geldende contracturen, zodat profielwijzigingen alleen toekomstige
 * weken beïnvloeden.
 */
export function createAppStore(storage: StorageLike | null = getDefaultStorage()): AppStore {
  const loaded = loadAppData(storage)
  const state = reactive<AppStoreState>({
    data: loaded.data,
    issues: [...loaded.issues],
    storageAvailable: loaded.storageAvailable,
    lastSaveFailed: false,
    reminderLog: loadReminderLog(storage),
  })

  const activeProfile = computed(
    () => state.data.profiles.find((profile) => profile.id === state.data.lastProfileId) ?? null,
  )

  function persist(): void {
    const success = saveAppData(state.data, storage)
    state.lastSaveFailed = !success
    if (!success) {
      addIssue('De gegevens konden niet lokaal worden opgeslagen.')
    }
  }

  function addIssue(issue: string): void {
    if (!state.issues.includes(issue)) {
      state.issues.push(issue)
    }
  }

  function findProfile(profileId: string): Profile | undefined {
    return state.data.profiles.find((profile) => profile.id === profileId)
  }

  function ensureWeek(profileId: string, ref: IsoWeekRef): WeekRecord {
    const existing = findWeekRecord(state.data.weeks, profileId, ref)
    if (existing) return existing

    const profile = findProfile(profileId)
    const record: WeekRecord = {
      profileId,
      isoYear: ref.isoYear,
      isoWeek: ref.isoWeek,
      contractMinutes: profile?.contractMinutes ?? 0,
      isVacation: false,
    }
    state.data.weeks.push(record)
    persist()
    return record
  }

  function createProfile(input: NewProfileData): Profile {
    const profile: Profile = {
      id: createId('profile'),
      name: input.name,
      contractMinutes: input.contractMinutes,
      defaultStartTime: input.defaultStartTime,
      defaultEndTime: input.defaultEndTime,
      theme: input.theme,
      reminders: input.reminders ?? defaultReminders(),
    }
    state.data.profiles.push(profile)
    state.data.lastProfileId = profile.id
    persist()
    return profile
  }

  function updateProfile(profileId: string, changes: ProfileChanges): Profile | null {
    const profile = findProfile(profileId)
    if (!profile) return null

    const previousContractMinutes = profile.contractMinutes
    if (changes.name !== undefined) profile.name = changes.name
    if (changes.defaultStartTime !== undefined) profile.defaultStartTime = changes.defaultStartTime
    if (changes.defaultEndTime !== undefined) profile.defaultEndTime = changes.defaultEndTime
    if (changes.theme !== undefined) profile.theme = changes.theme
    if (changes.reminders !== undefined) profile.reminders = changes.reminders
    if (changes.contractMinutes !== undefined) profile.contractMinutes = changes.contractMinutes

    if (changes.contractMinutes !== undefined && changes.contractMinutes !== previousContractMinutes) {
      applyContractChangeToFutureWeeks(profileId, previousContractMinutes, changes.contractMinutes)
    }

    persist()
    return profile
  }

  /**
   * Past een gewijzigd contract toe op nog niet begonnen weken die het oude
   * bedrag hadden. Historische weken en handmatig aangepaste weekcontracten
   * blijven ongewijzigd.
   */
  function applyContractChangeToFutureWeeks(profileId: string, previous: number, next: number): void {
    const today = todayIsoDate()
    for (const week of state.data.weeks) {
      if (week.profileId !== profileId) continue
      if (compareIsoWeeksToDate(week, today) <= 0) continue
      if (week.isVacation) continue
      if (week.contractMinutes === previous) {
        week.contractMinutes = next
      }
    }
  }

  function deleteProfile(profileId: string): void {
    state.data.profiles = state.data.profiles.filter((profile) => profile.id !== profileId)
    state.data.registrations = state.data.registrations.filter((registration) => registration.profileId !== profileId)
    state.data.weeks = state.data.weeks.filter((week) => week.profileId !== profileId)
    if (state.data.lastProfileId === profileId) {
      state.data.lastProfileId = null
    }
    const reminderLog = { ...state.reminderLog }
    delete reminderLog[profileId]
    state.reminderLog = reminderLog
    saveReminderLog(state.reminderLog, storage)
    persist()
  }

  function selectProfile(profileId: string | null): void {
    if (profileId !== null && !findProfile(profileId)) return
    state.data.lastProfileId = profileId
    persist()
  }

  function ensureWeeksForYear(profileId: string, isoYear: number): void {
    for (const ref of relevantIsoWeeks(state.data, profileId, isoYear)) {
      ensureWeek(profileId, ref)
    }
  }

  function setWeekContract(profileId: string, ref: IsoWeekRef, contractMinutes: number): void {
    const week = ensureWeek(profileId, ref)
    week.contractMinutes = Math.max(0, Math.round(contractMinutes))
    persist()
  }

  function setWeekVacation(profileId: string, ref: IsoWeekRef, isVacation: boolean): void {
    const week = ensureWeek(profileId, ref)
    // Het opgeslagen contract blijft altijd bewaard; bij vakantie is het
    // effectief 0 en bij het uitzetten geldt het bewaarde bedrag weer.
    week.isVacation = isVacation
    persist()
  }

  function addRegistration(profileId: string, changes: RegistrationChanges): Registration {
    const registration: Registration = {
      id: createId('registration'),
      profileId,
      date: changes.date,
      startTime: changes.startTime,
      endTime: changes.endTime,
    }
    state.data.registrations.push(registration)
    // De week krijgt zijn contract op het moment dat er voor het eerst iets in
    // die week wordt geregistreerd.
    ensureWeek(profileId, getIsoWeek(registration.date))
    persist()
    return registration
  }

  function updateRegistration(registrationId: string, changes: RegistrationChanges): Registration | null {
    const registration = state.data.registrations.find((item) => item.id === registrationId)
    if (!registration) return null

    registration.date = changes.date
    registration.startTime = changes.startTime
    registration.endTime = changes.endTime

    // Ook de (nieuwe) week moet bestaan, zodat verplaatste registraties in het
    // overzicht en in het saldo meetellen.
    ensureWeek(registration.profileId, getIsoWeek(registration.date))
    persist()
    return registration
  }

  function removeRegistration(registrationId: string): void {
    state.data.registrations = state.data.registrations.filter((registration) => registration.id !== registrationId)
    persist()
  }

  function markReminderSent(profileId: string, date: string): void {
    state.reminderLog = { ...state.reminderLog, [profileId]: date }
    saveReminderLog(state.reminderLog, storage)
  }

  function replaceData(data: AppData): void {
    state.data = data
    persist()
  }

  function reload(): void {
    const reloaded = loadAppData(storage)
    state.data = reloaded.data
    state.issues = [...reloaded.issues]
    state.storageAvailable = reloaded.storageAvailable
    state.reminderLog = loadReminderLog(storage)
  }

  return {
    state,
    activeProfile,
    setUsername: (username: string) => {
      state.data.username = username.trim()
      persist()
    },
    createProfile,
    updateProfile,
    deleteProfile,
    selectProfile,
    ensureWeek,
    ensureWeeksForYear,
    setWeekContract,
    setWeekVacation,
    addRegistration,
    updateRegistration,
    removeRegistration,
    markReminderSent,
    replaceData,
    reload,
  }
}

let singleton: AppStore | null = null

/** Geeft de app-brede store terug (één instantie per sessie). */
export function useAppStore(): AppStore {
  singleton ??= createAppStore()
  return singleton
}

/** Alleen voor tests: gooi de app-brede instantie weg. */
export function resetAppStoreForTests(): void {
  singleton = null
}

/** Sleutel van een week, handig voor lijsten en caching. */
export function weekKeyOf(week: Pick<WeekRecord, 'isoYear' | 'isoWeek'>): string {
  return isoWeekKey(week.isoYear, week.isoWeek)
}

/** Lege appdata, bijvoorbeeld voor een nieuwe start. */
export function emptyData(): AppData {
  return createEmptyData()
}
