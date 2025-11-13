import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FileUpload from '../components/FileUpload.jsx'
import { uploadReport } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const UploadReport = () => {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [status, setStatus] = useState({ message: '', error: '' })
  const [uploading, setUploading] = useState(false)
  const [uploadedReport, setUploadedReport] = useState(null)

  const handleUpload = async (file) => {
    setUploading(true)
    setStatus({ message: '', error: '' })
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const response = await uploadReport(formData)
      setUploadedReport(response)
      setStatus({ message: 'Report uploaded and parsed successfully.', error: '' })
      refreshProfile()
    } catch (err) {
      const detail = err.response?.data?.detail || 'Upload failed'
      setStatus({ message: '', error: detail })
    } finally {
      setUploading(false)
    }
  }

  const results = uploadedReport?.results || []
  const insights = uploadedReport?.insights || {}

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-primary">Upload a new report</h1>
      <p className="mt-2 text-sm text-slate-500">
        Upload a PDF to store it under your account. We parse the analytes, compare them against
        reference ranges, and ask our AI assistant to summarize the most meaningful findings.
      </p>

      {status.message && (
        <p className="mt-4 rounded bg-green-50 p-3 text-sm text-green-700">{status.message}</p>
      )}
      {status.error && (
        <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-600">{status.error}</p>
      )}

      <div className="mt-6">
        <FileUpload onSubmit={handleUpload} loading={uploading} />
      </div>

      {uploadedReport && (
        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500">Report</p>
              <h2 className="text-xl font-semibold text-primary">{uploadedReport.org_name}</h2>
              <p className="text-sm text-slate-500">
                Parsed on {new Date(uploadedReport.issued_at).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/reports/${uploadedReport.id}`)}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View details
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-slate-500">Lab</p>
              <p className="text-base font-medium text-slate-800">
                {uploadedReport.parsed_fields?.lab_name || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Report date</p>
              <p className="text-base font-medium text-slate-800">
                {uploadedReport.parsed_fields?.report_date}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Results parsed</p>
              <p className="text-base font-medium text-slate-800">{results.length}</p>
            </div>
          </div>
          {results.length > 0 && (
            <div className="mt-6 space-y-3">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-primary">{item.analyte_name}</p>
                    <p className="text-xs text-slate-500">
                      Ref: {item.ref_min} - {item.ref_max} {item.unit}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-slate-800">
                    {item.value} {item.unit}
                  </p>
                </div>
              ))}
            </div>
          )}
          {(insights.explanation || (insights.actions || []).length > 0 || (insights.key_results || []).length > 0) && (
            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">IA: resumen preliminar</p>
                {insights.triage && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Prioridad: {insights.triage}
                  </span>
                )}
              </div>
              {insights.key_results && insights.key_results.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {insights.key_results.map((item, index) => (
                    <li key={`${item.analyte}-${index}`} className="rounded border border-slate-200 bg-white p-2">
                      <span className="font-semibold text-slate-800">{item.analyte}</span> — {item.reason}
                    </li>
                  ))}
                </ul>
              )}
              {insights.explanation && (
                <p className="mt-3 text-sm text-slate-600">{insights.explanation}</p>
              )}
              {insights.actions && insights.actions.length > 0 && (
                <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
                  {insights.actions.map((item, index) => (
                    <li key={`${item.action}-${index}`}>
                      <span className="font-semibold">{item.action}</span>: {item.why}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

export default UploadReport
