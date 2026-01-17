# 📍 ShopSmart Pro - Sales Territory Plan & CRM Setup

## Executive Overview

This document outlines the territory planning, sales pipeline management, CRM configuration, and commission structure for the ShopSmart Pro field sales organization.

---

## Territory Structure

### Geographic Hierarchy

```
NATIONAL
    ↓
ZONES (4)
    ↓
REGIONS (12)
    ↓
TERRITORIES (48)
    ↓
BEATS (192)
```

### Zone Definitions

| Zone | States | HQ | Regional Manager |
|------|--------|-----|------------------|
| **North** | Delhi, UP, Punjab, Haryana, Rajasthan, HP, UK | Delhi | TBD |
| **West** | Maharashtra, Gujarat, MP, Goa | Mumbai | TBD |
| **South** | Karnataka, TN, Kerala, AP, Telangana | Bangalore | TBD |
| **East** | WB, Bihar, Odisha, Jharkhand, NE States | Kolkata | TBD |

### Territory Details (Sample - North Zone)

| Region | Key Cities | Territories | Monthly Target |
|--------|------------|-------------|----------------|
| Delhi NCR | Delhi, Gurgaon, Noida, Faridabad | 6 | 600 users |
| UP West | Meerut, Agra, Ghaziabad, Lucknow | 4 | 400 users |
| UP East | Varanasi, Allahabad, Kanpur, Gorakhpur | 4 | 350 users |
| Punjab | Ludhiana, Amritsar, Jalandhar, Chandigarh | 4 | 300 users |
| Rajasthan | Jaipur, Jodhpur, Udaipur, Kota | 4 | 300 users |

### Territory Assignment Criteria

| Factor | Weight | Metrics |
|--------|--------|---------|
| Shop Density | 30% | Retail outlets per sq km |
| Economic Activity | 25% | GDP, credit card penetration |
| Digital Readiness | 20% | Smartphone penetration |
| Competition | 15% | Existing solutions adoption |
| Infrastructure | 10% | Internet connectivity |

---

## Sales Team Structure

### Organizational Chart

```
┌─────────────────────────────────────┐
│        National Sales Head          │
│         (1 person)                  │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───┴───┐  ┌───┴───┐  ┌───┴───┐
│ Zone   │  │ Zone   │  │ Zone   │
│ Head   │  │ Head   │  │ Head   │
│ (4)    │  │        │  │        │
└───┬────┘  └────────┘  └────────┘
    │
┌───┴────────────────────────┐
│      Regional Managers      │
│         (12 total)          │
└───┬────────────────────────┘
    │
┌───┴────────────────────────┐
│    Territory Executives     │
│        (48 total)           │
└───┬────────────────────────┘
    │
┌───┴────────────────────────┐
│   Field Sales Associates    │
│       (192 total)           │
└────────────────────────────┘
```

### Roles & Responsibilities

| Role | Count | Responsibilities | Target |
|------|-------|------------------|--------|
| **National Sales Head** | 1 | Strategy, P&L, partnerships | Overall revenue |
| **Zone Head** | 4 | Zone P&L, team building | Zone target |
| **Regional Manager** | 12 | Regional ops, training | 500 users/mo |
| **Territory Executive** | 48 | Territory management | 125 users/mo |
| **Field Sales Associate** | 192 | Shop visits, demos | 40 users/mo |

---

## Beat Planning

### Daily Beat Structure

| Time | Activity | Duration |
|------|----------|----------|
| 9:00 - 9:30 | Morning huddle (virtual) | 30 min |
| 9:30 - 13:00 | Shop visits (first half) | 3.5 hrs |
| 13:00 - 14:00 | Lunch + CRM updates | 1 hr |
| 14:00 - 17:30 | Shop visits (second half) | 3.5 hrs |
| 17:30 - 18:00 | Day-end CRM updates | 30 min |
| 18:00 - 18:30 | Follow-up calls | 30 min |

### Beat Metrics

| Metric | Daily Target | Weekly Target |
|--------|--------------|---------------|
| Shop Visits | 15-20 | 75-100 |
| Demos Given | 10-12 | 50-60 |
| Registrations | 2-3 | 10-15 |
| Follow-up Calls | 5-10 | 25-50 |

### Route Optimization

```
Monday: Market A (high density)
Tuesday: Market B (medium density)
Wednesday: Market A (follow-ups) + Market C
Thursday: Market D (new expansion)
Friday: Mixed (pending follow-ups)
Saturday: High-traffic areas
```

---

## CRM Configuration (HubSpot)

### Pipeline Stages

