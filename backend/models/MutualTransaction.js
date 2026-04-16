const mongoose = require('mongoose');

const mutualTransactionSchema = new mongoose.Schema({
  mutualKhaataId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MutualKhaata',
    required: true
  },
  // Who added this transaction
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  // Who paid in this transaction
  payer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

mutualTransactionSchema.index({ mutualKhaataId: 1, createdAt: -1 });

module.exports = mongoose.model('MutualTransaction', mutualTransactionSchema);
