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

// POST /api/rewards/share - Award points for sharing app
router.post('/share', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Check if already shared today (max 3 shares per day = 30 points max)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayShares = await RewardRecord.countDocuments({
      userId: req.user.userId,
      reason: 'App Share',
      createdAt: { $gte: todayStart },
    });

    if (todayShares >= 5) {
      return res.json({
        success: true,
        message: 'Daily share limit reached (3/3). Come back tomorrow!',
        data: { points: user.points, level: user.level, todayShares, maxShares: 5, pointsAwarded: 0 },
      });
    }

    // Award 10 points per share
    const pointsToAdd = 10;
    user.points += pointsToAdd;

    // Level up check
    if (user.points >= 1000 && user.level !== 'Platinum') user.level = 'Platinum';
    else if (user.points >= 500 && user.level === 'Silver') user.level = 'Gold';

    await user.save();

    // Record the share
    await RewardRecord.create({
      userId: req.user.userId,
      points: pointsToAdd,
      reason: 'App Share',
    });

    res.json({
      success: true,
      message: `+${pointsToAdd} coins earned!`,
      data: {
        points: user.points,
        level: user.level,
        todayShares: todayShares + 1,
        maxShares: 5,
        pointsAwarded: pointsToAdd,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/rewards/share-stats - Get share stats
router.get('/share-stats', authenticateToken, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayShares, totalShares, totalPointsFromShares] = await Promise.all([
      RewardRecord.countDocuments({ userId: req.user.userId, reason: 'App Share', createdAt: { $gte: todayStart } }),
      RewardRecord.countDocuments({ userId: req.user.userId, reason: 'App Share' }),
      RewardRecord.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(req.user.userId), reason: 'App Share' } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        todayShares,
        maxDailyShares: 5,
        totalShares,
        totalPointsEarned: totalPointsFromShares[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
