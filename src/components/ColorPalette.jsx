import React from 'react'

/** Soft, forgiving colours. Cream doubles as the "undo a fill" colour. */
export const PALETTE = [
  { name: 'blush', hex: '#F6C7CE' },
  { name: 'rose', hex: '#E89AA6' },
  { name: 'peach', hex: '#F8D3B8' },
  { name: 'butter', hex: '#F7E6AC' },
  { name: 'honey', hex: '#EFC978' },
  { name: 'sage', hex: '#C7D8C0' },
  { name: 'moss', hex: '#9CBB94' },
  { name: 'mint', hex: '#C9E4D8' },
  { name: 'sky', hex: '#C5DEEA' },
  { name: 'denim', hex: '#93B9D2' },
  { name: 'lilac', hex: '#DACDE9' },
  { name: 'plum', hex: '#B79CC4' },
  { name: 'clay', hex: '#DFA98E' },
  { name: 'cocoa', hex: '#B98A6B' },
  { name: 'cream', hex: '#FBF6EC' },
  { name: 'ink', hex: '#3C3A38' },
]

export const BRUSH_SIZES = [
  { label: 'fine', value: 9 },
  { label: 'soft', value: 20 },
  { label: 'thick', value: 38 },
  { label: 'chunky', value: 62 },
]

const TOOLS = [
  { id: 'fill', icon: '🪣', label: 'Fill' },
  { id: 'brush', icon: '🖌️', label: 'Brush' },
  { id: 'eraser', icon: '🧽', label: 'Eraser' },
]

function ToolChip({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={[
        'flex min-h-[48px] items-center gap-1.5 rounded-pebble border-[2.5px] px-3 py-2',
        'font-hand text-xl font-semibold leading-none press-soft',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-butter',
        active
          ? 'border-ink bg-butter text-ink shadow-sketch'
          : 'border-ink/35 bg-paper text-ink-soft hover:border-ink/60 hover:text-ink',
      ].join(' ')}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * The bottom bar: colours, tools, brush sizes, and the housekeeping buttons.
 * Everything here is at least 44px tall so it stays thumb-friendly on an iPad,
 * and the swatch row scrolls sideways rather than reflowing into a wall.
 */
export default function ColorPalette({
  color,
  onColor,
  tool,
  onTool,
  brushSize,
  onBrushSize,
  onUndo,
  canUndo,
  onClear,
  onSave,
  saving,
}) {
  return (
    <div className="rounded-card border-[2.5px] border-ink/70 bg-paper/95 p-3 shadow-sketch-lg backdrop-blur-sm sm:p-4">
      {/* ---- colours ---- */}
      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible">
        {PALETTE.map((swatch) => {
          const active = color === swatch.hex
          return (
            <button
              key={swatch.hex}
              type="button"
              onClick={() => onColor(swatch.hex)}
              title={swatch.name}
              aria-label={`${swatch.name} colour`}
              aria-pressed={active}
              style={{ backgroundColor: swatch.hex }}
              className={[
                'h-11 w-11 shrink-0 rounded-blob border-[2.5px] press-soft sm:h-12 sm:w-12',
                'focus:outline-none focus-visible:ring-4 focus-visible:ring-butter',
                active
                  ? 'scale-110 border-ink shadow-sketch ring-2 ring-ink/20 ring-offset-2 ring-offset-paper'
                  : 'border-ink/35 hover:scale-105 hover:border-ink/70',
              ].join(' ')}
            />
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t-2 border-dashed border-ink/15 pt-3">
        {/* ---- tools ---- */}
        <div className="flex gap-2">
          {TOOLS.map((t) => (
            <ToolChip key={t.id} active={tool === t.id} onClick={() => onTool(t.id)} title={t.label}>
              <span className="text-lg">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </ToolChip>
          ))}
        </div>

        {/* ---- brush size ---- */}
        <div className="ml-1 flex items-center gap-1.5 rounded-pebble border-2 border-dashed border-ink/20 px-2 py-1.5">
          {BRUSH_SIZES.map((s) => {
            const active = brushSize === s.value
            const dot = Math.max(7, Math.min(24, s.value * 0.42))
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => onBrushSize(s.value)}
                title={`${s.label} brush`}
                aria-label={`${s.label} brush`}
                aria-pressed={active}
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full press-soft',
                  'focus:outline-none focus-visible:ring-4 focus-visible:ring-butter',
                  active ? 'bg-butter-soft ring-2 ring-ink/50' : 'hover:bg-paper-deep',
                ].join(' ')}
              >
                <span
                  className="block rounded-full bg-ink"
                  style={{ width: dot, height: dot, opacity: active ? 1 : 0.55 }}
                />
              </button>
            )
          })}
        </div>

        {/* ---- housekeeping ---- */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ToolChip onClick={onUndo} disabled={!canUndo} title="Undo">
            <span className="text-lg">↩️</span>
            <span className="hidden sm:inline">Undo</span>
          </ToolChip>
          <ToolChip onClick={onClear} title="Start over">
            <span className="text-lg">🧺</span>
            <span className="hidden sm:inline">Start over</span>
          </ToolChip>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={[
              'min-h-[48px] rounded-doodle border-[2.5px] border-blush-deep bg-blush-soft px-5 py-2',
              'font-hand text-2xl font-semibold leading-none text-ink shadow-sketch press-soft',
              'hover:bg-blush disabled:opacity-60',
              'focus:outline-none focus-visible:ring-4 focus-visible:ring-butter',
            ].join(' ')}
          >
            {saving ? 'saving…' : 'Save Masterpiece 💌'}
          </button>
        </div>
      </div>
    </div>
  )
}
