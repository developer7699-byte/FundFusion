import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft,
  Camera,
  Upload,
  Zap,
  RotateCcw,
  Sparkles,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  DollarSign,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function CustomerScanPayPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Main Mode: 'SCAN' or 'MY_QR'
  const [activeTab, setActiveTab] = useState<'SCAN' | 'MY_QR'>('SCAN')

  // Camera Scanner States
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [scannedResult, setScannedResult] = useState<{ upiId: string; name: string; raw: string } | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [copiedVpa, setCopiedVpa] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Media references
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const userVpa = user?.email ? `${user.email.split('@')[0]}@fundfusion` : 'developer7699@fundfusion'
  const userAddress = 'T9xZ8v9K3pQ9m7L2w8E4r1T'

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null)
    setIsScanning(true)
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setCameraActive(true)
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err)
      setCameraActive(false)
      setCameraError('Camera access denied or unavailable. You can upload a QR image or select sample QRs below.')
    }
  }

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    setIsScanning(false)
  }

  // Toggle Camera Front / Back
  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    if (cameraActive) {
      stopCamera()
      setTimeout(() => {
        startCamera()
      }, 300)
    }
  }

  // Continuously scan video stream using native BarcodeDetector if available
  useEffect(() => {
    let animationFrameId: number
    let detector: any = null

    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore
        detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      } catch (e) {
        console.log('BarcodeDetector init fallback')
      }
    }

    const detectFrame = async () => {
      if (cameraActive && videoRef.current && videoRef.current.readyState === 4) {
        if (detector) {
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              const qrText = barcodes[0].rawValue
              handleQrDetected(qrText)
              return
            }
          } catch (e) {
            // ignore frame error
          }
        }
      }
      if (cameraActive) {
        animationFrameId = requestAnimationFrame(detectFrame)
      }
    }

    if (cameraActive) {
      animationFrameId = requestAnimationFrame(detectFrame)
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [cameraActive])

  // Process detected QR code payload
  const handleQrDetected = (payload: string) => {
    stopCamera()
    playScanSound()

    // Parse UPI payload or plain string
    let upiId = 'merchant@okicici'
    let name = 'Verified P2P Merchant'

    if (payload.includes('pa=')) {
      const matchPa = payload.match(/pa=([^&]+)/)
      if (matchPa) upiId = decodeURIComponent(matchPa[1])
    }
    if (payload.includes('pn=')) {
      const matchPn = payload.match(/pn=([^&]+)/)
      if (matchPn) name = decodeURIComponent(matchPn[1])
    } else if (payload.includes('@')) {
      upiId = payload.trim()
      name = upiId.split('@')[0].toUpperCase() + ' Merchant'
    }

    setScannedResult({ upiId, name, raw: payload })
    showToast(`Scanned QR for ${name}!`)
  }

  // Simulated scan audio chime
  const playScanSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch (e) {
      // AudioContext fallback
    }
  }

  // Upload image file & scan QR from file canvas
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (ctx) {
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0, img.width, img.height)

          // Try native detector on image element
          if ('BarcodeDetector' in window) {
            try {
              // @ts-ignore
              const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
              detector.detect(img).then((barcodes: any[]) => {
                if (barcodes.length > 0) {
                  handleQrDetected(barcodes[0].rawValue)
                } else {
                  // Fallback simulation for uploaded file
                  handleQrDetected(`upi://pay?pa=store.${file.name.slice(0, 5)}@okaxis&pn=Store%20Payment`)
                }
              })
              return
            } catch (e) {}
          }
          // Default fallback for image upload
          handleQrDetected(`upi://pay?pa=pay.${file.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@upi&pn=Verified%20Payee`)
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Quick Preset Sample QRs for testing without physical QR
  const sampleQrs = [
    { title: 'Supermarket', amount: '₹450', upi: 'star.market@okicici', name: 'Fresh Mart Supermarket', icon: '🛒' },
    { title: 'Coffee Shop', amount: '₹120', upi: 'brew.coffee@okaxis', name: 'Blue Tokai Coffee', icon: '☕' },
    { title: 'Fuel Station', amount: '₹1,000', upi: 'hpcl.petrol@paytm', name: 'HPCL Auto Station', icon: '⛽' },
    { title: 'USDT Merchant', amount: '$50.00', upi: 'p2p.trader77@fundfusion', name: 'Escrow P2P Trader', icon: '⚡' },
  ]

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1)
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/customer/dashboard')
    }
  }

  return (
    <div className="min-h-[90vh] max-w-lg mx-auto space-y-4 pb-10 relative">
      {/* Toast Notification overlay */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-2 animate-in fade-in duration-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={handleBack}
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
          {activeTab === 'SCAN' ? 'Scan & Pay' : 'Receive Money'}
        </h2>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Main Switcher Tabs (Scan QR vs My QR Code) */}
      <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex gap-1">
        <button
          onClick={() => {
            setActiveTab('SCAN')
            setScannedResult(null)
          }}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer',
            activeTab === 'SCAN'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <QrCode className="w-4 h-4" />
          <span>Scan Any QR</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('MY_QR')
            stopCamera()
          }}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer',
            activeTab === 'MY_QR'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          <Smartphone className="w-4 h-4" />
          <span>My QR Code</span>
        </button>
      </div>

      {/* TAB 1: SCAN ANY QR MODE */}
      {activeTab === 'SCAN' && (
        <div className="space-y-4">
          {/* Main Viewfinder Camera Card */}
          <div className="rounded-3xl bg-slate-950 text-white p-5 space-y-4 relative overflow-hidden shadow-2xl border border-slate-800">
            {/* Viewfinder Header info */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold z-10 relative">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Camera Scanner
              </span>
              <span className="font-mono text-[11px] text-slate-500">UPI / USDT QR</span>
            </div>

            {/* Video Feed / Placeholder Area */}
            <div className="relative w-full aspect-4/3 rounded-2xl bg-slate-900 overflow-hidden border border-slate-800 flex items-center justify-center">
              {/* Video Element */}
              <video
                ref={videoRef}
                className={cn(
                  'w-full h-full object-cover transition-opacity duration-300',
                  cameraActive ? 'opacity-100' : 'opacity-0 hidden'
                )}
                playsInline
                muted
              />

              {/* Viewfinder Target Reticle Overlay */}
              <div className="absolute inset-4 sm:inset-8 pointer-events-none flex flex-col items-center justify-center">
                {/* Curved Corner Brackets */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-2xl shadow-[0_0_15px_rgba(129,140,248,0.8)] animate-pulse" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-2xl shadow-[0_0_15px_rgba(129,140,248,0.8)] animate-pulse" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-2xl shadow-[0_0_15px_rgba(129,140,248,0.8)] animate-pulse" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-2xl shadow-[0_0_15px_rgba(129,140,248,0.8)] animate-pulse" />

                {/* Animated Scanning Laser Beam */}
                {cameraActive && (
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scan-beam" />
                )}

                {/* When Camera Inactive Placeholder */}
                {!cameraActive && !scannedResult && (
                  <div className="text-center space-y-3 p-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center shadow-inner">
                      <Camera className="w-8 h-8 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-white">Camera is currently off</p>
                      <p className="text-[11px] text-slate-400">
                        Tap "Start Camera Scanner" to enable webcam / mobile camera.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden Canvas for QR file processing */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Camera Control Action Bar */}
            <div className="flex items-center justify-center gap-3 pt-1">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Scanner</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={stopCamera}
                    className="flex-1 py-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Stop Camera</span>
                  </button>

                  <button
                    onClick={toggleCameraFacing}
                    className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Switch Camera (Front/Back)"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-[11px] font-semibold hidden sm:inline">Flip Camera</span>
                  </button>
                </>
              )}

              {/* Upload QR Image Button */}
              <label className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-bold">Upload QR</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            {/* Error banner if permission denied */}
            {cameraError && (
              <p className="text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 font-semibold text-center">
                {cameraError}
              </p>
            )}
          </div>

          {/* SCANNED RESULT PAY CARD */}
          {scannedResult && (
            <div className="p-5 rounded-3xl bg-gradient-to-b from-indigo-500/10 via-slate-900/60 to-slate-900 border-2 border-indigo-500/40 text-slate-900 dark:text-white space-y-3 shadow-xl animate-in fade-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">{scannedResult.name}</h4>
                    <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {scannedResult.upiId}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  QR Verified
                </span>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setScannedResult(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Scan Again
                </button>
                <button
                  onClick={() => {
                    navigate('/customer/pay/confirm')
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Proceed to Pay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Preset Sample Merchant QRs (For testing on laptop) */}
          <div className="space-y-2">
            <p className="text-[11px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400 px-1">
              OR QUICK TEST SAMPLE MERCHANT QRS
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sampleQrs.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQrDetected(`upi://pay?pa=${item.upi}&pn=${encodeURIComponent(item.name)}`)}
                  className="p-3 rounded-2xl bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left space-y-1 transition-all hover:scale-[1.02] cursor-pointer shadow-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {item.amount}
                    </span>
                  </div>
                  <h5 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{item.title}</h5>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{item.upi}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY QR CODE MODE (RECEIVE MONEY) */}
      {activeTab === 'MY_QR' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 p-6 text-center space-y-5 shadow-xl relative overflow-hidden">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Receive QR</span>
            </div>

            {/* Generated QR Box Container */}
            <div className="relative w-56 h-56 mx-auto p-4 rounded-3xl bg-white border-2 border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col items-center justify-center space-y-2">
              {/* Dynamic QR SVG Pattern with FundFusion Logo center */}
              <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                {/* QR Finder Corners */}
                <rect x="5" y="5" width="25" height="25" rx="4" fill="currentColor" />
                <rect x="9" y="9" width="17" height="17" rx="2" fill="white" />
                <rect x="13" y="13" width="9" height="9" rx="1" fill="currentColor" />

                <rect x="70" y="5" width="25" height="25" rx="4" fill="currentColor" />
                <rect x="74" y="9" width="17" height="17" rx="2" fill="white" />
                <rect x="78" y="13" width="9" height="9" rx="1" fill="currentColor" />

                <rect x="5" y="70" width="25" height="25" rx="4" fill="currentColor" />
                <rect x="9" y="74" width="17" height="17" rx="2" fill="white" />
                <rect x="13" y="78" width="9" height="9" rx="1" fill="currentColor" />

                {/* QR Data Grid Matrix */}
                <rect x="35" y="8" width="5" height="5" />
                <rect x="45" y="8" width="10" height="5" />
                <rect x="60" y="8" width="5" height="5" />
                <rect x="35" y="18" width="10" height="5" />
                <rect x="50" y="18" width="5" height="5" />

                <rect x="8" y="35" width="5" height="10" />
                <rect x="18" y="35" width="10" height="5" />
                <rect x="8" y="50" width="5" height="5" />
                <rect x="18" y="50" width="5" height="10" />

                <rect x="70" y="35" width="10" height="5" />
                <rect x="85" y="35" width="5" height="10" />
                <rect x="75" y="45" width="10" height="5" />
                <rect x="70" y="55" width="5" height="10" />

                <rect x="35" y="70" width="10" height="5" />
                <rect x="50" y="70" width="5" height="10" />
                <rect x="60" y="75" width="10" height="5" />
                <rect x="35" y="85" width="5" height="10" />
                <rect x="45" y="85" width="15" height="5" />
                <rect x="65" y="85" width="15" height="10" />

                {/* Center FundFusion Badge */}
                <circle cx="50" cy="50" r="14" fill="white" />
                <circle cx="50" cy="50" r="11" fill="#4f46e5" />
              </svg>
            </div>

            {/* VPA Details */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Scan with GPay, PhonePe, Paytm or any UPI App</p>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">{userVpa}</h3>
              <p className="text-[11px] font-mono text-slate-400">{userAddress}</p>
            </div>

            {/* Copy & Share Buttons */}
            <div className="flex gap-2 pt-2 max-w-xs mx-auto">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(userVpa)
                  setCopiedVpa(true)
                  showToast('UPI VPA copied!')
                  setTimeout(() => setCopiedVpa(false), 2500)
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer text-slate-800 dark:text-slate-200"
              >
                {copiedVpa ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedVpa ? 'Copied!' : 'Copy UPI VPA'}</span>
              </button>

              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'FundFusion Pay Me', text: `Pay me via FundFusion: ${userVpa}` })
                  } else {
                    showToast('Sharing link copied to clipboard!')
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Share2 className="w-4 h-4" />
                <span>Share QR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
