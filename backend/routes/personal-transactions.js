const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const PersonalTransaction = require('../models/PersonalTransaction');

const router = express.Router();

// JWT Secret (same as auth.js)
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

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.userId = decoded.userId;
    next();
  });
};

// Add a new personal transaction
router.post('/add', authenticateToken, [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('type')
    .isIn(['INCOME', 'EXPENSE'])
    .withMessage('Type must be INCOME or EXPENSE'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, type, category, description, date } = req.body;
    const userId = req.userId;

    const personalTransaction = new PersonalTransaction({
      userId,
      amount: parseFloat(amount),
      type,
      category: category || '',
      description: description || '',
      date: date ? new Date(date) : new Date()
    });

    await personalTransaction.save();

    res.status(201).json({
      success: true,
      message: 'Personal transaction added successfully',
      data: {
        transaction: {
          id: personalTransaction._id,
          amount: personalTransaction.amount,
          type: personalTransaction.type,
          category: personalTransaction.category,
          description: personalTransaction.description,
          date: personalTransaction.date,
          createdAt: personalTransaction.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Add personal transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all personal transactions for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { type, startDate, endDate, limit = 100 } = req.query;

    const query = { userId };

    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const transactions = await PersonalTransaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .select('-__v')
      .lean();

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const netBalance = totalIncome - totalExpense;

    // Transform _id to id for frontend compatibility
    const transformedTransactions = transactions.map(transaction => ({
      id: transaction._id.toString(),
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category || '',
      description: transaction.description || '',
      date: transaction.date,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    }));

    res.json({
      success: true,
      message: 'Personal transactions retrieved successfully',
      data: {
        transactions: transformedTransactions,
        summary: {
          totalIncome,
          totalExpense,
          netBalance,
          totalTransactions: transformedTransactions.length
        }
      }
    });

  } catch (error) {
    console.error('Get personal transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get a single personal transaction by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const userId = req.userId;

    const transaction = await PersonalTransaction.findOne({
      _id: transactionId,
      userId
    }).select('-__v');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Transaction retrieved successfully',
      data: {
        transaction: {
          id: transaction._id.toString(),
          amount: transaction.amount,
          type: transaction.type,
          category: transaction.category || '',
          description: transaction.description || '',
          date: transaction.date,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update a personal transaction
router.put('/:id', authenticateToken, [
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('type')
    .optional()
    .isIn(['INCOME', 'EXPENSE'])
    .withMessage('Type must be INCOME or EXPENSE'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const transactionId = req.params.id;
    const userId = req.userId;
    const updateData = req.body;

    // Find the transaction and verify ownership
    const transaction = await PersonalTransaction.findOne({
      _id: transactionId,
      userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or access denied'
      });
    }

    // Prepare update data
    const updates = {};
    if (updateData.amount !== undefined) updates.amount = parseFloat(updateData.amount);
    if (updateData.type !== undefined) updates.type = updateData.type;
    if (updateData.category !== undefined) updates.category = updateData.category || '';
    if (updateData.description !== undefined) updates.description = updateData.description || '';
    if (updateData.date !== undefined) updates.date = new Date(updateData.date);
    updates.updatedAt = new Date();

    // Update the transaction
    const updatedTransaction = await PersonalTransaction.findByIdAndUpdate(
      transactionId,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: {
        transaction: {
          id: updatedTransaction._id.toString(),
          amount: updatedTransaction.amount,
          type: updatedTransaction.type,
          category: updatedTransaction.category || '',
          description: updatedTransaction.description || '',
          date: updatedTransaction.date,
          createdAt: updatedTransaction.createdAt,
          updatedAt: updatedTransaction.updatedAt
        }
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

// Delete a personal transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const transactionId = req.params.id;
    const userId = req.userId;

    // Validate transactionId
    if (!transactionId || transactionId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID'
      });
    }

    // Find and delete the transaction
    const deletedTransaction = await PersonalTransaction.findOneAndDelete({
      _id: transactionId,
      userId
    });

    if (!deletedTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
      data: {
        deletedTransaction: {
          id: deletedTransaction._id.toString()
        }
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

