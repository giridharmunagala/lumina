export type Theme = 'dark' | 'light' | 'solarized-dark' | 'solarized-light'
export type FontFamily = 'serif' | 'sans' | 'mono'

export interface Preferences {
  theme: Theme
  fontFamily: FontFamily
  fontSize: number
  lineHeight: number
  contentWidth: number
  sidebarWidth: number
  sidebarCollapsed: boolean
  outlineVisible: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.7,
  contentWidth: 760,
  sidebarWidth: 320,
  sidebarCollapsed: false,
  outlineVisible: true,
}

export const PREFERENCES_KEY = 'lumina.preferences.v1'

const themes: Theme[] = ['dark', 'light', 'solarized-dark', 'solarized-light']
const families: FontFamily[] = ['serif', 'sans', 'mono']

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return DEFAULT_PREFERENCES
  try {
    const input = JSON.parse(raw) as Partial<Preferences>
    return {
      theme: themes.includes(input.theme as Theme) ? (input.theme as Theme) : DEFAULT_PREFERENCES.theme,
      fontFamily: families.includes(input.fontFamily as FontFamily)
        ? (input.fontFamily as FontFamily)
        : DEFAULT_PREFERENCES.fontFamily,
      fontSize: numberIn(input.fontSize, 14, 28, DEFAULT_PREFERENCES.fontSize),
      lineHeight: numberIn(input.lineHeight, 1.35, 2.1, DEFAULT_PREFERENCES.lineHeight),
      contentWidth: numberIn(input.contentWidth, 560, 1100, DEFAULT_PREFERENCES.contentWidth),
      sidebarWidth: numberIn(input.sidebarWidth, 240, 480, DEFAULT_PREFERENCES.sidebarWidth),
      sidebarCollapsed:
        typeof input.sidebarCollapsed === 'boolean'
          ? input.sidebarCollapsed
          : DEFAULT_PREFERENCES.sidebarCollapsed,
      outlineVisible:
        typeof input.outlineVisible === 'boolean'
          ? input.outlineVisible
          : DEFAULT_PREFERENCES.outlineVisible,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function loadPreferences(): Preferences {
  return parsePreferences(localStorage.getItem(PREFERENCES_KEY))
}

export function savePreferences(preferences: Preferences): void {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
}
