const mongoose = require('mongoose');

const mutualKhaataSchema = new mongoose.Schema({
  // The two users sharing this khaata
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Net balance from user1's perspective: positive = user2 owes user1
  balance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'declined'],
    default: 'pending'
  },
  // Who sent the request
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date,
    default: null
  }
});

// Ensure only one mutual khaata between any two users
mutualKhaataSchema.index({ user1: 1, user2: 1 }, { unique: true });
mutualKhaataSchema.index({ user2: 1, user1: 1 });
mutualKhaataSchema.index({ status: 1 });

module.exports = mongoose.model('MutualKhaata', mutualKhaataSchema);
