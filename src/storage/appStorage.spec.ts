import { describe, expect, it } from 'vitest'
import {
  STORAGE_BACKUP_KEY,
  STORAGE_KEY,
  getDefaultStorage,
  loadAppData,
  loadReminderLog,
  saveAppData,
  saveReminderLog,
  serializeAppData,
  type StorageLike,
} from './appStorage'
import { createEmptyData } from './parseStoredData'
import { SCHEMA_VERSION, type AppData, type Profile } from '../domain/types'

/** Eenvoudige in-memory opslag voor tests. */
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

  raw(key: string): string | null {
    return this.values.get(key) ?? null
  }
}

/** Opslag die bij elke actie een fout gooit. */
class FailingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error('niet beschikbaar')
  }

  setItem(): void {
    throw new Error('vol')
  }

  removeItem(): void {
    throw new Error('niet beschikbaar')
  }
}

function createProfile(): Profile {
  return {
    id: 'p1',
    name: 'Bakkerij Jansen',
    contractMinutes: 1920,
    defaultStartTime: '08:00',
    defaultEndTime: '16:30',
    accentColor: '#2563eb',
    reminders: { enabled: false, days: [], time: '09:00' },
  }
}

function createData(): AppData {
  return { ...createEmptyData(), username: 'Martin', profiles: [createProfile()], lastProfileId: 'p1' }
}

describe('loadAppData', () => {
  it('leest opgeslagen gegevens terug', () => {
    const storage = new MemoryStorage()
    saveAppData(createData(), storage)

    const result = loadAppData(storage)
    expect(result.storageAvailable).toBe(true)
    expect(result.data.username).toBe('Martin')
    expect(result.data.profiles[0]?.name).toBe('Bakkerij Jansen')
    expect(result.issues).toEqual([])
  })

  it('bewaart het app-thema', () => {
    const storage = new MemoryStorage()
    saveAppData({ ...createData(), theme: 'dark' }, storage)

    expect(loadAppData(storage).data.theme).toBe('dark')
  })

  it('meldt een ontbrekende opslag zonder crash', () => {
    const result = loadAppData(null)
    expect(result.storageAvailable).toBe(false)
    expect(result.data.profiles).toEqual([])
    expect(result.issues[0]).toContain('geen lokale opslag')
  })

  it('meldt een onleesbare opslag zonder crash', () => {
    const result = loadAppData(new FailingStorage())
    expect(result.storageAvailable).toBe(false)
    expect(result.issues[0]).toContain('kon niet worden gelezen')
  })

  it('maakt een reservekopie van onleesbare data in plaats van deze te overschrijven', () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, '{kapot')

    const result = loadAppData(storage)
    expect(result.hasUsableData).toBe(false)
    expect(storage.raw(STORAGE_KEY)).toBe('{kapot')
    expect(storage.raw(STORAGE_BACKUP_KEY)).toBe('{kapot')
  })

  it('geeft aan wanneer er nog geen gegevens zijn', () => {
    const result = loadAppData(new MemoryStorage())
    expect(result.hasUsableData).toBe(false)
    expect(result.storageAvailable).toBe(true)
  })

  it('meldt een mislukte opslagpoging zonder crash', () => {
    expect(saveAppData(createData(), null)).toBe(false)
    expect(saveAppData(createData(), new FailingStorage())).toBe(false)
    expect(saveAppData(createData(), new MemoryStorage())).toBe(true)
  })

  it('vindt in een browseromgeving localStorage', () => {
    expect(getDefaultStorage()).not.toBeNull()
  })
})

describe('serializeAppData', () => {
  it('schrijft de huidige schemaversie weg', () => {
    const serialized = serializeAppData({ ...createData(), schemaVersion: 0 })
    expect(JSON.parse(serialized).schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('is rondgaand te lezen', () => {
    const data = createData()
    const parsed = loadAppData(new MemoryStorage())
    expect(parsed.data.schemaVersion).toBe(SCHEMA_VERSION)
    const storage = new MemoryStorage()
    saveAppData(data, storage)
    const reloaded = loadAppData(storage)
    expect(reloaded.data).toEqual({ ...data, schemaVersion: SCHEMA_VERSION })
  })
})

describe('herinneringslog', () => {
  it('bewaart en leest de administratie', () => {
    const storage = new MemoryStorage()
    expect(loadReminderLog(storage)).toEqual({})

    saveReminderLog({ p1: '2026-10-15' }, storage)
    expect(loadReminderLog(storage)).toEqual({ p1: '2026-10-15' })
  })

  it('negeert onbruikbare inhoud', () => {
    const storage = new MemoryStorage()
    storage.setItem('uurwijzer:reminders', '[1,2]')
    expect(loadReminderLog(storage)).toEqual({})

    storage.setItem('uurwijzer:reminders', '{kapot')
    expect(loadReminderLog(storage)).toEqual({})

    expect(loadReminderLog(null)).toEqual({})
    saveReminderLog({ p1: '2026-10-15' }, null)
  })
})
