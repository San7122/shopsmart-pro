import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Star, Zap, Building2, ArrowRight, Loader2, Globe, X } from 'lucide-react'
import { subscriptionsAPI } from '../services/api'
import PaymentMethods from '../components/PaymentMethods'
import toast from 'react-hot-toast'

// Load Razorpay script
const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Pricing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState(null)
  const [currentSubscription, setCurrentSubscription] = useState(null)
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' or 'yearly'
  const [processingPlan, setProcessingPlan] = useState(null)
  const [selectedCountry, setSelectedCountry] = useState('IN')
  const [countryConfig, setCountryConfig] = useState(null)
  const [supportedCountries, setSupportedCountries] = useState([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null)

  useEffect(() => {
    fetchData()
  }, [selectedCountry])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [plansRes, subRes] = await Promise.all([
        subscriptionsAPI.getPlans(selectedCountry),
        subscriptionsAPI.getMySubscription()
      ])
      setPlans(plansRes.data.data)
      setCountryConfig(plansRes.data.data.country)
      setSupportedCountries(plansRes.data.data.supportedCountries || [])
      setCurrentSubscription(subRes.data.data)
    } catch (error) {
      console.error('Error fetching plans:', error)
      toast.error('Failed to load pricing plans')
    } finally {
      setLoading(false)
    }
  }

  const handleStartTrial = async (planKey) => {
    setProcessingPlan(planKey)
    try {
      const response = await subscriptionsAPI.startTrial(planKey)
      toast.success(response.data.message)
      navigate('/settings')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start trial')
    } finally {
      setProcessingPlan(null)
    }
  }

  const handleSubscribe = async (planKey) => {
    // Show payment method selection modal
    setSelectedPlanForPayment(planKey)
    setShowPaymentModal(true)
  }

  const handleRazorpayPayment = async (planKey) => {
    setProcessingPlan(planKey)

    try {
      // Load Razorpay SDK
      const loaded = await loadRazorpay()
      if (!loaded) {
        toast.error('Payment gateway failed to load. Please try again.')
        setProcessingPlan(null)
        return
      }

      // Create order
      const response = await subscriptionsAPI.createSubscription(planKey)
      const { orderId, amount, currency, keyId, plan } = response.data.data

      // Razorpay options
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'ShopSmart Pro',
        description: plan.name,
        order_id: orderId,
        handler: async function (response) {
          try {
            // Verify payment
            await subscriptionsAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey
            })
            toast.success('Payment successful! Plan activated.')
            navigate('/settings')
          } catch (err) {
            toast.error('Payment verification failed')
          }
        },
        prefill: {
          name: currentSubscription?.subscription?.user?.name || '',
          email: currentSubscription?.subscription?.user?.email || '',
          contact: currentSubscription?.subscription?.user?.phone || ''
        },
        theme: {
          color: '#4F46E5'
        },
        modal: {
          ondismiss: function () {
            setProcessingPlan(null)
          }
        }
      }

      const paymentObject = new window.Razorpay(options)
      paymentObject.open()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate payment')
      setProcessingPlan(null)
    }
  }

  const handlePaymentSuccess = (data) => {
    setShowPaymentModal(false)
    setSelectedPlanForPayment(null)
    toast.success(data.message || 'Payment submitted! Your plan will be activated after verification.')
    navigate('/settings')
  }

  const handlePaymentCancel = () => {
    setShowPaymentModal(false)
    setSelectedPlanForPayment(null)
    setProcessingPlan(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    )
  }

  const monthlyPlans = plans?.monthly || {}
  const yearlyPlans = plans?.yearly || {}
  const currentPlan = currentSubscription?.subscription?.plan || 'free'
  const isTrialing = currentSubscription?.isInTrial
  const trialDaysLeft = currentSubscription?.trialDaysRemaining || 0
  const currencySymbol = countryConfig?.currencySymbol || '₹'

  // Get display prices based on selected country
  const getPrice = (planKey, cycle) => {
    if (cycle === 'monthly') {
      return monthlyPlans[planKey]?.displayPrice || `${currencySymbol}0`
    } else {
      return yearlyPlans[`${planKey}_yearly`]?.displayPrice || monthlyPlans[planKey]?.displayPrice
    }
  }

  const getSavings = (planKey) => {
    return yearlyPlans[`${planKey}_yearly`]?.savings || ''
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start with a 30-day free trial. No credit card required. Cancel anytime.
          </p>

          {/* Country Selector */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <Globe className="w-5 h-5 text-gray-500" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {supportedCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Trial Banner */}
          {isTrialing && (
            <div className="mt-6 inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full">
              <Zap className="w-5 h-5" />
              <span className="font-medium">
                Trial Active: {trialDaysLeft} days remaining
              </span>
            </div>
          )}

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingCycle === 'yearly' ? 'bg-brand-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Yearly
              <span className="ml-1 text-green-600">(Save 17%)</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className={`bg-white rounded-2xl shadow-lg p-8 border-2 ${
            currentPlan === 'free' ? 'border-brand-600' : 'border-transparent'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Star className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold">Free</h3>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold">{currencySymbol}0</span>
              <span className="text-gray-500">/forever</span>
            </div>

            <p className="text-gray-600 mb-6">
              Perfect for getting started with basic features.
            </p>

            <ul className="space-y-3 mb-8">
              {monthlyPlans.free?.features?.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              disabled={currentPlan === 'free'}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                currentPlan === 'free'
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
            </button>
          </div>

          {/* Pro Plan */}
          <div className={`bg-white rounded-2xl shadow-lg p-8 border-2 relative ${
            currentPlan === 'pro' || currentPlan === 'pro_yearly' ? 'border-brand-600' : 'border-brand-200'
          }`}>
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-brand-600 text-white text-sm font-medium px-4 py-1 rounded-full">
                Most Popular
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand-100 rounded-lg">
                <Zap className="w-6 h-6 text-brand-600" />
              </div>
              <h3 className="text-xl font-bold">Pro</h3>
            </div>

            <div className="mb-6">
              {billingCycle === 'monthly' ? (
                <>
                  <span className="text-4xl font-bold">{getPrice('pro', 'monthly')}</span>
                  <span className="text-gray-500">/month</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold">{getPrice('pro', 'yearly')}</span>
                  <span className="text-gray-500">/year</span>
                  <div className="text-sm text-green-600 mt-1">{getSavings('pro')}</div>
                </>
              )}
            </div>

            <p className="text-gray-600 mb-6">
              Everything you need to grow your business.
            </p>

            <ul className="space-y-3 mb-8">
              {monthlyPlans.pro?.features?.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            {currentPlan === 'pro' || currentPlan === 'pro_yearly' ? (
              <button
                disabled
                className="w-full py-3 rounded-lg font-medium bg-brand-100 text-brand-700 cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : currentSubscription?.subscription?.isTrialUsed ? (
              <button
                onClick={() => handleSubscribe(billingCycle === 'yearly' ? 'pro_yearly' : 'pro')}
                disabled={processingPlan !== null}
                className="w-full py-3 rounded-lg font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
              >
                {processingPlan === 'pro' || processingPlan === 'pro_yearly' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Subscribe Now <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => handleStartTrial('pro')}
                disabled={processingPlan !== null}
                className="w-full py-3 rounded-lg font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
              >
                {processingPlan === 'pro' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Start 30-Day Free Trial <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Business Plan */}
          <div className={`bg-white rounded-2xl shadow-lg p-8 border-2 ${
            currentPlan === 'business' || currentPlan === 'business_yearly' ? 'border-brand-600' : 'border-transparent'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold">Business</h3>
            </div>

            <div className="mb-6">
              {billingCycle === 'monthly' ? (
                <>
                  <span className="text-4xl font-bold">{getPrice('business', 'monthly')}</span>
                  <span className="text-gray-500">/month</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold">{getPrice('business', 'yearly')}</span>
                  <span className="text-gray-500">/year</span>
                  <div className="text-sm text-green-600 mt-1">{getSavings('business')}</div>
                </>
              )}
            </div>

            <p className="text-gray-600 mb-6">
              For growing businesses with multiple locations.
            </p>

            <ul className="space-y-3 mb-8">
              {monthlyPlans.business?.features?.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            {currentPlan === 'business' || currentPlan === 'business_yearly' ? (
              <button
                disabled
                className="w-full py-3 rounded-lg font-medium bg-purple-100 text-purple-700 cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : currentSubscription?.subscription?.isTrialUsed ? (
              <button
                onClick={() => handleSubscribe(billingCycle === 'yearly' ? 'business_yearly' : 'business')}
                disabled={processingPlan !== null}
                className="w-full py-3 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                {processingPlan === 'business' || processingPlan === 'business_yearly' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Subscribe Now <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => handleStartTrial('business')}
                disabled={processingPlan !== null}
                className="w-full py-3 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                {processingPlan === 'business' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Start 30-Day Free Trial <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Nepal Payment Info */}
        {selectedCountry === 'NP' && (
          <div className="mt-8 max-w-3xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Payment Options for Nepal</h3>
            <p className="text-blue-700 text-sm">
              Payments are processed in INR via Razorpay (cards accepted). Local payment options
              like eSewa, Khalti, and IME Pay coming soon! Prices shown are approximate NPR equivalents.
            </p>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>

          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="font-semibold mb-2">What happens after my 30-day trial?</h3>
              <p className="text-gray-600">
                After your trial ends, you'll be automatically charged the plan amount. You can cancel anytime before the trial ends to avoid charges.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="font-semibold mb-2">Can I change plans later?</h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan anytime. When upgrading, you'll be charged the difference. When downgrading, the new rate applies from the next billing cycle.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">
                {selectedCountry === 'IN'
                  ? 'We accept all major credit/debit cards, UPI (GPay, PhonePe, Paytm), Net Banking, and wallets through Razorpay.'
                  : 'We accept international credit/debit cards through Razorpay. Local payment methods (eSewa, Khalti) coming soon!'
                }
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="font-semibold mb-2">Is my payment information secure?</h3>
              <p className="text-gray-600">
                Absolutely! All payments are processed through Razorpay, a leading payment gateway. We never store your card details on our servers.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="font-semibold mb-2">Do you support multiple countries?</h3>
              <p className="text-gray-600">
                Yes! ShopSmart Pro is available in India and Nepal. Prices are shown in your local currency. More countries coming soon!
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Have questions? Contact us at{' '}
            <a href="mailto:support@shopsmart.pro" className="text-brand-600 hover:underline">
              support@shopsmart.pro
            </a>
          </p>
        </div>
      </div>

      {/* Payment Methods Modal */}
      {showPaymentModal && selectedPlanForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={handlePaymentCancel}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-6">
              <h2 className="text-xl font-bold mb-2 text-center">Choose Payment Method</h2>
              <p className="text-gray-600 text-center mb-6">
                Select how you want to pay for your subscription
              </p>

              {/* Payment Options */}
              <div className="space-y-3">
                {/* Card/Razorpay Option */}
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    handleRazorpayPayment(selectedPlanForPayment)
                  }}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all"
                >
                  <div className="text-3xl">💳</div>
                  <div className="text-left flex-1">
                    <div className="font-semibold">Card / Net Banking</div>
                    <div className="text-sm text-gray-500">Credit/Debit Card, Net Banking, Wallets</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </button>

                {/* UPI Option (India only) */}
                {selectedCountry === 'IN' && (
                  <button
                    onClick={() => {
                      setShowPaymentModal(false)
                      navigate(`/pay?method=upi&plan=${selectedPlanForPayment}`)
                    }}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all"
                  >
                    <div className="text-3xl">📱</div>
                    <div className="text-left flex-1">
                      <div className="font-semibold">UPI</div>
                      <div className="text-sm text-gray-500">GPay, PhonePe, Paytm, BHIM</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </button>
                )}

                {/* Bank Transfer Option */}
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    navigate(`/pay?method=bank-transfer&plan=${selectedPlanForPayment}`)
                  }}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="text-3xl">🏦</div>
                  <div className="text-left flex-1">
                    <div className="font-semibold">Bank Transfer</div>
                    <div className="text-sm text-gray-500">NEFT, RTGS, IMPS</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </button>

                {/* Nepal Payment Options */}
                {selectedCountry === 'NP' && (
                  <>
                    <button
                      onClick={() => {
                        setShowPaymentModal(false)
                        navigate(`/pay?method=esewa&plan=${selectedPlanForPayment}`)
                      }}
                      className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all"
                    >
                      <div className="text-3xl">💚</div>
                      <div className="text-left flex-1">
                        <div className="font-semibold">eSewa</div>
                        <div className="text-sm text-gray-500">Pay with eSewa wallet</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </button>

                    <button
                      onClick={() => {
                        setShowPaymentModal(false)
                        navigate(`/pay?method=khalti&plan=${selectedPlanForPayment}`)
                      }}
                      className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all"
                    >
                      <div className="text-3xl">💜</div>
                      <div className="text-left flex-1">
                        <div className="font-semibold">Khalti</div>
                        <div className="text-sm text-gray-500">Pay with Khalti wallet</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center mt-6">
                All payments are secure and encrypted. Your subscription will be activated immediately after payment verification.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
