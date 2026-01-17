import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  IndianRupee,
  AlertTriangle,
  ArrowRight,
  Plus,
  Clock
} from 'lucide-react'
import { analyticsAPI } from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const response = await analyticsAPI.getDashboard()
      if (response.data.success) {
        setData(response.data.data)
      }
    } catch (error) {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const stats = [
    {
      title: "Today's Credit",
      value: formatCurrency(data?.today?.credit?.total || 0),
      subtext: `${data?.today?.credit?.count || 0} transactions`,
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100'
    },
    {
      title: "Today's Collection",
      value: formatCurrency(data?.today?.payment?.total || 0),
      subtext: `${data?.today?.payment?.count || 0} payments`,
      icon: TrendingDown,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      iconBg: 'bg-emerald-100'
    },
    {
      title: 'Total Receivable',
      value: formatCurrency(data?.receivables?.total || 0),
      subtext: `From ${data?.receivables?.count || 0} customers`,
      icon: IndianRupee,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100'
    },
    {
      title: 'Total Customers',
      value: data?.customerCount || 0,
      subtext: 'Active customers',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">{formatDate(new Date(), 'long')}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/customers" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Entry
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className={`card ${stat.bgColor} border-none`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Transaction Trend</h2>
            <span className="text-sm text-gray-500">Last 30 days</span>
          </div>
          
          {data?.monthlyTrend && data.monthlyTrend.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyTrend}>
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
                  <Line 
                    type="monotone" 
                    dataKey="credit" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={false}
                    name="Credit"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="payment" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                    name="Payment"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No transaction data yet</p>
                <p className="text-sm">Start adding transactions to see trends</p>
              </div>
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Alerts</h2>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          
          <div className="space-y-3">
            {/* Low Stock Alert */}
            <Link 
              to="/products?filter=low_stock"
              className="block p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">Low Stock Items</p>
                    <p className="text-sm text-amber-600">{data?.inventory?.lowStock || 0} products</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600" />
              </div>
            </Link>

            {/* Out of Stock */}
            <Link 
              to="/products?filter=out_of_stock"
              className="block p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">Out of Stock</p>
                    <p className="text-sm text-red-600">{data?.inventory?.outOfStock || 0} products</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-red-600" />
              </div>
            </Link>

            {/* Receivables */}
            <Link 
              to="/customers?filter=has_balance"
              className="block p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">Pending Dues</p>
                    <p className="text-sm text-blue-600">{data?.receivables?.count || 0} customers</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </div>
            </Link>
          </div>

          {/* Inventory Value */}
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">Total Inventory Value</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(data?.inventory?.totalValue || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {data?.inventory?.totalProducts || 0} products in stock
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link 
            to="/customers"
            className="flex flex-col items-center p-4 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors"
          >
            <Users className="w-8 h-8 text-brand-600 mb-2" />
            <span className="text-sm font-medium text-brand-700">Add Customer</span>
          </Link>
          <Link 
            to="/products"
            className="flex flex-col items-center p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <Package className="w-8 h-8 text-emerald-600 mb-2" />
            <span className="text-sm font-medium text-emerald-700">Add Product</span>
          </Link>
          <Link 
            to="/transactions"
            className="flex flex-col items-center p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
          >
            <IndianRupee className="w-8 h-8 text-amber-600 mb-2" />
            <span className="text-sm font-medium text-amber-700">Record Payment</span>
          </Link>
          <Link 
            to="/analytics"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-700">View Reports</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
