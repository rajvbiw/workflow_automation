import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Workflows from './pages/Workflows'

function App() {
  const token = localStorage.getItem('token')
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/workflows" element={token ? <Workflows /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to="/workflows" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App