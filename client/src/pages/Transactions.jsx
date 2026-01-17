import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeftRight, 
  Plus, 
  Minus,
  Filter,
  Calendar,
  Download
} from 'lucide-react'
import { transactionsAPI } from '../services/api'
import { formatCurrency, formatDate, downloadCSV } from '../utils/helpers'
import toast from 'react-hot-toast'

const Transactions = () => {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  })

  useEffect(() => {
    fetchTransactions()
  }, [filter, pagination.page])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: 30,
        type: filter || undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined
      }
      
      const response = await transactionsAPI.getAll(params)
      if (response.data.success) {
        setTransactions(response.data.data)
        setSummary(response.data.summary)
        setPagination(prev => ({
          ...prev,
          totalPages: response.data.totalPages,
          total: response.data.total
        }))
      }
    } catch (error) {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const exportData = transactions.map(txn => ({
      Date: formatDate(txn.transactionDate, 'datetime'),
      Customer: txn.customer?.name || 'N/A',
      Type: txn.type === 'credit' ? 'Credit' : 'Payment',
      Amount: txn.amount,
      'Payment Method': txn.paymentMethod || 'N/A',
      Description: txn.description || '',
      'Balance After': txn.balanceAfter
    }))
    downloadCSV(exportData, `transactions-${new Date().toISOString().split('T')[0]}`)
    toast.success('Transactions exported successfully')
  }

  const handleDateFilter = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchTransactions()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500">View all credit and payment records</p>
        </div>
        <button 
          onClick={handleExport}
          className="btn-secondary"
          disabled={transactions.length === 0}
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-red-50 border-none">
            <p className="text-sm text-red-600">Total Credit</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(summary.totalCredit)}</p>
            <p className="text-xs text-red-500 mt-1">{summary.creditCount} transactions</p>
          </div>
          <div className="card bg-green-50 border-none">
            <p className="text-sm text-green-600">Total Payments</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(summary.totalPayments)}</p>
            <p className="text-xs text-green-500 mt-1">{summary.paymentCount} transactions</p>
          </div>
          <div className="card bg-amber-50 border-none">
            <p className="text-sm text-amber-600">Net Balance</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {formatCurrency(summary.totalCredit - summary.totalPayments)}
            </p>
            <p className="text-xs text-amber-500 mt-1">Credit - Payments</p>
          </div>
          <div className="card bg-blue-50 border-none">
            <p className="text-sm text-blue-600">Total Transactions</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {summary.creditCount + summary.paymentCount}
            </p>
            <p className="text-xs text-blue-500 mt-1">All time</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Type Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => { setFilter(''); setPagination(prev => ({ ...prev, page: 1 })) }}
              className={`btn ${filter === '' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All
            </button>
            <button
              onClick={() => { setFilter('credit'); setPagination(prev => ({ ...prev, page: 1 })) }}
              className={`btn ${filter === 'credit' ? 'bg-red-600 text-white' : 'btn-secondary'}`}
            >
              <Plus className="w-4 h-4" />
              Credit
            </button>
            <button
              onClick={() => { setFilter('payment'); setPagination(prev => ({ ...prev, page: 1 })) }}
              className={`btn ${filter === 'payment' ? 'bg-green-600 text-white' : 'btn-secondary'}`}
            >
              <Minus className="w-4 h-4" />
              Payment
            </button>
          </div>

          {/* Date Range */}
          <div className="flex gap-2 flex-1 lg:justify-end">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="input pl-10 w-40"
                placeholder="Start date"
              />
            </div>
            <span className="self-center text-gray-400">to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="input pl-10 w-40"
                placeholder="End date"
              />
            </div>
            <button onClick={handleDateFilter} className="btn-secondary">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <ArrowLeftRight className="empty-state-icon" />
            <h3 className="empty-state-title">No transactions found</h3>
            <p className="empty-state-text">
              {filter || dateRange.start || dateRange.end 
                ? 'Try different filters' 
                : 'Add customers and record transactions to see them here'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {transactions.map((txn) => (
              <Link
                key={txn._id}
                to={`/customers/${txn.customer?._id}`}
                className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                  txn.type === 'credit' ? 'border-l-4 border-red-400' : 'border-l-4 border-green-400'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    txn.type === 'credit' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {txn.type === 'credit' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{txn.customer?.name || 'Unknown Customer'}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(txn.transactionDate, 'datetime')}
                      {txn.type === 'payment' && txn.paymentMethod && ` • ${txn.paymentMethod.toUpperCase()}`}
                    </p>
                    {txn.description && (
                      <p className="text-sm text-gray-400 mt-1">{txn.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${txn.type === 'credit' ? 'text-red-600' : 'text-green-600'}`}>
                    {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Balance: {formatCurrency(txn.balanceAfter)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {transactions.length} of {pagination.total} transactions
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="btn-secondary btn-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Transactions
