# 🔄 ShopSmart Pro - n8n Workflow Automation

## Overview

n8n provides powerful workflow automation for ShopSmart Pro, handling:
- 📱 WhatsApp/SMS notifications
- 📧 Email campaigns & alerts
- 🔄 Data sync between systems
- 📊 Analytics & reporting automation
- 🤖 AI-powered features
- 💰 Payment reminders

---

## Quick Start

### 1. Start n8n with Docker

```bash
# Start all services including n8n
docker-compose up -d

# Or start only n8n
docker-compose up -d n8n
```

### 2. Access n8n Dashboard

- **URL**: http://localhost:5678
- **Username**: admin (or set in N8N_USER)
- **Password**: shopsmart123 (or set in N8N_PASSWORD)

### 3. Import Workflows

1. Go to n8n dashboard → Workflows → Import
2. Select workflow JSON files from `n8n/workflows/` folder:
   - `01_payment_reminders.json`
   - `02_customer_onboarding.json`
   - `03_daily_reports.json`
   - `04_ai_insights.json`
   - `05_low_stock_alerts.json`

### 4. Configure Credentials

In n8n, go to Credentials and set up:

| Credential | Required For |
|------------|--------------|
| ShopSmart API Key | All workflows |
| WhatsApp Business API | WhatsApp messages |
| Twilio | SMS fallback |
| SendGrid | Email notifications |
| OpenAI | AI insights |
| HubSpot | CRM sync |

---

## Architecture with n8n

```
┌─────────────────────────────────────────────────────────────────┐
│                      ShopSmart Pro Stack                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  React   │    │  React   │    │  Node.js │    │ MongoDB  │  │
│  │   Web    │───▶│  Native  │    │  Backend │◀──▶│ Database │  │
│  │  Client  │    │  Mobile  │    │   API    │    │          │  │
│  └──────────┘    └──────────┘    └────┬─────┘    └──────────┘  │
│                                       │                         │
│                                       │ Webhooks                │
│                                       ▼                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      n8n Automation                       │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │  │
│  │  │WhatsApp │ │  Email  │ │   SMS   │ │  CRM    │        │  │
│  │  │Reminders│ │Campaigns│ │ Alerts  │ │  Sync   │        │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │  │
│  │  │Analytics│ │  AI/ML  │ │ Reports │ │ Backups │        │  │
│  │  │  Sync   │ │  Tasks  │ │  Gen    │ │  Auto   │        │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  External Services                        │  │
│  │  WhatsApp │ Twilio │ SendGrid │ HubSpot │ Google │ OpenAI│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Workflows

### 1. Payment Reminder Workflows
| Workflow | Trigger | Actions |
|----------|---------|---------|
| Daily Reminder | Cron (9 AM) | Find due payments → Send WhatsApp |
| Overdue Alert | Cron (Daily) | Find overdue > 7 days → SMS + Call |
| Pre-Due Reminder | Cron (Daily) | Due in 3 days → WhatsApp reminder |

### 2. Customer Onboarding
| Workflow | Trigger | Actions |
|----------|---------|---------|
| Welcome Flow | New Registration | Send WhatsApp + Email + CRM entry |
| Day 1 Check | Cron (Daily) | Check activity → Send tutorial |
| Day 7 Nudge | Cron (Daily) | Check engagement → Re-engage |

### 3. Business Intelligence
| Workflow | Trigger | Actions |
|----------|---------|---------|
| Daily Report | Cron (7 PM) | Generate stats → Email to owner |
| Weekly Summary | Cron (Monday) | Aggregate data → PDF report |
| Low Stock Alert | Cron (Hourly) | Check inventory → Alert if low |

### 4. AI-Powered Features
| Workflow | Trigger | Actions |
|----------|---------|---------|
| Smart Insights | Weekly | Analyze data → Generate insights |
| Customer Scoring | Daily | Calculate trust scores via AI |
| Demand Forecast | Weekly | Predict inventory needs |

---

## n8n Setup

### Environment Variables
```env
# n8n Configuration
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=https://n8n.yourdomain.com

# Database
N8N_DB_TYPE=mongodb
N8N_DB_MONGODB_CONNECTION_URL=mongodb://mongo:27017/n8n

# Security
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_secure_password

# Encryption
N8N_ENCRYPTION_KEY=your_encryption_key

