import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { BillProvider } from './context/BillContext'
import { AuthProvider } from './context/AuthContext'
import TopBar from './components/TopBar'
import HomePage from './pages/HomePage'
import ReviewPage from './pages/ReviewPage'
import AssignPage from './pages/AssignPage'
import SummaryPage from './pages/SummaryPage'
import SharePage from './pages/SharePage'
import HistoryPage from './pages/HistoryPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import LoginPage from './pages/LoginPage'

const NO_TOPBAR_EXACT = ['/login', '/auth/callback', '/share']

function AppRoutes() {
  const { pathname } = useLocation()
  const showTopBar =
    !NO_TOPBAR_EXACT.some(p => pathname === p || pathname.startsWith('/share/')) &&
    !pathname.startsWith('/s/')

  return (
    <>
      {showTopBar && <TopBar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/assign" element={<AssignPage />} />
        <Route path="/summary" element={<SummaryPage />} />
        <Route path="/share" element={<SharePage />} />
        <Route path="/share/:billId" element={<SharePage />} />
        <Route path="/s/:code" element={<SharePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BillProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </BillProvider>
    </AuthProvider>
  )
}
