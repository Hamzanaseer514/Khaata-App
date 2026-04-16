const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const Transaction = require('../models/Transaction');
const GroupTransaction = require('../models/GroupTransaction');
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

// GET /api/contacts - Get all contacts for logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const contacts = await Contact.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.userId) } },
      {
        $lookup: {
          from: 'transactions', // Ensure this matches your collection name
          let: { contactId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$contactId', '$$contactId'] } } },
            { $sort: { date: -1 } },
            { $limit: 1 },
            { $project: { date: 1 } }
          ],
          as: 'lastTransaction'
        }
      },
      {
        $addFields: {
          lastTransactionDate: { $arrayElemAt: ['$lastTransaction.date', 0] }
        }
      },
      {
        $project: {
          lastTransaction: 0,
          userId: 0
        }
      },
      { $sort: { isPinned: -1, updatedAt: -1 } } // Pinned first, then recently updated
    ]);

    res.json({
      success: true,
      message: 'Contacts retrieved successfully',
      data: contacts
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/contacts/summary/buckets - Balance buckets for histogram
router.get('/summary/buckets', authenticateToken, async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.user.userId }).select('balance');

    const buckets = [
      { key: '<0', label: 'You Owe (<0)', count: 0 },
      { key: '0-1k', label: '0–1k', count: 0 },
      { key: '1k-5k', label: '1–5k', count: 0 },
      { key: '5k-10k', label: '5–10k', count: 0 },
      { key: '10k+', label: '10k+', count: 0 },
    ];

    contacts.forEach((c) => {
      const b = Number(c.balance || 0);
      if (b < 0) buckets[0].count += 1;
      else if (b <= 1000) buckets[1].count += 1;
      else if (b <= 5000) buckets[2].count += 1;
      else if (b <= 10000) buckets[3].count += 1;
      else buckets[4].count += 1;
    });

    res.json({ success: true, message: 'Buckets summary', data: { buckets } });
  } catch (error) {
    console.error('Buckets summary error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// POST /api/contacts - Create a new contact
router.post('/', [
  authenticateToken,
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 digits')
    .matches(/^[\+]?[0-9][\d]{9,14}$/)
    .withMessage('Please enter a valid phone number')
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

    const { name, email, phone, profilePicture } = req.body;

    // Check if contact with same phone already exists for this user
    const existingContact = await Contact.findOne({ 
      userId: req.user.userId, 
      phone: phone 
    });
    
    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'Contact with this phone number already exists'
      });
    }

    // Create new contact
    const contact = new Contact({
      userId: req.user.userId,
      name,
      email,
      phone,
      profilePicture
    });

    await contact.save();

    // --- Reward System Logic ---
    try {
      const user = await User.findById(req.user.userId);
      if (user) {
        const earnedPoints = 10; // Points for a new contact
        user.points += earnedPoints;
        
        // Simple Leveling logic
        if (user.points >= 1000) user.level = 'Platinum';
        else if (user.points >= 400) user.level = 'Gold';
        
        await user.save();
        
        // Log reward record
        const reward = new RewardRecord({
          userId: req.user.userId,
          points: earnedPoints,
          reason: 'New Contact Added'
        });
        await reward.save();
      }
    } catch (rewardError) {
      console.error('Reward award error:', rewardError);
    }
    // ----------------------------

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        profilePicture: contact.profilePicture,
        balance: contact.balance,
        createdAt: contact.createdAt
      }
    });

  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/contacts/:id - Get a specific contact
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    }).select('-userId');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact retrieved successfully',
      data: contact
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT /api/contacts/:id - Update a contact
router.put('/:id', [
  authenticateToken,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .normalizeEmail()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Please provide a valid email');
      }
      return true;
    }),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 digits')
    .matches(/^[\+]?[0-9][\d]{9,14}$/)
    .withMessage('Please enter a valid phone number')
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

    const contact = await Contact.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Update contact fields
    const { name, email, phone, profilePicture } = req.body;
    if (name && name.trim()) contact.name = name.trim();
    if (email !== undefined) contact.email = email === '' ? undefined : email;
    if (phone && phone.trim()) contact.phone = phone.trim();
    if (profilePicture !== undefined) contact.profilePicture = profilePicture;

    await contact.save();

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        profilePicture: contact.profilePicture,
        balance: contact.balance,
        createdAt: contact.createdAt
      }
    });

  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/contacts/:id/settle - Settle up (reset balance to 0 with a settlement record)
router.post('/:id/settle', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    if (contact.balance === 0) {
      return res.status(400).json({ success: false, message: 'Balance is already settled' });
    }

    const settledAmount = Math.abs(contact.balance);
    // If balance > 0 (friend owes you), friend pays to settle → FRIEND
    // If balance < 0 (you owe friend), you pay to settle → USER
    const payer = contact.balance > 0 ? 'FRIEND' : 'USER';

    // Create a settlement transaction
    const transaction = new Transaction({
      userId: req.user.userId,
      contactId: contact._id,
      amount: settledAmount,
      payer,
      note: '✓ Settlement - Balance cleared'
    });
    await transaction.save();

    // Reset balance
    contact.balance = 0;
    await contact.save();

    res.json({
      success: true,
      message: 'Settled up! Balance is now zero.',
      data: { newBalance: 0, transactionId: transaction._id, settledAmount }
    });
  } catch (error) {
    console.error('Settle up error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/contacts/:id/pin - Toggle pin/unpin a contact
router.put('/:id/pin', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    contact.isPinned = !contact.isPinned;
    await contact.save();

    res.json({
      success: true,
      message: contact.isPinned ? 'Contact pinned!' : 'Contact unpinned',
      data: { isPinned: contact.isPinned }
    });
  } catch (error) {
    console.error('Pin toggle error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/contacts/:id - Delete a contact
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, userId: req.user.userId });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Delete contact
    await Contact.deleteOne({ _id: contact._id });

    // Cascade delete: remove all single transactions for this contact
    await Transaction.deleteMany({ userId: req.user.userId, contactId: contact._id });

    // Cascade delete: remove all group transactions where this contact is payer or participant
    await GroupTransaction.deleteMany({
      userId: req.user.userId,
      $or: [{ payerId: contact._id }, { contactIds: contact._id }]
    });

    res.json({ success: true, message: 'Contact and related records deleted' });

  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
