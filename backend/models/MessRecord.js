const mongoose = require('mongoose');

const messRecordSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  mealType: { 
    type: String, 
    enum: ["Breakfast", "Lunch", "Dinner"], 
    required: true 
  },
  price: { 
    type: Number, 
    required: true,
    min: [0, 'Price cannot be negative']
  },
}, { 
  timestamps: true 
});

// Index for efficient queries
messRecordSchema.index({ user: 1, date: 1 });
messRecordSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('MessRecord', messRecordSchema);
