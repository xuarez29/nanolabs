import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchReports, fetchTrends } from '../lib/api.js'
import ReportCard from '../components/ReportCard.jsx'
import ChartSection from '../components/ChartSection.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const Dashboard = () => {
  const { patient } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trends, setTrends] = useState([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reportsResponse, trendsResponse] = await Promise.all([
          fetchReports({ mine: true }),
          fetchTrends(),
        ])
        const reportList = reportsResponse.results ?? reportsResponse
        setReports(Array.isArray(reportList) ? reportList : [])
        setTrends(Array.isArray(trendsResponse?.analytes) ? trendsResponse.analytes : [])
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return <p className="p-6 text-slate-500">Loading dashboard…</p>
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <section className="rounded-2xl bg-gradient-to-r from-primary to-accent p-8 text-white">
        <p className="text-sm uppercase text-white/70">Hola</p>
        <h1 className="text-3xl font-semibold">{patient?.name || 'Paciente'}</h1>
        <p className="mt-2 text-sm text-white/80">Historial cargado y análisis recientes.</p>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-sm uppercase text-white/60">Reportes subidos</p>
            <p className="text-3xl font-semibold">{reports.length}</p>
            <p className="text-xs text-white/70">Análisis procesados</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-sm uppercase text-white/60">Última actualización</p>
            <p className="text-3xl font-semibold">
              {reports.length > 0
                ? new Date(reports[reports.length - 1].issued_at).toLocaleDateString()
                : '—'}
            </p>
            <p className="text-xs text-white/70">Fecha del reporte más reciente</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-sm uppercase text-white/60">Alertas</p>
            <p className="text-3xl font-semibold">0</p>
            <p className="text-xs text-white/70">Sin eventos pendientes</p>
          </div>
        </div>
      </section>

      {error && <p className="mt-6 rounded bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      <section className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">Recent reports</h2>
            <Link to="/upload" className="text-sm font-medium text-accent hover:underline">
              Upload new
            </Link>
          </div>
          <div className="space-y-4">
            {reports.length === 0 && (
              <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No reports yet.
              </p>
            )}
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </div>
        <ChartSection trends={trends} />
      </section>
    </main>
  )
}

export default Dashboard
