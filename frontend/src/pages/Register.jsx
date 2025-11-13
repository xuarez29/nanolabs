import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const initialForm = {
  username: '',
  email: '',
  password: '',
  patient_name: '',
  patient_sex: 'O',
  patient_birth_date: '',
}

const Register = () => {
  const navigate = useNavigate()
  const { setToken } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { ...form }
      const { tokens } = await register(payload)
      const token = tokens?.access
      if (token) {
        setToken(token)
      }
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      const detail = data?.detail || Object.values(data || {})[0] || 'Registration failed'
      setError(Array.isArray(detail) ? detail.join(', ') : detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-10 shadow-lg">
        <h1 className="text-2xl font-semibold text-primary">Create your Nano Labs account</h1>
        <p className="mt-2 text-sm text-slate-500">Set up login credentials and patient profile.</p>
        {error && <p className="mt-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-600">Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              placeholder="jane.doe"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              placeholder="••••••••"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-600">Patient name</label>
            <input
              name="patient_name"
              value={form.patient_name}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Sex</label>
            <select
              name="patient_sex"
              value={form.patient_sex}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            >
              <option value="F">Female</option>
              <option value="M">Male</option>
              <option value="O">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Birth date</label>
            <input
              type="date"
              name="patient_birth_date"
              value={form.patient_birth_date}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="md:col-span-2 mt-2 w-full rounded-md bg-accent px-4 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Go to login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
