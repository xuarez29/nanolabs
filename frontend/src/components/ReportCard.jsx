import { Link } from 'react-router-dom'

const ReportCard = ({ report }) => {
  const results = report.results || []
  const abnormal = results.filter((item) => item.flag && item.flag !== 'normal').length
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent" />
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {new Date(report.issued_at).toLocaleDateString()}
            </p>
          </div>
          <h3 className="mt-1 text-lg font-semibold text-primary">{report.org_name}</h3>
          <p className="text-sm text-slate-500">
            {report.parsed_fields?.lab_name || 'Unknown lab'} ·{' '}
            {abnormal > 0 ? `${abnormal} fuera de rango` : `${results.length} resultados`}
          </p>
        </div>
        <Link
          to={`/reports/${report.id}`}
          className="rounded-full border border-accent/30 px-3 py-1 text-sm font-medium text-accent transition hover:bg-accent hover:text-white"
        >
          Ver
        </Link>
      </div>
    </article>
  )
}

export default ReportCard
