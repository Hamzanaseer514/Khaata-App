const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');

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
    const contacts = await Contact.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('-userId');

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

    const { name, email, phone } = req.body;

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
      phone
    });

    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
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
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 digits')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
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
    const { name, email, phone } = req.body;
    if (name) contact.name = name;
    if (email !== undefined) contact.email = email;
    if (phone) contact.phone = phone;

    await contact.save();

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
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

// DELETE /api/contacts/:id - Delete a contact
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });

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
