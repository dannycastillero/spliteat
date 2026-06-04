import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <AuthProvider>
      <BillProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/share" element={<SharePage />} />
            <Route path="/share/:billId" element={<SharePage />} />
            <Route
              path="*"
              element={
                <>
                  <TopBar />
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/review" element={<ReviewPage />} />
                    <Route path="/assign" element={<AssignPage />} />
                    <Route path="/summary" element={<SummaryPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                  </Routes>
                </>
              }
            />
          </Routes>
        </BrowserRouter>
      </BillProvider>
    </AuthProvider>
  )
}
