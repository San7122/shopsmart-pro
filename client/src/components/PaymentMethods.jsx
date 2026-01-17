import { useState, useEffect } from 'react'
import { paymentsAPI } from '../services/api'

// Payment method icons (using emoji for simplicity - can replace with actual icons)
const PAYMENT_ICONS = {
  upi: '📱',
  bank_transfer: '🏦',
  esewa: '💚',
  khalti: '💜',
  card: '💳'
}

const PaymentMethods = ({ plan, country, onSuccess, onCancel }) => {
  const [methods, setMethods] = useState([])
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [step, setStep] = useState('select') // select, pay, proof
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentData, setPaymentData] = useState(null)
  const [proofData, setProofData] = useState({ transactionId: '', utrNumber: '' })

  useEffect(() => {
    fetchPaymentMethods()
  }, [country])

  const fetchPaymentMethods = async () => {
    try {
      const res = await paymentsAPI.getMethods(country)
      setMethods(res.data.data.methods)
    } catch (err) {
      setError('Failed to load payment methods')
    }
  }

  const handleSelectMethod = (method) => {
    setSelectedMethod(method)
    setStep('pay')
    initiatePayment(method)
  }

  const initiatePayment = async (method) => {
    setLoading(true)
    setError('')

    try {
      let res
      switch (method.id) {
        case 'upi':
          res = await paymentsAPI.initiateUpi({ plan })
          break
        case 'bank_transfer':
          res = await paymentsAPI.initiateBankTransfer({ plan })
          break
        case 'esewa':
          res = await paymentsAPI.initiateEsewa({ plan })
          // eSewa redirects to their page
          if (res.data.data.redirectUrl) {
            window.location.href = res.data.data.redirectUrl
            return
          }
          break
        case 'khalti':
          res = await paymentsAPI.initiateKhalti({ plan })
          // Khalti opens in popup/redirect
          if (res.data.data.payment_url) {
            window.location.href = res.data.data.payment_url
            return
          }
          break
        default:
          throw new Error('Unknown payment method')
      }

      setPaymentData(res.data.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Payment initiation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitProof = async () => {
    setLoading(true)
    setError('')

    try {
      let res
      if (selectedMethod.id === 'upi') {
        res = await paymentsAPI.submitUpiProof({
          orderId: paymentData.orderId,
          utrNumber: proofData.utrNumber
        })
      } else if (selectedMethod.id === 'bank_transfer') {
        res = await paymentsAPI.submitBankTransferProof({
          orderId: paymentData.orderId,
          transactionId: proofData.transactionId,
          utrNumber: proofData.utrNumber
        })
      }

      onSuccess(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit payment proof')
    } finally {
      setLoading(false)
    }
  }

  // Render method selection
  if (step === 'select') {
    return (
      <div className="payment-methods">
        <h3>Choose Payment Method</h3>
        <p className="subtitle">Select how you want to pay for {plan} plan</p>

        {error && <div className="error-message">{error}</div>}

        <div className="methods-grid">
          {methods.map((method) => (
            <button
              key={method.id}
              className="method-card"
              onClick={() => handleSelectMethod(method)}
            >
              <span className="method-icon">{PAYMENT_ICONS[method.id]}</span>
              <span className="method-name">{method.name}</span>
              <span className="method-desc">{method.description}</span>
            </button>
          ))}
        </div>

        <button className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>

        <style jsx>{`
          .payment-methods {
            padding: 20px;
            max-width: 500px;
            margin: 0 auto;
          }
          h3 {
            text-align: center;
            margin-bottom: 5px;
          }
          .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 20px;
          }
          .error-message {
            background: #fee;
            color: #c00;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 15px;
          }
          .methods-grid {
            display: grid;
            gap: 12px;
          }
          .method-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
          }
          .method-card:hover {
            border-color: #4CAF50;
            background: #f8fff8;
          }
          .method-icon {
            font-size: 28px;
          }
          .method-name {
            font-weight: 600;
            flex: 1;
            text-align: left;
          }
          .method-desc {
            font-size: 12px;
            color: #666;
          }
          .cancel-btn {
            display: block;
            width: 100%;
            margin-top: 15px;
            padding: 12px;
            border: none;
            background: #f5f5f5;
            border-radius: 8px;
            cursor: pointer;
          }
        `}</style>
      </div>
    )
  }

  // Render UPI payment
  if (step === 'pay' && selectedMethod?.id === 'upi' && paymentData) {
    return (
      <div className="payment-upi">
        <h3>Pay via UPI</h3>

        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="upi-container">
          <div className="amount-box">
            <span className="label">Amount to Pay</span>
            <span className="amount">{paymentData.currency} {paymentData.amount}</span>
          </div>

          {paymentData.qrData && (
            <div className="qr-section">
              <p>Scan QR Code with any UPI app</p>
              <div className="qr-placeholder">
                {/* In real app, generate QR from paymentData.qrData */}
                <div className="qr-box">QR Code</div>
                <small>PhonePe | GPay | Paytm | BHIM</small>
              </div>
            </div>
          )}

          <div className="divider">OR</div>

          <div className="upi-id-section">
            <p>Pay to UPI ID:</p>
            <div className="upi-id">{paymentData.upiId}</div>
            <button
              className="copy-btn"
              onClick={() => navigator.clipboard.writeText(paymentData.upiId)}
            >
              Copy UPI ID
            </button>
          </div>

          {paymentData.upiLink && (
            <a
              href={paymentData.upiLink}
              className="upi-link-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open UPI App
            </a>
          )}
        </div>

        <div className="proof-section">
          <h4>After Payment</h4>
          <p>Enter your UPI Transaction ID / UTR Number</p>
          <input
            type="text"
            placeholder="Enter UTR Number (12 digits)"
            value={proofData.utrNumber}
            onChange={(e) => setProofData({ ...proofData, utrNumber: e.target.value })}
          />
          <button
            className="submit-btn"
            onClick={handleSubmitProof}
            disabled={!proofData.utrNumber || loading}
          >
            {loading ? 'Submitting...' : 'Submit & Activate'}
          </button>
        </div>

        <button className="back-btn" onClick={() => { setStep('select'); setPaymentData(null); }}>
          Back to Payment Methods
        </button>

        <style jsx>{`
          .payment-upi {
            padding: 20px;
            max-width: 400px;
            margin: 0 auto;
          }
          h3 {
            text-align: center;
            margin-bottom: 20px;
          }
          .loading {
            text-align: center;
            padding: 20px;
            color: #666;
          }
          .error-message {
            background: #fee;
            color: #c00;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 15px;
          }
          .upi-container {
            background: #f9f9f9;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .amount-box {
            text-align: center;
            margin-bottom: 20px;
          }
          .amount-box .label {
            display: block;
            color: #666;
            font-size: 14px;
          }
          .amount-box .amount {
            font-size: 32px;
            font-weight: bold;
            color: #2e7d32;
          }
          .qr-section {
            text-align: center;
            margin-bottom: 20px;
          }
          .qr-placeholder {
            background: white;
            padding: 20px;
            border-radius: 8px;
            display: inline-block;
          }
          .qr-box {
            width: 150px;
            height: 150px;
            background: #eee;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 10px;
            border-radius: 8px;
          }
          .divider {
            text-align: center;
            color: #999;
            margin: 15px 0;
            position: relative;
          }
          .divider::before, .divider::after {
            content: '';
            position: absolute;
            top: 50%;
            width: 40%;
            height: 1px;
            background: #ddd;
          }
          .divider::before { left: 0; }
          .divider::after { right: 0; }
          .upi-id-section {
            text-align: center;
          }
          .upi-id {
            font-family: monospace;
            font-size: 18px;
            background: white;
            padding: 10px 20px;
            border-radius: 8px;
            margin: 10px 0;
          }
          .copy-btn {
            background: #e3f2fd;
            color: #1976d2;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
          }
          .upi-link-btn {
            display: block;
            text-align: center;
            background: #4CAF50;
            color: white;
            padding: 12px;
            border-radius: 8px;
            text-decoration: none;
            margin-top: 15px;
            font-weight: 500;
          }
          .proof-section {
            background: #fff3e0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
          }
          .proof-section h4 {
            margin: 0 0 5px;
          }
          .proof-section p {
            color: #666;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .proof-section input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 10px;
            box-sizing: border-box;
          }
          .submit-btn {
            width: 100%;
            background: #ff9800;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
          }
          .submit-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          .back-btn {
            width: 100%;
            background: #f5f5f5;
            border: none;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
          }
        `}</style>
      </div>
    )
  }

  // Render Bank Transfer payment
  if (step === 'pay' && selectedMethod?.id === 'bank_transfer' && paymentData) {
    return (
      <div className="payment-bank">
        <h3>Pay via Bank Transfer</h3>

        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="bank-container">
          <div className="amount-box">
            <span className="label">Amount to Pay</span>
            <span className="amount">{paymentData.currency} {paymentData.amount}</span>
          </div>

          <div className="bank-details">
            <h4>Bank Details</h4>
            <div className="detail-row">
              <span className="label">Account Name:</span>
              <span className="value">{paymentData.bankDetails.accountName}</span>
            </div>
            <div className="detail-row">
              <span className="label">Account Number:</span>
              <span className="value">{paymentData.bankDetails.accountNumber}</span>
            </div>
            <div className="detail-row">
              <span className="label">IFSC Code:</span>
              <span className="value">{paymentData.bankDetails.ifscCode}</span>
            </div>
            <div className="detail-row">
              <span className="label">Bank Name:</span>
              <span className="value">{paymentData.bankDetails.bankName}</span>
            </div>
            {paymentData.bankDetails.branch && (
              <div className="detail-row">
                <span className="label">Branch:</span>
                <span className="value">{paymentData.bankDetails.branch}</span>
              </div>
            )}
            {paymentData.bankDetails.swiftCode && (
              <div className="detail-row">
                <span className="label">SWIFT Code:</span>
                <span className="value">{paymentData.bankDetails.swiftCode}</span>
              </div>
            )}
          </div>

          <div className="order-info">
            <p>Order ID: <strong>{paymentData.orderId}</strong></p>
            <small>Please mention this Order ID in payment remarks</small>
          </div>
        </div>

        <div className="proof-section">
          <h4>After Payment</h4>
          <p>Enter your transaction details</p>
          <input
            type="text"
            placeholder="Transaction ID / Reference Number"
            value={proofData.transactionId}
            onChange={(e) => setProofData({ ...proofData, transactionId: e.target.value })}
          />
          <input
            type="text"
            placeholder="UTR Number (if available)"
            value={proofData.utrNumber}
            onChange={(e) => setProofData({ ...proofData, utrNumber: e.target.value })}
          />
          <button
            className="submit-btn"
            onClick={handleSubmitProof}
            disabled={!proofData.transactionId || loading}
          >
            {loading ? 'Submitting...' : 'Submit & Activate'}
          </button>
        </div>

        <button className="back-btn" onClick={() => { setStep('select'); setPaymentData(null); }}>
          Back to Payment Methods
        </button>

        <style jsx>{`
          .payment-bank {
            padding: 20px;
            max-width: 450px;
            margin: 0 auto;
          }
          h3 {
            text-align: center;
            margin-bottom: 20px;
          }
          .loading {
            text-align: center;
            padding: 20px;
            color: #666;
          }
          .error-message {
            background: #fee;
            color: #c00;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 15px;
          }
          .bank-container {
            background: #f9f9f9;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .amount-box {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #ddd;
          }
          .amount-box .label {
            display: block;
            color: #666;
            font-size: 14px;
          }
          .amount-box .amount {
            font-size: 32px;
            font-weight: bold;
            color: #2e7d32;
          }
          .bank-details {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
          }
          .bank-details h4 {
            margin: 0 0 15px;
            color: #333;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-row .label {
            color: #666;
            font-size: 14px;
          }
          .detail-row .value {
            font-weight: 500;
            font-family: monospace;
          }
          .order-info {
            text-align: center;
            background: #e3f2fd;
            padding: 12px;
            border-radius: 8px;
          }
          .order-info p {
            margin: 0;
          }
          .order-info small {
            color: #666;
          }
          .proof-section {
            background: #fff3e0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
          }
          .proof-section h4 {
            margin: 0 0 5px;
          }
          .proof-section p {
            color: #666;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .proof-section input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 10px;
            box-sizing: border-box;
          }
          .submit-btn {
            width: 100%;
            background: #ff9800;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
          }
          .submit-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          .back-btn {
            width: 100%;
            background: #f5f5f5;
            border: none;
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
          }
        `}</style>
      </div>
    )
  }

  // Loading state
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading payment options...</p>
      <style jsx>{`
        .loading-container {
          text-align: center;
          padding: 40px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #4CAF50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default PaymentMethods
