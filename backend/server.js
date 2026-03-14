const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create or promote default admin based on env configuration
const ensureDefaultAdmin = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || process.env.EMAIL_USER || '').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const adminName = process.env.ADMIN_NAME || 'Khaata Admin';

  if (!adminEmail) {
    console.warn('ADMIN_EMAIL not set. Skipping default admin creation.');
    return;
  }

  try {
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = new User({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      });
      await admin.save();
      console.log(`Default admin created with email ${adminEmail}. Please change the password via env.`);
      return;
    }

    let updated = false;
    if (admin.role !== 'admin') {
      admin.role = 'admin';
      updated = true;
    }

    // Refresh password if it does not match the configured one
    const isSamePassword = await admin.comparePassword(adminPassword).catch(() => false);
    if (!isSamePassword && adminPassword) {
      admin.password = adminPassword;
      updated = true;
    }

    if (updated) {
      await admin.save();
      console.log(`Admin user ${adminEmail} updated/promoted.`);
    } else {
      console.log(`Admin user ${adminEmail} already present.`);
    }
  } catch (error) {
    console.error('Default admin creation failed:', error);
  }
};

// MongoDB connection
mongoose.connect(process.env.MONGODB_URL || 'mongodb+srv://khaata:khaata@cluster0.8fo1wsq.mongodb.net/')
.then(async () => {
  console.log('MongoDB connected successfully');
  await ensureDefaultAdmin();
})
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
app.use('/api/admin', require('./routes/admin'));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Khaata Backend API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
