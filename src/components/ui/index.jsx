// Componentes base de UI: botones grandes, campos y contenedores
// pensados para usarse con el pulgar en un celular.
import { forwardRef, useEffect, useId, useRef } from 'react'
import { toNumber } from '../../lib/format.js'

/* -------------------------------- Botón -------------------------------- */

const VARIANTS = {
  primary:
    'bg-brand-500 text-ink-950 font-semibold hover:bg-brand-400 active:bg-brand-600 disabled:bg-ink-700 disabled:text-zinc-500',
  secondary:
    'bg-ink-800 text-zinc-100 border border-ink-700 hover:bg-ink-700 active:bg-ink-600 disabled:text-zinc-600',
  ghost: 'bg-transparent text-zinc-300 hover:bg-ink-800 active:bg-ink-700',
  danger: 'bg-red-600/90 text-white hover:bg-red-600 active:bg-red-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700',
}

const SIZES = {
  sm: 'px-3 py-2 text-sm rounded-lg min-h-[38px]',
  md: 'px-4 py-3 text-[15px] rounded-xl min-h-[48px]',
  lg: 'px-5 py-4 text-base rounded-2xl min-h-[56px]',
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', full = false, loading = false, className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 transition-colors select-none
        disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
})

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  )
}

/* ------------------------------ Contenedor ----------------------------- */

export function Card({ title, subtitle, action, children, className = '', padded = true }) {
  return (
    <section className={`card ${padded ? 'p-4' : ''} ${className}`}>
      {(title || action) && (
        <header className={`flex items-start justify-between gap-3 ${padded ? 'mb-3' : 'p-4 pb-0'}`}>
          <div>
            {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>}
            {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/* -------------------------------- Campos ------------------------------- */

export function Field({ label, hint, error, children, required, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="label-base">
          {label}
          {required && <span className="text-brand-400"> *</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : hint ? <p className="hint-base">{hint}</p> : null}
    </div>
  )
}

export const TextInput = forwardRef(function TextInput({ className = '', ...props }, ref) {
  return <input ref={ref} {...props} className={`input-base ${className}`} />
})

export const TextArea = forwardRef(function TextArea({ className = '', rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} {...props} className={`input-base resize-y ${className}`} />
})

/** Campo numérico con prefijo/sufijo (para $ y unidades). */
export function NumberInput({
  value,
  onChange,
  prefix,
  suffix,
  step = '0.01',
  min,
  max,
  placeholder,
  className = '',
  inputMode = 'decimal',
  allowNegative = false,
  ...props
}) {
  return (
    <div className={`relative flex items-center ${className}`}>
      {prefix && <span className="pointer-events-none absolute left-4 text-zinc-400">{prefix}</span>}
      <input
        {...props}
        type="text"
        inputMode={inputMode}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value
          const pattern = allowNegative ? /^-?[0-9]*[.,]?[0-9]*$/ : /^[0-9]*[.,]?[0-9]*$/
          if (raw === '' || pattern.test(raw)) onChange(raw.replace(',', '.'))
        }}
        onBlur={(e) => {
          const raw = e.target.value
          if (raw === '' || raw === '-') return
          let n = toNumber(raw, 0)
          if (min != null && n < min) n = min
          if (max != null && n > max) n = max
          onChange(String(n))
        }}
        step={step}
        className={`input-base tabular ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-16' : ''}`}
      />
      {suffix && <span className="pointer-events-none absolute right-4 text-sm text-zinc-400">{suffix}</span>}
    </div>
  )
}

/* -------------------------------- Toggle ------------------------------- */

export function Toggle({ checked, onChange, label, hint, disabled }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[15px] font-medium text-zinc-100">
          {label}
        </label>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand-500' : 'bg-ink-700'
        } disabled:opacity-50`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

/* ---------------------------- Segmentado ------------------------------- */

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`grid gap-2 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              active
                ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/40'
                : 'border-ink-700 bg-ink-850 hover:bg-ink-800'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[15px] font-semibold text-zinc-100">
              {opt.emoji && <span aria-hidden="true">{opt.emoji}</span>}
              {opt.label}
            </div>
            {opt.hint && <div className="text-xs text-zinc-400 mt-0.5">{opt.hint}</div>}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------- Avisos -------------------------------- */

const BANNER_TONES = {
  info: 'bg-sky-500/10 border-sky-500/30 text-sky-200',
  warn: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
  error: 'bg-red-500/10 border-red-500/30 text-red-200',
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
}

export function Banner({ tone = 'info', title, children, action, className = '' }) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${BANNER_TONES[tone]} ${className}`}>
      {title && <p className="font-semibold mb-0.5">{title}</p>}
      {children && <div className="text-[13px] leading-relaxed opacity-95">{children}</div>}
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  )
}

/* ----------------------------- Esqueletos ------------------------------ */

export function Skeleton({ className = 'h-4 w-full' }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-ink-800 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  )
}

export function RouteSkeleton() {
  return (
    <div className="space-y-3" aria-live="polite" aria-busy="true">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <p className="text-center text-xs text-zinc-500">Calculando ruta y casetas…</p>
    </div>
  )
}

/* ------------------------------- Modal --------------------------------- */

export function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-ink-800 bg-ink-900 p-5 pb-safe shadow-card animate-fade-in"
      >
        {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
        <div className="text-sm text-zinc-300">{children}</div>
        {footer && <div className="mt-5 flex gap-3">{footer}</div>}
      </div>
    </div>
  )
}

/* ----------------------------- Estado vacío ---------------------------- */

export function EmptyState({ icon = '📭', title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-700 px-6 py-12 text-center">
      <div className="text-4xl mb-3" aria-hidden="true">
        {icon}
      </div>
      <p className="text-base font-semibold text-zinc-200">{title}</p>
      {children && <p className="mt-1 max-w-xs text-sm text-zinc-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ------------------------------ Renglones ------------------------------ */

/** Renglón concepto / monto, usado en desgloses. */
export function Row({ label, value, hint, strong = false, accent = false, className = '' }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${className}`}>
      <div className="min-w-0">
        <span className={`text-[15px] ${strong ? 'font-semibold text-zinc-100' : 'text-zinc-300'}`}>{label}</span>
        {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      </div>
      <span
        className={`tabular whitespace-nowrap ${
          accent ? 'text-brand-400 text-lg font-bold' : strong ? 'font-semibold text-zinc-100' : 'text-zinc-200'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export function Divider({ className = '' }) {
  return <hr className={`border-ink-800 my-2 ${className}`} />
}