| Stage | Definition | Probability | Actions |
|-------|------------|-------------|---------|
| **Lead** | Shop identified | 10% | Basic info collected |
| **Contacted** | First interaction done | 20% | Demo scheduled |
| **Demo Given** | App demonstrated | 40% | Interest assessed |
| **Registered** | Account created | 60% | First customer added |
| **Activated** | 10+ customers | 80% | Regular usage verified |
| **Premium Lead** | Premium interest | 90% | Pricing discussed |
| **Won** | Premium purchased | 100% | Payment received |
| **Lost** | Rejected/Churned | 0% | Reason documented |

### Lead Scoring Model

| Attribute | Score | Criteria |
|-----------|-------|----------|
| **Shop Type** | | |
| - Kirana | +20 | High credit volume |
| - Grocery | +15 | Medium credit |
| - Electronics | +25 | High ticket items |
| - Medical | +10 | Low credit typically |
| **Shop Size** | | |
| - Large | +15 | >₹5L monthly |
| - Medium | +10 | ₹2L-5L monthly |
| - Small | +5 | <₹2L monthly |
| **Tech Readiness** | | |
| - Smartphone owner | +20 | Required |
| - WhatsApp user | +10 | Indicator |
| - Current digital tool | +15 | Competition |
| **Engagement** | | |
| - Demo completed | +25 | High intent |
| - Registered | +30 | Committed |
| - Asked questions | +10 | Interest |

**Lead Qualification Threshold: 50 points**

### Custom Fields

| Field | Type | Required | Stage |
|-------|------|----------|-------|
| Shop Name | Text | Yes | Lead |
| Shop Type | Dropdown | Yes | Lead |
| Monthly Revenue | Number | No | Contacted |
| Current Method | Dropdown | No | Contacted |
| No. of Customers | Number | No | Demo |
| Credit Volume | Number | No | Demo |
| Pain Points | Multi-select | Yes | Demo |
| Objections | Multi-select | No | Demo |
| Registered Date | Date | Auto | Registered |
| Customers Added | Number | Auto | Activated |

### Automation Rules

| Trigger | Action | Timeline |
|---------|--------|----------|
| Lead created | Assign to territory rep | Immediate |
| No activity 48h | Alert to rep + manager | 48 hours |
| Demo completed | Send tutorial video | Immediate |
| Registered | Trigger Day 1 call task | +24 hours |
| 7 days no activity | Send re-engagement email | +7 days |
| Premium interest | Alert to manager | Immediate |

---

## Sales Reporting

### Daily Reports (Auto-generated)

| Report | Recipients | Time |
|--------|------------|------|
| Daily Activity Summary | All reps, managers | 7 PM |
| Registration Dashboard | Zone heads | 7 PM |
| Beat Completion | Territory managers | 8 PM |

### Weekly Reports

| Report | Content | Recipients |
|--------|---------|------------|
| Pipeline Review | Stage movement, conversion | All managers |
| Territory Performance | vs Target, trends | Zone heads |
| Activity Analysis | Visits, demos, conversion | National head |
| Lost Deal Analysis | Reasons, patterns | Product team |

### Monthly Reports

| Report | Content |
|--------|---------|
| Territory Scorecard | Full performance metrics |
| Compensation Report | Commissions, incentives |
| Market Intelligence | Competition, trends |
| Forecast | Next quarter pipeline |

### Key Dashboards

#### 1. Sales Activity Dashboard
```
┌─────────────────────────────────────────────────┐
│  TODAY'S ACTIVITY                               │
├─────────────────────────────────────────────────┤
│  Visits: 1,245 / 1,500 target    [████████░░]  │
│  Demos:    892 / 1,000 target    [████████░░]  │
│  Registrations: 156 / 200 target [███████░░░]  │
└─────────────────────────────────────────────────┘
```

#### 2. Pipeline Dashboard
```
┌─────────────────────────────────────────────────┐
│  PIPELINE BY STAGE                              │
├─────────────────────────────────────────────────┤
│  Lead        ████████████████  4,500            │
│  Contacted   ██████████        2,800            │
│  Demo Given  ███████           1,900            │
│  Registered  █████             1,200            │
│  Activated   ███                 650            │
│  Premium     █                   150            │
└─────────────────────────────────────────────────┘
```

---

## Commission Structure

### Base Compensation

| Role | Monthly Base | Variable (Max) | OTE |
|------|--------------|----------------|-----|
| Field Sales Associate | ₹18,000 | ₹12,000 | ₹30,000 |
| Territory Executive | ₹35,000 | ₹25,000 | ₹60,000 |
| Regional Manager | ₹60,000 | ₹40,000 | ₹1,00,000 |
| Zone Head | ₹1,00,000 | ₹75,000 | ₹1,75,000 |

### Variable Pay Components

