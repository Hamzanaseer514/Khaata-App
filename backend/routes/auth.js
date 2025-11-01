const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

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

const router = express.Router();

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// In-memory OTP store (email -> { code, expiresAt, payload })
// NOTE: For production move to a persistent/secure store like Redis
const pendingOtps = new Map();

// Utility to generate 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP for signup
router.post('/send-otp', [
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Prevent duplicate signups
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const code = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    pendingOtps.set(email, { code, expiresAt, payload: { name, email, password } });

    // Send email via nodemailer
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const brandPrimary = '#20B2AA';
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify your email – Khaata</title>
        <style>
          body { background:#f5f7fb; margin:0; padding:24px; font-family:Arial, Helvetica, sans-serif; color:#111827; }
          .wrap { max-width:640px; margin:0 auto; }
          .brand { text-align:center; font-weight:800; color:${brandPrimary}; font-size:22px; margin-bottom:12px; }
          .card { background:#ffffff; border-radius:14px; box-shadow:0 10px 30px rgba(16,24,40,.08); border:1px solid #eef2f7; overflow:hidden; }
          .header { padding:18px 22px; border-bottom:1px solid #eef2f7; background:linear-gradient(135deg, #ffffff, #f9fbff); }
          .title { margin:0; font-size:18px; font-weight:800; color:#0f172a; }
          .body { padding:24px 22px; }
          .lead { margin:8px 0 18px; color:#475569; line-height:1.5; }
          .code { display:inline-block; font-size:24px; letter-spacing:4px; font-weight:900; padding:10px 16px; border-radius:10px; background:#f1faf9; color:#0b7d79; border:1px dashed ${brandPrimary}; }
          .meta { margin-top:10px; color:#64748b; font-size:13px; }
          .divider { height:1px; background:#eef2f7; margin:22px 0; }
          .privacy { color:#64748b; font-size:12px; line-height:1.55; }
          .footer { text-align:center; color:#94a3b8; font-size:12px; padding:16px 0 6px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="brand">Khaata</div>
          <div class="card">
            <div class="header"><h1 class="title">Verify your email</h1></div>
            <div class="body">
              <p class="lead">Hi${name ? ' ' + name : ''}, use the following verification code to complete your sign up. The code expires in <b>5 minutes</b>.</p>
              <div><span class="code">${code}</span></div>
              <p class="meta">Didn’t request this? You can safely ignore this email.</p>
              <div class="divider"></div>
              <p class="privacy">Khaata respects your privacy. This one‑time code is for account verification only and should not be shared with anyone. By continuing, you agree to Khaata’s Terms and Privacy Policy.</p>
            </div>
            <div class="footer">© ${new Date().getFullYear()} Khaata. All rights reserved.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `Khaata <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Khaata verification code',
      html,
    });

    return res.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Verify OTP and create account
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 4, max: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email, otp } = req.body;
    const entry = pendingOtps.get(email);
    if (!entry) {
      return res.status(400).json({ success: false, message: 'No OTP pending for this email' });
    }
    if (Date.now() > entry.expiresAt) {
      pendingOtps.delete(email);
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }
    if (entry.code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Create user now
    const { name, password } = entry.payload;
    let user = new User({ name, email, password });
    await user.save();
    pendingOtps.delete(email);

    const token = generateToken(user._id);
    return res.json({
      success: true,
      message: 'Signup verified',
      data: {
        user: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt },
        token,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Resend OTP using existing pending payload
router.post('/resend-otp', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email } = req.body;
    const entry = pendingOtps.get(email);
    if (!entry) {
      return res.status(400).json({ success: false, message: 'No pending signup for this email' });
    }
    const code = generateOtp();
    entry.code = code;
    entry.expiresAt = Date.now() + 5 * 60 * 1000;

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    const resendHtml = `
      <!DOCTYPE html>
      <html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Resend code – Khaata</title>
      <style>body{background:#f5f7fb;margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111827}.wrap{max-width:640px;margin:0 auto}.brand{text-align:center;font-weight:800;color:#20B2AA;font-size:22px;margin-bottom:12px}.card{background:#fff;border-radius:14px;box-shadow:0 10px 30px rgba(16,24,40,.08);border:1px solid #eef2f7;overflow:hidden}.header{padding:18px 22px;border-bottom:1px solid #eef2f7;background:linear-gradient(135deg,#fff,#f9fbff)}.title{margin:0;font-size:18px;font-weight:800;color:#0f172a}.body{padding:24px 22px}.code{display:inline-block;font-size:24px;letter-spacing:4px;font-weight:900;padding:10px 16px;border-radius:10px;background:#f1faf9;color:#0b7d79;border:1px dashed #20B2AA}.meta{margin-top:10px;color:#64748b;font-size:13px}.footer{text-align:center;color:#94a3b8;font-size:12px;padding:16px 0 6px}</style></head>
      <body><div class="wrap"><div class="brand">Khaata</div><div class="card"><div class="header"><h1 class="title">Your new verification code</h1></div><div class="body"><p>Use this updated code to continue sign up (expires in <b>5 minutes</b>):</p><div><span class="code">${code}</span></div><p class="meta">If you didn’t request a new code, you can ignore this email.</p></div><div class="footer">© ${new Date().getFullYear()} Khaata.</div></div></div></body></html>`;
    await transporter.sendMail({
      from: `Khaata <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Khaata verification code (resend)',
      html: resendHtml,
    });
    return res.json({ success: true, message: 'OTP resent' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Register route
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
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

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Login route
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Change password route
router.post('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  body('confirmNewPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New password confirmation does not match');
      }
      return true;
    })
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

    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE /api/auth/delete-account - Delete user account and all related data
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Import required models
    const Contact = require('../models/Contact');
    const Transaction = require('../models/Transaction');
    const GroupTransaction = require('../models/GroupTransaction');
    const MessRecord = require('../models/MessRecord');
    const Notification = require('../models/Notification');

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`=== DELETING ACCOUNT FOR USER ${userId} ===`);

    // Delete all user-related data in parallel for better performance
    const deleteResults = await Promise.allSettled([
      // Delete all contacts (cascade will handle related transactions)
      Contact.deleteMany({ userId }),
      
      // Delete all single transactions
      Transaction.deleteMany({ userId }),
      
      // Delete all group transactions
      GroupTransaction.deleteMany({ userId }),
      
      // Delete all mess records
      MessRecord.deleteMany({ user: userId }),
      
      // Delete all notifications
      Notification.deleteMany({ userId }),
    ]);

    // Check if any deletion failed
    const failedDeletions = deleteResults.filter(result => result.status === 'rejected');
    if (failedDeletions.length > 0) {
      console.error('Some deletions failed:', failedDeletions);
      // Continue anyway - we'll still delete the user
    }

    // Finally, delete the user account
    await User.deleteOne({ _id: userId });

    console.log(`Account and all related data deleted for user ${userId}`);

    res.json({
      success: true,
      message: 'Account and all related data deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/auth/backup-data - Backup all user data
router.get('/backup-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Import required models
    const Contact = require('../models/Contact');
    const Transaction = require('../models/Transaction');
    const GroupTransaction = require('../models/GroupTransaction');
    const MessRecord = require('../models/MessRecord');
    const PersonalTransaction = require('../models/PersonalTransaction');
    const Notification = require('../models/Notification');

    // Find user
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`=== BACKING UP DATA FOR USER ${userId} ===`);

    // Fetch all user data in parallel
    const [
      contacts,
      transactions,
      groupTransactions,
      messRecords,
      personalTransactions,
      notifications
    ] = await Promise.all([
      Contact.find({ userId }).lean(),
      Transaction.find({ userId }).populate('contactId', 'name email phone').lean(),
      GroupTransaction.find({ userId }).populate('contactIds', 'name email phone').lean(),
      MessRecord.find({ user: userId }).lean(),
      PersonalTransaction.find({ userId }).lean(),
      Notification.find({ userId }).lean()
    ]);

    // Transform data to remove sensitive info and convert ObjectIds to strings
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      user: {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      data: {
        contacts: contacts.map(contact => ({
          id: contact._id.toString(),
          name: contact.name,
          email: contact.email || '',
          phone: contact.phone || '',
          balance: contact.balance || 0,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt
        })),
        transactions: transactions.map(tx => ({
          id: tx._id.toString(),
          contactId: tx.contactId ? (tx.contactId._id ? tx.contactId._id.toString() : tx.contactId.toString()) : null,
          contactName: tx.contactId ? (tx.contactId.name || 'Unknown') : null,
          amount: tx.amount,
          payer: tx.payer,
          note: tx.note || '',
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt
        })),
        groupTransactions: groupTransactions.map(gtx => {
          const individualAmountsObj = {};
          if (gtx.individualAmounts && gtx.individualAmounts instanceof Map) {
            gtx.individualAmounts.forEach((value, key) => {
              individualAmountsObj[key.toString()] = value;
            });
          } else if (gtx.individualAmounts) {
            Object.entries(gtx.individualAmounts).forEach(([key, value]) => {
              individualAmountsObj[key.toString()] = value;
            });
          }

          return {
            id: gtx._id.toString(),
            description: gtx.description || '',
            totalAmount: gtx.totalAmount,
            perPersonShare: gtx.perPersonShare,
            payerId: gtx.payerId ? gtx.payerId.toString() : null,
            contactIds: gtx.contactIds ? gtx.contactIds.map(c => 
              typeof c === 'object' && c._id ? c._id.toString() : c.toString()
            ) : [],
            splitMode: gtx.splitMode || 'equal',
            individualAmounts: individualAmountsObj,
            createdAt: gtx.createdAt,
            updatedAt: gtx.updatedAt
          };
        }),
        messRecords: messRecords.map(record => ({
          id: record._id.toString(),
          date: record.date,
          mealType: record.mealType,
          price: record.price,
          personCount: record.personCount || 1,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        })),
        personalTransactions: personalTransactions.map(ptx => ({
          id: ptx._id.toString(),
          amount: ptx.amount,
          type: ptx.type,
          category: ptx.category || '',
          description: ptx.description || '',
          date: ptx.date,
          createdAt: ptx.createdAt,
          updatedAt: ptx.updatedAt
        })),
        notifications: notifications.map(notif => ({
          id: notif._id.toString(),
          type: notif.type,
          title: notif.title || '',
          message: notif.message || '',
          isRead: notif.isRead || false,
          createdAt: notif.createdAt,
          updatedAt: notif.updatedAt
        }))
      },
      summary: {
        totalContacts: contacts.length,
        totalTransactions: transactions.length,
        totalGroupTransactions: groupTransactions.length,
        totalMessRecords: messRecords.length,
        totalPersonalTransactions: personalTransactions.length,
        totalNotifications: notifications.length
      }
    };

    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="khaata_backup_${new Date().toISOString().split('T')[0]}.json"`);

    res.json(backupData);

  } catch (error) {
    console.error('Backup data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
