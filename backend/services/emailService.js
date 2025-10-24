const nodemailer = require('nodemailer');
require('dotenv').config();

// Email configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // 465 => true, 587 => false
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Email templates
const getEmailTemplate = (transactionData) => {
  const { type, amount, contactName, updatedBalance, description, userName } = transactionData;
  
  // Determine transaction flow based on payer
  const isUserPaid = type === 'DEBIT'; // USER paid = DEBIT for friend
  const isFriendPaid = type === 'CREDIT'; // FRIEND paid = CREDIT for friend
  
  let transactionMessage = '';
  let balanceMessage = '';
  let actionMessage = '';
  
  if (isUserPaid) {
    // User paid, friend owes user
    transactionMessage = `You owe ₹${amount} to ${userName}`;
    balanceMessage = `Your updated balance: ₹${updatedBalance}`;
    actionMessage = updatedBalance > 0 
      ? `You still owe ₹${updatedBalance} to ${userName}`
      : updatedBalance < 0
      ? `You have overpaid ₹${Math.abs(updatedBalance)} to ${userName}`
      : `Your account with ${userName} is settled`;
  } else if (isFriendPaid) {
    // Friend paid, user owes friend
    transactionMessage = `You paid ₹${amount} to ${userName}`;
    balanceMessage = `Your updated balance: ₹${updatedBalance}`;
    actionMessage = updatedBalance < 0 
      ? `${userName} owes you ₹${Math.abs(updatedBalance)}`
      : updatedBalance > 0
      ? `You still owe ₹${updatedBalance} to ${userName}`
      : `Your account with ${userName} is settled`;
  }
  
  return {
    subject: `Khaata Transaction - ${isUserPaid ? 'Amount Owed' : 'Payment Received'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Khaata Transaction Notification</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #20B2AA;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #20B2AA;
            margin-bottom: 10px;
          }
          .transaction-card {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid ${isUserPaid ? '#e74c3c' : '#27ae60'};
          }
          .amount {
            font-size: 24px;
            font-weight: bold;
            color: ${isUserPaid ? '#e74c3c' : '#27ae60'};
            margin: 10px 0;
          }
          .balance {
            font-size: 18px;
            color: #2c3e50;
            margin: 10px 0;
          }
          .action {
            background-color: ${isUserPaid ? '#fdf2f2' : '#f0f9f0'};
            border: 1px solid ${isUserPaid ? '#fecaca' : '#bbf7d0'};
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #7f8c8d;
            font-size: 14px;
          }
          .button {
            display: inline-block;
            background-color: #20B2AA;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">💰 Khaata</div>
            <h2>Transaction Notification</h2>
          </div>
          
          <p>Hello <strong>${contactName}</strong>,</p>
          
          <p>A new transaction has been recorded in your Khaata account:</p>
          
          <div class="transaction-card">
            <h3>Transaction Details</h3>
            <p><strong>Amount:</strong> <span class="amount">₹${amount}</span></p>
            <p><strong>Description:</strong> ${description || 'No description provided'}</p>
            <p><strong>Transaction:</strong> ${transactionMessage}</p>
            <p><strong>${balanceMessage}</strong></p>
          </div>
          
          <div class="action">
            <h4>📋 Account Status:</h4>
            <p><strong>${actionMessage}</strong></p>
          </div>
          
          <p>This transaction was automatically recorded in your Khaata account. You can view all your transactions and manage your finances through the Khaata app.</p>
          
          <div style="text-align: center;">
            <a href="#" class="button">View in Khaata App</a>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from Khaata.</p>
            <p>If you have any questions, please contact us.</p>
            <p>© 2024 Khaata. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Khaata Transaction Notification
      
      Hello ${contactName},
      
      A new transaction has been recorded in your Khaata account:
      
      Amount: ₹${amount}
      Description: ${description || 'No description provided'}
      Transaction: ${transactionMessage}
      ${balanceMessage}
      
      Account Status:
      ${actionMessage}
      
      This transaction was automatically recorded in your Khaata account.
      
      Best regards,
      Khaata Team
    `
  };
};

// Send notification email
const sendNotificationEmail = async (contactEmail, transactionData) => {
  try {
    const transporter = createTransporter();
    const emailTemplate = getEmailTemplate(transactionData);
    
    const mailOptions = {
      from: `"Khaata" <${process.env.EMAIL_USER}>`,
      to: contactEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text, // fallback
      html: emailTemplate.html,
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotificationEmail,
  getEmailTemplate
};
