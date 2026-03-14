const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Shared JWT secret (falls back to dev secret). Prefer setting JWT_SECRET in env.
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Basic JWT verification middleware
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
    req.userRole = decoded.role;
    next();
  });
};

// Ensure the authenticated user is an admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('role name email');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  JWT_SECRET,
};

