const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URL || 'mongodb+srv://khaata:khaata@cluster0.8fo1wsq.mongodb.net/')
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/group-transactions', require('./routes/group-transactions'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/mess', require('./routes/messRoutes'));
app.use('/api/personal-transactions', require('./routes/personal-transactions'));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Khaata Backend API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
