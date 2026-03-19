const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Contact = require('../models/Contact');
const Transaction = require('../models/Transaction');
const GroupTransaction = require('../models/GroupTransaction');
const MessRecord = require('../models/MessRecord');
const PersonalTransaction = require('../models/PersonalTransaction');
const Notification = require('../models/Notification');
const { sendAppUpdateEmail } = require('../services/emailService');

const router = express.Router();

// GET /api/admin/stats - high level counts + latest users
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [userCount, contactCount, transactionCount, groupTransactionCount, messRecordCount, latestUsers] = await Promise.all([
      User.countDocuments(),
      Contact.countDocuments(),
      Transaction.countDocuments(),
      GroupTransaction.countDocuments(),
      MessRecord.countDocuments(),
      User.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .select('name email role createdAt')
        .lean()
    ]);

    return res.json({
      success: true,
      data: {
        totals: {
          users: userCount,
          contacts: contactCount,
          transactions: transactionCount,
          groupTransactions: groupTransactionCount,
          messRecords: messRecordCount,
        },
        latestUsers,
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/admin/users - paginated + searchable list of users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').toString().trim();

    const filter = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      filter['$or'] = [{ name: regex }, { email: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name email role createdAt')
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/admin/app-update/broadcast - send update email to all users
router.post('/app-update/broadcast', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { version, message, updateUrl, subject } = req.body || {};

    if (!version || !message || !updateUrl) {
      return res.status(400).json({
        success: false,
        message: 'version, message, and updateUrl are required',
      });
    }

    const users = await User.find({ email: { $exists: true, $ne: '' } })
      .select('email name')
      .lean();

    if (!users.length) {
      return res.json({ success: true, data: { total: 0, sent: 0, failed: 0 } });
    }

    const sendResults = await Promise.allSettled(
      users.map((u) =>
        sendAppUpdateEmail(u.email, {
          name: u.name,
          version,
          message,
          updateUrl,
          subject,
        })
      )
    );

    let sent = 0;
    const failures = [];
    sendResults.forEach((r, idx) => {
      const userEmail = users[idx]?.email;
      if (r.status === 'fulfilled' && r.value?.success) {
        sent += 1;
      } else {
        failures.push({
          email: userEmail,
          error: r.reason?.message || r.value?.error || 'Unknown error',
        });
      }
    });

    // Save ONE broadcast admin-alert notification (visible to all users)
    await Notification.create({
      type: 'admin-alert',
      isBroadcast: true,
      title: subject || 'Khaata App Update',
      message: `Version ${version}: ${message}${updateUrl ? '\n\n' + updateUrl : ''}`,
      status: 'sent',
      sentAt: new Date(),
      readBy: [],
    });

    return res.json({
      success: true,
      data: {
        total: users.length,
        sent,
        failed: failures.length,
        failures,
      },
      message: `Broadcast complete: ${sent}/${users.length} sent`,
    });
  } catch (error) {
    console.error('Admin app update broadcast error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;

// GET /api/admin/users/:id/detail - detailed view for a single user
router.get('/users/:id/detail', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const user = await User.findById(userId).select('name email role createdAt').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [
      contacts,
      transactions,
      groupTransactions,
      messRecords,
      contactCount,
      transactionCount,
      groupCount,
      messCount,
    ] = await Promise.all([
      Contact.find({ userId }).sort({ createdAt: -1 }).limit(limit).select('name email phone balance createdAt').lean(),
      // Redact sensitive amounts; keep linkage and timing
      Transaction.find({ userId }).sort({ createdAt: -1 }).limit(limit).select('payer note createdAt contactId').populate('contactId', 'name email phone').lean(),
      GroupTransaction.find({ userId }).sort({ createdAt: -1 }).limit(limit).select('description createdAt contactIds').lean(),
      MessRecord.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).select('date mealType createdAt').lean(),
      Contact.countDocuments({ userId }),
      Transaction.countDocuments({ userId }),
      GroupTransaction.countDocuments({ userId }),
      MessRecord.countDocuments({ user: userId }),
    ]);

    const summary = {
      contacts: contactCount,
      transactions: transactionCount,
      groupTransactions: groupCount,
      messRecords: messCount,
    };

    return res.json({
      success: true,
      data: {
        user,
        summary,
        contacts,
        transactions,
        groupTransactions,
        messRecords,
      },
    });
  } catch (error) {
    console.error('Admin user detail error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

