const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Contact = require('../models/Contact');
const { createTransactionNotification } = require('../services/notificationService');
const User = require('../models/User');
const RewardRecord = require('../models/RewardRecord');

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

    // --- Reward System Logic ---
    try {
      const user = await User.findById(req.user.userId);
      if (user) {
        let earnedPoints = 5; // Base points for a transaction
        let rewardReason = 'New Transaction';

        // Check Daily Milestone (5 transactions)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastReset = new Date(user.dailyTransactionCount.lastReset);
        lastReset.setHours(0, 0, 0, 0);

        if (today > lastReset) {
          // Reset for a new day
          user.dailyTransactionCount.count = 1;
          user.dailyTransactionCount.lastReset = new Date();
        } else {
          user.dailyTransactionCount.count += 1;
        }

        // Award milestone if exactly 5
        if (user.dailyTransactionCount.count === 5) {
          earnedPoints += 50;
          rewardReason = 'Daily Transaction Milestone (5)';
        }

        user.points += earnedPoints;

        // Simple Leveling logic
        if (user.points >= 1000) user.level = 'Platinum';
        else if (user.points >= 400) user.level = 'Gold';

        await user.save();

        // Log reward record
        const reward = new RewardRecord({
          userId: req.user.userId,
          points: earnedPoints,
          reason: rewardReason
        });
        await reward.save();
      }
    } catch (rewardError) {
      console.error('Reward award error:', rewardError);
    }
    // ----------------------------

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

// GET /api/transactions/summary/monthly - Monthly aggregation for dashboard
router.get('/summary/monthly', authenticateToken, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    // Last 6 months range
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const stats = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          userPaid: {
            $sum: { $cond: [{ $eq: ["$payer", "USER"] }, "$amount", 0] }
          },
          friendPaid: {
            $sum: { $cond: [{ $eq: ["$payer", "FRIEND"] }, "$amount", 0] }
          }
        }
      },
      {
        $addFields: {
          net: { $subtract: ["$userPaid", "$friendPaid"] }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Format for frontend: { label: 'Jan', userPaid: 100, friendPaid: 50, net: 50 }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedData = stats.map(s => ({
      label: months[s._id.month - 1],
      userPaid: s.userPaid,
      friendPaid: s.friendPaid,
      net: s.net
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Monthly summary error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
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

// PUT /api/transactions/:id - Update an existing transaction
router.put('/:id', [
  authenticateToken,
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0'),
  body('payer')
    .optional()
    .isIn(['USER', 'FRIEND'])
    .withMessage('Payer must be either USER or FRIEND'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Note cannot exceed 200 characters')
], async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { amount, payer, note } = req.body;

    // Find the transaction and verify ownership
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: req.user.userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or access denied'
      });
    }

    const contact = await Contact.findById(transaction.contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Associated contact not found'
      });
    }

    // 1. Revert previous balance impact
    if (transaction.payer === 'USER') {
      contact.balance -= transaction.amount;
    } else {
      contact.balance += transaction.amount;
    }

    // 2. Update transaction fields
    if (amount !== undefined) transaction.amount = amount;
    if (payer !== undefined) transaction.payer = payer;
    if (note !== undefined) transaction.note = note;

    // 3. Apply new balance impact
    if (transaction.payer === 'USER') {
      contact.balance += transaction.amount;
    } else {
      contact.balance -= transaction.amount;
    }

    await transaction.save();
    await contact.save();

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: {
        id: transaction._id,
        amount: transaction.amount,
        payer: transaction.payer,
        note: transaction.note,
        newBalance: contact.balance
      }
    });

  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE /api/transactions/:id - Delete a transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const transactionId = req.params.id;

    // Find the transaction and verify ownership
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: req.user.userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or access denied'
      });
    }

    const contact = await Contact.findById(transaction.contactId);
    if (contact) {
      // Revert balance impact
      if (transaction.payer === 'USER') {
        contact.balance -= transaction.amount;
      } else {
        contact.balance += transaction.amount;
      }
      await contact.save();
    }

    await Transaction.deleteOne({ _id: transactionId });

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
      data: {
        newBalance: contact ? contact.balance : null
      }
    });

  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
