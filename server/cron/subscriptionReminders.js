/**
 * Subscription Reminder Cron Jobs
 * SOFT PAYWALL APPROACH - remind but don't block users
 *
 * Flow:
 * 1. User starts trial (NO card required)
 * 2. Day 25: Reminder "5 days left"
 * 3. Day 28: Reminder "3 days left, upgrade now"
 * 4. Day 30: Reminder "Trial ended, some features limited"
 * 5. After trial: Soft downgrade to free (can still use basic features)
 * 6. Keep reminding gently until they upgrade
 */

const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// In production, integrate with:
// - SendGrid, Mailgun for emails
// - Twilio, MSG91 for SMS
// - WhatsApp Business API for WhatsApp

// ============================================================
// NOTIFICATION FUNCTIONS (Replace with actual service)
// ============================================================

const sendTrialEndingReminder = async (user, daysLeft, subscription) => {
  const messages = {
    7: `Hi ${user.name}! Your ShopSmart Pro trial has 7 days left. Enjoying the unlimited features? 🚀`,
    5: `Hi ${user.name}! Only 5 days left in your trial. Don't lose your premium features - upgrade now! 💪`,
    3: `Hi ${user.name}! 3 days left! Your customers data is safe, but you'll lose invoice generation & analytics. Upgrade to keep them!`,
    1: `Hi ${user.name}! LAST DAY of trial! Upgrade now to continue unlimited access. Your data is always safe with us. 🔒`
  };

  const message = messages[daysLeft] || `Trial ending in ${daysLeft} days`;

  console.log(`[Reminder] ${message} - Phone: ${user.phone}`);

  // TODO: Actual WhatsApp/SMS integration
  // await whatsappAPI.sendMessage({
  //   to: user.phone,
  //   message: message,
  //   buttons: [
  //     { text: 'Upgrade Now', url: 'https://yourapp.com/pricing' },
  //     { text: 'Remind Later', callback: 'remind_later' }
  //   ]
  // });
};

const sendTrialExpiredReminder = async (user) => {
  const message = `Hi ${user.name}! Your trial has ended. You're now on the Free plan (50 customers, 50 products). Upgrade anytime to unlock unlimited features! 🎯`;

  console.log(`[Reminder] Trial expired: ${message} - Phone: ${user.phone}`);
};

const sendGentleUpgradeReminder = async (user, daysSinceExpiry) => {
  // Send gentle reminders every few days after trial expires
  // But don't spam - once a week is enough
  const messages = [
    `Hi ${user.name}! Missing the Pro features? Upgrade now and get 20% off! Use code: COMEBACK20`,
    `Hi ${user.name}! Your shop is growing! Time to upgrade? Unlimited customers & products await! 📈`,
    `Hi ${user.name}! Did you know? Pro users save 5 hours/week on billing. Upgrade today! ⏰`
  ];

  const message = messages[Math.floor(Math.random() * messages.length)];
  console.log(`[Gentle Reminder] ${message} - Phone: ${user.phone}`);
};

const sendPaymentDueReminder = async (user, dueDate) => {
  console.log(`[Reminder] Payment due on ${dueDate.toLocaleDateString()} for ${user.name}`);
};

const sendPaymentFailedReminder = async (user) => {
  console.log(`[Reminder] Payment failed for ${user.name}. Please update payment method.`);
};

// ============================================================
// CRON JOBS
// ============================================================

// Check trials ending in 7, 5, 3, and 1 days
const checkTrialReminders = async () => {
  console.log('[Cron] Checking trial reminders...');

  const reminderDays = [7, 5, 3, 1];

  for (const days of reminderDays) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    try {
      const subscriptions = await Subscription.find({
        status: 'trialing',
        trialEndDate: {
          $gte: targetDate,
          $lt: nextDay
        }
      }).populate('user');

      for (const sub of subscriptions) {
        if (sub.user) {
          await sendTrialEndingReminder(sub.user, days, sub);
        }
      }

      console.log(`[Cron] Sent ${subscriptions.length} trial reminders for ${days}-day notice`);
    } catch (error) {
      console.error(`[Cron] Error checking ${days}-day trials:`, error.message);
    }
  }
};

