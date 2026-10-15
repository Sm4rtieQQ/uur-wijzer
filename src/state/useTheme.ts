import { watchEffect } from 'vue'
import type { ThemeId } from '../domain/types'

/** Zet het thema op het document, zodat de CSS-tokens wisselen. */
export function applyTheme(theme: ThemeId, prefersDark: boolean): void {
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  if (typeof document !== 'undefined') {
    document.documentElement.dataset['theme'] = resolved
  }
}

/**
 * Houdt het thema van het actieve profiel bij, inclusief de systeemvoorkeur
 * wanneer het profielthema op `system` staat.
 */
export function useTheme(getTheme: () => ThemeId): void {
  const prefersDarkQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null

  watchEffect((onCleanup) => {
    if (!prefersDarkQuery) {
      applyTheme(getTheme(), false)
      return
    }

    const update = () => applyTheme(getTheme(), prefersDarkQuery.matches)
    update()
    prefersDarkQuery.addEventListener('change', update)
    onCleanup(() => prefersDarkQuery.removeEventListener('change', update))
  })
}
