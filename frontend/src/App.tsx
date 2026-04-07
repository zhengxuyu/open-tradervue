import { useEffect, useState } from 'react'
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
import { supabase } from '@/services/supabase'
import type { Session } from '@supabase/supabase-js'

function PrivateRoute({ session, children }: { session: Session | null; children: React.ReactNode }) {
  if (!session) {
    return <Navigate to="/" replace />
  }
  return <Layout>{children}</Layout>
}

function HomePage({ session }: { session: Session | null }) {
  if (session) {
    return <Layout><Dashboard /></Layout>
  }
  return <Landing />
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes (OAuth callback, login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-outline text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={session ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/" element={<HomePage session={session} />} />
        <Route path="/trades" element={<PrivateRoute session={session}><Trades /></PrivateRoute>} />
        <Route path="/positions/daily" element={<PrivateRoute session={session}><DailyPositionDetail /></PrivateRoute>} />
        <Route path="/positions/:id" element={<PrivateRoute session={session}><PositionDetailPage /></PrivateRoute>} />
        <Route path="/import" element={<PrivateRoute session={session}><Import /></PrivateRoute>} />
        <Route path="/calendar" element={<PrivateRoute session={session}><Calendar /></PrivateRoute>} />
        <Route path="/analysis" element={<PrivateRoute session={session}><Analysis /></PrivateRoute>} />
        <Route path="/statistics" element={<PrivateRoute session={session}><Statistics /></PrivateRoute>} />
        <Route path="/charts" element={<PrivateRoute session={session}><Charts /></PrivateRoute>} />
        <Route path="/journal" element={<PrivateRoute session={session}><Journal /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute session={session}><Settings /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
