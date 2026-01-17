import { Outlet } from 'react-router-dom'
import { Store } from 'lucide-react'

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-700 to-primary-800 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Store className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">ShopSmart Pro</h1>
              <p className="text-white/70 text-sm">Apni Dukaan, Smart Dukaan</p>
            </div>
          </div>
          
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            अपनी दुकान को<br />
            <span className="text-white/90">डिजिटल बनाएं</span>
          </h2>
          
          <p className="text-white/80 text-lg mb-8">
            एक ही जगह पर - उधार खाता, स्टॉक मैनेजमेंट, बिलिंग और बहुत कुछ। 
            अभी शुरू करें, बिल्कुल मुफ्त!
          </p>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">📒</span>
              </div>
              <span className="text-white">डिजिटल उधार खाता - बही खाते को अलविदा</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">📦</span>
              </div>
              <span className="text-white">स्मार्ट इन्वेंट्री - स्टॉक कभी खत्म नहीं</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
              <span className="text-white">बिज़नेस इनसाइट्स - सब कुछ एक नज़र में</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
