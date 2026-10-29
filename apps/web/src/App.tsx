import { Route, Routes } from 'react-router'

import PublicLayout from './components/layout/PublicLayout'
import AppLayout from './components/layout/AppLayout'

import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
