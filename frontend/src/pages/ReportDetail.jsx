import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchReport, downloadReportFile } from '../lib/api.js'

const ReportDetail = () => {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const loadReport = async () => {
      try {
        const data = await fetchReport(id)
        setReport(data)
      } catch (err) {
        setError('Unable to load report')
      }
    }
    loadReport()
  }, [id])

  if (error) {
    return <p className="p-6 text-red-600">{error}</p>
  }

  if (!report) {
    return <p className="p-6 text-slate-500">Loading report…</p>
  }

  const results = report.results || []
  const insights = report.insights || {}
  const keyResults = insights.key_results || []
  const pdfViewUrl = report.pdf_file_url || report.pdf_url
  const pdfDownloadUrl = report.pdf_download_url

  const handleDownload = async () => {
    if (!pdfDownloadUrl || !report) return
    setDownloading(true)
    try {
      const blob = await downloadReportFile(report.id)
      const blobUrl = window.URL.createObjectURL(blob)
      const name = (report.org_name || 'reporte').toLowerCase().replace(/[^a-z0-9]+/gi, '-')
      const filename = `${name || 'reporte'}-${new Date(report.issued_at).toISOString().split('T')[0]}.pdf`
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (downloadError) {
      console.error('Download failed', downloadError)
      alert('No pudimos descargar el archivo.')
    } finally {
      setDownloading(false)
    }
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-2xl bg-white p-8 shadow">
        <p className="text-sm text-slate-500">Report ID</p>
        <h1 className="mt-1 text-2xl font-semibold text-primary">{report.id}</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Patient</p>
            <p className="text-base font-medium text-slate-800">{report.patient?.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Issued at</p>
            <p className="text-base font-medium text-slate-800">
              {new Date(report.issued_at).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Organization</p>
            <p className="text-base font-medium text-slate-800">{report.org_name}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">PDF</p>
            {pdfViewUrl ? (
              <div className="mt-1 flex flex-wrap gap-3 text-sm font-medium text-accent">
                <a href={pdfViewUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Abrir en pestaña nueva
                </a>
                {pdfDownloadUrl && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="text-left text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloading ? 'Descargando…' : 'Descargar archivo'}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Archivo no disponible</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Parsed lab</p>
            <p className="text-base font-medium text-slate-800">
              {report.parsed_fields?.lab_name || 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Report date</p>
            <p className="text-base font-medium text-slate-800">
              {report.parsed_fields?.report_date || '—'}
            </p>
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-primary">Results & reference ranges</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500">
                    <th className="py-2">Analyte</th>
                    <th className="py-2">Value</th>
                    <th className="py-2">Reference</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((item) => {
                    const reference = `${item.ref_min} - ${item.ref_max} ${item.unit}`
                    const statusMap = {
                      normal: 'Normal',
                      high: 'High',
                      low: 'Low',
                    }
                    const statusColor =
                      item.flag === 'high'
                        ? 'text-red-600'
                        : item.flag === 'low'
                          ? 'text-orange-500'
                          : 'text-emerald-600'
                    return (
                      <tr key={item.id}>
                        <td className="py-3 font-semibold text-slate-800">{item.analyte_name}</td>
                        <td className="py-3 text-slate-700">
                          {item.value} {item.unit}
                        </td>
                        <td className="py-3 text-slate-500">{reference}</td>
                        <td className={`py-3 font-semibold ${statusColor}`}>{statusMap[item.flag]}</td>
                        <td className="py-3 text-slate-500">
                          {item.measured_at ? new Date(item.measured_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(insights.explanation || keyResults.length > 0) && (
          <div className="mt-8 rounded-xl bg-slate-50 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">IA: resumen clínico</h3>
              {insights.triage && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  Prioridad: {insights.triage}
                </span>
              )}
            </div>
            {keyResults.length > 0 && (
              <div className="mt-4 space-y-3">
                {keyResults.map((item, index) => (
                  <div key={`${item.analyte || index}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-800">{item.analyte}</span>
                      <span className="text-xs uppercase text-slate-500">{item.status}</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Valor: {item.value} {item.unit || ''} {item.ref_range ? `(ref: ${item.ref_range})` : ''}
                    </p>
                    {item.reason && <p className="text-sm text-slate-600">{item.reason}</p>}
                  </div>
                ))}
              </div>
            )}
            {insights.explanation && (
              <p className="mt-4 text-sm text-slate-600">{insights.explanation}</p>
            )}
            {insights.recommended_tests && insights.recommended_tests.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-700">Pruebas sugeridas</p>
                <ul className="list-disc pl-5 text-sm text-slate-600">
                  {insights.recommended_tests.map((item, index) => (
                    <li key={`${item.test}-${index}`}>
                      <span className="font-semibold">{item.test}</span>: {item.why}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insights.actions && insights.actions.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-700">Recomendaciones</p>
                <ul className="list-disc pl-5 text-sm text-slate-600">
                  {insights.actions.map((item, index) => (
                    <li key={`${item.action}-${index}`}>
                      <span className="font-semibold">{item.action}</span>: {item.why}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insights.uncertainties && insights.uncertainties.length > 0 && (
              <div className="mt-4 text-sm text-slate-500">
                <p className="font-semibold">Dudas o datos faltantes</p>
                <ul className="list-disc pl-5">
                  {insights.uncertainties.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {insights.disclaimer && (
              <p className="mt-4 text-xs text-slate-500">{insights.disclaimer}</p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export default ReportDetail
