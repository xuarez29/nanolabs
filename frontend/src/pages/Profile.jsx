import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchReports, deleteReport, updateOnboarding, downloadReportFile } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const Profile = () => {
  const { patient, loadingProfile, setPatient } = useAuth()
  const [reports, setReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const [downloadingId, setDownloadingId] = useState('')
  const defaultEditForm = {
    age: '',
    sex: 'other',
    height: '',
    weight: '',
    activity_level: 'moderate',
    conditions: '',
    medications: '',
    sports: '',
    diet_preferences: '',
    sleep_hours: '',
    stress_level: '3',
  }
  const [editForm, setEditForm] = useState(defaultEditForm)

  const loadReports = async () => {
    setReportsLoading(true)
    try {
      const response = await fetchReports({ mine: true })
      const list = response.results ?? response
      setReports(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Unable to load user reports', error)
      setReports([])
    } finally {
      setReportsLoading(false)
    }
  }

  useEffect(() => {
    if (patient) {
      loadReports()
    }
  }, [patient])

  const hasOnboarding = Boolean(patient?.onboarding)

  if (loadingProfile && !patient) {
    return <p className="p-6 text-slate-500">Cargando perfil…</p>
  }

  if (!patient) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
          No encontramos tu perfil. Regístrate como paciente para administrar tu información.
        </p>
      </main>
    )
  }

  const handleDelete = async (reportId) => {
    if (!window.confirm('Delete this report permanently?')) return
    setDeletingId(reportId)
    try {
      await deleteReport(reportId)
      setReports((prev) => prev.filter((r) => r.id !== reportId))
    } catch (error) {
      console.error('Failed to delete report', error)
    } finally {
      setDeletingId('')
    }
  }

  const triggerDownload = async (report) => {
    if (!report?.id) return
    setDownloadingId(report.id)
    try {
      const blob = await downloadReportFile(report.id)
      const blobUrl = window.URL.createObjectURL(blob)
      const filenameBase = (report.org_name || 'reporte').toLowerCase().replace(/[^a-z0-9]+/gi, '-')
      const filename = `${filenameBase || 'reporte'}-${new Date(report.issued_at).toISOString().split('T')[0]}.pdf`
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download failed', error)
      alert('No pudimos descargar el archivo. Intenta de nuevo.')
    } finally {
      setDownloadingId('')
    }
  }

  const onboarding = patient.onboarding
  const totalReports = reports.length
  const displayName = patient.name?.trim() || patient.user?.username || patient.username || 'Paciente NanoLabs'

  useEffect(() => {
    if (onboarding) {
      setEditForm({
        age: onboarding.profile?.age ?? '',
        sex: onboarding.profile?.sex ?? 'other',
        height: onboarding.profile?.height ?? '',
        weight: onboarding.profile?.weight ?? '',
        activity_level: onboarding.profile?.activity_level ?? 'moderate',
        conditions: (onboarding.medical_background?.conditions || []).join(', '),
        medications: (onboarding.medical_background?.medications || []).join(', '),
        sports: (onboarding.lifestyle?.sports || []).join(', '),
        diet_preferences: (onboarding.lifestyle?.diet_preferences || []).join(', '),
        sleep_hours: onboarding.lifestyle?.sleep_hours ?? '',
        stress_level: onboarding.lifestyle?.stress_level ? String(onboarding.lifestyle?.stress_level) : '3',
      })
    } else {
      setEditForm(defaultEditForm)
    }
  }, [onboarding])
  const profileData = onboarding?.profile || {}
  const medicalData = onboarding?.medical_background || {}
  const lifestyleData = onboarding?.lifestyle || {}

  const formatList = (items) => {
    if (!items || items.length === 0) return 'Sin datos'
    return items.join(', ')
  }

  const sexLabel = () => {
    const value = profileData.sex || patient.sex
    const normalized = typeof value === 'string' ? value.toLowerCase() : value
    switch (normalized) {
      case 'male':
      case 'm':
        return 'Masculino'
      case 'female':
      case 'f':
        return 'Femenino'
      case 'other':
      case 'o':
        return 'Otro'
      default:
        return '—'
    }
  }

  const openEditModal = () => {
    setEditError('')
    setShowEdit(true)
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  const parseList = (value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  const handleQuickSave = async () => {
    setSavingEdit(true)
    setEditError('')
    const payload = {
      profile: {
        age: editForm.age ? Number(editForm.age) : null,
        sex: editForm.sex,
        height: editForm.height ? Number(editForm.height) : null,
        weight: editForm.weight ? Number(editForm.weight) : null,
        activity_level: editForm.activity_level,
      },
      medical_background: {
        conditions: parseList(editForm.conditions),
        medications: parseList(editForm.medications),
      },
      lifestyle: {
        sports: parseList(editForm.sports),
        diet_preferences: parseList(editForm.diet_preferences),
        sleep_hours: editForm.sleep_hours ? Number(editForm.sleep_hours) : null,
        stress_level: editForm.stress_level ? Number(editForm.stress_level) : null,
      },
      missing_answers: [],
    }
    try {
      const saved = await updateOnboarding(payload)
      setPatient((prev) => ({
        ...prev,
        is_onboarding_complete: true,
        onboarding: saved,
      }))
      setShowEdit(false)
    } catch (error) {
      const detail = error.response?.data?.detail || 'No pudimos guardar tus datos. Intenta de nuevo.'
      setEditError(detail)
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="rounded-3xl bg-gradient-to-r from-primary via-accent to-slate-900 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">Panel personal</p>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
              {displayName}
            </h1>
            <p className="max-w-lg text-sm text-white/80">
              Centraliza tus reportes clínicos y mantén tu información contextual al día para recibir explicaciones
              personalizadas de NanoLabs.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-white/80">
              <div className="rounded-full border border-white/30 px-4 py-2">
                <span className="text-xs uppercase text-white/60">Reportes</span>
                <p className="text-lg font-semibold text-white">{totalReports}</p>
              </div>
              <div className="rounded-full border border-white/30 px-4 py-2">
                <span className="text-xs uppercase text-white/60">Onboarding</span>
                <p className="text-lg font-semibold text-white">{hasOnboarding ? 'Completo' : 'Pendiente'}</p>
              </div>
            </div>
          </div>
          <div className="w-full rounded-2xl bg-white/10 p-4 text-sm text-white/90 lg:max-w-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-wide text-white/70">Datos del onboarding</p>
              <button
                type="button"
                onClick={openEditModal}
                className="rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white hover:text-primary"
              >
                Editar datos
              </button>
            </div>
            {!onboarding ? (
              <p className="mt-3 text-sm">
                Aún no registras datos clínicos. Completa el cuestionario para personalizar tus reportes.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <ul className="mt-2 space-y-1">
                    <li>Edad: {profileData.age ?? '—'} años</li>
                    <li>Estatura: {profileData.height ?? '—'} cm</li>
                    <li>Peso: {profileData.weight ?? '—'} kg</li>
                    <li>Sexo: {sexLabel()}</li>
                    <li>Actividad: {profileData.activity_level ?? '—'}</li>
                  </ul>
                </div>
                <div>
                  <ul className="mt-2 space-y-1">
                    <li>Condiciones: {formatList(medicalData.conditions)}</li>
                    <li>Medicamentos: {formatList(medicalData.medications)}</li>
                  </ul>
                </div>
                <div>
                  <ul className="mt-2 space-y-1">
                    <li>Deportes: {formatList(lifestyleData.sports)}</li>
                    <li>Dieta: {formatList(lifestyleData.diet_preferences)}</li>
                    <li>Sueño: {lifestyleData.sleep_hours ?? '—'} h</li>
                    <li>Estrés: {lifestyleData.stress_level ?? '—'} / 5</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 px-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                if (!savingEdit) handleQuickSave()
              }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-primary">Editar información de salud</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Modifica rápidamente tus datos básicos, antecedentes y hábitos sin salir del perfil.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
              {editError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{editError}</p>}
              <section className="space-y-4 rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Perfil básico</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-600">
                    Edad
                    <input
                      type="number"
                      name="age"
                      min="0"
                      max="120"
                      value={editForm.age}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Sexo
                    <select
                      name="sex"
                      value={editForm.sex}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <option value="male">Masculino</option>
                      <option value="female">Femenino</option>
                      <option value="other">Otro / Prefiero no decir</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Estatura (cm)
                    <input
                      type="number"
                      name="height"
                      min="50"
                      max="250"
                      value={editForm.height}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Peso (kg)
                    <input
                      type="number"
                      name="weight"
                      min="20"
                      max="300"
                      value={editForm.weight}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Nivel de actividad
                    <select
                      name="activity_level"
                      value={editForm.activity_level}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <option value="sedentary">Sedentario</option>
                      <option value="light">Ligero</option>
                      <option value="moderate">Moderado</option>
                      <option value="high">Alto</option>
                    </select>
                  </label>
                </div>
              </section>
              <section className="space-y-4 rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Antecedentes médicos
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-600">
                    Condiciones (separadas por coma)
                    <textarea
                      name="conditions"
                      rows="3"
                      value={editForm.conditions}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      placeholder="Diabetes tipo 2, Hipertensión"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Medicamentos (separados por coma)
                    <textarea
                      name="medications"
                      rows="3"
                      value={editForm.medications}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      placeholder="Metformina, Losartán"
                    />
                  </label>
                </div>
              </section>
              <section className="space-y-4 rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estilo de vida</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-600">
                    Deportes o actividad (coma)
                    <textarea
                      name="sports"
                      rows="2"
                      value={editForm.sports}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      placeholder="Correr 3x semana, Yoga 1x semana"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Preferencias de dieta (coma)
                    <textarea
                      name="diet_preferences"
                      rows="2"
                      value={editForm.diet_preferences}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      placeholder="Vegetariana, Baja en carbohidratos"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Horas de sueño (promedio)
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      name="sleep_hours"
                      value={editForm.sleep_hours}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Nivel de estrés (1-5)
                    <input
                      type="number"
                      min="1"
                      max="5"
                      name="stress_level"
                      value={editForm.stress_level}
                      onChange={handleEditChange}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                </div>
              </section>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  to="/onboarding"
                  className="inline-flex items-center justify-center rounded-full border border-primary/30 px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
                  onClick={() => setShowEdit(false)}
                >
                  Abrir cuestionario completo
                </Link>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingEdit ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEdit(false)}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="mt-10 rounded-2xl bg-white p-8 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Reportes cargados</p>
            <h2 className="text-xl font-semibold text-primary">Tus documentos</h2>
          </div>
          <Link
            to="/upload"
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Subir nuevo
          </Link>
        </div>
        {reportsLoading && (
          <p className="mt-4 text-sm text-slate-500">Cargando tus reportes…</p>
        )}
        {!reportsLoading && reports.length === 0 && (
          <p className="mt-4 rounded border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Aún no has cargado reportes.
          </p>
        )}
        {!reportsLoading && reports.length > 0 && (
          <div className="mt-6 divide-y divide-slate-100">
            {reports.map((report) => {
              const viewUrl = report.pdf_file_url || report.pdf_url
              const downloadUrl = report.pdf_download_url
              return (
                <div
                  key={report.id}
                  className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-base font-semibold text-primary">{report.org_name}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(report.issued_at).toLocaleString()} ·{' '}
                      {report.parsed_fields?.lab_name || 'Unknown lab'}
                    </p>
                    {report.insights?.explanation && (
                      <p className="text-xs text-slate-500">{report.insights.explanation}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {viewUrl && (
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        Abrir PDF
                      </a>
                    )}
                    {downloadUrl ? (
                      <button
                        type="button"
                        onClick={() => triggerDownload(report)}
                        disabled={downloadingId === report.id}
                        className="text-sm font-medium text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {downloadingId === report.id ? 'Descargando…' : 'Descargar PDF'}
                      </button>
                    ) : (
                      <span className="text-sm text-slate-400">Sin archivo</span>
                    )}
                    <Link
                      to={`/reports/${report.id}`}
                      className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Ver
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(report.id)}
                      disabled={deletingId === report.id}
                      className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === report.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </main>
  )
}

export default Profile
