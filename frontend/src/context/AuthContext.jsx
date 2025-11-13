import { createContext, useContext, useEffect, useMemo, useCallback, useState } from 'react'
import { fetchProfile } from '../lib/api.js'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(() => localStorage.getItem('accessToken'))
  const [patient, setPatient] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!token) {
      setPatient(null)
      return
    }
    setLoadingProfile(true)
    try {
      const profile = await fetchProfile()
      setPatient(profile)
    } catch (error) {
      console.error('Failed to load patient profile', error)
      setPatient(null)
    } finally {
      setLoadingProfile(false)
    }
  }, [token])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const value = useMemo(
    () => ({
      token,
      setToken: (newToken) => {
        if (newToken) {
          localStorage.setItem('accessToken', newToken)
        } else {
          localStorage.removeItem('accessToken')
        }
        setTokenState(newToken)
      },
      patient,
      setPatient,
      loadingProfile,
      refreshProfile: loadProfile,
    }),
    [token, patient, loadingProfile, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
