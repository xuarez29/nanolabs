import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const Navbar = () => {
  const navigate = useNavigate()
  const { setToken, patient } = useAuth()

  const handleLogout = () => {
    setToken(null)
    navigate('/login')
  }

  return (
    <header className="bg-white/90 backdrop-blur shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21c4.97-4.5 7.5-8.25 7.5-11.25A7.5 7.5 0 0 0 12 2.25 7.5 7.5 0 0 0 4.5 9.75C4.5 12.75 7.03 16.5 12 21Z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-primary">NanoLabs</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">Intelligent diagnostics</p>
          </div>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-accent">
            Dashboard
          </Link>
          <Link to="/upload" className="hover:text-accent">
            Upload
          </Link>
          <Link to="/profile" className="hover:text-accent">
            Profile
          </Link>
          {patient && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {patient.name || 'Patient'}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
