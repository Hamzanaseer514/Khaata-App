const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Contact = require('../models/Contact');
const { createTransactionNotification } = require('../services/notificationService');

const router = express.Router();

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

// POST /api/transactions - Create a new transaction
router.post('/', [
  authenticateToken,
  body('contactId')
    .notEmpty()
    .withMessage('Contact ID is required')
    .isMongoId()
    .withMessage('Invalid contact ID'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0'),
  body('payer')
    .isIn(['USER', 'FRIEND'])
    .withMessage('Payer must be either USER or FRIEND'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Note cannot exceed 200 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { contactId, amount, payer, note } = req.body;

    // Verify that the contact belongs to the user
    const contact = await Contact.findOne({ 
      _id: contactId, 
      userId: req.user.userId 
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Create new transaction
    const transaction = new Transaction({
      userId: req.user.userId,
      contactId,
      amount,
      payer,
      note: note || ''
    });

    await transaction.save();

    // Update contact balance
    // USER pays → balance increases (friend owes you more)
    // FRIEND pays → balance decreases (you owe friend more, or friend owes you less)
    if (payer === 'USER') {
      contact.balance += amount; // Friend owes you more (positive balance)
    } else {
      contact.balance -= amount; // You owe friend more (negative balance)
    }

    await contact.save();

    // Send notification email (async, don't wait for it)
    createTransactionNotification(transaction, req.user.userId, contactId)
      .then(result => {
        console.log('Notification result:', result);
      })
      .catch(error => {
        console.error('Notification error:', error);
      });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: {
        id: transaction._id,
        contactId: transaction.contactId,
        amount: transaction.amount,
        payer: transaction.payer,
        note: transaction.note,
        createdAt: transaction.createdAt,
        newBalance: contact.balance
      }
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/transactions - Get transactions for a specific contact or all contacts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { contact_id } = req.query;
    const userId = req.user.userId;

    let query = { userId };

    // If contact_id is provided, filter by contact
    if (contact_id) {
      // Verify that the contact belongs to the user
      const contact = await Contact.findOne({ 
        _id: contact_id, 
        userId 
      });

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }

      query.contactId = contact_id;
    }

    const transactions = await Transaction.find(query)
      .populate('contactId', 'name phone email')
      .sort({ createdAt: -1 })
      .select('-userId');

    // Transform the data to match frontend expectations
    const transformedTransactions = transactions.map(transaction => ({
      id: transaction._id,
      amount: transaction.amount,
      payer: transaction.payer,
      note: transaction.note,
      createdAt: transaction.createdAt
    }));

    res.json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: transformedTransactions
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/transactions/summary/monthly - Monthly totals for bar chart
router.get('/summary/monthly', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1); // last 6 months including current

    const results = await Transaction.aggregate([
      { $match: { userId: new (require('mongoose')).Types.ObjectId(userId), createdAt: { $gte: start } } },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' }, payer: '$payer' },
          total: { $sum: '$amount' },
          txCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]);

    // Shape: month label, userPaid, friendPaid, net (userPaid - friendPaid)
    const map = new Map();
    results.forEach((r) => {
      const key = `${r._id.y}-${r._id.m}`;
      if (!map.has(key)) map.set(key, { year: r._id.y, month: r._id.m, userPaid: 0, friendPaid: 0, userCount: 0, friendCount: 0 });
      const row = map.get(key);
      if (r._id.payer === 'USER') { row.userPaid += r.total; row.userCount += r.txCount; }
      else { row.friendPaid += r.total; row.friendCount += r.txCount; }
    });

    // Ensure chronological sequence for last 6 months
    const out = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const row = map.get(k) || { year: d.getFullYear(), month: d.getMonth() + 1, userPaid: 0, friendPaid: 0 };
      out.push({
        year: row.year,
        month: row.month,
        label: d.toLocaleString('default', { month: 'short' }),
        userPaid: row.userPaid,
        friendPaid: row.friendPaid,
        userCount: row.userCount || 0,
        friendCount: row.friendCount || 0,
        net: row.userPaid - row.friendPaid,
      });
    }

    res.json({ success: true, message: 'Monthly summary', data: out });
  } catch (error) {
    console.error('Monthly summary error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

module.exports = router;
