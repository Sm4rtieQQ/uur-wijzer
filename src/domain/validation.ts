import { compareIsoDates, isValidIsoDate, todayIsoDate } from './date'
import { elapsedMinutes, hoursToMinutes, isValidTimeOfDay } from './time'
import type { IsoWeekday, ThemeId, ValidationResult } from './types'

/** Invoer van het registratieformulier (alles als tekst uit formuliervelden). */
export interface RegistrationFormInput {
  date: string
  startTime: string
  endTime: string
}

/** Gevalideerde registratiegegevens. */
export interface ValidatedRegistration {
  date: string
  startTime: string
  endTime: string
}

/** Invoer van het profielformulier. */
export interface ProfileFormInput {
  name: string
  contractHours: string
  defaultStartTime: string
  defaultEndTime: string
  theme: ThemeId
}

/** Gevalideerde profielgegevens. */
export interface ValidatedProfile {
  name: string
  contractMinutes: number
  defaultStartTime: string
  defaultEndTime: string
  theme: ThemeId
}

const MAX_MINUTES_PER_WEEK = 7 * 24 * 60

/** Leest een getal met punt of komma als decimaalteken. */
function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (normalized === '') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

/** Valideert de invoer van een registratie met Nederlandse foutmeldingen. */
export function validateRegistrationInput(
  input: RegistrationFormInput,
  today: string = todayIsoDate(),
): ValidationResult<ValidatedRegistration> {
  const errors: Partial<Record<keyof RegistrationFormInput, string>> = {}

  const date = input.date.trim()
  if (date === '') {
    errors.date = 'Vul een datum in.'
  } else if (!isValidIsoDate(date)) {
    errors.date = 'Vul een geldige datum in (d-m-jjjj).'
  } else if (compareIsoDates(date, today) > 0) {
    errors.date = 'De datum mag niet in de toekomst liggen.'
  }

  const startTime = input.startTime.trim()
  const endTime = input.endTime.trim()
  if (!isValidTimeOfDay(startTime)) {
    errors.startTime = 'Vul een geldige starttijd in (HH:mm).'
  }
  if (!isValidTimeOfDay(endTime)) {
    errors.endTime = 'Vul een geldige eindtijd in (HH:mm).'
  }

  if (!errors.startTime && !errors.endTime && elapsedMinutes(startTime, endTime) === null) {
    errors.endTime =
      'De eindtijd moet later zijn dan de starttijd. Diensten over middernacht worden niet ondersteund.'
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      date,
      startTime,
      endTime,
    },
  }
}

/** Valideert de invoer van een nieuw of bestaand profiel. */
export function validateProfileInput(input: ProfileFormInput): ValidationResult<ValidatedProfile> {
  const errors: Partial<Record<keyof ProfileFormInput, string>> = {}

  const name = input.name.trim()
  if (name === '') {
    errors.name = 'Vul de naam van de werkgever in.'
  } else if (name.length > 80) {
    errors.name = 'De naam van de werkgever mag maximaal 80 tekens bevatten.'
  }

  const contractHours = parseDecimal(input.contractHours)
  let contractMinutes = 0
  if (contractHours === null) {
    errors.contractHours = 'Vul de contracturen per week in als getal (bijvoorbeeld 32 of 32,5).'
  } else if (contractHours < 0 || hoursToMinutes(contractHours) > MAX_MINUTES_PER_WEEK) {
    errors.contractHours = 'De contracturen moeten tussen 0 en 168 uur per week liggen.'
  } else {
    contractMinutes = hoursToMinutes(contractHours)
  }

  const defaultStartTime = input.defaultStartTime.trim()
  const defaultEndTime = input.defaultEndTime.trim()
  if (!isValidTimeOfDay(defaultStartTime)) {
    errors.defaultStartTime = 'Vul een geldige standaard starttijd in (HH:mm).'
  }
  if (!isValidTimeOfDay(defaultEndTime)) {
    errors.defaultEndTime = 'Vul een geldige standaard eindtijd in (HH:mm).'
  }

  if (!errors.defaultStartTime && !errors.defaultEndTime && elapsedMinutes(defaultStartTime, defaultEndTime) === null) {
    errors.defaultEndTime =
      'De standaard eindtijd moet later zijn dan de standaard starttijd. Diensten over middernacht worden niet ondersteund.'
  }

  if (input.theme !== 'light' && input.theme !== 'dark' && input.theme !== 'system') {
    errors.theme = 'Kies een geldig thema.'
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      name,
      contractMinutes,
      defaultStartTime,
      defaultEndTime,
      theme: input.theme,
    },
  }
}

/** Valideert een invoerveld met contracturen (in uren) voor één week. */
export function validateContractHours(value: string): ValidationResult<{ contractMinutes: number }> {
  const hours = parseDecimal(value)
  if (hours === null) {
    return { ok: false, errors: { contractHours: 'Vul de contracturen in als getal (bijvoorbeeld 32 of 32,5).' } }
  }
  const contractMinutes = hoursToMinutes(hours)
  if (hours < 0 || contractMinutes > MAX_MINUTES_PER_WEEK) {
    return { ok: false, errors: { contractHours: 'De contracturen moeten tussen 0 en 168 uur per week liggen.' } }
  }
  return { ok: true, value: { contractMinutes } }
}

/** Valideert herinneringsinstellingen; lege dagen zijn alleen toegestaan als herinneringen uit staan. */
export function validateReminderSettings(
  enabled: boolean,
  days: IsoWeekday[],
  time: string,
): ValidationResult<{ enabled: boolean; days: IsoWeekday[]; time: string }> {
  const errors: Partial<Record<'days' | 'time', string>> = {}
  const uniqueDays = [...new Set(days)].sort((a, b) => a - b)

  if (enabled && uniqueDays.length === 0) {
    errors.days = 'Kies minimaal één dag voor de herinnering.'
  }
  if (!isValidTimeOfDay(time)) {
    errors.time = 'Vul een geldige herinneringstijd in (HH:mm).'
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }
  return { ok: true, value: { enabled, days: uniqueDays, time } }
}
