import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BillProvider } from './context/BillContext'
import HomePage from './pages/HomePage'
import ReviewPage from './pages/ReviewPage'
import AssignPage from './pages/AssignPage'
import SummaryPage from './pages/SummaryPage'
import SharePage from './pages/SharePage'

export default function App() {
  return (
    <BillProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/assign" element={<AssignPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/share/:billId" element={<SharePage />} />
        </Routes>
      </BrowserRouter>
    </BillProvider>
  )
}
