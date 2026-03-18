const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RewardRecord = require('../models/RewardRecord');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// GET /api/rewards/summary - Get user points and level
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('points level dailyTransactionCount');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        points: user.points,
        level: user.level,
        dailyCount: user.dailyTransactionCount.count,
        nextMilestone: 5
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/rewards/history - Get point earnings history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const history = await RewardRecord.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
