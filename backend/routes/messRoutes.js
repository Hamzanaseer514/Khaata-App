const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const MessRecord = require('../models/MessRecord');

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

// Add a new mess record
router.post('/add', authenticateToken, [
  body('date')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('mealType')
    .isIn(['Breakfast', 'Lunch', 'Dinner'])
    .withMessage('Meal type must be Breakfast, Lunch, or Dinner'),
  body('price')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('personCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Person count must be a positive integer')
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

    const { date, mealType, price, personCount = 1 } = req.body;
    const userId = req.userId;

    // Check if record already exists for the same date and meal type
    const existingRecord = await MessRecord.findOne({
      user: userId,
      date: new Date(date),
      mealType: mealType
    });

    if (existingRecord) {
      const dateStr = new Date(date).toLocaleDateString('en-IN', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      return res.status(400).json({
        success: false,
        message: `${mealType} is already added for ${dateStr}. Please select a different date or meal type.`
      });
    }

    // Calculate total price (price per person * person count)
    const pricePerPerson = parseFloat(price);
    const totalPrice = pricePerPerson * parseInt(personCount);

    // Create new mess record
    const messRecord = new MessRecord({
      user: userId,
      date: new Date(date),
      mealType,
      price: totalPrice,
      personCount: parseInt(personCount)
    });

    await messRecord.save();

    res.status(201).json({
      success: true,
      message: 'Mess record added successfully',
      data: {
        record: {
          id: messRecord._id,
          date: messRecord.date,
          mealType: messRecord.mealType,
          price: messRecord.price,
          personCount: messRecord.personCount,
          createdAt: messRecord.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Add mess record error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all mess records for a user
router.get('/user/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const requestingUserId = req.userId;

    // Check if user is requesting their own records or has permission
    if (userId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own records.'
      });
    }

    const records = await MessRecord.find({ user: userId })
      .sort({ date: -1, createdAt: -1 })
      .select('-__v');

    // Transform _id to id for frontend compatibility
    const transformedRecords = records.map(record => ({
      id: record._id.toString(),
      date: record.date,
      mealType: record.mealType,
      price: record.price,
      personCount: record.personCount || 1,
      createdAt: record.createdAt
    }));

    res.json({
      success: true,
      message: 'Records retrieved successfully',
      data: {
        records: transformedRecords,
        totalRecords: transformedRecords.length
      }
    });

  } catch (error) {
    console.error('Get user records error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get monthly mess records and total
router.get('/monthly/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const requestingUserId = req.userId;
    const { month, year } = req.query;

    // Check if user is requesting their own records
    if (userId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own records.'
      });
    }

    // Validate month and year parameters
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year parameters are required'
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12'
      });
    }

    if (yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({
        success: false,
        message: 'Year must be between 2020 and 2030'
      });
    }

    // Create date range for the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

    // Get records for the month
    const rawRecords = await MessRecord.find({
      user: userId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: -1, createdAt: -1 });

    // Transform _id to id for frontend compatibility
    const records = rawRecords.map(record => ({
      id: record._id.toString(),
      date: record.date,
      mealType: record.mealType,
      price: record.price,
      personCount: record.personCount || 1,
      createdAt: record.createdAt
    }));

    // Calculate total using aggregation
    let totalResult = [];
    try {
      totalResult = await MessRecord.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            date: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$price" },
            count: { $sum: 1 }
          }
        }
      ]);
    } catch (aggregationError) {
      console.error('Aggregation error:', aggregationError);
      // Fallback: calculate manually
      const manualTotal = records.reduce((sum, record) => sum + record.price, 0);
      totalResult = [{ total: manualTotal, count: records.length }];
    }
    // If aggregation succeeded but returned empty (no matches), compute from records
    if (!totalResult || totalResult.length === 0) {
      const manualTotal = records.reduce((sum, record) => sum + record.price, 0);
      totalResult = [{ total: manualTotal, count: records.length }];
    }

    const total = totalResult[0].total || 0;
    const count = totalResult[0].count || 0;

    // Group records by date for better frontend display
    const recordsByDate = {};
    records.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!recordsByDate[dateKey]) {
        recordsByDate[dateKey] = [];
      }
      recordsByDate[dateKey].push(record);
    });

    // Calculate meal type breakdown
    const mealBreakdown = {
      Breakfast: { count: 0, total: 0 },
      Lunch: { count: 0, total: 0 },
      Dinner: { count: 0, total: 0 }
    };

    records.forEach(record => {
      mealBreakdown[record.mealType].count += 1;
      mealBreakdown[record.mealType].total += record.price;
    });

    // Calculate daily averages
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const avgMealsPerDay = count / daysInMonth;
    const avgSpentPerDay = total / daysInMonth;

    res.json({
      success: true,
      message: 'Monthly records retrieved successfully',
      data: {
        records,
        recordsByDate,
        analytics: {
          mealBreakdown,
          avgMealsPerDay: Math.round(avgMealsPerDay * 100) / 100,
          avgSpentPerDay: Math.round(avgSpentPerDay * 100) / 100,
          daysInMonth,
          activeDays: Object.keys(recordsByDate).length
        },
        summary: {
          totalAmount: total,
          totalMeals: count,
          month: monthNum,
          year: yearNum,
          monthName: startDate.toLocaleString('default', { month: 'long' })
        }
      }
    });

  } catch (error) {
    console.error('Get monthly records error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update a mess record
router.put('/update/:id', authenticateToken, [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('mealType')
    .optional()
    .isIn(['Breakfast', 'Lunch', 'Dinner'])
    .withMessage('Meal type must be Breakfast, Lunch, or Dinner'),
  body('price')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
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

    const recordId = req.params.id;
    const userId = req.userId;
    const updateData = req.body;

    // Find the record and verify ownership
    const record = await MessRecord.findOne({ _id: recordId, user: userId });
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found or access denied'
      });
    }

    // Update the record
    const updatedRecord = await MessRecord.findByIdAndUpdate(
      recordId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Record updated successfully',
      data: {
        record: updatedRecord
      }
    });

  } catch (error) {
    console.error('Update record error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete a mess record
router.delete('/delete/:id', authenticateToken, async (req, res) => {
  try {
    const recordId = req.params.id;
    const userId = req.userId;

    // Validate recordId
    if (!recordId || recordId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Invalid record ID'
      });
    }

    // Find and delete the record
    const deletedRecord = await MessRecord.findOneAndDelete({ 
      _id: recordId, 
      user: userId 
    });

    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        message: 'Record not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Record deleted successfully',
      data: {
        deletedRecord
      }
    });

  } catch (error) {
    console.error('Delete record error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get records for a custom date range
router.get('/dateRange/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const requestingUserId = req.userId;
    const { startDate, endDate } = req.query;

    if (userId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own records.'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date parameters are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // Get records for the date range
    const rawRecords = await MessRecord.find({
      user: userId,
      date: {
        $gte: start,
        $lte: end
      }
    }).sort({ date: -1, createdAt: -1 });

    // Transform _id to id for frontend compatibility
    const records = rawRecords.map(record => ({
      id: record._id.toString(),
      date: record.date,
      mealType: record.mealType,
      price: record.price,
      personCount: record.personCount || 1,
      createdAt: record.createdAt
    }));

    // Calculate total using aggregation
    let totalResult = [];
    try {
      totalResult = await MessRecord.aggregate([
        {
          $match: {
            user: userId,
            date: {
              $gte: start,
              $lte: end
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$price" },
            count: { $sum: 1 }
          }
        }
      ]);
    } catch (aggregationError) {
      console.error('Aggregation error:', aggregationError);
      const manualTotal = records.reduce((sum, record) => sum + record.price, 0);
      totalResult = [{ total: manualTotal, count: records.length }];
    }

    const total = totalResult.length > 0 ? totalResult[0].total : 0;
    const count = totalResult.length > 0 ? totalResult[0].count : 0;

    const recordsByDate = {};
    records.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!recordsByDate[dateKey]) {
        recordsByDate[dateKey] = [];
      }
      recordsByDate[dateKey].push(record);
    });

    const mealBreakdown = {
      Breakfast: { count: 0, total: 0 },
      Lunch: { count: 0, total: 0 },
      Dinner: { count: 0, total: 0 }
    };

    records.forEach(record => {
      mealBreakdown[record.mealType].count += 1;
      mealBreakdown[record.mealType].total += record.price;
    });

    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const avgMealsPerDay = count / daysDiff;
    const avgSpentPerDay = total / daysDiff;

    res.json({
      success: true,
      message: 'Date range records retrieved successfully',
      data: {
        records,
        recordsByDate,
        analytics: {
          mealBreakdown,
          avgMealsPerDay: Math.round(avgMealsPerDay * 100) / 100,
          avgSpentPerDay: Math.round(avgSpentPerDay * 100) / 100,
          daysInRange: daysDiff,
          activeDays: Object.keys(recordsByDate).length
        },
        summary: {
          totalAmount: total,
          totalMeals: count,
          startDate: startDate,
          endDate: endDate,
          dateRange: `${startDate} - ${endDate}`
        }
      }
    });

  } catch (error) {
    console.error('Get date range records error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get list of months (year-month) that have data for a user with quick summaries
router.get('/months/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const requestingUserId = req.userId;

    if (userId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own records.'
      });
    }

    // Group by year and month and compute totals
    const results = await MessRecord.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          totalAmount: { $sum: '$price' },
          totalMeals: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
    ]);

    const months = results.map((r) => {
      const year = r._id.year;
      const month = r._id.month; // 1-12
      const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
      return {
        year,
        month,
        monthName,
        label: `${monthName} ${year}`,
        totalAmount: r.totalAmount,
        totalMeals: r.totalMeals,
      };
    });

    res.json({
      success: true,
      message: 'Months retrieved successfully',
      data: { months },
    });
  } catch (error) {
    console.error('Get months error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

module.exports = router;
