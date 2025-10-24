const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: false // Can be null for group transactions
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  sentAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
