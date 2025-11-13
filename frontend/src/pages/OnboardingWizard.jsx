import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchOnboarding, updateOnboarding } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const initialProfile = {
  age: '',
  sex: 'other',
  height: '',
  weight: '',
  activity_level: 'moderate',
}

const initialMedical = {
  conditions: '',
  medications: '',
}

const initialLifestyle = {
  sports: '',
  diet_preferences: '',
  sleep_hours: '',
  stress_level: '3',
}

const steps = ['Bienvenida', 'Perfil básico', 'Antecedentes médicos', 'Estilo de vida', 'Resumen']

const OnboardingWizard = () => {
  const navigate = useNavigate()
  const { patient, setPatient } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [profile, setProfile] = useState(initialProfile)
  const [medical, setMedical] = useState(initialMedical)
  const [lifestyle, setLifestyle] = useState(initialLifestyle)
  const [missingAnswers, setMissingAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchOnboarding()
        if (data.profile) {
          setProfile((prev) => ({ ...prev, ...data.profile }))
        }
        if (data.medical_background) {
          setMedical({
            conditions: (data.medical_background.conditions || []).join(', '),
            medications: (data.medical_background.medications || []).join(', '),
          })
        }
        if (data.lifestyle) {
          setLifestyle({
            sports: (data.lifestyle.sports || []).join(', '),
            diet_preferences: (data.lifestyle.diet_preferences || []).join(', '),
            sleep_hours: data.lifestyle.sleep_hours ?? '',
            stress_level: String(data.lifestyle.stress_level ?? '3'),
          })
        }
      } catch (err) {
        console.error(err)
        setError('No fue posible cargar el cuestionario.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfile({ ...profile, [name]: value })
  }

  const handleMedicalChange = (event) => {
    const { name, value } = event.target
    setMedical({ ...medical, [name]: value })
  }

  const handleLifestyleChange = (event) => {
    const { name, value } = event.target
    setLifestyle({ ...lifestyle, [name]: value })
  }

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 0))

  const parseList = (value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    const profilePayload = {
      age: profile.age ? Number(profile.age) : null,
      sex: profile.sex,
      height: profile.height ? Number(profile.height) : null,
      weight: profile.weight ? Number(profile.weight) : null,
      activity_level: profile.activity_level,
    }

    const missing = []
    Object.entries(profilePayload).forEach(([key, value]) => {
      if (value === null || value === '') {
        missing.push(`Sin respuesta: ${key}`)
      }
    })

    const payload = {
      profile: profilePayload,
      medical_background: {
        conditions: parseList(medical.conditions),
        medications: parseList(medical.medications),
      },
      lifestyle: {
        sports: parseList(lifestyle.sports),
        diet_preferences: parseList(lifestyle.diet_preferences),
        sleep_hours: lifestyle.sleep_hours ? Number(lifestyle.sleep_hours) : null,
        stress_level: lifestyle.stress_level ? Number(lifestyle.stress_level) : null,
      },
      missing_answers: missing.length ? missing : [],
    }

    setMissingAnswers(payload.missing_answers)

    try {
      const saved = await updateOnboarding(payload)
      setPatient((prev) => ({
        ...prev,
        is_onboarding_complete: true,
        onboarding: saved,
      }))
      navigate('/')
    } catch (err) {
      const detail = err.response?.data
      setError(detail?.detail || 'No fue posible guardar tu información.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="p-6 text-slate-500">Cargando cuestionario…</p>
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-3xl bg-white p-8 shadow-xl">
        <p className="text-sm uppercase tracking-wide text-slate-400">Paso {currentStep + 1} de {steps.length}</p>
        <h1 className="mt-2 text-2xl font-semibold text-primary">{steps[currentStep]}</h1>
        {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        {currentStep === 0 && (
          <div className="mt-6 space-y-4 text-slate-600">
            <p>¡Bienvenido(a) a NanoLabs! Antes de comenzar, cuéntanos un poco sobre ti para personalizar tus reportes.</p>
            <ul className="list-disc pl-5 text-sm">
              <li>Solo tardarás un par de minutos.</li>
              <li>Tus respuestas nos ayudan a contextualizar tus resultados.</li>
              <li>Puedes actualizar esta información cuando lo necesites.</li>
            </ul>
          </div>
        )}

        {currentStep === 1 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Edad
              <input
                type="number"
                name="age"
                min="0"
                max="120"
                value={profile.age}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Sexo
              <select
                name="sex"
                value={profile.sex}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Estatura (cm)
              <input
                type="number"
                name="height"
                min="50"
                max="250"
                value={profile.height}
                onChange={handleProfileChange}
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
                value={profile.weight}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm font-semibold text-slate-600 md:col-span-2">
              Nivel de actividad
              <select
                name="activity_level"
                value={profile.activity_level}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="sedentary">Sedentario</option>
                <option value="light">Ligero</option>
                <option value="moderate">Moderado</option>
                <option value="high">Alto</option>
              </select>
            </label>
          </div>
        )}

        {currentStep === 2 && (
          <div className="mt-6 grid gap-4">
            <label className="text-sm font-semibold text-slate-600">
              Condiciones médicas (separadas por coma)
              <textarea
                name="conditions"
                value={medical.conditions}
                onChange={handleMedicalChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                rows={3}
              />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Medicamentos (opcional)
              <textarea
                name="medications"
                value={medical.medications}
                onChange={handleMedicalChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                rows={3}
              />
            </label>
          </div>
        )}

        {currentStep === 3 && (
          <div className="mt-6 grid gap-4">
            <label className="text-sm font-semibold text-slate-600">
              Deportes o actividad física (indica frecuencia, ej. "Correr - 3 veces/semana")
              <textarea
                name="sports"
                value={lifestyle.sports}
                onChange={handleLifestyleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                rows={3}
              />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Preferencias alimentarias
              <textarea
                name="diet_preferences"
                value={lifestyle.diet_preferences}
                onChange={handleLifestyleChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                rows={2}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-600">
                Horas de sueño (promedio)
                <input
                  type="number"
                  name="sleep_hours"
                  min="0"
                  max="24"
                  value={lifestyle.sleep_hours}
                  onChange={handleLifestyleChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="text-sm font-semibold text-slate-600">
                Nivel de estrés (1 = bajo, 5 = alto)
                <input
                  type="number"
                  name="stress_level"
                  min="1"
                  max="5"
                  value={lifestyle.stress_level}
                  onChange={handleLifestyleChange}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="mt-6 space-y-3 text-sm text-slate-600">
            <p>Revisa tu información antes de finalizar:</p>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold">Perfil:</span> {profile.age || '—'} años, {profile.weight || '—'} kg,
                {profile.height || '—'} cm, actividad {profile.activity_level}
              </li>
              <li>
                <span className="font-semibold">Condiciones:</span> {medical.conditions || '—'}
              </li>
              <li>
                <span className="font-semibold">Medicamentos:</span> {medical.medications || '—'}
              </li>
              <li>
                <span className="font-semibold">Estilo de vida:</span> dieta {lifestyle.diet_preferences || '—'}, deportes {lifestyle.sports || '—'}, sueño {lifestyle.sleep_hours || '—'} h, estrés {lifestyle.stress_level}
              </li>
            </ul>
            {missingAnswers.length > 0 && (
              <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                Respuestas pendientes: {missingAnswers.join(', ')}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 0}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
          >
            Atrás
          </button>
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Finalizar'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

export default OnboardingWizard
