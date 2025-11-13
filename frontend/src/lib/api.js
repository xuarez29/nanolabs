import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const login = async ({ username, password }) => {
  const { data } = await api.post('/api/auth/login/', { username, password })
  return data
}

export const register = async (payload) => {
  const { data } = await api.post('/api/auth/register/', payload)
  return data
}

export const uploadReport = async (formData) => {
  const { data } = await api.post('/api/reports/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const fetchReports = async (params = {}) => {
  const { data } = await api.get('/api/reports/', { params })
  return data
}

export const fetchReport = async (id) => {
  const { data } = await api.get(`/api/reports/${id}/`)
  return data
}

export const createReport = async (payload) => {
  const { data } = await api.post('/api/reports/', payload)
  return data
}

export const deleteReport = async (id) => {
  await api.delete(`/api/reports/${id}/delete/`)
}

export const fetchTrends = async (params = {}) => {
  const { data } = await api.get('/api/report-trends/', { params })
  return data
}

export const downloadReportFile = async (id) => {
  const { data } = await api.get(`/api/reports/${id}/download/`, {
    responseType: 'blob',
  })
  return data
}

export const fetchPatients = async (params = {}) => {
  const { data } = await api.get('/api/patients/', { params })
  return data
}

export const fetchProfile = async () => {
  const { data } = await api.get('/api/profile/')
  return data
}

export const updateProfile = async (payload) => {
  const { data } = await api.put('/api/profile/', payload)
  return data
}

export const fetchOnboarding = async () => {
  const { data } = await api.get('/api/onboarding/')
  return data
}

export const updateOnboarding = async (payload) => {
  const { data } = await api.put('/api/onboarding/', payload)
  return data
}

export default api
