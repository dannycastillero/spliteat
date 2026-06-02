import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ocrReceipt } from '../api/client'
import { useBill } from '../context/BillContext'
import BottomNav from '../components/BottomNav'

export default function HomePage() {
  const navigate = useNavigate()
  const { setItems, setRawImage, resetBill } = useBill()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const recentBills: Array<{ shareUrl: string; date: string; total: string }> =
    JSON.parse(localStorage.getItem('spliteat_recent') || '[]')

  const handleFile = async (file: File) => {
    const base64 = await fileToBase64(file)
    const mediaType = file.type as 'image/jpeg' | 'image/png'
    setRawImage(base64)
    try {
      const result = await ocrReceipt(base64, mediaType)
      setItems(
        result.items.map(i => ({
          id: crypto.randomUUID(),
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
          isPotentialAlcohol: i.isPotentialAlcohol,
          isAlcohol: false,
          assignedTo: [],
        }))
      )
      navigate('/review')
    } catch {
      alert('No se pudo leer la factura. Intenta de nuevo o usa entrada manual.')
    }
  }

  const handleNewBill = () => {
    resetBill()
    navigate('/review')
  }

  return (
    <div className="flex flex-col min-h-screen pb-20 px-5">
      <header className="flex items-center justify-between pt-10 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-primary text-xl">✕</span>
          <span className="font-heading font-bold text-xl text-on-surface">SplitEat</span>
        </div>
      </header>

      <h1 className="font-heading font-bold text-3xl text-on-surface mb-1">
        Welcome to SplitEat!
      </h1>
      <p className="text-on-surface-variant mb-6">Let's split that bill easily.</p>

      <button
        onClick={() => cameraInputRef.current?.click()}
        className="w-full bg-[#B3272E] rounded-2xl p-6 text-left text-white mb-3"
      >
        <div className="text-3xl mb-2">📷</div>
        <div className="font-heading font-bold text-xl">Scan Bill</div>
        <div className="text-sm opacity-80">Auto-detect items &amp; prices</div>
      </button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <div className="flex gap-3 mb-8">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-gray-100 rounded-2xl p-5 flex flex-col items-center gap-2 text-primary"
        >
          <span className="text-2xl">☁️</span>
          <span className="font-heading font-semibold text-sm">Upload Photos</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        <button
          onClick={handleNewBill}
          className="flex-1 bg-secondary rounded-2xl p-5 flex flex-col items-center gap-2 text-on-surface"
        >
          <span className="text-2xl">✏️</span>
          <span className="font-heading font-semibold text-sm">Manual Entry</span>
        </button>
      </div>

      {recentBills.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-heading font-bold text-sm">Recent Receipts</span>
            <button
              onClick={() => { localStorage.removeItem('spliteat_recent'); window.location.reload() }}
              className="text-primary text-xs font-bold uppercase"
            >
              Clear All
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentBills.map(b => (
              <a
                key={b.shareUrl}
                href={b.shareUrl}
                className="flex-shrink-0 w-24 h-24 bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center gap-1 border border-gray-100"
              >
                <span className="text-2xl">🧾</span>
                <span className="text-xs text-gray-500">{b.date}</span>
                <span className="text-xs font-bold text-primary">${b.total}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
  })
}
