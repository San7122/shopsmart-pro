import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Package,
  ChevronRight,
  AlertTriangle,
  Filter,
  Grid,
  List
} from 'lucide-react'
import { productsAPI, categoriesAPI } from '../../services/api'
import { formatCurrency, debounce, getStockStatus } from '../../utils/helpers'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(searchParams.get('filter') || '')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [filter, categoryFilter, pagination.page])

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll()
      if (response.data.success) {
        setCategories(response.data.data)
      }
    } catch (error) {
      // If no categories, create defaults
      try {
        await categoriesAPI.createDefaults()
        const response = await categoriesAPI.getAll()
        if (response.data.success) {
          setCategories(response.data.data)
        }
      } catch (e) {
        console.error('Failed to create default categories')
      }
    }
  }

  const fetchProducts = async (searchQuery = '') => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: 20,
        search: searchQuery,
        stockStatus: filter || undefined,
        category: categoryFilter || undefined,
        sort: 'recent'
      }
      
      const response = await productsAPI.getAll(params)
      if (response.data.success) {
        setProducts(response.data.data)
        setSummary(response.data.summary)
        setPagination(prev => ({
          ...prev,
          totalPages: response.data.totalPages,
          total: response.data.total
        }))
      }
    } catch (error) {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const debouncedSearch = useCallback(
    debounce((query) => {
      setPagination(prev => ({ ...prev, page: 1 }))
      fetchProducts(query)
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
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500">Manage your inventory and stock</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card bg-blue-50 border-none">
            <p className="text-sm text-blue-600">Total Products</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{summary.totalProducts}</p>
          </div>
          <div className="card bg-green-50 border-none">
            <p className="text-sm text-green-600">In Stock</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {summary.totalProducts - summary.lowStock - summary.outOfStock}
            </p>
          </div>
          <div className="card bg-amber-50 border-none">
            <p className="text-sm text-amber-600">Low Stock</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{summary.lowStock}</p>
          </div>
          <div className="card bg-red-50 border-none">
            <p className="text-sm text-red-600">Out of Stock</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{summary.outOfStock}</p>
          </div>
          <div className="card bg-purple-50 border-none col-span-2 lg:col-span-1">
            <p className="text-sm text-purple-600">Inventory Value</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{formatCurrency(summary.totalValue)}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name, brand, barcode..."
              className="input pl-12"
            />
          </div>
          
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="input w-full lg:w-48"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>{cat.icon} {cat.name}</option>
            ))}
          </select>

          {/* Stock Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('')}
              className={`btn btn-sm ${filter === '' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('low_stock')}
              className={`btn btn-sm ${filter === 'low_stock' ? 'bg-amber-600 text-white' : 'btn-secondary'}`}
            >
              <AlertTriangle className="w-4 h-4" />
              Low
            </button>
            <button
              onClick={() => handleFilterChange('out_of_stock')}
              className={`btn btn-sm ${filter === 'out_of_stock' ? 'bg-red-600 text-white' : 'btn-secondary'}`}
            >
              Out
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Product List/Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Package className="empty-state-icon" />
            <h3 className="empty-state-title">No products found</h3>
            <p className="empty-state-text">
              {search ? 'Try a different search term' : 'Add your first product to get started'}
            </p>
            {!search && (
              <button 
                onClick={() => setShowAddModal(true)}
                className="btn-primary mt-4"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {products.map((product) => {
              const stockStatus = getStockStatus(product.stock, product.lowStockAlert)
              return (
                <Link
                  key={product._id}
                  to={`/products/${product._id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      {product.images?.[0]?.url ? (
                        <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Package className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {product.category && (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                            {product.category.icon} {product.category.name}
                          </span>
                        )}
                        {product.brand && (
                          <span className="text-xs text-gray-500">{product.brand}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(product.sellingPrice)}</p>
                      {product.mrp && product.mrp > product.sellingPrice && (
                        <p className="text-xs text-gray-400 line-through">{formatCurrency(product.mrp)}</p>
                      )}
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className={`font-medium ${
                        stockStatus.color === 'danger' ? 'text-red-600' :
                        stockStatus.color === 'warning' ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {product.stock} {product.unit}
                      </p>
                      <span className={`badge badge-${stockStatus.color}`}>
                        {stockStatus.label}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              )
            })}
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {products.length} of {pagination.total} products
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
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => {
            const stockStatus = getStockStatus(product.stock, product.lowStockAlert)
            return (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 rounded-xl mb-3 flex items-center justify-center">
                  {product.images?.[0]?.url ? (
                    <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Package className="w-12 h-12 text-gray-300" />
                  )}
                </div>
                <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                {product.brand && (
                  <p className="text-sm text-gray-500">{product.brand}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <p className="font-bold text-gray-900">{formatCurrency(product.sellingPrice)}</p>
                  <span className={`badge badge-${stockStatus.color}`}>
                    {product.stock} {product.unit}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        categories={categories}
        onSuccess={() => {
          setShowAddModal(false)
          fetchProducts(search)
        }}
      />
    </div>
  )
}

// Add Product Modal Component
const AddProductModal = ({ isOpen, onClose, categories, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '',
    sellingPrice: '',
    costPrice: '',
    mrp: '',
    stock: '',
    unit: 'pcs',
    lowStockAlert: '10',
    barcode: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const units = [
    { value: 'pcs', label: 'Pieces' },
    { value: 'kg', label: 'Kilograms' },
    { value: 'g', label: 'Grams' },
    { value: 'l', label: 'Liters' },
    { value: 'ml', label: 'Milliliters' },
    { value: 'dozen', label: 'Dozen' },
    { value: 'pack', label: 'Pack' },
    { value: 'box', label: 'Box' }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.sellingPrice) newErrors.sellingPrice = 'Selling price is required'
    if (formData.sellingPrice && parseFloat(formData.sellingPrice) <= 0) newErrors.sellingPrice = 'Price must be greater than 0'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const response = await productsAPI.create({
        ...formData,
        sellingPrice: parseFloat(formData.sellingPrice),
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        mrp: formData.mrp ? parseFloat(formData.mrp) : undefined,
        stock: formData.stock ? parseFloat(formData.stock) : 0,
        lowStockAlert: parseInt(formData.lowStockAlert) || 10
      })
      if (response.data.success) {
        toast.success('Product added successfully')
        setFormData({
          name: '', brand: '', category: '', sellingPrice: '', costPrice: '',
          mrp: '', stock: '', unit: 'pcs', lowStockAlert: '10', barcode: ''
        })
        onSuccess()
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Product" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Product Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter product name"
              className={`input ${errors.name ? 'input-error' : ''}`}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="label">Brand</label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="Brand name"
              className="input"
            />
          </div>

          <div>
            <label className="label">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="input"
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Selling Price (₹) *</label>
            <input
              type="number"
              name="sellingPrice"
              value={formData.sellingPrice}
              onChange={handleChange}
              placeholder="0.00"
              className={`input ${errors.sellingPrice ? 'input-error' : ''}`}
              step="0.01"
              min="0"
            />
            {errors.sellingPrice && <p className="text-red-500 text-sm mt-1">{errors.sellingPrice}</p>}
          </div>

          <div>
            <label className="label">Cost Price (₹)</label>
            <input
              type="number"
              name="costPrice"
              value={formData.costPrice}
              onChange={handleChange}
              placeholder="0.00"
              className="input"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="label">MRP (₹)</label>
            <input
              type="number"
              name="mrp"
              value={formData.mrp}
              onChange={handleChange}
              placeholder="0.00"
              className="input"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="label">Barcode</label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              placeholder="Scan or enter barcode"
              className="input"
            />
          </div>

          <div>
            <label className="label">Current Stock</label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              placeholder="0"
              className="input"
              min="0"
            />
          </div>

          <div>
            <label className="label">Unit</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="input"
            >
              {units.map(unit => (
                <option key={unit.value} value={unit.value}>{unit.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Low Stock Alert</label>
            <input
              type="number"
              name="lowStockAlert"
              value={formData.lowStockAlert}
              onChange={handleChange}
              placeholder="10"
              className="input"
              min="0"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Adding...' : 'Add Product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default Products
