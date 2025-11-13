const TrendCard = ({ label, unit, points }) => {
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const svgPoints = points.map((p, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * 100
    const y = 100 - ((p.value - min) / range) * 100
    return `${x},${y}`
  })

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <p className="text-xs text-slate-400">Últimos {points.length} reportes</p>
        </div>
        <p className="text-base font-semibold text-slate-800">
          {points[points.length - 1].value}{unit ? ` ${unit}` : ''}
        </p>
      </div>
      <svg viewBox="0 0 100 40" className="mt-3 h-16 w-full text-accent" preserveAspectRatio="none">
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={svgPoints.join(' ')} />
      </svg>
      <div className="flex justify-between text-xs text-slate-400">
        <span>Mín: {min.toFixed(1)}</span>
        <span>Máx: {max.toFixed(1)}</span>
      </div>
    </div>
  )
}

const ChartSection = ({ trends }) => {
  if (!trends || trends.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm font-medium text-slate-600">Tendencias</p>
        <p className="mt-4 text-sm text-slate-500">Sube más reportes para generar gráficas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {trends.map((trend) => (
        <TrendCard key={trend.key} label={trend.label} unit={trend.unit} points={trend.points} />
      ))}
    </div>
  )
}

export default ChartSection
