import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Edit2, 
  Trash2,
  Plus,
  Minus,
  IndianRupee,
  Clock,
  MessageCircle,
  MoreVertical,
  Download
} from 'lucide-react'
import { customersAPI, transactionsAPI } from '../../services/api'
import { formatCurrency, formatDate, getInitials, getAvatarColor } from '../../utils/helpers'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'

const CustomerDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionType, setTransactionType] = useState('credit')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    fetchCustomer()
    fetchTransactions()
  }, [id])

  const fetchCustomer = async () => {
    try {
      const response = await customersAPI.getOne(id)
      if (response.data.success) {
        setCustomer(response.data.data)
      }
    } catch (error) {
      toast.error('Failed to load customer')
      navigate('/customers')
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await customersAPI.getTransactions(id, { limit: 50 })
      if (response.data.success) {
        setTransactions(response.data.data)
      }
    } catch (error) {
      console.error('Failed to load transactions')
    }
  }

  const handleDelete = async () => {
    try {
      await customersAPI.delete(id)
      toast.success('Customer deleted')
      navigate('/customers')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete customer')
    }
  }

  const openTransactionModal = (type) => {
    setTransactionType(type)
    setShowTransactionModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found</p>
        <Link to="/customers" className="btn-primary mt-4">Back to Customers</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/customers')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Customer Details</h1>
      </div>

      {/* Customer Info Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl ${getAvatarColor(customer.name)} flex items-center justify-center text-white text-xl font-semibold`}>
              {getInitials(customer.name)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-gray-500 hover:text-brand-600 mt-1">
                  <Phone className="w-4 h-4" />
                  {customer.phone}
                </a>
              )}
              {customer.address && (
                <p className="flex items-center gap-2 text-gray-500 mt-1">
                  <MapPin className="w-4 h-4" />
                  {customer.address}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowDeleteModal(true)}
              className="btn-ghost text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Balance Display */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className={`text-3xl font-bold ${customer.balance > 0 ? 'text-red-600' : customer.balance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                {formatCurrency(Math.abs(customer.balance))}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {customer.balance > 0 ? 'Customer owes you' : customer.balance < 0 ? 'You owe customer' : 'No pending balance'}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => openTransactionModal('credit')}
                className="btn bg-red-100 text-red-700 hover:bg-red-200"
              >
                <Plus className="w-4 h-4" />
                Credit
              </button>
              <button 
                onClick={() => openTransactionModal('payment')}
                className="btn bg-green-100 text-green-700 hover:bg-green-200"
              >
                <Minus className="w-4 h-4" />
                Payment
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <p className="text-xs text-red-600">Total Credit</p>
            <p className="text-lg font-semibold text-red-700">{formatCurrency(customer.totalCredit)}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <p className="text-xs text-green-600">Total Paid</p>
            <p className="text-lg font-semibold text-green-700">{formatCurrency(customer.totalPaid)}</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-xl">
            <p className="text-xs text-amber-600">Trust Score</p>
            <p className="text-lg font-semibold text-amber-700">{'⭐'.repeat(customer.trustScore || 3)}</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
          <span className="text-sm text-gray-500">{transactions.length} transactions</span>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No transactions yet</p>
            <p className="text-sm text-gray-400">Add credit or record payment to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((txn) => (
              <div 
                key={txn._id}
                className={`flex items-center justify-between p-4 rounded-xl ${
                  txn.type === 'credit' ? 'bg-red-50' : 'bg-green-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    txn.type === 'credit' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {txn.type === 'credit' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {txn.type === 'credit' ? 'Credit Given' : 'Payment Received'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(txn.transactionDate, 'datetime')}
                      {txn.paymentMethod && txn.type === 'payment' && ` • ${txn.paymentMethod.toUpperCase()}`}
                    </p>
                    {txn.description && (
                      <p className="text-sm text-gray-600 mt-1">{txn.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${txn.type === 'credit' ? 'text-red-600' : 'text-green-600'}`}>
                    {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Balance: {formatCurrency(txn.balanceAfter)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <TransactionModal 
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        type={transactionType}
        customerId={id}
        customerName={customer.name}
        onSuccess={() => {
          setShowTransactionModal(false)
          fetchCustomer()
          fetchTransactions()
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Customer"
        size="sm"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{customer.name}</strong>? 
            This action cannot be undone.
          </p>
          {customer.balance !== 0 && (
            <p className="text-red-600 text-sm mb-4">
              ⚠️ This customer has a pending balance of {formatCurrency(Math.abs(customer.balance))}
            </p>
          )}
          <div className="flex gap-3">
            <button 
              onClick={() => setShowDeleteModal(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button 
              onClick={handleDelete}
              className="btn-danger flex-1"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Transaction Modal Component
const TransactionModal = ({ isOpen, onClose, type, customerId, customerName, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    paymentMethod: 'cash'
  })
  const [loading, setLoading] = useState(false)

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      const response = await transactionsAPI.create({
        customerId,
        type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        paymentMethod: type === 'payment' ? formData.paymentMethod : undefined
      })
      
      if (response.data.success) {
        toast.success(type === 'credit' ? 'Credit added successfully' : 'Payment recorded successfully')
        setFormData({ amount: '', description: '', paymentMethod: 'cash' })
        onSuccess()
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={type === 'credit' ? 'Add Credit' : 'Record Payment'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={`p-4 rounded-xl ${type === 'credit' ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className="text-sm text-gray-600">Customer</p>
          <p className="font-semibold text-gray-900">{customerName}</p>
        </div>

        <div>
          <label className="label">Amount (₹) *</label>
          <div className="relative">
            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Enter amount"
              className="input pl-12 text-lg font-semibold"
              step="0.01"
              min="0"
              autoFocus
            />
          </div>
        </div>

        {type === 'payment' && (
          <div>
            <label className="label">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.value }))}
                  className={`p-3 rounded-xl text-sm font-medium transition-colors ${
                    formData.paymentMethod === method.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">Description (Optional)</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="e.g., Monthly groceries, Bill payment"
            className="input"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className={`flex-1 ${type === 'credit' ? 'btn bg-red-600 text-white hover:bg-red-700' : 'btn-success'}`}
          >
            {loading ? 'Processing...' : type === 'credit' ? 'Add Credit' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CustomerDetail
