const mongoose = require('mongoose');

const personalTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: {
      values: ['INCOME', 'EXPENSE'],
      message: 'Type must be either INCOME or EXPENSE'
    }
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
personalTransactionSchema.index({ userId: 1, date: -1 });
personalTransactionSchema.index({ userId: 1, createdAt: -1 });
personalTransactionSchema.index({ userId: 1, type: 1 });

// Update updatedAt before saving
personalTransactionSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('PersonalTransaction', personalTransactionSchema);

