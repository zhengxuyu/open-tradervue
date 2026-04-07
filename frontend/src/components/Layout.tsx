import { Sidebar } from './Sidebar'
import { Citation } from './Citation'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased">
      <Sidebar />
      <main className="ml-64 min-h-screen pb-8">
        {children}
      </main>
      <Citation />
    </div>
  )
}
