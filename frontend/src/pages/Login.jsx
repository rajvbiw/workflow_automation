import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function Login() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      setTimeout(() => navigate('/workflows'), 600) // slight delay for animation
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center" style={{ minHeight: '100vh', justifyContent: 'center' }}>
      <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="logo-text" style={{ justifyContent: 'center' }}>
             <span>Nexus</span> Flow
          </div>
          <p style={{ marginTop: '0.5rem' }}>Welcome back. Sign in to your automation engine.</p>
        </div>
        
        {error && (
          <div className="badge error" style={{ display: 'block', textAlign: 'center', marginBottom: '1.5rem', padding: '0.75rem', borderRadius: '8px' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex grid gap-4" style={{ gridTemplateColumns: '1fr' }}>
          <div>
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="primary" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
            Demo Account:<br/>admin@example.com / admin
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login