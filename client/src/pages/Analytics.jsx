import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package,
  IndianRupee,
  Calendar
} from 'lucide-react'
import { analyticsAPI } from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import toast from 'react-hot-toast'

const Analytics = () => {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30days')
  const [transactionData, setTransactionData] = useState(null)
  const [inventoryData, setInventoryData] = useState(null)
  const [customerData, setCustomerData] = useState(null)

  useEffect(() => {
    fetchAllAnalytics()
  }, [period])

  const fetchAllAnalytics = async () => {
    setLoading(true)
    try {
      const [txnRes, invRes, custRes] = await Promise.all([
        analyticsAPI.getTransactions({ period }),
        analyticsAPI.getInventory(),
        analyticsAPI.getCustomers()
      ])
      
      if (txnRes.data.success) setTransactionData(txnRes.data.data)
      if (invRes.data.success) setInventoryData(invRes.data.data)
      if (custRes.data.success) setCustomerData(custRes.data.data)
    } catch (error) {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Business insights and reports</p>
        </div>
        
        {/* Period Selector */}
        <div className="flex gap-2">
          {[
            { value: '7days', label: '7 Days' },
            { value: '30days', label: '30 Days' },
            { value: '90days', label: '90 Days' },
            { value: '1year', label: '1 Year' }
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`btn btn-sm ${period === p.value ? 'btn-primary' : 'btn-secondary'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <div className="card lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Trend</h3>
          {transactionData?.dailyBreakdown?.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={transactionData.dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return `${date.getDate()}/${date.getMonth() + 1}`
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={(label) => formatDate(label, 'short')}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="credit" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={false}
                    name="Credit Given"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="payment" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                    name="Payments Received"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              No data available for selected period
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
          {transactionData?.paymentMethods?.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={transactionData.paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="_id"
                    label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                  >
                    {transactionData.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No payment data
            </div>
          )}
        </div>

        {/* Top Credit Customers */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Credit Customers</h3>
          {transactionData?.topCreditCustomers?.length > 0 ? (
            <div className="space-y-3">
              {transactionData.topCreditCustomers.slice(0, 5).map((customer, index) => (
                <div key={customer.customerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.count} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{formatCurrency(customer.totalCredit)}</p>
                    <p className="text-xs text-gray-500">Balance: {formatCurrency(customer.currentBalance)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Inventory Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Category</h3>
          {inventoryData?.categoryBreakdown?.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryData.categoryBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    type="number"
                    tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  />
                  <YAxis 
                    dataKey="categoryName" 
                    type="category"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="totalValue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400">
              No inventory data
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
          {inventoryData?.topSelling?.length > 0 ? (
            <div className="space-y-3">
              {inventoryData.topSelling.slice(0, 5).map((product, index) => (
                <div key={product._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      {product.brand && <p className="text-xs text-gray-500">{product.brand}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{product.totalSold} sold</p>
                    <p className="text-xs text-gray-500">{product.stock} in stock</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No sales data
            </div>
          )}
        </div>
      </div>

      {/* Customer Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Summary */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <span className="text-gray-600">Total Customers</span>
              </div>
              <span className="text-2xl font-bold text-blue-700">
                {customerData?.summary?.totalCustomers || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-3">
                <IndianRupee className="w-8 h-8 text-amber-600" />
                <span className="text-gray-600">Total Receivable</span>
              </div>
              <span className="text-2xl font-bold text-amber-700">
                {formatCurrency(customerData?.summary?.totalReceivable || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-green-600" />
                <span className="text-gray-600">New This Month</span>
              </div>
              <span className="text-2xl font-bold text-green-700">
                {customerData?.newCustomersThisMonth || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Top Debtors */}
        <div className="card lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Debtors</h3>
          {customerData?.topDebtors?.length > 0 ? (
            <div className="space-y-3">
              {customerData.topDebtors.slice(0, 6).map((customer, index) => (
                <div key={customer._id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-500">Trust: {'⭐'.repeat(customer.trustScore || 3)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{formatCurrency(customer.balance)}</p>
                    <p className="text-xs text-gray-500">
                      Paid: {formatCurrency(customer.totalPaid)} / Credit: {formatCurrency(customer.totalCredit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              No pending dues
            </div>
          )}
        </div>
      </div>

      {/* Inventory Alerts */}
      <div className="card bg-gradient-to-r from-amber-50 to-red-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Alerts</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-xl">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-amber-700">{inventoryData?.alerts?.lowStock || 0}</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-white rounded-xl">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-red-700">{inventoryData?.alerts?.expiringSoon || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
