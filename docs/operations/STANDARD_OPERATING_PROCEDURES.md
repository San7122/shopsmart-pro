# 📋 ShopSmart Pro - Standard Operating Procedures (SOPs)

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2024 | Operations Team | Initial version |

---

## Table of Contents

1. [Customer Onboarding SOP](#sop-001-customer-onboarding)
2. [Customer Support SOP](#sop-002-customer-support)
3. [Incident Management SOP](#sop-003-incident-management)
4. [Data Backup & Recovery SOP](#sop-004-data-backup-recovery)
5. [Release Management SOP](#sop-005-release-management)
6. [Vendor Management SOP](#sop-006-vendor-management)
7. [Quality Assurance SOP](#sop-007-quality-assurance)
8. [Security Incident SOP](#sop-008-security-incident)

---

## SOP-001: Customer Onboarding

### Purpose
To ensure consistent, high-quality onboarding experience for all new ShopSmart Pro users.

### Scope
Applies to all customer-facing teams: Sales, Support, Success.

### Process Flow

```
┌─────────────────┐
│  Registration   │
│  (Customer)     │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Welcome Email  │
│  (Automated)    │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Day 1 Check    │
│  (Support)      │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Day 3 Call     │
│  (Success)      │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Day 7 Review   │
│  (Success)      │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Day 30 NPS     │
│  (Automated)    │
└─────────────────┘
```

### Detailed Steps

#### Step 1: Registration (Automated)
| Task | Owner | Timeline | Tools |
|------|-------|----------|-------|
| User registers via app/web | Customer | T+0 | App |
| Account created in database | System | Immediate | Backend |
| Welcome SMS sent | System | T+0 | SMS Gateway |
| Welcome email sent | System | T+0 | SendGrid |
| CRM record created | System | T+0 | HubSpot |

#### Step 2: Day 1 Engagement
| Task | Owner | Timeline |
|------|-------|----------|
| Check if first customer added | Support Bot | T+24h |
| Send tutorial video if not active | System | T+24h |
| Flag for manual follow-up if needed | System | T+24h |

#### Step 3: Day 3 Call
| Task | Owner | Timeline |
|------|-------|----------|
| Outbound call to new user | CSM | T+72h |
| Understand business needs | CSM | During call |
| Address any issues | CSM | During call |
| Update CRM notes | CSM | Post-call |

**Call Script:**
```
"नमस्ते [Name] जी! मैं [Your Name], ShopSmart Pro से।
आपने 3 दिन पहले register किया था। कैसा experience रहा?
कोई problem तो नहीं आई? [Listen]
क्या आपने पहला customer add किया? [Help if needed]
कोई भी help चाहिए तो directly मुझे call कर सकते हो।"
```

#### Step 4: Day 7 Review
| Check | Action if Failed |
|-------|------------------|
| ≥5 customers added | Send "Add Customer" tutorial |
| ≥10 transactions | Send "Transaction" tutorial |
| App opened ≥3 times | Send re-engagement campaign |

#### Step 5: Day 30 NPS Survey
| NPS Score | Action |
|-----------|--------|
| 9-10 (Promoters) | Request referral, testimonial |
| 7-8 (Passives) | Understand what's missing |
| 0-6 (Detractors) | Immediate escalation to Success lead |

### Success Metrics
| Metric | Target |
|--------|--------|
| D1 Activation Rate | ≥60% |
| D7 Active Rate | ≥40% |
| D30 Retention | ≥25% |
| Day 3 Call Completion | ≥80% |
| NPS Score | ≥40 |

---

## SOP-002: Customer Support

### Purpose
To provide fast, effective support to all ShopSmart Pro users.

### Service Level Agreements (SLAs)

| Priority | Description | First Response | Resolution |
|----------|-------------|----------------|------------|
| P1 - Critical | App down, data loss | 15 min | 4 hours |
| P2 - High | Feature not working | 1 hour | 24 hours |
| P3 - Medium | How-to questions | 4 hours | 48 hours |
| P4 - Low | Feature requests | 24 hours | N/A |

### Support Channels

| Channel | Hours | Response Time |
|---------|-------|---------------|
| WhatsApp | 9 AM - 9 PM | < 15 min |
| Phone | 10 AM - 7 PM | Immediate |
| Email | 24/7 | < 24 hours |
| In-App Chat | 24/7 | < 15 min (bot), < 1 hr (human) |

### Ticket Handling Process

```
┌─────────────────┐
│  Ticket Created │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Auto-categorize│
│  & Prioritize   │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Assign to Agent│
└────────┬────────┘
         ↓
┌─────────────────┐
│  First Response │
│  (within SLA)   │
└────────┬────────┘
         ↓
    ┌────┴────┐
    ↓         ↓
┌───────┐ ┌───────┐
│Resolved│ │Escalate│
└───────┘ └───┬───┘
              ↓
         ┌────────┐
         │  L2/L3 │
         │ Support│
         └────────┘
```

### Escalation Matrix

| From | To | Trigger |
|------|-----|---------|
| L1 Support | L2 Support | Technical issue, not resolved in 30 min |
| L2 Support | L3 Tech | Bug confirmed, needs code fix |
| L2 Support | Product | Feature gap identified |
| Any Level | Management | Customer threat, legal issue |

### Response Templates
(See Customer Support Guide for full templates)

### Quality Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| First Response Time | < 15 min | Auto-tracked |
| Resolution Time | < 2 hours (avg) | Auto-tracked |
| First Contact Resolution | > 80% | Manual tag |
| CSAT Score | > 4.5/5 | Post-ticket survey |
| Ticket Reopen Rate | < 5% | Auto-tracked |

---

## SOP-003: Incident Management

### Purpose
To minimize impact of service disruptions and restore normal operations quickly.

### Incident Severity Levels

| Severity | Impact | Examples |
|----------|--------|----------|
| SEV1 | Complete outage | App down, database inaccessible |
| SEV2 | Major feature broken | Login failing, transactions not saving |
| SEV3 | Minor feature issue | UI bug, slow performance |
| SEV4 | Cosmetic/Low impact | Typo, minor display issue |

### Incident Response Team

| Role | Responsibility | Contact |
|------|----------------|---------|
| Incident Commander | Overall coordination | On-call rotation |
| Tech Lead | Technical investigation | Engineering |
| Comms Lead | User communication | Support Lead |
| Executive Sponsor | Decision authority | CTO/CEO |

### Incident Response Process

```
DETECT (T+0)
    ↓
ASSESS SEVERITY (T+5 min)
    ↓
ASSEMBLE TEAM (T+10 min)
    ↓
COMMUNICATE (T+15 min)
    ↓
INVESTIGATE & FIX (Ongoing)
    ↓
VERIFY & MONITOR (Post-fix)
    ↓
POST-MORTEM (T+48 hrs)
```

### Communication Templates

#### User Notification (SEV1)
```
🔴 Service Update - ShopSmart Pro

हमें एक technical issue आ रही है। हमारी team fix कर रही है।
आपका data safe है।

Status updates: [status page link]

Sorry for the inconvenience!
- Team ShopSmart
```

#### Internal Alert (Slack)
```
🚨 INCIDENT DECLARED - SEV1
Issue: [Brief description]
Impact: [User impact]
IC: [Name]
War Room: [Link]
ETA: Investigating

@channel
```

### Post-Incident Review
| Section | Content |
|---------|---------|
| Timeline | Minute-by-minute account |
| Root Cause | Why did this happen? |
| Impact | Users affected, duration |
| What Went Well | Positive aspects of response |
| What Went Wrong | Areas for improvement |
| Action Items | Preventive measures |

---

## SOP-004: Data Backup & Recovery

### Purpose
To ensure business continuity through robust data backup and recovery procedures.

### Backup Schedule

| Data Type | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| MongoDB (Full) | Daily | 30 days | AWS S3 |
| MongoDB (Incremental) | Hourly | 7 days | AWS S3 |
| User Uploads | Real-time | 90 days | AWS S3 |
| Logs | Daily | 14 days | CloudWatch |
| Configs | On change | 90 days | Git |

### Backup Verification
| Check | Frequency | Owner |
|-------|-----------|-------|
| Backup completion | Daily | Automated |
| Restore test (sample) | Weekly | DevOps |
| Full restore drill | Monthly | DevOps |
| DR failover test | Quarterly | DevOps + Engineering |

### Recovery Procedures

#### Point-in-Time Recovery (MongoDB)
```bash
# 1. Stop application servers
kubectl scale deployment backend --replicas=0

# 2. Restore from backup
mongorestore --uri="mongodb://..." --archive=backup.gz --gzip

# 3. Apply oplog to point-in-time
mongorestore --uri="mongodb://..." --oplogReplay --oplogLimit="<timestamp>"

# 4. Verify data integrity
mongo --eval "db.users.count()"

# 5. Restart application
kubectl scale deployment backend --replicas=3
```

#### Recovery Time Objectives
| Scenario | RTO | RPO |
|----------|-----|-----|
| Single record recovery | 15 min | 1 hour |
| Database corruption | 2 hours | 1 hour |
| Complete data center failure | 4 hours | 1 hour |

---

## SOP-005: Release Management

### Purpose
To ensure safe, consistent deployment of new features and bug fixes.

### Release Types

| Type | Frequency | Approval | Rollback Window |
|------|-----------|----------|-----------------|
| Hotfix | As needed | Tech Lead | Immediate |
| Patch | Weekly | Engineering Lead | 24 hours |
| Minor | Bi-weekly | Product + Engineering | 48 hours |
| Major | Monthly | Leadership | 1 week |

### Release Process

```
┌─────────────────┐
│  Development    │
│  Complete       │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Code Review    │
│  Approved       │
└────────┬────────┘
         ↓
┌─────────────────┐
│  QA Testing     │
│  Passed         │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Staging Deploy │
│  Verified       │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Release Notes  │
│  Prepared       │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Production     │
│  Deploy         │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Monitor        │
│  (1 hour)       │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Announce       │
│  (if needed)    │
└─────────────────┘
```

### Release Checklist
- [ ] All tests passing
- [ ] Code review approved
- [ ] Database migrations ready
- [ ] Feature flags configured
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Release notes written
- [ ] Support team briefed
- [ ] Go/No-Go approval received

### Rollback Procedure
```bash
# 1. Identify rollback need
# Check error rates, user reports

# 2. Execute rollback
kubectl rollout undo deployment/backend

# 3. Verify rollback
curl -f https://api.shopsmart.pro/health

# 4. Notify stakeholders
# Post in #releases channel

# 5. Document incident
# Create post-mortem if needed
```

---

## SOP-006: Vendor Management

### Purpose
To effectively manage relationships with third-party vendors and service providers.

### Vendor Categories

| Category | Examples | Risk Level |
|----------|----------|------------|
| Critical | AWS, MongoDB Atlas | High |
| Important | SMS Gateway, Payment | Medium |
| Supporting | Analytics, Marketing | Low |

### Vendor Evaluation Criteria

| Criteria | Weight | Scoring |
|----------|--------|---------|
| Reliability/Uptime | 25% | SLA guarantees |
| Cost | 20% | TCO analysis |
| Security | 20% | Certifications, audits |
| Support | 15% | Response times |
| Scalability | 10% | Growth capacity |
| Integration | 10% | API quality |

### Vendor Review Schedule

| Vendor Type | Review Frequency |
|-------------|------------------|
| Critical | Quarterly |
| Important | Semi-annually |
| Supporting | Annually |

### Current Vendors

| Vendor | Service | Contract End | Owner |
|--------|---------|--------------|-------|
| AWS | Cloud Infrastructure | Rolling | DevOps |
| MongoDB Atlas | Database | Rolling | DevOps |
| Twilio | SMS | Dec 2024 | Engineering |
| SendGrid | Email | Dec 2024 | Marketing |
| Razorpay | Payments | Mar 2025 | Finance |

---

## SOP-007: Quality Assurance

### Purpose
To maintain high quality standards across all product releases.

### QA Process

```
Requirements → Test Cases → Development → Testing → UAT → Release
```

### Testing Types

| Type | Coverage | Frequency |
|------|----------|-----------|
| Unit Tests | 80%+ code coverage | Every commit |
| Integration Tests | All API endpoints | Every PR |
| E2E Tests | Critical user flows | Daily |
| Performance Tests | Key endpoints | Weekly |
| Security Tests | OWASP Top 10 | Monthly |
| UAT | New features | Before release |

### Bug Severity Classification

| Severity | Definition | Example |
|----------|------------|---------|
| Critical | App unusable | Crash on launch |
| High | Major feature broken | Cannot add customer |
| Medium | Feature partially broken | Sort not working |
| Low | Minor issue | UI alignment |

### QA Sign-off Criteria
- [ ] All critical/high bugs fixed
- [ ] No new critical bugs introduced
- [ ] Test coverage maintained
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] UAT approved

---

## SOP-008: Security Incident Response

### Purpose
To effectively respond to security incidents and minimize damage.

### Security Incident Types

| Type | Examples |
|------|----------|
| Data Breach | Unauthorized data access |
| Account Compromise | User account hacked |
| DDoS Attack | Service disruption |
| Malware | Infected systems |
| Phishing | User credential theft |

### Response Process

```
DETECT → CONTAIN → ERADICATE → RECOVER → LESSONS LEARNED
```

### Immediate Actions (First 15 minutes)

1. **Assess scope** - What is affected?
2. **Contain** - Isolate affected systems
3. **Notify** - Alert security team
4. **Preserve** - Don't destroy evidence
5. **Document** - Start incident log

### Escalation Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Security Lead | TBD | XXX | security@shopsmart.pro |
| CTO | TBD | XXX | cto@shopsmart.pro |
| Legal | TBD | XXX | legal@shopsmart.pro |

### Communication Rules

- **DO NOT** discuss incident details publicly
- **DO NOT** speculate about cause
- **DO** keep affected users informed
- **DO** coordinate all comms through Comms Lead

### Regulatory Reporting
| Regulation | Timeline | Authority |
|------------|----------|-----------|
| CERT-In | 6 hours | CERT-In |
| IT Act | 72 hours | Cyber Cell |
| GDPR (if applicable) | 72 hours | DPA |

---

## Appendix: Document Templates

### A. Incident Report Template
### B. Vendor Evaluation Scorecard
### C. Release Notes Template
### D. QA Test Case Template

---

*Document Version: 1.0*
*Approved By: Operations Manager*
*Review Date: July 2024*
