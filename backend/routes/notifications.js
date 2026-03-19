const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Notification = require('../models/Notification');
const Transaction = require('../models/Transaction');
const Contact = require('../models/Contact');
const User = require('../models/User');
const { sendNotificationEmail } = require('../services/emailService');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

// GET /api/notifications - Get all notifications (email-type) for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const notifications = await Notification.find({ userId, type: 'email' })
      .populate('transactionId', 'amount payer note createdAt')
      .populate('contactId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 notifications
    
    const formattedNotifications = notifications.map(notification => ({
      id: notification._id,
      transactionId: notification.transactionId?._id,
      contactName: notification.contactId?.name,
      contactEmail: notification.contactId?.email,
      message: notification.message,
      status: notification.status,
      sentAt: notification.sentAt,
      createdAt: notification.createdAt,
      transactionDetails: notification.transactionId ? {
        amount: notification.transactionId.amount,
        payer: notification.transactionId.payer,
        note: notification.transactionId.note,
        createdAt: notification.transactionId.createdAt
      } : null
    }));
    
    res.json({
      success: true,
      data: formattedNotifications,
      count: formattedNotifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/notifications/alerts - admin alerts (in-app) - fetches broadcast alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const alerts = await Notification.find({ type: 'admin-alert', isBroadcast: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Map read status per-user from readBy array
    const mapped = alerts.map(a => ({
      ...a,
      isRead: (a.readBy || []).some(id => id.toString() === userId),
    }));
    const unreadCount = mapped.filter(a => !a.isRead).length;
    return res.json({ success: true, data: { alerts: mapped, unreadCount } });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/notifications/alerts/read - mark all broadcast alerts as read for this user
router.patch('/alerts/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await Notification.updateMany(
      { type: 'admin-alert', isBroadcast: true, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
    return res.json({ success: true, message: 'Alerts marked as read' });
  } catch (error) {
    console.error('Error marking alerts read:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PATCH /api/notifications/alerts/:id/read - mark single broadcast alert as read for this user
router.patch('/alerts/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const alertId = req.params.id;
    const updated = await Notification.findOneAndUpdate(
      { _id: alertId, type: 'admin-alert', isBroadcast: true },
      { $addToSet: { readBy: userId } },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    return res.json({ success: true, message: 'Alert marked as read', data: updated });
  } catch (error) {
    console.error('Error marking alert read:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/notifications/send - Manually send notification (for testing)
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { transactionId, contactId } = req.body;
    const userId = req.user.userId;
    
    // Find transaction and contact
    const transaction = await Transaction.findOne({ _id: transactionId, userId });
    const contact = await Contact.findOne({ _id: contactId, userId });
    
    if (!transaction || !contact) {
      return res.status(404).json({
        success: false,
        message: 'Transaction or contact not found'
      });
    }
    
    if (!contact.email) {
      return res.status(400).json({
        success: false,
        message: 'Contact does not have an email address'
      });
    }
    
    // Create notification record
    const notification = new Notification({
      transactionId: transaction._id,
      userId: userId,
      contactId: contact._id,
      message: `Transaction notification for ${contact.name}`,
      status: 'pending'
    });
    
    await notification.save();
    
    // Prepare email data
    const emailData = {
      type: transaction.payer === 'USER' ? 'DEBIT' : 'CREDIT',
      amount: transaction.amount,
      contactName: contact.name,
      updatedBalance: contact.balance,
      description: transaction.note
    };
    
    // Send email
    const emailResult = await sendNotificationEmail(contact.email, emailData);
    
    // Update notification status
    if (emailResult.success) {
      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();
    } else {
      notification.status = 'failed';
      await notification.save();
    }
    
    res.json({
      success: true,
      message: 'Notification processed',
      data: {
        notificationId: notification._id,
        emailSent: emailResult.success,
        emailError: emailResult.error || null
      }
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/notifications/stats - Get notification statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const stats = await Notification.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const formattedStats = {
      total: 0,
      sent: 0,
      pending: 0,
      failed: 0
    };
    
    stats.forEach(stat => {
      formattedStats.total += stat.count;
      formattedStats[stat._id] = stat.count;
    });
    
    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
