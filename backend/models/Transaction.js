const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  payer: {
    type: String,
    required: [true, 'Payer is required'],
    enum: {
      values: ['USER', 'FRIEND'],
      message: 'Payer must be either USER or FRIEND'
    }
  },
  note: {
    type: String,
    trim: true,
    maxlength: [200, 'Note cannot exceed 200 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
transactionSchema.index({ userId: 1, contactId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
