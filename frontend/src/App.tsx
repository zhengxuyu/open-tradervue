import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/positions/daily" element={<DailyPositionDetail />} />
          <Route path="/positions/:id" element={<PositionDetailPage />} />
          <Route path="/import" element={<Import />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/journal" element={<Journal />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
