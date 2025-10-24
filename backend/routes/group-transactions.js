const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const GroupTransaction = require('../models/GroupTransaction');
const Transaction = require('../models/Transaction');
const Contact = require('../models/Contact');
const { createGroupTransactionNotification } = require('../services/notificationService');

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

// POST /api/group-transactions - Create a new group transaction
router.post('/', [
  authenticateToken,
  body('payerId')
    .notEmpty()
    .withMessage('Payer ID is required'),
  body('contactIds')
    .isArray({ min: 1 })
    .withMessage('At least 1 contact is required for group transaction'),
  body('contactIds.*')
    .isMongoId()
    .withMessage('Invalid contact ID'),
  body('totalAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Total amount must be a positive number greater than 0'),
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('splitMode')
    .optional()
    .isIn(['equal', 'manual'])
    .withMessage('Split mode must be either equal or manual'),
  body('individualAmounts')
    .optional()
    .isObject()
    .withMessage('Individual amounts must be an object')
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

    const { payerId, contactIds, totalAmount, description, splitMode = 'equal', individualAmounts = {}, userAmount = 0 } = req.body;
    const userId = req.user.userId;

    console.log('=== GROUP TRANSACTION DEBUG ===');
    console.log('User ID:', userId);
    console.log('Payer ID:', payerId);
    console.log('Contact IDs:', contactIds);
    console.log('Total Amount:', totalAmount);
    console.log('Description:', description);
    console.log('Split Mode:', splitMode);
    console.log('Individual Amounts:', individualAmounts);

    // Check if payer is "USER" (logged in user paying)
    const isUserPayer = payerId === 'USER';
    
    // Verify that all contacts belong to the user
    const contacts = await Contact.find({ 
      _id: { $in: contactIds }, 
      userId 
    });

    console.log('Looking for contacts with IDs:', contactIds);
    console.log('Found contacts:', contacts.map(c => ({ id: c._id.toString(), name: c.name })));
    console.log('Expected count:', contactIds.length);
    console.log('Actual count:', contacts.length);

    if (contacts.length !== contactIds.length) {
      console.log('ERROR: Contact count mismatch!');
      return res.status(404).json({
        success: false,
        message: 'One or more contacts not found',
        debug: {
          requestedIds: contactIds,
          foundContacts: contacts.map(c => c._id.toString()),
          expectedCount: contactIds.length,
          actualCount: contacts.length
        }
      });
    }

    if (!isUserPayer && !contactIds.includes(payerId)) {
      return res.status(400).json({
        success: false,
        message: 'Payer must be included in the contact list'
      });
    }

    // Calculate per person share based on split mode
    let perPersonShare;
    let contactAmounts = {};
    
    if (splitMode === 'equal') {
      // Equal split - include the user/payer in the split
      perPersonShare = totalAmount / (contactIds.length + 1);
      contactIds.forEach(contactId => {
        contactAmounts[contactId] = perPersonShare;
      });
    } else {
      // Manual split - validate individual amounts
      const contactTotal = Object.values(individualAmounts).reduce((sum, amount) => sum + amount, 0);
      const totalManual = contactTotal + userAmount;
      
      if (Math.abs(totalManual - totalAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Manual amounts total (${totalManual}) must equal the total amount (${totalAmount})`
        });
      }
      
      contactAmounts = individualAmounts;
      perPersonShare = totalAmount / (contactIds.length + 1); // For display purposes
    }

    // Create group transaction
    const groupTransaction = new GroupTransaction({
      userId,
      payerId: isUserPayer ? null : payerId, // Store null if user is paying
      contactIds,
      totalAmount,
      perPersonShare,
      description,
      splitMode,
      individualAmounts: splitMode === 'manual' ? contactAmounts : undefined,
      userAmount: splitMode === 'manual' ? userAmount : undefined
    });

    await groupTransaction.save();

    // Create individual transactions for each contact
    const individualTransactions = [];

    for (const contactId of contactIds) {
      const contact = contacts.find(c => c._id.toString() === contactId);
      const contactAmount = contactAmounts[contactId];
      
      if (isUserPayer) {
        // User is paying - all contacts owe user their share
        const transaction = new Transaction({
          userId,
          contactId,
          amount: contactAmount,
          payer: 'USER', // User paid, so friends owe user
          note: `Group: ${description}`
        });

        await transaction.save();
        individualTransactions.push(transaction);

        // Update contact balance - friend owes user (positive balance for user)
        contact.balance += contactAmount;
        await contact.save();
      } else if (contactId === payerId) {
        // Contact paid - they get credit for what they paid minus their share
        const creditAmount = totalAmount - contactAmount;
        
        const transaction = new Transaction({
          userId,
          contactId,
          amount: creditAmount,
          payer: 'FRIEND', // Friend paid, so user owes friend
          note: `Group: ${description}`
        });

        await transaction.save();
        individualTransactions.push(transaction);

        // Update contact balance - user owes friend (negative balance)
        contact.balance -= creditAmount;
        await contact.save();
      } else {
        // Other contacts owe the payer their share
        const transaction = new Transaction({
          userId,
          contactId,
          amount: contactAmount,
          payer: 'FRIEND', // Friend paid, so user owes friend
          note: `Group: ${description}`
        });

        await transaction.save();
        individualTransactions.push(transaction);

        // Update contact balance - user owes friend (negative balance)
        contact.balance -= contactAmount;
        await contact.save();
      }
    }

    // Send notifications for group transaction (async, don't wait for it)
    createGroupTransactionNotification(groupTransaction, userId, contactIds)
      .then(result => {
        console.log('Group notification result:', result);
      })
      .catch(error => {
        console.error('Group notification error:', error);
      });

    res.status(201).json({
      success: true,
      message: 'Group transaction created successfully',
      data: {
        id: groupTransaction._id,
        payerId: groupTransaction.payerId || 'USER',
        contactIds: groupTransaction.contactIds,
        totalAmount: groupTransaction.totalAmount,
        perPersonShare: groupTransaction.perPersonShare,
        description: groupTransaction.description,
        createdAt: groupTransaction.createdAt,
        splitMode: groupTransaction.splitMode,
        individualAmounts: groupTransaction.individualAmounts ? Object.fromEntries(groupTransaction.individualAmounts) : undefined,
        userAmount: groupTransaction.userAmount,
        individualTransactions: individualTransactions.map(t => ({
          id: t._id,
          contactId: t.contactId,
          amount: t.amount,
          payer: t.payer,
          note: t.note
        }))
      }
    });

  } catch (error) {
    console.error('Create group transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/group-transactions - Get all group transactions for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const groupTransactions = await GroupTransaction.find({ userId })
      .populate('payerId', 'name phone email')
      .populate('contactIds', 'name phone email')
      .sort({ createdAt: -1 });

    // Transform the data to match frontend expectations
    const transformedTransactions = groupTransactions.map(transaction => ({
      id: transaction._id,
      payerId: transaction.payerId || 'USER',
      payerName: transaction.payerId ? transaction.payerId.name : 'You',
      contactIds: transaction.contactIds,
      contactNames: transaction.contactIds.map(contact => contact.name),
      totalAmount: transaction.totalAmount,
      perPersonShare: transaction.perPersonShare,
      description: transaction.description,
      createdAt: transaction.createdAt,
      splitMode: transaction.splitMode || 'equal',
      individualAmounts: transaction.individualAmounts ? Object.fromEntries(transaction.individualAmounts) : undefined,
      userAmount: transaction.userAmount || undefined
    }));

    res.json({
      success: true,
      message: 'Group transactions retrieved successfully',
      data: transformedTransactions
    });

  } catch (error) {
    console.error('Get group transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
