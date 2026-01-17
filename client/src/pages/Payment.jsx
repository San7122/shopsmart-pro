import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Copy, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { paymentsAPI, subscriptionsAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Payment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const method = searchParams.get('method') || 'upi'
  const plan = searchParams.get('plan') || 'pro'

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [paymentData, setPaymentData] = useState(null)
  const [error, setError] = useState('')
  const [proofData, setProofData] = useState({
    transactionId: '',
    utrNumber: ''
  })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    initiatePayment()
  }, [method, plan])

  const initiatePayment = async () => {
    setLoading(true)
    setError('')

    try {
      let res
      switch (method) {
        case 'upi':
          res = await paymentsAPI.initiateUpi({ plan })
          break
        case 'bank-transfer':
          res = await paymentsAPI.initiateBankTransfer({ plan })
          break
        case 'esewa':
          res = await paymentsAPI.initiateEsewa({ plan })
          if (res.data.data.esewaUrl) {
            // For eSewa, we can show manual option or redirect
            setPaymentData(res.data.data)
          }
          break
        case 'khalti':
          res = await paymentsAPI.initiateKhalti({ plan })
          if (res.data.data.khaltiData?.payment_url) {
            window.location.href = res.data.data.khaltiData.payment_url
            return
          }
          break
        default:
          throw new Error('Unknown payment method')
      }

      setPaymentData(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate payment')
      toast.error('Failed to initiate payment')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitProof = async () => {
    if (!proofData.transactionId && !proofData.utrNumber) {
      toast.error('Please enter transaction ID or UTR number')
      return
    }

    setSubmitting(true)

    try {
      if (method === 'upi') {
        await paymentsAPI.submitUpiProof({
          orderId: paymentData.orderId,
          utrNumber: proofData.utrNumber || proofData.transactionId
        })
      } else {
        await paymentsAPI.submitBankTransferProof({
          orderId: paymentData.orderId,
          transactionId: proofData.transactionId,
          utrNumber: proofData.utrNumber
        })
      }

      setSubmitted(true)
      toast.success('Payment proof submitted successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit proof')
    } finally {
      setSubmitting(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing payment...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Payment Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/pricing')}
            className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700"
          >
            Back to Pricing
          </button>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Payment Submitted!</h2>
          <p className="text-gray-600 mb-2">
            Your payment proof has been submitted successfully.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <Clock className="w-5 h-5 text-amber-600 mx-auto mb-2" />
            <p className="text-sm text-amber-800">
              Your account will be activated within <strong>2 hours</strong> after verification.
            </p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700"
          >
            Go to Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Pricing
        </button>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Amount Header */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-6 text-center">
            <p className="text-sm opacity-90 mb-1">Amount to Pay</p>
            <p className="text-4xl font-bold">
              {paymentData?.currency === 'NPR' ? 'रू' : '₹'}{paymentData?.amount}
            </p>
            <p className="text-sm opacity-90 mt-1">{paymentData?.plan} Plan</p>
          </div>

          <div className="p-6">
            {/* UPI Payment */}
            {method === 'upi' && paymentData && (
              <>
                <h3 className="font-semibold text-lg mb-4">Pay via UPI</h3>

                {/* UPI ID */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">Pay to UPI ID:</p>
                  <div className="flex items-center justify-between bg-white rounded-lg p-3 border">
                    <span className="font-mono text-lg">{paymentData.upiId}</span>
                    <button
                      onClick={() => copyToClipboard(paymentData.upiId)}
                      className="text-brand-600 hover:text-brand-700"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Open UPI App Button */}
                {paymentData.upiLink && (
                  <a
                    href={paymentData.upiLink}
                    className="block w-full bg-green-600 text-white text-center py-3 rounded-lg font-medium hover:bg-green-700 mb-4"
                  >
                    Open UPI App
                  </a>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
                  <ol className="text-sm text-blue-800 space-y-1">
                    {paymentData.instructions?.map((instruction, idx) => (
                      <li key={idx}>{instruction}</li>
                    ))}
                  </ol>
                </div>
              </>
            )}

            {/* Bank Transfer */}
            {method === 'bank-transfer' && paymentData && (
              <>
                <h3 className="font-semibold text-lg mb-4">Pay via Bank Transfer</h3>

                {/* Bank Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium mb-3">Bank Details:</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bank Name:</span>
                      <span className="font-medium">{paymentData.bankDetails?.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Name:</span>
                      <span className="font-medium">{paymentData.bankDetails?.accountName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Account Number:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{paymentData.bankDetails?.accountNumber}</span>
                        <button
                          onClick={() => copyToClipboard(paymentData.bankDetails?.accountNumber)}
                          className="text-brand-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">IFSC Code:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{paymentData.bankDetails?.ifscCode}</span>
                        <button
                          onClick={() => copyToClipboard(paymentData.bankDetails?.ifscCode)}
                          className="text-brand-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order ID */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-amber-800">
                    <strong>Important:</strong> Use this Order ID as payment reference/remarks:
                  </p>
                  <div className="flex items-center justify-between mt-2 bg-white rounded p-2">
                    <span className="font-mono font-bold">{paymentData.orderId}</span>
                    <button
                      onClick={() => copyToClipboard(paymentData.orderId)}
                      className="text-brand-600"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* eSewa Manual */}
            {method === 'esewa' && paymentData && (
              <>
                <h3 className="font-semibold text-lg mb-4">Pay via eSewa</h3>

                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-green-900 mb-2">Manual Payment:</h4>
                  <ol className="text-sm text-green-800 space-y-1">
                    {paymentData.manualOption?.instructions?.map((instruction, idx) => (
                      <li key={idx}>{instruction}</li>
                    ))}
                  </ol>
                </div>
              </>
            )}

            {/* Submit Proof Section */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-3">After Payment - Enter Transaction Details:</h4>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder={method === 'upi' ? 'UTR Number (12 digits)' : 'Transaction ID / Reference Number'}
                  value={method === 'upi' ? proofData.utrNumber : proofData.transactionId}
                  onChange={(e) => {
                    if (method === 'upi') {
                      setProofData({ ...proofData, utrNumber: e.target.value })
                    } else {
                      setProofData({ ...proofData, transactionId: e.target.value })
                    }
                  }}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />

                {method === 'bank-transfer' && (
                  <input
                    type="text"
                    placeholder="UTR Number (optional)"
                    value={proofData.utrNumber}
                    onChange={(e) => setProofData({ ...proofData, utrNumber: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                )}

                <button
                  onClick={handleSubmitProof}
                  disabled={submitting || (!proofData.transactionId && !proofData.utrNumber)}
                  className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit & Activate'}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Your subscription will be activated within 2 hours after verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
