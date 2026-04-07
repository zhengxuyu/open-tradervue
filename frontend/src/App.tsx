import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Trades } from '@/pages/Trades'
import { PositionDetailPage } from '@/pages/PositionDetail'
import { DailyPositionDetail } from '@/pages/DailyPositionDetail'
import { Import } from '@/pages/Import'
import { Calendar } from '@/pages/Calendar'
import { Analysis } from '@/pages/Analysis'
import { Statistics } from '@/pages/Statistics'
import { Charts } from '@/pages/Charts'
import { Journal } from '@/pages/Journal'
import { Settings } from '@/pages/Settings'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Landing } from '@/pages/Landing'
import { isAuthenticated } from '@/services/auth'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />
  }
  return <Layout>{children}</Layout>
}

function HomePage() {
  if (isAuthenticated()) {
    return <Layout><Dashboard /></Layout>
  }
  return <Landing />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/trades" element={<PrivateRoute><Trades /></PrivateRoute>} />
        <Route path="/positions/daily" element={<PrivateRoute><DailyPositionDetail /></PrivateRoute>} />
        <Route path="/positions/:id" element={<PrivateRoute><PositionDetailPage /></PrivateRoute>} />
        <Route path="/import" element={<PrivateRoute><Import /></PrivateRoute>} />
        <Route path="/calendar" element={<PrivateRoute><Calendar /></PrivateRoute>} />
        <Route path="/analysis" element={<PrivateRoute><Analysis /></PrivateRoute>} />
        <Route path="/statistics" element={<PrivateRoute><Statistics /></PrivateRoute>} />
        <Route path="/charts" element={<PrivateRoute><Charts /></PrivateRoute>} />
        <Route path="/journal" element={<PrivateRoute><Journal /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
