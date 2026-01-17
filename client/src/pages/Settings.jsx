import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  User, 
  Store, 
  Lock, 
  Bell, 
  Globe,
  Save,
  Eye,
  EyeOff
} from 'lucide-react'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

const Settings = () => {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'shop', label: 'Shop Details', icon: Store },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Globe }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-64">
          <div className="card p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-brand-50 text-brand-700' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSettings user={user} updateUser={updateUser} />}
          {activeTab === 'shop' && <ShopSettings user={user} updateUser={updateUser} />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'preferences' && <PreferencesSettings user={user} updateUser={updateUser} />}
        </div>
      </div>
    </div>
  )
}

// Profile Settings
const ProfileSettings = ({ user, updateUser }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await authAPI.updateProfile({
        name: formData.name,
        email: formData.email
      })
      
      if (response.data.success) {
        updateUser(response.data.data)
        toast.success('Profile updated successfully')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="input"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="label">Phone Number</label>
          <input
            type="tel"
            value={formData.phone}
            className="input bg-gray-50"
            disabled
          />
          <p className="text-xs text-gray-500 mt-1">Phone number cannot be changed</p>
        </div>

        <div>
          <label className="label">Email Address</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="input"
            placeholder="your@email.com"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

// Shop Settings
const ShopSettings = ({ user, updateUser }) => {
  const [formData, setFormData] = useState({
    shopName: user?.shopName || '',
    shopType: user?.shopType || 'kirana',
    gstNumber: user?.gstNumber || '',
    address: {
      street: user?.address?.street || '',
      area: user?.address?.area || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      pincode: user?.address?.pincode || ''
    }
  })
  const [loading, setLoading] = useState(false)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await authAPI.updateProfile(formData)
      
      if (response.data.success) {
        updateUser(response.data.data)
        toast.success('Shop details updated successfully')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update shop details')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Shop Details</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Shop Name</label>
          <input
            type="text"
            value={formData.shopName}
            onChange={(e) => setFormData(prev => ({ ...prev, shopName: e.target.value }))}
            className="input"
            placeholder="Your shop name"
          />
        </div>

        <div>
          <label className="label">Shop Type</label>
          <select
            value={formData.shopType}
            onChange={(e) => setFormData(prev => ({ ...prev, shopType: e.target.value }))}
            className="input"
          >
            {shopTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">GST Number (Optional)</label>
          <input
            type="text"
            value={formData.gstNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
            className="input"
            placeholder="22AAAAA0000A1Z5"
          />
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium text-gray-900 mb-3">Address</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Street / Building</label>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, street: e.target.value }
                }))}
                className="input"
                placeholder="Shop number, street name"
              />
            </div>
            
            <div>
              <label className="label">Area / Locality</label>
              <input
                type="text"
                value={formData.address.area}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, area: e.target.value }
                }))}
                className="input"
                placeholder="Area name"
              />
            </div>
            
            <div>
              <label className="label">City</label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, city: e.target.value }
                }))}
                className="input"
                placeholder="City"
              />
            </div>
            
            <div>
              <label className="label">State</label>
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, state: e.target.value }
                }))}
                className="input"
                placeholder="State"
              />
            </div>
            
            <div>
              <label className="label">Pincode</label>
              <input
                type="text"
                value={formData.address.pincode}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, pincode: e.target.value }
                }))}
                className="input"
                placeholder="6-digit pincode"
                maxLength={6}
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

// Security Settings
const SecuritySettings = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    
    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await authAPI.updatePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      })
      
      if (response.data.success) {
        toast.success('Password changed successfully')
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Change Password</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Current Password</label>
          <div className="relative">
            <input
              type={showPasswords ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="input pr-12"
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="label">New Password</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
            className="input"
            placeholder="Enter new password"
          />
        </div>

        <div>
          <label className="label">Confirm New Password</label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            className="input"
            placeholder="Confirm new password"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          <Lock className="w-4 h-4" />
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  )
}

// Preferences Settings
const PreferencesSettings = ({ user, updateUser }) => {
  const [formData, setFormData] = useState({
    language: user?.language || 'en'
  })
  const [loading, setLoading] = useState(false)

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिंदी (Hindi)' },
    { value: 'mr', label: 'मराठी (Marathi)' },
    { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
    { value: 'ta', label: 'தமிழ் (Tamil)' },
    { value: 'te', label: 'తెలుగు (Telugu)' },
    { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    { value: 'ml', label: 'മലയാളം (Malayalam)' },
    { value: 'bn', label: 'বাংলা (Bengali)' },
    { value: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await authAPI.updateProfile(formData)
      
      if (response.data.success) {
        updateUser(response.data.data)
        toast.success('Preferences updated successfully')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Preferences</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Language</label>
          <select
            value={formData.language}
            onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
            className="input"
          >
            {languages.map(lang => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Select your preferred language for the app interface
          </p>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </form>

      {/* App Info */}
      <div className="mt-8 pt-6 border-t">
        <h3 className="font-medium text-gray-900 mb-3">About ShopSmart Pro</h3>
        <div className="space-y-2 text-sm text-gray-500">
          <p>Version: 1.0.0</p>
          <p>© 2024 ShopSmart Pro. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default Settings
