import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import UploadReport from './pages/UploadReport.jsx'
import ReportDetail from './pages/ReportDetail.jsx'
import Register from './pages/Register.jsx'
import Profile from './pages/Profile.jsx'
import OnboardingWizard from './pages/OnboardingWizard.jsx'
import Navbar from './components/Navbar.jsx'
import { useAuth } from './context/AuthContext.jsx'

const ProtectedRoute = ({ children }) => {
  const location = useLocation()
  const { token, patient } = useAuth()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  if (
    patient &&
    !patient.is_onboarding_complete &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />
  }
  return children
}

function App() {
  const location = useLocation()
  const { token, patient } = useAuth()
  const hideNavbarRoutes = ['/login', '/register', '/onboarding']
  const showNavbar = token && !hideNavbarRoutes.includes(location.pathname)

  return (
    <div className="min-h-screen bg-slate-50">
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingWizard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/:id"
          element={
            <ProtectedRoute>
              <ReportDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={token ? (patient?.is_onboarding_complete ? '/' : '/onboarding') : '/login'} replace />} />
      </Routes>
    </div>
  )
}

export default App
