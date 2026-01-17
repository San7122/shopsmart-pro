import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, Phone, Lock, User, Store, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const Register = () => {
  const { register } = useAuth()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    shopName: '',
    shopType: 'kirana',
    address: {
      area: '',
      city: '',
      pincode: ''
    }
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const shopTypes = [
    { value: 'kirana', label: 'Kirana / Grocery' },
    { value: 'grocery', label: 'Supermarket' },
    { value: 'medical', label: 'Medical Store' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'stationery', label: 'Stationery' },
    { value: 'other', label: 'Other' }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    
    if (name.startsWith('address.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [field]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateStep1 = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Enter valid 10-digit phone number'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors = {}
    
    if (!formData.shopName.trim()) {
      newErrors.shopName = 'Shop name is required'
    }
    
    if (!formData.address.city.trim()) {
      newErrors['address.city'] = 'City is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateStep2()) return
    
    setLoading(true)
    const result = await register({
      name: formData.name,
      phone: formData.phone,
      password: formData.password,
      shopName: formData.shopName,
      shopType: formData.shopType,
      address: formData.address
    })
    setLoading(false)
    
    if (result.success) {
      toast.success('Registration successful! Welcome to ShopSmart Pro!')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 animate-fade-in">
      {/* Mobile Logo */}
      <div className="flex items-center justify-center gap-3 mb-6 lg:hidden">
        <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center">
          <Store className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">ShopSmart Pro</h1>
          <p className="text-xs text-gray-500">Apni Dukaan, Smart Dukaan</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-brand-600' : 'bg-gray-200'}`}></div>
        <div className={`w-12 h-1 rounded ${step >= 2 ? 'bg-brand-600' : 'bg-gray-200'}`}></div>
        <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-brand-600' : 'bg-gray-200'}`}></div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {step === 1 ? 'Create Account' : 'Shop Details'}
        </h2>
        <p className="text-gray-500 mt-1">
          {step === 1 ? 'Step 1: Personal Information' : 'Step 2: Business Information'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 ? (
          <>
            {/* Name */}
            <div>
              <label className="label">Your Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={`input pl-12 ${errors.name ? 'input-error' : ''}`}
                />
              </div>
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="label">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter 10-digit mobile number"
                  className={`input pl-12 ${errors.phone ? 'input-error' : ''}`}
                  maxLength={10}
                />
              </div>
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className={`input pl-12 pr-12 ${errors.password ? 'input-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className={`input pl-12 ${errors.confirmPassword ? 'input-error' : ''}`}
                />
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="btn-primary w-full py-3.5 text-lg mt-6"
            >
              Continue →
            </button>
          </>
        ) : (
          <>
            {/* Shop Name */}
            <div>
              <label className="label">Shop Name</label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleChange}
                  placeholder="Enter your shop name"
                  className={`input pl-12 ${errors.shopName ? 'input-error' : ''}`}
                />
              </div>
              {errors.shopName && <p className="text-red-500 text-sm mt-1">{errors.shopName}</p>}
            </div>

            {/* Shop Type */}
            <div>
              <label className="label">Shop Type</label>
              <select
                name="shopType"
                value={formData.shopType}
                onChange={handleChange}
                className="input"
              >
                {shopTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Area */}
            <div>
              <label className="label">Area / Locality</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="address.area"
                  value={formData.address.area}
                  onChange={handleChange}
                  placeholder="Enter area or locality"
                  className="input pl-12"
                />
              </div>
            </div>

            {/* City & Pincode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">City</label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  placeholder="City"
                  className={`input ${errors['address.city'] ? 'input-error' : ''}`}
                />
                {errors['address.city'] && <p className="text-red-500 text-sm mt-1">{errors['address.city']}</p>}
              </div>
              <div>
                <label className="label">Pincode</label>
                <input
                  type="text"
                  name="address.pincode"
                  value={formData.address.pincode}
                  onChange={handleChange}
                  placeholder="Pincode"
                  className="input"
                  maxLength={6}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary flex-1 py-3"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 py-3"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Creating...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </>
        )}
      </form>

      {/* Login Link */}
      <p className="text-center mt-6 text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-600 hover:text-brand-700 font-semibold">
          Login
        </Link>
      </p>
    </div>
  )
}

export default Register
