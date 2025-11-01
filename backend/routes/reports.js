const express = require('express');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Contact = require('../models/Contact');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Generate PDF report
const generatePDFReport = async (transactions, contact, user, format) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // CEO Header
      doc.fillColor('#e74c3c')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('AMEER HAMZA', { align: 'center' });
      
      doc.fillColor('#2c3e50')
         .fontSize(12)
         .font('Helvetica')
         .text('CEO - Khaata App', { align: 'center' });
      
      doc.moveDown(1);
      
      // Main Header with styling
      doc.fillColor('#20B2AA')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('Khaata Transaction Report', { align: 'center' });
      
      doc.fillColor('#2c3e50')
         .fontSize(12)
         .font('Helvetica')
         .text(`Generated on ${new Date().toLocaleDateString('en-US', { 
           year: 'numeric', 
           month: 'long', 
           day: 'numeric',
           hour: '2-digit',
           minute: '2-digit'
         })}`, { align: 'center' });
      
      doc.moveDown(1);
      
      // Contact and User info box with proper spacing
      const infoBoxY = doc.y;
      
      // Clean contact and user names to avoid encoding issues
      const contactName = (contact.name || 'Unknown').replace(/[^\x00-\x7F]/g, '').trim() || 'Unknown Contact';
      const isAllContacts = contactName === 'All Contacts';
      const contactPhone = (!isAllContacts && contact.phone) ? (contact.phone.replace(/[^\x00-\x7F]/g, '').trim() || '') : '';
      const contactEmail = (!isAllContacts && contact.email) ? (contact.email.replace(/[^\x00-\x7F@.]/g, '').trim() || '') : '';
      const userName = (user.name || 'User').replace(/[^\x00-\x7F]/g, '').trim() || 'User';
      // User email - less aggressive cleaning to preserve email format
      const userEmail = user.email ? user.email.trim() : '';
      
      // Calculate info box height based on content
      let infoBoxHeight = 80;
      if (userEmail) infoBoxHeight = 100;
      if (!isAllContacts && contactEmail) infoBoxHeight = Math.max(infoBoxHeight, 100);
      
      doc.fillColor('#f8f9fa')
         .rect(50, infoBoxY, 500, infoBoxHeight)
         .fill();
      
      if (isAllContacts) {
        // For "All Contacts" report, only show report type on left
        doc.fillColor('#2c3e50')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text(`Report Type: ${contactName}`, 60, infoBoxY + 15);
      } else {
        // For individual contact reports, show contact details
        doc.fillColor('#2c3e50')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text(`Contact: ${contactName}`, 60, infoBoxY + 15);
        
        if (contactPhone) {
          doc.fontSize(12)
             .font('Helvetica')
             .text(`Phone: ${contactPhone}`, 60, infoBoxY + 35);
        }
        
        if (contactEmail) {
          doc.fontSize(12)
             .font('Helvetica')
             .text(`Email: ${contactEmail}`, 60, contactPhone ? infoBoxY + 55 : infoBoxY + 35);
        }
      }
      
      // Always show user info on right side
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`Report for: ${userName}`, 300, infoBoxY + 15);
      
      if (userEmail) {
        doc.fontSize(12)
           .font('Helvetica')
           .text(`Email: ${userEmail}`, 300, infoBoxY + 35);
      }
      
      doc.y = infoBoxY + infoBoxHeight + 10;
      doc.moveDown(1);

      // Summary section with styling
      const totalTransactions = transactions.length;
      const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const currentBalance = contact.balance;
      
      // Calculate totals
      const userPaidTotal = transactions
        .filter(t => t.payer === 'USER')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const contactPaidTotal = transactions
        .filter(t => t.payer === 'FRIEND')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const balanceStatus = currentBalance > 0 
        ? `Friend owes you Rs. ${Math.abs(currentBalance).toFixed(2)}`
        : currentBalance < 0 
        ? `You owe friend Rs. ${Math.abs(currentBalance).toFixed(2)}`
        : 'All settled';
      
      // Summary box with proper positioning
      const summaryBoxY = doc.y;
      doc.fillColor('#e8f4fd')
         .rect(50, summaryBoxY, 500, 100)
         .fill();
      
      doc.fillColor('#2c3e50')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Transaction Summary', 60, summaryBoxY + 15);
      
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Total Transactions: ${totalTransactions}`, 60, summaryBoxY + 40)
         .text(`Total Amount: Rs. ${totalAmount.toFixed(2)}`, 60, summaryBoxY + 60)
         .text(`Current Balance: Rs. ${Math.abs(currentBalance).toFixed(2)}`, 60, summaryBoxY + 80);
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(currentBalance > 0 ? '#27ae60' : currentBalance < 0 ? '#e74c3c' : '#7f8c8d')
         .text(`Status: ${balanceStatus}`, 300, summaryBoxY + 40);
      
      doc.y = summaryBoxY + 110;
      doc.moveDown(1);

      // Transactions table with proper spacing
      doc.fillColor('#2c3e50')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Transaction History', 50, doc.y);
      
      doc.moveDown(1);
      
      // Table headers with proper spacing
      const tableTop = doc.y;
      doc.fillColor('#20B2AA')
         .rect(50, tableTop, 520, 25)
         .fill();
      
      doc.fillColor('white')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('Date', 60, tableTop + 8)
         .text('Transaction Type', 150, tableTop + 8)
         .text('Amount', 350, tableTop + 8)
         .text('Description', 438, tableTop + 8);
      
      doc.moveDown(0.5);
      
      let currentY = tableTop + 35;
      
      // Transaction rows with alternating colors
      transactions.forEach((transaction, index) => {
        if (currentY > 700) { // New page if needed
          doc.addPage();
          currentY = 50;
        }
        
        const date = new Date(transaction.createdAt).toLocaleDateString('en-IN');
        const type = transaction.payer === 'USER' ? 'You Paid (Friend Owes You)' : 'Friend Paid (You Owe Friend)';
        const amount = `Rs. ${Math.abs(transaction.amount).toFixed(2)}`;
        const description = (transaction.note || 'No description').replace(/[^\x00-\x7F]/g, '') || 'No description';
        
        // Calculate description height for dynamic row height
        const rowStartY = currentY;
        doc.fontSize(11);
        const descHeight = doc.heightOfString(description, { width: 132 });
        const rowHeight = Math.max(35, descHeight + 15);
        
        // Alternate row colors with proper spacing - adjust height dynamically
        if (index % 2 === 0) {
          doc.fillColor('#f8f9fa')
             .rect(50, rowStartY - 5, 520, rowHeight)
             .fill();
        }
        
        doc.fillColor('#2c3e50')
           .fontSize(11)
           .font('Helvetica')
           .text(date, 60, rowStartY + 5)
           .text(type, 150, rowStartY + 5)
           .fillColor(transaction.payer === 'USER' ? '#27ae60' : '#e74c3c')
           .text(amount, 350, rowStartY + 5)
           .fillColor('#2c3e50')
           .text(description, 438, rowStartY + 5, { width: 132 });
        
        currentY += rowHeight;
      });

      // Totals section - Check if enough space (need ~150px)
      // If not enough space, add new page
      if (doc.y > 600) {
        doc.addPage();
        doc.y = 50;
      }
      
      doc.moveDown(1);
      const totalsY = doc.y;
      
      doc.fillColor('#2c3e50')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Payment Summary', 50, totalsY);
      
      doc.moveDown(0.5);
      
      // Totals box
      const totalsBoxY = doc.y;
      doc.fillColor('#f0f9f0')
         .rect(50, totalsBoxY, 500, 80)
         .fill();
      
      doc.fillColor('#2c3e50')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('Total Payments:', 60, totalsBoxY + 20);
      
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#27ae60')
         .text(`You Paid: Rs. ${userPaidTotal.toFixed(2)}`, 60, totalsBoxY + 45)
         .fillColor('#e74c3c')
         .text(`Friend Paid: Rs. ${contactPaidTotal.toFixed(2)}`, 60, totalsBoxY + 65);
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(currentBalance > 0 ? '#27ae60' : currentBalance < 0 ? '#e74c3c' : '#7f8c8d')
         .text(`Net Balance: ${balanceStatus}`, 300, totalsBoxY + 45);
      
      doc.y = totalsBoxY + 90;
      doc.moveDown(1);

      // Signature at the end
      // Check if we have enough space for signature (need about 120px)
      if (doc.y > 650) {
        doc.addPage();
        doc.y = 50;
      }
      
      doc.moveDown(1);
      
      // Signature line
      doc.fillColor('#2c3e50')
         .fontSize(12)
         .font('Helvetica')
         .text('_________________________', 400, doc.y);
      
      doc.fillColor('#e74c3c')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('AmeerHamza', 420, doc.y + 20);
      
      doc.fillColor('#2c3e50')
         .fontSize(12)
         .font('Helvetica')
         .text('CEO - Khaata App', 420, doc.y + 35);
      
      doc.fillColor('#7f8c8d')
         .fontSize(10)
         .font('Helvetica')
         .text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, 50, doc.y + 70);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate CSV report
const generateCSVReport = async (transactions, contact, user) => {
  const csvWriter = createCsvWriter({
    path: 'temp_report.csv',
    header: [
      { id: 'date', title: 'Date' },
      { id: 'type', title: 'Transaction Type' },
      { id: 'amount', title: 'Amount' },
      { id: 'description', title: 'Description' }
    ]
  });

  const records = transactions.map(transaction => ({
    date: new Date(transaction.createdAt).toLocaleDateString('en-IN'),
    type: transaction.payer === 'USER' ? 'You Paid (Friend Owes You)' : 'Friend Paid (You Owe Friend)',
    amount: `Rs. ${Math.abs(transaction.amount).toFixed(2)}`,
    description: (transaction.note || 'No description').replace(/[^\x00-\x7F]/g, '')
  }));

  await csvWriter.writeRecords(records);
  
  // Read the file and return buffer
  const csvData = fs.readFileSync('temp_report.csv');
  fs.unlinkSync('temp_report.csv'); // Clean up temp file
  
  return csvData;
};

// Export contact transactions
router.get('/contact/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { format = 'pdf' } = req.query;
    const userId = req.user.userId;

    console.log('=== EXPORTING CONTACT TRANSACTIONS ===');
    console.log('Contact ID:', contactId);
    console.log('Format:', format);
    console.log('User ID:', userId);

    // Find contact and user
    const [contact, user] = await Promise.all([
      Contact.findOne({ _id: contactId, userId }),
      User.findOne({ _id: userId })
    ]);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get all transactions for this contact
    const transactions = await Transaction.find({
      userId: userId,
      contactId: contactId
    }).sort({ createdAt: -1 });

    console.log(`Found ${transactions.length} transactions for contact ${contact.name}`);

    let fileData;
    let contentType;
    let filename;

    if (format.toLowerCase() === 'csv') {
      fileData = await generateCSVReport(transactions, contact, user);
      contentType = 'text/csv';
      filename = `${contact.name.replace(/\s+/g, '_')}_transactions.csv`;
    } else {
      fileData = await generatePDFReport(transactions, contact, user, format);
      contentType = 'application/pdf';
      filename = `${contact.name.replace(/\s+/g, '_')}_transactions.pdf`;
    }

    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileData.length);

    res.send(fileData);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export transactions',
      error: error.message
    });
  }
});

// Export all user transactions
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;
    const userId = req.user.userId;

    console.log('=== EXPORTING ALL USER TRANSACTIONS ===');
    console.log('Format:', format);
    console.log('User ID:', userId);

    // Find user
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get all transactions for user
    const transactions = await Transaction.find({
      userId: userId
    }).populate('contactId', 'name').sort({ createdAt: -1 });

    console.log(`Found ${transactions.length} total transactions for user ${user.name}`);
    console.log(`User email: ${user.email || 'NOT FOUND'}`);

    let fileData;
    let contentType;
    let filename;

    if (format.toLowerCase() === 'csv') {
      fileData = await generateCSVReport(transactions, { name: 'All Contacts' }, user);
      contentType = 'text/csv';
      filename = `${user.name.replace(/\s+/g, '_')}_all_transactions.csv`;
    } else {
      fileData = await generatePDFReport(transactions, { name: 'All Contacts' }, user, format);
      contentType = 'application/pdf';
      filename = `${user.name.replace(/\s+/g, '_')}_all_transactions.pdf`;
    }

    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileData.length);

    res.send(fileData);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export transactions',
      error: error.message
    });
  }
});

module.exports = router;
