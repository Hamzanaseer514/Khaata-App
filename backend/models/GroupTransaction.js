const mongoose = require('mongoose');

const groupTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: false // Allow null when user is paying
  },
  contactIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  }],
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0.01, 'Total amount must be greater than 0']
  },
  perPersonShare: {
    type: Number,
    required: [true, 'Per person share is required'],
    min: [0.01, 'Per person share must be greater than 0']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  splitMode: {
    type: String,
    enum: ['equal', 'manual'],
    default: 'equal'
  },
  individualAmounts: {
    type: Map,
    of: Number,
    required: false
  },
  userAmount: {
    type: Number,
    required: false,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
groupTransactionSchema.index({ userId: 1, createdAt: -1 });
groupTransactionSchema.index({ userId: 1, payerId: 1 });

module.exports = mongoose.model('GroupTransaction', groupTransactionSchema);
