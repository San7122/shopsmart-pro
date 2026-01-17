import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Package,
  Edit2, 
  Trash2,
  Plus,
  Minus,
  BarChart3,
  AlertTriangle,
  Calendar
} from 'lucide-react'
import { productsAPI } from '../../services/api'
import { formatCurrency, formatDate, getStockStatus, getDaysUntilExpiry } from '../../utils/helpers'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      const response = await productsAPI.getOne(id)
      if (response.data.success) {
        setProduct(response.data.data)
      }
    } catch (error) {
      toast.error('Failed to load product')
      navigate('/products')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await productsAPI.delete(id)
      toast.success('Product deleted')
      navigate('/products')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete product')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Product not found</p>
        <Link to="/products" className="btn-primary mt-4">Back to Products</Link>
      </div>
    )
  }

  const stockStatus = getStockStatus(product.stock, product.lowStockAlert)
  const daysUntilExpiry = getDaysUntilExpiry(product.expiryDate)
  const profitMargin = product.costPrice && product.sellingPrice 
    ? ((product.sellingPrice - product.costPrice) / product.sellingPrice * 100).toFixed(1)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/products')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Product Details</h1>
      </div>

      {/* Product Info Card */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Image */}
          <div className="w-full lg:w-48 h-48 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            {product.images?.[0]?.url ? (
              <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <Package className="w-16 h-16 text-gray-300" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
                {product.brand && (
                  <p className="text-gray-500 mt-1">{product.brand}</p>
                )}
                {product.category && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm mt-2">
                    {product.category.icon} {product.category.name}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="btn-ghost text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Price & Stock */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-green-600">Selling Price</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(product.sellingPrice)}</p>
              </div>
              {product.costPrice && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-600">Cost Price</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(product.costPrice)}</p>
                </div>
              )}
              {product.mrp && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">MRP</p>
                  <p className="text-2xl font-bold text-gray-700">{formatCurrency(product.mrp)}</p>
                </div>
              )}
              {profitMargin && (
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-purple-600">Profit Margin</p>
                  <p className="text-2xl font-bold text-purple-700">{profitMargin}%</p>
                </div>
              )}
            </div>

            {/* Additional Info */}
            {(product.barcode || product.sku) && (
              <div className="flex gap-4 mt-4 text-sm text-gray-500">
                {product.barcode && <p>Barcode: {product.barcode}</p>}
                {product.sku && <p>SKU: {product.sku}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Stock Management</h3>
          <button 
            onClick={() => setShowStockModal(true)}
            className="btn-primary btn-sm"
          >
            Update Stock
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${
            stockStatus.color === 'danger' ? 'bg-red-50' :
            stockStatus.color === 'warning' ? 'bg-amber-50' : 'bg-green-50'
          }`}>
            <p className={`text-sm ${
              stockStatus.color === 'danger' ? 'text-red-600' :
              stockStatus.color === 'warning' ? 'text-amber-600' : 'text-green-600'
            }`}>Current Stock</p>
            <p className={`text-2xl font-bold ${
              stockStatus.color === 'danger' ? 'text-red-700' :
              stockStatus.color === 'warning' ? 'text-amber-700' : 'text-green-700'
            }`}>
              {product.stock} {product.unit}
            </p>
            <span className={`badge badge-${stockStatus.color} mt-2`}>
              {stockStatus.label}
            </span>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600">Low Stock Alert</p>
            <p className="text-2xl font-bold text-gray-700">{product.lowStockAlert} {product.unit}</p>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-600">Total Sold</p>
            <p className="text-2xl font-bold text-blue-700">{product.totalSold || 0} {product.unit}</p>
          </div>

          {product.lastSoldAt && (
            <div className="p-4 bg-purple-50 rounded-xl">
              <p className="text-sm text-purple-600">Last Sold</p>
              <p className="text-lg font-semibold text-purple-700">{formatDate(product.lastSoldAt, 'short')}</p>
            </div>
          )}
        </div>

        {/* Expiry Warning */}
        {product.expiryDate && (
          <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${
            daysUntilExpiry <= 0 ? 'bg-red-50' :
            daysUntilExpiry <= 30 ? 'bg-amber-50' : 'bg-green-50'
          }`}>
            <Calendar className={`w-5 h-5 ${
              daysUntilExpiry <= 0 ? 'text-red-600' :
              daysUntilExpiry <= 30 ? 'text-amber-600' : 'text-green-600'
            }`} />
            <div>
              <p className={`font-medium ${
                daysUntilExpiry <= 0 ? 'text-red-800' :
                daysUntilExpiry <= 30 ? 'text-amber-800' : 'text-green-800'
              }`}>
                {daysUntilExpiry <= 0 ? 'Expired!' :
                 daysUntilExpiry <= 30 ? `Expiring in ${daysUntilExpiry} days` :
                 `Expires on ${formatDate(product.expiryDate, 'short')}`}
              </p>
              <p className="text-sm text-gray-600">Expiry Date: {formatDate(product.expiryDate, 'long')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stock Value */}
      <div className="card bg-gradient-to-r from-brand-50 to-primary-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Value</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">At Cost Price</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency((product.costPrice || 0) * product.stock)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">At Selling Price</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(product.sellingPrice * product.stock)}
            </p>
          </div>
        </div>
      </div>

      {/* Update Stock Modal */}
      <StockUpdateModal 
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        product={product}
        onSuccess={() => {
          setShowStockModal(false)
          fetchProduct()
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Product"
        size="sm"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{product.name}</strong>? 
            This action cannot be undone.
          </p>
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

// Stock Update Modal
const StockUpdateModal = ({ isOpen, onClose, product, onSuccess }) => {
  const [type, setType] = useState('add')
  const [adjustment, setAdjustment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!adjustment || parseFloat(adjustment) <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    setLoading(true)
    try {
      const response = await productsAPI.updateStock(product._id, {
        adjustment: parseFloat(adjustment),
        type
      })
      
      if (response.data.success) {
        toast.success('Stock updated successfully')
        setAdjustment('')
        onSuccess()
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update stock')
    } finally {
      setLoading(false)
    }
  }

  const newStock = type === 'add' 
    ? product.stock + (parseFloat(adjustment) || 0)
    : type === 'remove'
    ? product.stock - (parseFloat(adjustment) || 0)
    : parseFloat(adjustment) || 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Stock">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600">Product</p>
          <p className="font-semibold text-gray-900">{product.name}</p>
          <p className="text-sm text-gray-500 mt-1">Current Stock: {product.stock} {product.unit}</p>
        </div>

        <div>
          <label className="label">Action</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType('add')}
              className={`p-3 rounded-xl flex items-center justify-center gap-2 ${
                type === 'add' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
            <button
              type="button"
              onClick={() => setType('remove')}
              className={`p-3 rounded-xl flex items-center justify-center gap-2 ${
                type === 'remove' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Minus className="w-4 h-4" />
              Remove
            </button>
            <button
              type="button"
              onClick={() => setType('set')}
              className={`p-3 rounded-xl flex items-center justify-center gap-2 ${
                type === 'set' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Set
            </button>
          </div>
        </div>

        <div>
          <label className="label">Quantity ({product.unit})</label>
          <input
            type="number"
            value={adjustment}
            onChange={(e) => setAdjustment(e.target.value)}
            placeholder={type === 'set' ? 'New stock count' : 'Enter quantity'}
            className="input text-lg font-semibold"
            step="0.01"
            min="0"
            autoFocus
          />
        </div>

        {adjustment && (
          <div className={`p-3 rounded-xl ${newStock < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className="text-sm text-gray-600">New Stock will be:</p>
            <p className={`text-xl font-bold ${newStock < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {Math.max(0, newStock)} {product.unit}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading || newStock < 0}
            className="btn-primary flex-1"
          >
            {loading ? 'Updating...' : 'Update Stock'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ProductDetail
