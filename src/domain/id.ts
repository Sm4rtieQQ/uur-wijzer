/** Maakt een redelijk unieke identifier, bruikbaar als sleutel in de opslag. */
export function createId(prefix: string): string {
  const globalCrypto = typeof globalThis.crypto === 'object' ? globalThis.crypto : undefined
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return `${prefix}-${globalCrypto.randomUUID()}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
