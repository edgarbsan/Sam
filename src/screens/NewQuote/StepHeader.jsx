const STEPS = ['Viaje', 'Costos', 'Margen', 'Compartir']

export default function StepHeader({ step }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-carne-800">
          Paso {step} de {STEPS.length}
        </p>
        <p className="text-xs text-cacao-700">{STEPS[step - 1]}</p>
      </div>
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={STEPS.length}>
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? 'bg-carne-700' : 'bg-crema-50/70'}`}
          />
        ))}
      </div>
    </div>
  )
}