# External Services
WHATSAPP_API_TOKEN=your_whatsapp_token
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
SENDGRID_API_KEY=your_sendgrid_key
OPENAI_API_KEY=your_openai_key
```

---

## Workflow Categories

### Category 1: Notifications & Reminders
- Payment due reminders
- Overdue payment alerts
- Low stock notifications
- New order alerts

### Category 2: Customer Engagement
- Welcome messages
- Re-engagement campaigns
- Feedback collection
- Anniversary/birthday wishes

### Category 3: Data & Analytics
- Daily reports generation
- Data warehouse sync
- Backup automation
- Analytics aggregation

### Category 4: AI & Intelligence
- Customer scoring
- Demand forecasting
- Smart recommendations
- Anomaly detection

### Category 5: Integrations
- CRM sync (HubSpot)
- Accounting sync (Tally)
- E-commerce sync
- Bank statement import

---

## API Endpoints for n8n

### Webhook Endpoints (Backend → n8n)

```javascript
// POST /api/webhooks/n8n/new-customer
// Triggered when new customer is added

// POST /api/webhooks/n8n/new-transaction
// Triggered on each transaction

// POST /api/webhooks/n8n/low-stock
// Triggered when stock falls below threshold

// POST /api/webhooks/n8n/payment-received
// Triggered when payment is recorded
```

### Callback Endpoints (n8n → Backend)

```javascript
// POST /api/n8n/update-reminder-status
// Update that reminder was sent

// POST /api/n8n/log-notification
// Log notification delivery status

// POST /api/n8n/update-customer-score
// Update AI-calculated customer score
```

---

## Available Workflows

### 1. Payment Reminders (`01_payment_reminders.json`)
**Trigger**: Daily at 9 AM
**Actions**:
- Fetch customers with due payments
- Send WhatsApp reminder
- SMS fallback if WhatsApp fails
- Log notification to database

### 2. Customer Onboarding (`02_customer_onboarding.json`)
**Trigger**: Webhook on new registration
**Actions**:
- Send welcome WhatsApp message
- Send welcome email
- Create HubSpot contact
- Wait 1 day → Check activity
- Send tutorial or congrats based on activity

### 3. Daily Reports (`03_daily_reports.json`)
**Trigger**: Daily at 7 PM
**Actions**:
- Fetch daily stats for each user
- Generate formatted report
- Send via WhatsApp
- Send via Email
- Log report sent

### 4. AI Business Insights (`04_ai_insights.json`)
**Trigger**: Weekly (Monday 8 AM)
**Actions**:
- Fetch weekly business data
- Send to OpenAI for analysis
- Format AI insights
- Send via WhatsApp
- Save insights to database

### 5. Low Stock Alerts (`05_low_stock_alerts.json`)
**Trigger**: Every 4 hours
**Actions**:
- Check inventory for low stock
- Critical (out of stock) → WhatsApp + SMS
- Low stock → Aggregate and send summary

---

## Backend API Endpoints for n8n

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/n8n/due-payments` | POST | Get customers with due payments |
| `/api/n8n/daily-summary` | GET | Get daily stats for all users |
| `/api/n8n/low-stock` | GET | Get products with low stock |
| `/api/n8n/user-activity/:id` | GET | Get user activity |
| `/api/n8n/weekly-data` | GET | Get weekly data for AI |
| `/api/n8n/log-notification` | POST | Log notification sent |
| `/api/n8n/save-ai-insights` | POST | Save AI insights |
| `/api/n8n/trigger/onboarding` | POST | Trigger onboarding flow |

---

## WhatsApp Templates Required

Create these templates in Meta Business Suite:

| Template Name | Variables |
|--------------|-----------|
| `payment_reminder` | customer_name, amount, shop_name |
| `welcome_message` | user_name, shop_name |
| `tutorial_reminder` | user_name |
| `congrats_first_customer` | - |

---

## Environment Variables

```env
# n8n Connection
N8N_WEBHOOK_URL=http://localhost:5678
N8N_USER=admin
N8N_PASSWORD=shopsmart123
N8N_ENCRYPTION_KEY=your-32-char-key

# API Authentication
SHOPSMART_INTERNAL_API_KEY=your-internal-key

# External Services
WHATSAPP_PHONE_ID=your_phone_id
TWILIO_PHONE_NUMBER=+1234567890
SENDGRID_API_KEY=your_key
OPENAI_API_KEY=your_key
```

---

## Troubleshooting

### Workflow not triggering?
1. Check workflow is activated (toggle ON)
2. Verify cron expression in trigger node
3. Check n8n logs: `docker-compose logs n8n`

### API calls failing?
1. Verify backend is running
2. Check API key in credentials
3. Test endpoint manually with curl

### WhatsApp messages not sending?
1. Verify WhatsApp Business API setup
2. Check template is approved
3. Verify phone number format (+91...)

---

## Best Practices

1. **Error Handling**: Always add error workflow paths
2. **Rate Limits**: Add delays between bulk sends
3. **Logging**: Log all important actions
4. **Testing**: Test with small batches first
5. **Monitoring**: Check execution history regularly

---

*Part of ShopSmart Pro - Workflow Automation Layer*