// SOFT EXPIRATION - downgrade but don't block
const expireTrials = async () => {
  console.log('[Cron] Checking expired trials (soft downgrade)...');

  const now = new Date();

  try {
    const expiredTrials = await Subscription.find({
      status: 'trialing',
      trialEndDate: { $lt: now }
    }).populate('user');

    for (const sub of expiredTrials) {
      // Soft downgrade - user can still use app with free limits
      sub.status = 'expired';
      sub.plan = 'free';
      await sub.save();

      await User.findByIdAndUpdate(sub.user, {
        plan: 'free',
        subscriptionStatus: 'expired'
      });

      // Send friendly notification
      if (sub.user) {
        await sendTrialExpiredReminder(sub.user);
      }

      console.log(`[Cron] Trial soft-expired for user ${sub.user?._id || sub.user}, downgraded to free`);
    }

    console.log(`[Cron] Processed ${expiredTrials.length} expired trials`);
  } catch (error) {
    console.error('[Cron] Error expiring trials:', error.message);
  }
};

// Send gentle upgrade reminders to expired trial users (once a week)
const sendWeeklyUpgradeReminders = async () => {
  console.log('[Cron] Sending weekly upgrade reminders...');

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  try {
    // Find users whose trial expired but haven't been reminded this week
    const expiredSubscriptions = await Subscription.find({
      status: 'expired',
      trialEndDate: { $lt: weekAgo },
      // Only remind if they were active recently (used app in last 30 days)
    }).populate('user');

    let reminderCount = 0;

    for (const sub of expiredSubscriptions) {
      // Check if user was active recently (optional - skip inactive users)
      const user = sub.user;
      if (!user) continue;

      // Don't spam - check last reminder date
      const lastReminder = sub.metadata?.lastUpgradeReminder;
      if (lastReminder) {
        const daysSinceReminder = Math.floor((new Date() - new Date(lastReminder)) / (1000 * 60 * 60 * 24));
        if (daysSinceReminder < 7) continue; // Already reminded this week
      }

      await sendGentleUpgradeReminder(user, 0);

      // Update last reminder date
      sub.metadata = sub.metadata || {};
      sub.metadata.lastUpgradeReminder = new Date();
      await sub.save();

      reminderCount++;
    }

    console.log(`[Cron] Sent ${reminderCount} weekly upgrade reminders`);
  } catch (error) {
    console.error('[Cron] Error sending weekly reminders:', error.message);
  }
};

// Check upcoming payments (3 days before)
const checkPaymentReminders = async () => {
  console.log('[Cron] Checking payment reminders...');

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 3);
  targetDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  try {
    const subscriptions = await Subscription.find({
      status: 'active',
      nextBillingDate: {
        $gte: targetDate,
        $lt: nextDay
      }
    }).populate('user');

    for (const sub of subscriptions) {
      if (sub.user) {
        await sendPaymentDueReminder(sub.user, sub.nextBillingDate);
      }
    }

    console.log(`[Cron] Sent ${subscriptions.length} payment reminders`);
  } catch (error) {
    console.error('[Cron] Error checking payment reminders:', error.message);
  }
};

// Check failed payments
const checkFailedPayments = async () => {
  console.log('[Cron] Checking failed payments...');

  try {
    const subscriptions = await Subscription.find({
      status: 'past_due'
    }).populate('user');

    for (const sub of subscriptions) {
      if (sub.user) {
        await sendPaymentFailedReminder(sub.user);
      }
    }

    console.log(`[Cron] Sent ${subscriptions.length} failed payment reminders`);
  } catch (error) {
    console.error('[Cron] Error checking failed payments:', error.message);
  }
};

// ============================================================
// INITIALIZE CRON JOBS
// ============================================================

const initSubscriptionCrons = () => {
  // Daily at 9 AM IST - Trial reminders
  cron.schedule('0 9 * * *', () => {
    checkTrialReminders();
    checkPaymentReminders();
    checkFailedPayments();
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Daily at 10 AM NPT (9:45 AM IST) - Nepal timezone
  cron.schedule('0 10 * * *', () => {
    checkTrialReminders();
  }, {
    timezone: 'Asia/Kathmandu'
  });

  // Every hour - Check and soft-expire trials
  cron.schedule('0 * * * *', () => {
    expireTrials();
  });

  // Every Monday at 10 AM - Weekly upgrade reminders (not too frequent)
  cron.schedule('0 10 * * 1', () => {
    sendWeeklyUpgradeReminders();
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('✅ Subscription reminder cron jobs initialized (Soft Paywall Mode)');
};

module.exports = {
  initSubscriptionCrons,
  checkTrialReminders,
  checkPaymentReminders,
  checkFailedPayments,
  expireTrials,
  sendWeeklyUpgradeReminders
};
