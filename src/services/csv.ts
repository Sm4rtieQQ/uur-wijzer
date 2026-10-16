import { formatDateDutch, isValidIsoDate } from '../domain/date'
import { DEFAULT_ACCENT_COLOR } from '../domain/defaults'
import { getIsoWeek, isValidIsoWeek } from '../domain/isoWeek'
import { elapsedMinutes, isValidTimeOfDay, minutesToHours } from '../domain/time'
import { SCHEMA_VERSION, type AppData, type IsoWeekday, type Profile, type Registration, type ThemeId, type WeekRecord } from '../domain/types'
import {
  findOverlappingRegistration,
  validateContractHours,
  validateProfileInput,
  validateReminderSettings,
  validateSickHours,
} from '../domain/validation'

/**
 * CSV-formaat van UurWijzer.
 *
 * - Eén bestand bevat alle profielen met hun weekgegevens en registraties.
 * - UTF-8 met BOM, scheidingsteken `,`, RFC 4180-quoting, CRLF-regeleinden.
 * - Elke rij heeft een `record`-kolom: `meta`, `profile`, `week` of `registration`.
 * - Getallen met decimalen gebruiken een punt (bijvoorbeeld 32.5).
 * - Herinneringsdagen staan als `1|3|5` (ISO-weekdagen, 1 = maandag).
 * - `theme` (app-thema) staat in de meta-rij; `accent_color` per profiel en
 *   `sick_hours` per week. Kolommen van vóór schemaversie 3 (`accent_color`,
 *   `sick_hours`, `theme` in de meta-rij) zijn optioneel bij het importeren.
 */
export const CSV_COLUMNS = [
  'record',
  'schema_version',
  'username',
  'profile_id',
  'profile_name',
  'contract_hours',
  'default_start_time',
  'default_end_time',
  'accent_color',
  'theme',
  'reminders_enabled',
  'reminder_days',
  'reminder_time',
  'iso_year',
  'iso_week',
  'week_contract_hours',
  'is_vacation',
  'sick_hours',
  'registration_id',
  'date',
  'start_time',
  'end_time',
] as const

/** Kolommen die meegaan vanaf schemaversie 3; ontbreken is toegestaan (defaults). */
export const OPTIONAL_CSV_COLUMNS = ['accent_color', 'sick_hours'] as const

export type CsvColumn = (typeof CSV_COLUMNS)[number]
type CsvRow = Partial<Record<CsvColumn, string>>

/** Samenvatting van een geslaagde import. */
export interface CsvImportSummary {
  importedProfiles: string[]
  skippedProfiles: string[]
  importedRegistrations: number
  skippedRegistrations: number
  importedWeeks: number
  skippedWeeks: number
  username: string
  warnings: string[]
}

/** Uitkomst van een CSV-import. */
export type CsvImportResult =
  | { ok: true; data: AppData; summary: CsvImportSummary }
  | { ok: false; errors: string[] }

const MAX_ERRORS = 25

function formatHours(minutes: number): string {
  const hours = minutesToHours(minutes)
  return String(hours)
}

function isoDaysToString(days: IsoWeekday[]): string {
  return days.join('|')
}

