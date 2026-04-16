const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const MutualKhaata = require('../models/MutualKhaata');
const MutualTransaction = require('../models/MutualTransaction');
const User = require('../models/User');
const Contact = require('../models/Contact');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/mutual-khaata/eligible-contacts - Get contacts who have a Khaata app account
router.get('/eligible-contacts', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get all contacts of this user
    const contacts = await Contact.find({ userId }).select('name email phone profilePicture');

    if (contacts.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Collect all emails and phones from contacts
    const emails = contacts.map(c => c.email).filter(Boolean).map(e => e.toLowerCase());
    const phones = contacts.map(c => c.phone).filter(Boolean);

    // Find users who match by email OR phone (excluding self)
    const registeredUsers = await User.find({
      _id: { $ne: userId },
      $or: [
        ...(emails.length > 0 ? [{ email: { $in: emails } }] : []),
        // No phone field on User model, so we match by email only
      ]
    }).select('_id name email profilePicture');

    // Create a map of registered user emails for quick lookup
    const registeredEmailMap = {};
    registeredUsers.forEach(u => {
      registeredEmailMap[u.email.toLowerCase()] = u;
    });

    // Get existing mutual khaatas (active or pending) to mark them
    const existingKhaatas = await MutualKhaata.find({
      $or: [{ user1: userId }, { user2: userId }],
      status: { $in: ['active', 'pending'] }
    });

    const existingPartnerIds = new Set();
    existingKhaatas.forEach(k => {
      existingPartnerIds.add(k.user1.toString() === userId ? k.user2.toString() : k.user1.toString());
    });

    // Match contacts with registered users
    const eligibleContacts = [];
    contacts.forEach(contact => {
      if (contact.email) {
        const matchedUser = registeredEmailMap[contact.email.toLowerCase()];
        if (matchedUser) {
          const alreadyConnected = existingPartnerIds.has(matchedUser._id.toString());
          eligibleContacts.push({
            contactId: contact._id,
            contactName: contact.name,
            contactPhone: contact.phone,
            contactProfilePicture: contact.profilePicture,
            appUserId: matchedUser._id,
            appUserName: matchedUser.name,
            appUserEmail: matchedUser.email,
            appUserProfilePicture: matchedUser.profilePicture,
            alreadyConnected,
          });
        }
      }
    });

    res.json({ success: true, data: eligibleContacts });
  } catch (error) {
    console.error('Get eligible contacts error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/mutual-khaata/request - Send a mutual khaata request to an app user
router.post('/request', [
  authenticateToken,
  body('targetUserId')
    .notEmpty()
    .withMessage('Target user ID is required')
    .isMongoId()
    .withMessage('Invalid user ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { targetUserId } = req.body;
    const userId = req.userId;

    if (targetUserId === userId) {
      return res.status(400).json({ success: false, message: 'You cannot send a request to yourself' });
    }

    // Verify target user exists
    const targetUser = await User.findById(targetUserId).select('name email');
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if a mutual khaata already exists between these two users (in either direction)
    const existing = await MutualKhaata.findOne({
      $or: [
        { user1: userId, user2: targetUserId },
        { user1: targetUserId, user2: userId }
      ]
    });

    if (existing) {
      if (existing.status === 'active') {
        return res.status(400).json({ success: false, message: 'Mutual Khaata already exists with this user' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ success: false, message: 'A pending request already exists with this user' });
      }
      // If declined, allow re-requesting by updating
      existing.status = 'pending';
      existing.user1 = userId;
      existing.user2 = targetUserId;
      existing.requestedBy = userId;
      existing.balance = 0;
      existing.acceptedAt = null;
      await existing.save();

      return res.status(201).json({
        success: true,
        message: 'Mutual Khaata request sent!',
        data: { id: existing._id, targetName: targetUser.name }
      });
    }

    // Create new mutual khaata with pending status
    const mutualKhaata = new MutualKhaata({
      user1: userId,
      user2: targetUserId,
      requestedBy: userId,
      status: 'pending'
    });

    await mutualKhaata.save();

    res.status(201).json({
      success: true,
      message: 'Mutual Khaata request sent!',
      data: { id: mutualKhaata._id, targetName: targetUser.name }
    });
  } catch (error) {
    console.error('Send mutual khaata request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/mutual-khaata/requests/pending - Get pending requests for current user
router.get('/requests/pending', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Requests sent TO me (I need to accept/decline)
    const incoming = await MutualKhaata.find({
      user2: userId,
      status: 'pending'
    }).populate('user1', 'name email profilePicture');

    // Requests I sent (waiting for others)
    const outgoing = await MutualKhaata.find({
      user1: userId,
      status: 'pending'
    }).populate('user2', 'name email profilePicture');

    const incomingData = incoming.map(r => ({
      id: r._id,
      from: { id: r.user1._id, name: r.user1.name, email: r.user1.email, profilePicture: r.user1.profilePicture },
      createdAt: r.createdAt,
      type: 'incoming'
    }));

    const outgoingData = outgoing.map(r => ({
      id: r._id,
      to: { id: r.user2._id, name: r.user2.name, email: r.user2.email, profilePicture: r.user2.profilePicture },
      createdAt: r.createdAt,
      type: 'outgoing'
    }));

    res.json({
      success: true,
      data: { incoming: incomingData, outgoing: outgoingData }
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/mutual-khaata/requests/:id/accept - Accept a request
router.put('/requests/:id/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const khaata = await MutualKhaata.findOne({
      _id: req.params.id,
      user2: userId,
      status: 'pending'
    });

    if (!khaata) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    khaata.status = 'active';
    khaata.acceptedAt = new Date();
    await khaata.save();

    res.json({ success: true, message: 'Mutual Khaata accepted!', data: { id: khaata._id } });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/mutual-khaata/requests/:id/decline - Decline a request
router.put('/requests/:id/decline', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const khaata = await MutualKhaata.findOne({
      _id: req.params.id,
      user2: userId,
      status: 'pending'
    });

    if (!khaata) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    khaata.status = 'declined';
    await khaata.save();

    res.json({ success: true, message: 'Request declined' });
  } catch (error) {
    console.error('Decline request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/mutual-khaata/requests/:id/cancel - Cancel my outgoing request
router.delete('/requests/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const khaata = await MutualKhaata.findOne({
      _id: req.params.id,
      requestedBy: userId,
      status: 'pending'
    });

    if (!khaata) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    await MutualKhaata.deleteOne({ _id: khaata._id });

    res.json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/mutual-khaata - Get all active mutual khaatas for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const khaatas = await MutualKhaata.find({
      $or: [{ user1: userId }, { user2: userId }],
      status: 'active'
    })
      .populate('user1', 'name email profilePicture')
      .populate('user2', 'name email profilePicture')
      .sort({ acceptedAt: -1 });

    const data = await Promise.all(khaatas.map(async (k) => {
      const isUser1 = k.user1._id.toString() === userId;
      const partner = isUser1 ? k.user2 : k.user1;
      // Balance from current user's perspective
      const myBalance = isUser1 ? k.balance : -k.balance;

      // Get last transaction
      const lastTx = await MutualTransaction.findOne({ mutualKhaataId: k._id })
        .sort({ createdAt: -1 })
        .select('createdAt');

      return {
        id: k._id,
        partner: {
          id: partner._id,
          name: partner.name,
          email: partner.email,
          profilePicture: partner.profilePicture
        },
        balance: myBalance,
        acceptedAt: k.acceptedAt,
        lastTransaction: lastTx ? lastTx.createdAt : null
      };
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get mutual khaatas error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/mutual-khaata/:id - Get a specific mutual khaata with transactions
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const khaata = await MutualKhaata.findOne({
      _id: req.params.id,
      $or: [{ user1: userId }, { user2: userId }],
      status: 'active'
    })
      .populate('user1', 'name email profilePicture')
      .populate('user2', 'name email profilePicture');

    if (!khaata) {
      return res.status(404).json({ success: false, message: 'Mutual Khaata not found' });
    }

    const isUser1 = khaata.user1._id.toString() === userId;
    const partner = isUser1 ? khaata.user2 : khaata.user1;
    const myBalance = isUser1 ? khaata.balance : -khaata.balance;

    const transactions = await MutualTransaction.find({ mutualKhaataId: khaata._id })
      .populate('addedBy', 'name')
      .populate('payer', 'name')
      .sort({ createdAt: -1 });

    const txData = transactions.map(tx => ({
      id: tx._id,
      amount: tx.amount,
      payer: { id: tx.payer._id, name: tx.payer.name },
      addedBy: { id: tx.addedBy._id, name: tx.addedBy.name },
      note: tx.note,
      createdAt: tx.createdAt
    }));

    res.json({
      success: true,
      data: {
        id: khaata._id,
        partner: { id: partner._id, name: partner.name, email: partner.email, profilePicture: partner.profilePicture },
        balance: myBalance,
        user1: { id: khaata.user1._id, name: khaata.user1.name },
        user2: { id: khaata.user2._id, name: khaata.user2.name },
        transactions: txData,
        acceptedAt: khaata.acceptedAt
      }
    });
  } catch (error) {
    console.error('Get mutual khaata detail error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/mutual-khaata/:id/transactions - Add a transaction to mutual khaata
router.post('/:id/transactions', [
  authenticateToken,
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('payer')
    .notEmpty()
    .withMessage('Payer is required'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Note cannot exceed 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const userId = req.userId;
    const { amount, payer, note } = req.body;

    const khaata = await MutualKhaata.findOne({
      _id: req.params.id,
      $or: [{ user1: userId }, { user2: userId }],
      status: 'active'
    });

    if (!khaata) {
      return res.status(404).json({ success: false, message: 'Mutual Khaata not found' });
    }

    // Validate that payer is one of the two users
    const validPayers = [khaata.user1.toString(), khaata.user2.toString()];
    if (!validPayers.includes(payer)) {
      return res.status(400).json({ success: false, message: 'Invalid payer' });
    }

    const transaction = new MutualTransaction({
      mutualKhaataId: khaata._id,
      addedBy: userId,
      amount,
      payer,
      note: note || ''
    });

    await transaction.save();

    // Update balance: if user1 paid, balance increases (user2 owes user1 more)
    // if user2 paid, balance decreases (user1 owes user2 more)
    if (payer === khaata.user1.toString()) {
      khaata.balance += amount;
    } else {
      khaata.balance -= amount;
    }

    await khaata.save();

    // Populate for response
    await transaction.populate('addedBy', 'name');
    await transaction.populate('payer', 'name');

    const isUser1 = khaata.user1.toString() === userId;
    const myBalance = isUser1 ? khaata.balance : -khaata.balance;

    res.status(201).json({
      success: true,
      message: 'Transaction added!',
      data: {
        id: transaction._id,
        amount: transaction.amount,
        payer: { id: transaction.payer._id, name: transaction.payer.name },
        addedBy: { id: transaction.addedBy._id, name: transaction.addedBy.name },
        note: transaction.note,
        createdAt: transaction.createdAt,
        newBalance: myBalance
      }
    });
  } catch (error) {
    console.error('Add mutual transaction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/mutual-khaata/:id/transactions/:txId - Delete a transaction
router.delete('/:id/transactions/:txId', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const khaata = await MutualKhaata.findOne({
      _id: req.params.id,
      $or: [{ user1: userId }, { user2: userId }],
      status: 'active'
    });

    if (!khaata) {
      return res.status(404).json({ success: false, message: 'Mutual Khaata not found' });
    }

    const transaction = await MutualTransaction.findOne({
      _id: req.params.txId,
      mutualKhaataId: khaata._id
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Revert balance
    if (transaction.payer.toString() === khaata.user1.toString()) {
      khaata.balance -= transaction.amount;
    } else {
      khaata.balance += transaction.amount;
    }

    await MutualTransaction.deleteOne({ _id: transaction._id });
    await khaata.save();

    const isUser1 = khaata.user1.toString() === userId;
    const myBalance = isUser1 ? khaata.balance : -khaata.balance;

    res.json({
      success: true,
      message: 'Transaction deleted',
      data: { newBalance: myBalance }
    });
  } catch (error) {
    console.error('Delete mutual transaction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/mutual-khaata/:id - Delete/end a mutual khaata
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const khaata = await MutualKhaata.findOne({
      _id: req.params.id,
      $or: [{ user1: userId }, { user2: userId }]
    });

    if (!khaata) {
      return res.status(404).json({ success: false, message: 'Mutual Khaata not found' });
    }

    // Delete all transactions
    await MutualTransaction.deleteMany({ mutualKhaataId: khaata._id });
    await MutualKhaata.deleteOne({ _id: khaata._id });

    res.json({ success: true, message: 'Mutual Khaata ended and all transactions deleted' });
  } catch (error) {
    console.error('Delete mutual khaata error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
