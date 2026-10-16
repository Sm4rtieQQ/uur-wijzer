import { watchEffect } from 'vue'
import { DEFAULT_ACCENT_COLOR } from '../domain/defaults'
import type { ThemeId } from '../domain/types'

/** Zet het thema op het document, zodat de CSS-tokens wisselen. */
export function applyTheme(theme: ThemeId, prefersDark: boolean): void {
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  if (typeof document !== 'undefined') {
    document.documentElement.dataset['theme'] = resolved
  }
}

/** Zet een hexkleur (`#rrggbb`) om naar RGB-kanalen; `null` bij ongeldige invoer. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match || !match[1]) return null
  const value = Number.parseInt(match[1], 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

/**
 * Kiest leesbare tekstkleur (licht of donker) bij een accentkleur, op basis van
 * de relatieve luminantie (WCAG-benadering).
 */
export function accentInkFor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#ffffff'
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0)
  return luminance > 0.179 ? '#0a0b0d' : '#ffffff'
}

/**
 * Zachte variant van de accentkleur: 90% accent gemengd met 10% wit.
 * Wordt gebruikt voor het klokdecor in de header, dat op de accentkleur zelf
 * staat. Onbekende invoer geeft wit (net als `accentInkFor`).
 */
export function accentSoftFor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#ffffff'
  const toHex = (channel: number): string =>
    Math.round(channel * 0.9 + 255 * 0.1)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

/** Past de accentkleur van het actieve profiel toe via de design tokens. */
export function applyAccentColor(hex: string): void {
  if (typeof document === 'undefined') return
  const color = hexToRgb(hex) ? hex.trim() : DEFAULT_ACCENT_COLOR
  const root = document.documentElement.style
  root.setProperty('--uw-accent', color)
  root.setProperty('--uw-accent-ink', accentInkFor(color))
  root.setProperty('--uw-accent-soft', accentSoftFor(color))
}

/**
 * Houdt het app-thema en de accentkleur van het actieve profiel bij, inclusief
 * de systeemvoorkeur wanneer het thema op `system` staat.
 */
export function useTheme(getTheme: () => ThemeId, getAccentColor: () => string): void {
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

  watchEffect(() => applyAccentColor(getAccentColor()))
}
