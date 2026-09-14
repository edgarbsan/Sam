const STEPS = ['Viaje', 'Costos', 'Margen', 'Compartir']

export default function StepHeader({ step }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-brand-400">
          Paso {step} de {STEPS.length}
        </p>
        <p className="text-xs text-zinc-500">{STEPS[step - 1]}</p>
      </div>
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={STEPS.length}>
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? 'bg-brand-500' : 'bg-ink-800'}`}
          />
        ))}
      </div>
    </div>
  )
}
