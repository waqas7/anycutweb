import { Navigate, Route, Routes } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { ProjectDetail } from './pages/ProjectDetail'
import { OptimizePage } from './pages/Optimize'
import './App.css'

export default function App() {
  return (
    <div className="app-shell">
      <div className="app-bg" aria-hidden />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="/project/:id/optimize" element={<OptimizePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="site-footer">
        <span>AnyCut Web</span>
        <span className="dot">·</span>
        <span>Cut lists & nesting in your browser</span>
      </footer>
    </div>
  )
}
