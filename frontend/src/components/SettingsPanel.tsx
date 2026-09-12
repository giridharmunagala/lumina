import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import {
  DEFAULT_PREFERENCES,
  type FontFamily,
  type Preferences,
  THEMES,
  type Theme,
} from '../lib/preferences'

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <label>
      <span className="range-title">
        <span>{label}</span>
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="switch-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

export function SettingsPanel({
  value,
  onChange,
  onClose,
}: {
  value: Preferences
  onChange: (next: Preferences) => void
  onClose: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const set = <K extends keyof Preferences>(key: K, next: Preferences[K]) =>
    onChange({ ...value, [key]: next })

  useEffect(() => {
    const away = (event: MouseEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node)) onClose()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', away)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('mousedown', away)
      window.removeEventListener('keydown', escape)
    }
  }, [onClose])

  return (
    <div
      ref={panel}
      className="settings-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="settings-title"
    >
      <div className="settings-title">
        <strong id="settings-title">Reading preferences</strong>
        <button className="icon-button" onClick={onClose} aria-label="Close preferences">
          <X />
        </button>
      </div>

      <label>
        Theme
        <select value={value.theme} onChange={(event) => set('theme', event.target.value as Theme)}>
          {THEMES.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Typeface
        <select
          value={value.fontFamily}
          onChange={(event) => set('fontFamily', event.target.value as FontFamily)}
        >
          <option value="serif">Literary serif</option>
          <option value="sans">Clean sans</option>
          <option value="mono">Monospace</option>
        </select>
      </label>

      <Range label="Font size" value={value.fontSize} min={14} max={28} unit="px" onChange={(v) => set('fontSize', v)} />
      <Range
        label="Line height"
        value={value.lineHeight}
        min={1.35}
        max={2.1}
        step={0.05}
        onChange={(v) => set('lineHeight', v)}
      />
      <Range
        label="Content width"
        value={value.contentWidth}
        min={560}
        max={1100}
        step={20}
        unit="px"
        onChange={(v) => set('contentWidth', v)}
      />
      <Range
        label="Sidebar width"
        value={value.sidebarWidth}
        min={240}
        max={480}
        step={10}
        unit="px"
        onChange={(v) => set('sidebarWidth', v)}
      />

      <Toggle label="Justify paragraphs" checked={value.justifyText} onChange={(v) => set('justifyText', v)} />
      <Toggle label="Focus mode" checked={value.focusMode} onChange={(v) => set('focusMode', v)} />

      <button className="reset-button" onClick={() => onChange(DEFAULT_PREFERENCES)}>
        Reset to defaults
      </button>
    </div>
  )
}
