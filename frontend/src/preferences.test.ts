import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  loadPreferences,
  parsePreferences,
  savePreferences,
} from './preferences'

describe('preferences', () => {
  beforeEach(() => localStorage.clear())

  it('uses defaults for missing or malformed values', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences('{not json')).toEqual(DEFAULT_PREFERENCES)
  })

  it('merges valid values and clamps unsafe ranges', () => {
    const value = parsePreferences(JSON.stringify({
      theme: 'solarized-light',
      fontSize: 99,
      lineHeight: 1,
      sidebarCollapsed: true,
    }))
    expect(value.theme).toBe('solarized-light')
    expect(value.fontSize).toBe(28)
    expect(value.lineHeight).toBe(1.35)
    expect(value.sidebarCollapsed).toBe(true)
    expect(value.contentWidth).toBe(DEFAULT_PREFERENCES.contentWidth)
  })

  it('round trips through localStorage', () => {
    const value = { ...DEFAULT_PREFERENCES, theme: 'light' as const, fontSize: 21 }
    savePreferences(value)
    expect(localStorage.getItem(PREFERENCES_KEY)).toContain('"fontSize":21')
    expect(loadPreferences()).toEqual(value)
  })
})
