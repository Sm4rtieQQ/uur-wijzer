import { beforeEach, describe, expect, it } from 'vitest'
import { accentInkFor, accentSoftFor, applyAccentColor } from './useTheme'

describe('accentSoftFor', () => {
  it('mengt het accent 90/10 met wit', () => {
    expect(accentSoftFor('#2563eb')).toBe('#3b73ed')
    expect(accentSoftFor('#000000')).toBe('#1a1a1a')
    expect(accentSoftFor('#ffffff')).toBe('#ffffff')
  })

  it('valt terug op wit bij ongeldige invoer', () => {
    expect(accentSoftFor('geen-kleur')).toBe('#ffffff')
    expect(accentSoftFor('')).toBe('#ffffff')
  })
})

describe('applyAccentColor', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty('--uw-accent')
    document.documentElement.style.removeProperty('--uw-accent-ink')
    document.documentElement.style.removeProperty('--uw-accent-soft')
  })

  it('zet accent, leesbare tekstkleur en zachte variant als tokens', () => {
    applyAccentColor('#ca8a04')

    const style = document.documentElement.style
    expect(style.getPropertyValue('--uw-accent')).toBe('#ca8a04')
    expect(style.getPropertyValue('--uw-accent-ink')).toBe(accentInkFor('#ca8a04'))
    expect(style.getPropertyValue('--uw-accent-soft')).toBe(accentSoftFor('#ca8a04'))
  })

  it('gebruikt de standaard accentkleur bij ongeldige invoer', () => {
    applyAccentColor('onzin')

    expect(document.documentElement.style.getPropertyValue('--uw-accent')).toBe('#2563eb')
  })
})