function escapeField(value: string): string {
  if (/[",\r\n]/.test(value) || value !== value.trim()) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

function toLine(row: CsvRow): string {
  return CSV_COLUMNS.map((column) => escapeField(row[column] ?? '')).join(',')
}

/** Maakt één CSV-bestand met alle profielen, weekgegevens en registraties. */
export function exportToCsv(data: Pick<AppData, 'username' | 'theme' | 'profiles' | 'registrations' | 'weeks'>): string {
  const lines: string[] = []
  lines.push(CSV_COLUMNS.join(','))
  lines.push(
    toLine({ record: 'meta', schema_version: String(SCHEMA_VERSION), username: data.username, theme: data.theme }),
  )

  for (const profile of data.profiles) {
    lines.push(
      toLine({
        record: 'profile',
        profile_id: profile.id,
        profile_name: profile.name,
        contract_hours: formatHours(profile.contractMinutes),
        default_start_time: profile.defaultStartTime,
        default_end_time: profile.defaultEndTime,
        accent_color: profile.accentColor,
        reminders_enabled: profile.reminders.enabled ? 'true' : 'false',
        reminder_days: isoDaysToString(profile.reminders.days),
        reminder_time: profile.reminders.time,
      }),
    )

    // Alleen weken met eigen informatie worden bewaard: vakantie, ziekte-uren
    // of een weekcontract dat afwijkt van het profielcontract.
    for (const week of data.weeks) {
      if (week.profileId !== profile.id) continue
      if (!week.isVacation && week.sickMinutes === 0 && week.contractMinutes === profile.contractMinutes) continue
      lines.push(
        toLine({
          record: 'week',
          profile_id: profile.id,
          iso_year: String(week.isoYear),
          iso_week: String(week.isoWeek),
          week_contract_hours: formatHours(week.contractMinutes),
          is_vacation: week.isVacation ? 'true' : 'false',
          sick_hours: formatHours(week.sickMinutes),
        }),
      )
    }

    for (const registration of data.registrations) {
      if (registration.profileId !== profile.id) continue
      lines.push(
        toLine({
          record: 'registration',
          profile_id: profile.id,
          registration_id: registration.id,
          date: registration.date,
          start_time: registration.startTime,
          end_time: registration.endTime,
        }),
      )
    }
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`
}

/** Leest CSV-tekst en geeft de rijen met velden terug (RFC 4180). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let index = 0

  const content = text.startsWith('\uFEFF') ? text.slice(1) : text

  while (index < content.length) {
    const char = content[index] ?? ''

    if (inQuotes) {
      if (char === '"') {
        if (content[index + 1] === '"') {
          field += '"'
          index += 2
          continue
        }
        inQuotes = false
        index += 1
        continue
      }
      field += char
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      index += 1
      continue
    }
    if (char === ',') {
      row.push(field)
      field = ''
      index += 1
      continue
    }
    if (char === '\r' && content[index + 1] === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      index += 2
      continue
    }
    if (char === '\n' || char === '\r') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      index += 1
      continue
    }

    field += char
    index += 1
  }

  // Laatste veld/rij toevoegen als het bestand niet met een regeleinde eindigt.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((current) => !(current.length === 1 && (current[0] ?? '').trim() === ''))
}

function parseBooleanField(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()
  if (['true', 'ja', '1'].includes(normalized)) return true
  if (['false', 'nee', '0', ''].includes(normalized)) return false
  return null
}

function collectDuplicates(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

/**
 * Leest een exportbestand in en past het pas toe als het hele bestand geldig is.
 *
 * - Profielen met een bestaande id worden overgeslagen, inclusief hun weken en registraties.
 * - Registraties en weken met een bestaande sleutel worden overgeslagen.
 * - Onbekende rijtypen worden genegeerd (met een waarschuwing) voor toekomstige versies.
 */
export function importFromCsv(text: string, existing: AppData): CsvImportResult {
  const rows = parseCsv(text)
  const errors: string[] = []
  const warnings: string[] = []

  if (rows.length === 0) {
    return { ok: false, errors: ['Het bestand is leeg.'] }
  }

  const header = (rows[0] ?? []).map((column) => column.trim())
  const columnIndex = new Map<CsvColumn, number>()
  for (const column of CSV_COLUMNS) {
    const index = header.indexOf(column)
    if (index >= 0) columnIndex.set(column, index)
  }

  const missingColumns = CSV_COLUMNS.filter(
    (column) => !(OPTIONAL_CSV_COLUMNS as readonly string[]).includes(column) && !columnIndex.has(column),
  )
  if (missingColumns.length > 0) {
    return {
      ok: false,
      errors: [`Het bestand mist de volgende kolommen: ${missingColumns.join(', ')}.`],
    }
  }

  const valueOf = (row: string[], column: CsvColumn): string => {
    const index = columnIndex.get(column)
    return index === undefined ? '' : (row[index] ?? '')
  }

  // Kolommen van oudere versies met pauzegegevens; die worden niet meer
  // ondersteund. Als er daadwerkelijk pauzetijden in staan, melden we dat.
  const legacyBreakColumns = ['break_minutes', 'default_break_minutes']
    .map((column) => header.indexOf(column))
    .filter((index) => index >= 0)
  const hasLegacyBreakValues =
    legacyBreakColumns.length > 0 &&
    rows.slice(1).some((row) =>
      legacyBreakColumns.some((index) => {
        const value = Number((row[index] ?? '').trim())
        return Number.isFinite(value) && value > 0
      }),
    )
  if (hasLegacyBreakValues) {
    warnings.push(
      'De pauzegegevens in het bestand zijn overgeslagen: pauze wordt niet meer ondersteund. Gewerkte tijd is de volledige tijd tussen start en eind.',
    )
  }

  // Vóór schemaversie 3 stond het thema op elke profielrij. Dat veld is nu
  // app-breed; gevulde waarden melden we zodat niets stil verdwijnt.
  const themeIndex = columnIndex.get('theme')
  const recordIndex = columnIndex.get('record')
  const hasLegacyProfileTheme =
    themeIndex !== undefined &&
    recordIndex !== undefined &&
    rows.slice(1).some((row) => (row[recordIndex] ?? '').trim() === 'profile' && (row[themeIndex] ?? '').trim() !== '')
  if (hasLegacyProfileTheme) {
    warnings.push(
      'Het thema stond voorheen per profiel; het is nu een app-brede instelling en is niet uit dit bestand overgenomen.',
    )
  }

  let schemaVersion = SCHEMA_VERSION
  let usernameFromFile: string | null = null
  let themeFromFile: ThemeId | null = null
  const newProfiles: Profile[] = []
  const newWeeks: WeekRecord[] = []
  const newRegistrations: Registration[] = []

  const profileRowIds: string[] = []
  const parsedProfiles: Array<{ profile: Profile; rowNumber: number }> = []

  interface WeekRow {
    profileId: string
    isoYear: number
    isoWeek: number
    contractMinutes: number
    isVacation: boolean
    sickMinutes: number
    rowNumber: number
  }
  interface RegistrationRow {
    registration: Registration
    rowNumber: number
  }
  const weekRows: WeekRow[] = []
  const registrationRows: RegistrationRow[] = []

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? []
    const rowNumber = rowIndex + 1
    const recordType = valueOf(row, 'record').trim()

    if (recordType === '' ) continue

    if (recordType === 'meta') {
      const version = Number(valueOf(row, 'schema_version'))
      if (Number.isInteger(version) && version > 0) schemaVersion = version
      const username = valueOf(row, 'username')
      if (username.trim() !== '') usernameFromFile = username.trim()
      const theme = valueOf(row, 'theme').trim()
      if (theme === 'light' || theme === 'dark' || theme === 'system') themeFromFile = theme
      continue
    }

    if (recordType === 'profile') {
      const profileId = valueOf(row, 'profile_id').trim()
      profileRowIds.push(profileId)

      const contractHours = valueOf(row, 'contract_hours').trim()
      // De accentkleur is optioneel in oudere bestanden; leeg betekent standaard.
      const accentColor = valueOf(row, 'accent_color').trim() || DEFAULT_ACCENT_COLOR
      const validation = validateProfileInput({
        name: valueOf(row, 'profile_name'),
        contractHours,
        defaultStartTime: valueOf(row, 'default_start_time').trim(),
        defaultEndTime: valueOf(row, 'default_end_time').trim(),
        accentColor,
      })

      if (profileId === '') {
        errors.push(`Regel ${rowNumber}: profiel zonder profiel_id.`)
        continue
      }
      if (!validation.ok) {
        errors.push(`Regel ${rowNumber}: ongeldig profiel. ${Object.values(validation.errors).join(' ')}`)
        continue
      }

      const remindersEnabled = parseBooleanField(valueOf(row, 'reminders_enabled'))
      if (remindersEnabled === null) {
        errors.push(`Regel ${rowNumber}: reminders_enabled moet true of false zijn.`)
        continue
      }
      const reminderDays = valueOf(row, 'reminder_days')
        .split('|')
        .map((day) => day.trim())
        .filter((day) => day !== '')
        .map((day) => Number(day))
        .filter((day): day is IsoWeekday => Number.isInteger(day) && day >= 1 && day <= 7)

      const reminderValidation = validateReminderSettings(
        remindersEnabled,
        reminderDays,
        valueOf(row, 'reminder_time').trim(),
      )
      if (!reminderValidation.ok) {
        errors.push(`Regel ${rowNumber}: ongeldige herinneringsinstellingen. ${Object.values(reminderValidation.errors).join(' ')}`)
        continue
      }

      parsedProfiles.push({
        rowNumber,
        profile: {
          id: profileId,
          name: validation.value.name,
          contractMinutes: validation.value.contractMinutes,
          defaultStartTime: validation.value.defaultStartTime,
          defaultEndTime: validation.value.defaultEndTime,
          accentColor: validation.value.accentColor,
          reminders: {
            enabled: remindersEnabled,
            days: reminderValidation.value.days as IsoWeekday[],
            time: reminderValidation.value.time,
          },
        },
      })
      continue
    }

    if (recordType === 'week') {
      const profileId = valueOf(row, 'profile_id').trim()
      const isoYear = Number(valueOf(row, 'iso_year'))
      const isoWeek = Number(valueOf(row, 'iso_week'))
      const contractHours = valueOf(row, 'week_contract_hours').trim()
      const isVacation = parseBooleanField(valueOf(row, 'is_vacation'))
      // Ziekte-uren zijn optioneel in oudere bestanden; leeg betekent 0.
      const sickHours = valueOf(row, 'sick_hours').trim() || '0'

      if (profileId === '') {
        errors.push(`Regel ${rowNumber}: weekgegevens zonder profiel_id.`)
        continue
      }
      if (!isValidIsoWeek(isoYear, isoWeek)) {
        errors.push(`Regel ${rowNumber}: ongeldige ISO-week (${valueOf(row, 'iso_year')}-${valueOf(row, 'iso_week')}).`)
        continue
      }
      const contract = validateContractHours(contractHours)
      if (!contract.ok) {
        errors.push(`Regel ${rowNumber}: ongeldige weekcontracturen (${contractHours}).`)
        continue
      }
      if (isVacation === null) {
        errors.push(`Regel ${rowNumber}: is_vacation moet true of false zijn.`)
        continue
      }
      const sick = validateSickHours(sickHours)
      if (!sick.ok) {
        errors.push(`Regel ${rowNumber}: ongeldige ziekte-uren (${sickHours}).`)
        continue
      }

      weekRows.push({
        profileId,
        isoYear,
        isoWeek,
        contractMinutes: contract.value.contractMinutes,
        isVacation,
        sickMinutes: sick.value.sickMinutes,
        rowNumber,
      })
      continue
    }

    if (recordType === 'registration') {
      const profileId = valueOf(row, 'profile_id').trim()
      const registrationId = valueOf(row, 'registration_id').trim()
      const date = valueOf(row, 'date').trim()
      const startTime = valueOf(row, 'start_time').trim()
      const endTime = valueOf(row, 'end_time').trim()

      if (profileId === '' || registrationId === '') {
        errors.push(`Regel ${rowNumber}: registratie zonder profiel_id of registration_id.`)
        continue
      }
      if (!isValidIsoDate(date)) {
        errors.push(`Regel ${rowNumber}: ongeldige datum (${valueOf(row, 'date')}).`)
        continue
      }
      if (!isValidTimeOfDay(startTime) || !isValidTimeOfDay(endTime)) {
        errors.push(`Regel ${rowNumber}: ongeldige tijden (${startTime}–${endTime}).`)
        continue
      }
      if (elapsedMinutes(startTime, endTime) === null) {
        errors.push(`Regel ${rowNumber}: eindtijd moet later zijn dan starttijd (diensten over middernacht worden niet ondersteund).`)
        continue
      }

      registrationRows.push({
        rowNumber,
        registration: { id: registrationId, profileId, date, startTime, endTime },
      })
      continue
    }

    warnings.push(`Regel ${rowNumber}: onbekend rijtype "${recordType}" is genegeerd.`)
  }

  if (schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        `Het bestand is gemaakt met een nieuwere versie van UurWijzer (schemaversie ${schemaVersion}); deze app ondersteunt versie ${SCHEMA_VERSION}.`,
      ],
    }
  }

  const duplicateProfileIds = [...collectDuplicates(profileRowIds)]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
  if (duplicateProfileIds.length > 0) {
    return { ok: false, errors: [`Dubbel profiel_id in het bestand: ${duplicateProfileIds.join(', ')}.`] }
  }
  const duplicateRegistrationIds = [
    ...collectDuplicates(registrationRows.map((item) => item.registration.id)).entries(),
  ]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
  if (duplicateRegistrationIds.length > 0) {
    return { ok: false, errors: [`Dubbel registration_id in het bestand: ${duplicateRegistrationIds.join(', ')}.`] }
  }

  if (errors.length > 0) {
    const shown = errors.slice(0, MAX_ERRORS)
    const rest = errors.length - shown.length
    return {
      ok: false,
      errors: rest > 0 ? [...shown, `En nog ${rest} andere fouten.`] : shown,
    }
  }

  // Vanaf hier is het bestand geldig; er worden geen gegevens half toegepast.
  const existingProfileIds = new Set(existing.profiles.map((profile) => profile.id))
  const skippedProfiles: string[] = []
  const skippedProfileIds = new Set<string>()
  const importedProfileIds = new Set<string>()

  for (const { profile } of parsedProfiles) {
    if (existingProfileIds.has(profile.id)) {
      skippedProfiles.push(profile.name)
      skippedProfileIds.add(profile.id)
      continue
    }
    newProfiles.push(profile)
    importedProfileIds.add(profile.id)
  }

  const knownProfileIds = new Set([...existingProfileIds, ...importedProfileIds])

  for (const row of weekRows) {
    if (!knownProfileIds.has(row.profileId)) {
      errors.push(`Regel ${row.rowNumber}: weekgegevens horen bij een onbekend profiel (${row.profileId}).`)
      continue
    }
    if (skippedProfileIds.has(row.profileId)) continue
    const exists =
      existing.weeks.some(
        (week) =>
          week.profileId === row.profileId && week.isoYear === row.isoYear && week.isoWeek === row.isoWeek,
      ) || newWeeks.some((week) => week.profileId === row.profileId && week.isoYear === row.isoYear && week.isoWeek === row.isoWeek)
    if (exists) continue
    newWeeks.push({
      profileId: row.profileId,
      isoYear: row.isoYear,
      isoWeek: row.isoWeek,
      contractMinutes: row.contractMinutes,
      isVacation: row.isVacation,
      sickMinutes: row.sickMinutes,
    })
  }

  const existingRegistrationIds = new Set(existing.registrations.map((registration) => registration.id))
  const newRegistrationIds = new Set<string>()
  // Alle registraties die na deze import voor een profiel gelden; hiertegen
  // wordt op overlap gecontroleerd (bestaand + al geaccepteerd in dit bestand).
  const acceptedRegistrations: Registration[] = [...existing.registrations]

  for (const { registration, rowNumber } of registrationRows) {
    if (!knownProfileIds.has(registration.profileId)) {
      errors.push(`Regel ${rowNumber}: registratie hoort bij een onbekend profiel (${registration.profileId}).`)
      continue
    }
    if (skippedProfileIds.has(registration.profileId)) continue
    if (existingRegistrationIds.has(registration.id) || newRegistrationIds.has(registration.id)) continue

    const overlap = findOverlappingRegistration(registration.date, registration.startTime, registration.endTime, {
      existingRegistrations: acceptedRegistrations.filter((item) => item.profileId === registration.profileId),
    })
    if (overlap) {
      errors.push(
        `Regel ${rowNumber}: deze registratie overlapt met een registratie van ${overlap.startTime} tot ` +
          `${overlap.endTime} op ${formatDateDutch(overlap.date)}.`,
      )
      continue
    }

    newRegistrationIds.add(registration.id)
    newRegistrations.push(registration)
    acceptedRegistrations.push(registration)
  }

  if (errors.length > 0) {
    const shown = errors.slice(0, MAX_ERRORS)
    const rest = errors.length - shown.length
    return {
      ok: false,
      errors: rest > 0 ? [...shown, `En nog ${rest} andere fouten.`] : shown,
    }
  }

  const importedWeeks = [...newWeeks]
  for (const registration of newRegistrations) {
    const profile = newProfiles.find((item) => item.id === registration.profileId)
    if (!profile) continue
    const weekOfRegistration = getIsoWeek(registration.date)
    const exists = importedWeeks.some(
      (week) =>
        week.profileId === registration.profileId &&
        week.isoYear === weekOfRegistration.isoYear &&
        week.isoWeek === weekOfRegistration.isoWeek,
    )
    if (exists) continue
    importedWeeks.push({
      profileId: registration.profileId,
      isoYear: weekOfRegistration.isoYear,
      isoWeek: weekOfRegistration.isoWeek,
      contractMinutes: profile.contractMinutes,
      isVacation: false,
      sickMinutes: 0,
    })
  }

  const username =
    existing.username.trim() !== '' ? existing.username : (usernameFromFile ?? existing.username)
  if (usernameFromFile !== null && existing.username.trim() !== '' && usernameFromFile !== existing.username) {
    warnings.push(
      `De gebruikersnaam in het bestand ("${usernameFromFile}") is niet overgenomen omdat er al een gebruikersnaam is ingesteld.`,
    )
  }

  const skippedRegistrationRows = registrationRows.length - newRegistrations.length
  const skippedWeekRows = weekRows.length - newWeeks.length

  return {
    ok: true,
    data: {
      schemaVersion: SCHEMA_VERSION,
      username,
      theme: themeFromFile ?? existing.theme,
      profiles: [...existing.profiles, ...newProfiles],
      registrations: [...existing.registrations, ...newRegistrations],
      weeks: [...existing.weeks, ...importedWeeks],
      lastProfileId: existing.lastProfileId,
    },
    summary: {
      importedProfiles: newProfiles.map((profile) => profile.name),
      skippedProfiles,
      importedRegistrations: newRegistrations.length,
      skippedRegistrations: skippedRegistrationRows,
      importedWeeks: importedWeeks.length,
      skippedWeeks: skippedWeekRows,
      username,
      warnings,
    },
  }
}
