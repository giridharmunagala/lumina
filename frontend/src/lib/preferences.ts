export type Theme =
  | 'system'
  | 'dark'
  | 'light'
  | 'sepia'
  | 'nord'
  | 'solarized-dark'
  | 'solarized-light'
export type FontFamily = 'serif' | 'sans' | 'mono'
export type SortOrder = 'recent' | 'name' | 'path'

export interface Preferences {
  theme: Theme
  fontFamily: FontFamily
  fontSize: number
  lineHeight: number
  contentWidth: number
  sidebarWidth: number
  sidebarCollapsed: boolean
  outlineVisible: boolean
  focusMode: boolean
  justifyText: boolean
  sort: SortOrder
  groupByFolder: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.7,
  contentWidth: 760,
  sidebarWidth: 320,
  sidebarCollapsed: false,
  outlineVisible: true,
  focusMode: false,
  justifyText: false,
  sort: 'recent',
  groupByFolder: false,
}

export const PREFERENCES_KEY = 'lumina.preferences.v1'

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Match system' },
  { value: 'dark', label: 'Midnight' },
  { value: 'light', label: 'Daylight' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'nord', label: 'Nord' },
  { value: 'solarized-dark', label: 'Solarized Dark' },
  { value: 'solarized-light', label: 'Solarized Light' },
]

export const SORT_ORDERS: { value: SortOrder; label: string }[] = [
  { value: 'recent', label: 'Recently updated' },
  { value: 'name', label: 'Title A–Z' },
  { value: 'path', label: 'Folder path' },
]

const themes = THEMES.map((item) => item.value)
const families: FontFamily[] = ['serif', 'sans', 'mono']
const orders = SORT_ORDERS.map((item) => item.value)

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return DEFAULT_PREFERENCES
  try {
    const input = JSON.parse(raw) as Partial<Preferences>
    return {
      theme: oneOf(input.theme, themes, DEFAULT_PREFERENCES.theme),
      fontFamily: oneOf(input.fontFamily, families, DEFAULT_PREFERENCES.fontFamily),
      fontSize: numberIn(input.fontSize, 14, 28, DEFAULT_PREFERENCES.fontSize),
      lineHeight: numberIn(input.lineHeight, 1.35, 2.1, DEFAULT_PREFERENCES.lineHeight),
      contentWidth: numberIn(input.contentWidth, 560, 1100, DEFAULT_PREFERENCES.contentWidth),
      sidebarWidth: numberIn(input.sidebarWidth, 240, 480, DEFAULT_PREFERENCES.sidebarWidth),
      sidebarCollapsed: boolean(input.sidebarCollapsed, DEFAULT_PREFERENCES.sidebarCollapsed),
      outlineVisible: boolean(input.outlineVisible, DEFAULT_PREFERENCES.outlineVisible),
      focusMode: boolean(input.focusMode, DEFAULT_PREFERENCES.focusMode),
      justifyText: boolean(input.justifyText, DEFAULT_PREFERENCES.justifyText),
      sort: oneOf(input.sort, orders, DEFAULT_PREFERENCES.sort),
      groupByFolder: boolean(input.groupByFolder, DEFAULT_PREFERENCES.groupByFolder),
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

/** Resolve the "system" theme against the current media query. */
export function resolveTheme(theme: Theme): Exclude<Theme, 'system'> {
  if (theme !== 'system') return theme
  const dark = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true
  return dark ? 'dark' : 'light'
}

export function fontStack(family: FontFamily): string {
  if (family === 'serif') return 'var(--font-serif)'
  return family === 'mono' ? 'var(--font-mono)' : 'var(--font-sans)'
}
