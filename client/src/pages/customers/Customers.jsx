import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Filter, 
  Users,
  Phone,
  ChevronRight,
  IndianRupee,
  UserPlus
} from 'lucide-react'
import { customersAPI } from '../../services/api'
import { formatCurrency, getInitials, getAvatarColor, debounce } from '../../utils/helpers'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'

const Customers = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [customers, setCustomers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(searchParams.get('filter') || '')
  const [showAddModal, setShowAddModal] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  })

  useEffect(() => {
    fetchCustomers()
  }, [filter, pagination.page])

  const fetchCustomers = async (searchQuery = '') => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: 20,
        search: searchQuery,
        hasBalance: filter === 'has_balance' ? 'true' : undefined,
        sort: 'recent'
      }
      
      const response = await customersAPI.getAll(params)
      if (response.data.success) {
        setCustomers(response.data.data)
        setStats(response.data.stats)
        setPagination(prev => ({
          ...prev,
          totalPages: response.data.totalPages,
          total: response.data.total
        }))
      }
    } catch (error) {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const debouncedSearch = useCallback(
    debounce((query) => {
      setPagination(prev => ({ ...prev, page: 1 }))
      fetchCustomers(query)
    }, 300),
    []
  )

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearch(value)
    debouncedSearch(value)
  }

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    setPagination(prev => ({ ...prev, page: 1 }))
    if (newFilter) {
      setSearchParams({ filter: newFilter })
    } else {
      setSearchParams({})
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500">Manage your customer accounts and credit</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-blue-50 border-none">
            <p className="text-sm text-blue-600">Total Customers</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{stats.totalCustomers}</p>
          </div>
          <div className="card bg-amber-50 border-none">
            <p className="text-sm text-amber-600">Total Receivable</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(stats.totalReceivable)}</p>
          </div>
          <div className="card bg-red-50 border-none">
            <p className="text-sm text-red-600">With Balance</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{stats.customersWithBalance}</p>
          </div>
          <div className="card bg-green-50 border-none">
            <p className="text-sm text-green-600">Total Payable</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(stats.totalPayable)}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name or phone..."
              className="input pl-12"
            />
          </div>
          
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('')}
              className={`btn ${filter === '' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('has_balance')}
              className={`btn ${filter === 'has_balance' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <IndianRupee className="w-4 h-4" />
              With Balance
            </button>
          </div>
        </div>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users className="empty-state-icon" />
            <h3 className="empty-state-title">No customers found</h3>
            <p className="empty-state-text">
              {search ? 'Try a different search term' : 'Add your first customer to get started'}
            </p>
            {!search && (
              <button 
                onClick={() => setShowAddModal(true)}
                className="btn-primary mt-4"
              >
                <UserPlus className="w-4 h-4" />
                Add Customer
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {customers.map((customer) => (
              <Link
                key={customer._id}
                to={`/customers/${customer._id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${getAvatarColor(customer.name)} flex items-center justify-center text-white font-medium`}>
                    {getInitials(customer.name)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{customer.name}</p>
                    {customer.phone && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-semibold ${customer.balance > 0 ? 'text-red-600' : customer.balance < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {customer.balance > 0 ? formatCurrency(customer.balance) : customer.balance < 0 ? formatCurrency(Math.abs(customer.balance)) : '₹0'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {customer.balance > 0 ? 'To Receive' : customer.balance < 0 ? 'To Pay' : 'Clear'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {customers.length} of {pagination.total} customers
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

      {/* Add Customer Modal */}
      <AddCustomerModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false)
          fetchCustomers(search)
        }}
      />
    </div>
  )
}

// Add Customer Modal Component
const AddCustomerModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Enter valid 10-digit phone number'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const response = await customersAPI.create(formData)
      if (response.data.success) {
        toast.success('Customer added successfully')
        setFormData({ name: '', phone: '', address: '', notes: '' })
        onSuccess()
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Customer">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Customer Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter customer name"
            className={`input ${errors.name ? 'input-error' : ''}`}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="label">Phone Number</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="10-digit mobile number"
            className={`input ${errors.phone ? 'input-error' : ''}`}
            maxLength={10}
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="label">Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Customer address (optional)"
            className="input"
          />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any notes about this customer..."
            className="input min-h-[80px] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Adding...' : 'Add Customer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default Customers