#### Field Sales Associate

| Metric | Weight | Payout |
|--------|--------|--------|
| Registrations | 50% | ₹150 per registration |
| Activations | 30% | ₹200 per activated user |
| Premium Conversions | 20% | ₹500 per premium |

**Example:**
- 30 registrations × ₹150 = ₹4,500
- 15 activations × ₹200 = ₹3,000
- 2 premium × ₹500 = ₹1,000
- **Total Variable: ₹8,500**

#### Territory Executive

| Metric | Weight | Payout |
|--------|--------|--------|
| Territory Target Achievement | 60% | Slab-based |
| Team Performance | 25% | Average of team |
| Quality Score | 15% | Retention-based |

**Achievement Slabs:**

| Achievement | Payout Multiplier |
|-------------|-------------------|
| < 80% | 0.5x |
| 80-100% | 1.0x |
| 100-120% | 1.25x |
| > 120% | 1.5x |

#### Regional Manager

| Metric | Weight | Description |
|--------|--------|-------------|
| Regional Revenue | 50% | ARR from region |
| Activation Rate | 25% | D30 retention |
| Team Quota Attainment | 25% | % of reps hitting target |

### Incentive Programs

#### Monthly SPIFFs
| SPIFF | Criteria | Reward |
|-------|----------|--------|
| "Fastest Finger" | First to hit monthly target | ₹5,000 |
| "Quality King" | Highest activation rate (>50%) | ₹3,000 |
| "Premium Pro" | Most premium conversions | ₹5,000 |

#### Quarterly Bonuses
| Level | Criteria | Bonus |
|-------|----------|-------|
| Bronze | Hit quarterly target | ₹10,000 |
| Silver | 110% of target | ₹20,000 |
| Gold | 125% of target | ₹35,000 |
| Diamond | 150% of target | ₹50,000 + Trip |

#### Annual President's Club
- Top 10 performers nationally
- All-expense paid trip (Goa/Thailand)
- Special recognition at annual meet
- Premium gift (₹25,000 value)

---

## Training & Enablement

### Onboarding Program (2 weeks)

| Week | Focus | Activities |
|------|-------|------------|
| Week 1 | Product & Market | Product training, market understanding |
| Week 2 | Sales Skills | Role plays, field shadowing |

### Certification Levels

| Level | Requirement | Benefits |
|-------|-------------|----------|
| Certified | Pass product exam (80%+) | Base commission |
| Advanced | 3 months performance | +10% commission |
| Expert | 6 months + 120% target | +15% commission |

### Ongoing Training

| Training | Frequency | Format |
|----------|-----------|--------|
| Product Updates | Bi-weekly | Virtual |
| Sales Skills | Monthly | In-person |
| Competition Intelligence | Weekly | Email |
| Best Practice Sharing | Weekly | Team call |

---

## Performance Management

### Weekly 1:1 Template

```
1. WINS THIS WEEK
   - Key achievements
   - Best practices to share

2. CHALLENGES
   - Blockers faced
   - Support needed

3. PIPELINE REVIEW
   - Hot prospects
   - At-risk deals

4. NEXT WEEK PRIORITIES
   - Focus areas
   - Targets

5. DEVELOPMENT
   - Skills to improve
   - Training needs
```

### Performance Improvement Plan (PIP)

**Trigger:** < 70% target achievement for 2 consecutive months

| Week | Focus | Review |
|------|-------|--------|
| Week 1-2 | Identify gaps, set daily targets | Daily check-in |
| Week 3-4 | Intensive coaching | Every 2 days |
| Week 5-6 | Independent execution | Weekly review |
| Week 7-8 | Final assessment | Decision point |

---

## Tools & Resources

### Sales Tech Stack

| Tool | Purpose | Access |
|------|---------|--------|
| HubSpot CRM | Pipeline management | All sales |
| WhatsApp Business | Customer communication | All sales |
| Google Maps | Route planning | All sales |
| Zoom | Virtual demos | All sales |
| Notion | Sales playbook | All sales |
| Looker | Dashboards | Managers+ |

### Sales Collateral

| Asset | Format | Location |
|-------|--------|----------|
| Product Brochure | PDF | Google Drive |
| Demo Video | MP4 | YouTube (unlisted) |
| Case Studies | PDF | Google Drive |
| Pricing Sheet | PDF | Google Drive |
| FAQ Document | PDF | Notion |
| Objection Handling | Doc | Notion |

---

## Appendix

### A. Territory Maps
### B. CRM Field Definitions
### C. Commission Calculator
### D. Training Calendar
### E. Competitive Battlecards

---

*Document Version: 1.0*
*Owner: National Sales Head*
*Last Updated: January 2024*
