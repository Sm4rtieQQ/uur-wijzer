import { SCHEMA_VERSION, type AppData } from '../domain/types'
import { createEmptyData, parseStoredData, type ParsedStoredData } from './parseStoredData'

/** Sleutel waaronder de appdata in localStorage staat. */
export const STORAGE_KEY = 'uurwijzer:data'

/** Sleutel voor een veilige kopie van onleesbare data. */
export const STORAGE_BACKUP_KEY = 'uurwijzer:data:backup'

/** Sleutel voor administratie van verstuurde herinneringen. */
export const REMINDER_LOG_KEY = 'uurwijzer:reminders'

/** Minimale opslaginterface, zodat tests zonder browser kunnen draaien. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Resultaat van het laden van appdata. */
export interface LoadAppDataResult extends ParsedStoredData {
  /** Is er een bruikbare opslag beschikbaar (localStorage)? */
  storageAvailable: boolean
}

/** Geeft localStorage terug als die beschikbaar en bruikbaar is. */
export function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

/** Serialiseert appdata naar JSON met de huidige schemaversie. */
export function serializeAppData(data: AppData): string {
  return JSON.stringify({ ...data, schemaVersion: SCHEMA_VERSION })
}

/**
 * Laadt de appdata uit de opslag.
 *
 * Onleesbare data wordt niet overschreven maar veiliggesteld onder
 * `STORAGE_BACKUP_KEY`, zodat er geen gegevens stilzwijgend verdwijnen.
 */
export function loadAppData(storage: StorageLike | null = getDefaultStorage()): LoadAppDataResult {
  if (!storage) {
    return {
      data: createEmptyData(),
      issues: ['Er is geen lokale opslag beschikbaar. Gegevens kunnen niet worden bewaard.'],
      hasUsableData: false,
      storageAvailable: false,
    }
  }

  let raw: string | null = null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return {
      data: createEmptyData(),
      issues: ['De lokale opslag kon niet worden gelezen.'],
      hasUsableData: false,
      storageAvailable: false,
    }
  }

  const parsed = parseStoredData(raw)

  if (raw !== null && !parsed.hasUsableData) {
    try {
      storage.setItem(STORAGE_BACKUP_KEY, raw)
    } catch {
      // Het maken van een reservekopie mag nooit tot een crash leiden.
    }
  }

  return { ...parsed, storageAvailable: true }
}

/** Schrijft de appdata naar de opslag. Geeft aan of het opslaan gelukt is. */
export function saveAppData(data: AppData, storage: StorageLike | null = getDefaultStorage()): boolean {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, serializeAppData(data))
    return true
  } catch {
    return false
  }
}

/** Leest de administratie van verstuurde herinneringen (profiel-id → datum). */
export function loadReminderLog(storage: StorageLike | null = getDefaultStorage()): Record<string, string> {
  if (!storage) return {}
  try {
    const raw = storage.getItem(REMINDER_LOG_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const log: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') log[key] = value
    }
    return log
  } catch {
    return {}
  }
}

/** Bewaart de administratie van verstuurde herinneringen. */
export function saveReminderLog(
  log: Record<string, string>,
  storage: StorageLike | null = getDefaultStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(REMINDER_LOG_KEY, JSON.stringify(log))
  } catch {
    // Niet kunnen opslaan van herinneringslog mag de app niet blokkeren.
  }
}
