# 🏪 ShopSmart Pro

**Apni Dukaan, Smart Dukaan** - An all-in-one platform for local shopkeepers to manage their business digitally.

### ⚠️ NO LOCAL SETUP REQUIRED - Deploy Directly to Cloud!

**Important**: You don't need to install MongoDB, Razorpay, or any services on your laptop! Everything runs in the cloud. See [NO_LOCAL_SETUP_NEEDED.md](NO_LOCAL_SETUP_NEEDED.md) for complete instructions.

![ShopSmart Pro](https://img.shields.io/badge/Version-2.0.0-blue) ![License](https://img.shields.io/badge/License-MIT-green) ![Node](https://img.shields.io/badge/Node-20+-brightgreen)

## 🎯 Overview

ShopSmart Pro is a comprehensive solution designed to help local kirana stores and small retailers:

- 📒 **Digital Ledger (Udhaar)** - Track customer credit and payments
- 📦 **Inventory Management** - Manage stock, track low inventory, expiry alerts
- 📊 **Analytics Dashboard** - Business insights and reports
- 👥 **Customer Management** - Maintain customer database with transaction history
- 💰 **Payment Tracking** - Record payments via Cash, UPI, Card, etc.
- 🏪 **Digital Storefront** - Share your store online via WhatsApp
- 🧾 **Invoice Generation** - Create professional invoices
- 📱 **Mobile App** - React Native app for Android/iOS

## 🚀 Features

### Phase 1 (MVP) ✅
- Customer Management (Udhaar/Credit)
- Inventory Management
- Analytics & Reports
- Dashboard with insights
- Multi-language support

### Phase 3 (Current) ✅
- **📊 Data Warehouse** - Star schema, ETL pipelines, BI reporting
- **📣 Marketing** - Brand guidelines, campaign plans, social strategy
- **🔧 Operations** - SOPs, incident management, vendor processes
- **💰 Finance** - Financial model, pricing strategy, projections
- **📍 Sales** - Territory planning, CRM setup, commission structure

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Notifications**: React Hot Toast

## 📁 Project Structure

```
shopsmart-pro/
├── client/                    # React Frontend
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   │   ├── layouts/       # Layout components
│   │   │   └── Modal.jsx
│   │   ├── context/           # React Context
│   │   │   └── AuthContext.jsx
│   │   ├── pages/             # Page components
│   │   │   ├── auth/
│   │   │   ├── customers/
│   │   │   ├── products/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Transactions.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/          # API services
│   │   │   └── api.js
│   │   ├── utils/             # Utility functions
│   │   │   └── helpers.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
│
├── server/                    # Node.js Backend
│   ├── config/
│   │   └── db.js              # Database configuration
│   ├── controllers/           # Route handlers
│   │   ├── authController.js
│   │   ├── customerController.js
│   │   ├── transactionController.js
│   │   ├── categoryController.js
│   │   ├── productController.js
│   │   └── analyticsController.js
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   ├── models/                # Mongoose schemas
│   │   ├── User.js
│   │   ├── Customer.js
│   │   ├── Transaction.js
│   │   ├── Category.js
│   │   ├── Product.js
│   │   ├── Sale.js
│   │   └── index.js
│   ├── routes/                # API routes
│   │   ├── auth.js
│   │   ├── customers.js
│   │   ├── transactions.js
│   │   ├── categories.js
│   │   ├── products.js
│   │   └── analytics.js
│   ├── .env                   # Environment variables
│   ├── package.json
│   └── server.js              # Entry point
│
└── README.md
```

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/shopsmart-pro.git
cd shopsmart-pro
```

### 2. Backend Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Configure environment variables
# Edit .env file with your MongoDB URI and JWT secret
nano .env

# Start the server
npm run dev
```

**Environment Variables (.env):**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/shopsmart-pro
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRE=30d
NODE_ENV=development
```

### 3. Frontend Setup
```bash
# Open new terminal, navigate to client directory
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## 📚 API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | Get all customers |
| GET | `/api/customers/:id` | Get single customer |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Delete customer |
| GET | `/api/customers/:id/transactions` | Get customer transactions |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | Get all transactions |
| GET | `/api/transactions/:id` | Get single transaction |
| POST | `/api/transactions` | Create transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/transactions/today` | Get today's summary |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/:id` | Get single product |
| GET | `/api/products/barcode/:barcode` | Get product by barcode |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| PATCH | `/api/products/:id/stock` | Update stock |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/products/alerts/low-stock` | Get low stock products |
| GET | `/api/products/alerts/expiring` | Get expiring products |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | Get all categories |
| POST | `/api/categories` | Create category |
| POST | `/api/categories/defaults` | Create default categories |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Get dashboard data |
| GET | `/api/analytics/transactions` | Get transaction analytics |
| GET | `/api/analytics/inventory` | Get inventory analytics |
| GET | `/api/analytics/customers` | Get customer analytics |

## 🎨 Screenshots

### Dashboard
Clean, informative dashboard with key metrics at a glance.

### Customer Management
Easy-to-use customer list with balance tracking.

### Inventory
Comprehensive product management with stock alerts.

### Analytics
Visual reports and business insights.

## 🔮 Future Roadmap

### Phase 2 Features
- [ ] Digital Storefront with shareable link
- [ ] WhatsApp integration for payment reminders
- [ ] B2B Supplier Network
- [ ] Billing/Invoice generation
- [ ] Mobile app (React Native)

### Phase 3 Features
- [ ] AI-powered demand forecasting
- [ ] Multi-store management
- [ ] Integration with payment gateways
- [ ] Offline-first support
- [ ] Voice commands (Hindi)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

Built with ❤️ tech 
---

**ShopSmart Pro** - Empowering local businesses to compete in the digital age!
