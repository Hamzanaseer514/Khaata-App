const Notification = require('../models/Notification');
const Contact = require('../models/Contact');
const User = require('../models/User');
const { sendNotificationEmail } = require('./emailService');

// Create and send notification when a transaction is created
const createTransactionNotification = async (transactionId, userId, contactId) => {
  try {
    console.log('=== CREATING TRANSACTION NOTIFICATION ===');
    console.log('Transaction ID:', transactionId);
    console.log('User ID:', userId);
    console.log('Contact ID:', contactId);
    
    // Find the contact and user to get names and email
    const [contact, user] = await Promise.all([
      Contact.findOne({ _id: contactId, userId }),
      User.findOne({ _id: userId })
    ]);
    
    if (!contact) {
      console.log('Contact not found for notification');
      return { success: false, error: 'Contact not found' };
    }
    
    if (!user) {
      console.log('User not found for notification');
      return { success: false, error: 'User not found' };
    }
    
    if (!contact.email) {
      console.log('Contact has no email address');
      return { success: false, error: 'Contact has no email address' };
    }
    
    // Create notification record
    const notification = new Notification({
      transactionId: transactionId,
      userId: userId,
      contactId: contactId,
      message: `Transaction notification for ${contact.name}`,
      status: 'pending'
    });
    
    await notification.save();
    console.log('Notification record created:', notification._id);
    
    // Prepare email data
    const emailData = {
      type: transactionId.payer === 'USER' ? 'DEBIT' : 'CREDIT',
      amount: transactionId.amount,
      contactName: contact.name,
      userName: user.name, // Add user's name
      updatedBalance: contact.balance,
      description: transactionId.note
    };
    
    console.log('Sending email to:', contact.email);
    console.log('Email data:', emailData);
    
    // Send email
    const emailResult = await sendNotificationEmail(contact.email, emailData);
    
    // Update notification status
    if (emailResult.success) {
      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();
      console.log('Email sent successfully, notification status updated to sent');
    } else {
      notification.status = 'failed';
      await notification.save();
      console.log('Email failed, notification status updated to failed');
    }
    
    return {
      success: true,
      notificationId: notification._id,
      emailSent: emailResult.success,
      emailError: emailResult.error || null
    };
    
  } catch (error) {
    console.error('Error creating transaction notification:', error);
    return { success: false, error: error.message };
  }
};

// Create notification for group transaction
const createGroupTransactionNotification = async (groupTransaction, userId, contactIds) => {
  try {
    console.log('=== CREATING GROUP TRANSACTION NOTIFICATIONS ===');
    console.log('Group Transaction:', groupTransaction);
    console.log('User ID:', userId);
    console.log('Contact IDs:', contactIds);
    
    const results = [];
    
    // Get user details
    const user = await User.findOne({ _id: userId });
    if (!user) {
      console.log('User not found for group notification');
      return { success: false, error: 'User not found' };
    }
    
    // Calculate per person share
    const perPersonShare = groupTransaction.perPersonShare;
    const isUserPayer = groupTransaction.payerId === null;
    
    for (const contactId of contactIds) {
      try {
        // Find the contact
        const contact = await Contact.findOne({ _id: contactId, userId });
        
        if (!contact) {
          console.log(`Contact ${contactId} not found`);
          results.push({
            contactId,
            success: false,
            error: 'Contact not found'
          });
          continue;
        }
        
        if (!contact.email) {
          console.log(`Contact ${contact.name} has no email address`);
          results.push({
            contactId,
            success: false,
            error: 'Contact has no email address'
          });
          continue;
        }
        
        // Create notification record
        const notification = new Notification({
          transactionId: null, // Group transactions don't have a single transaction ID
          userId: userId,
          contactId: contactId,
          message: `Group transaction notification for ${contact.name}`,
          status: 'pending'
        });
        
        await notification.save();
        console.log('Group notification record created:', notification._id);
        
        // Prepare email data for group transaction
        const emailData = {
          type: isUserPayer ? 'DEBIT' : 'CREDIT', // If user paid, contact owes (DEBIT for contact)
          amount: perPersonShare,
          contactName: contact.name,
          userName: user.name,
          updatedBalance: contact.balance,
          description: groupTransaction.description
        };
        
        console.log('Sending group transaction email to:', contact.email);
        console.log('Email data:', emailData);
        
        // Send email
        const emailResult = await sendNotificationEmail(contact.email, emailData);
        
        // Update notification status
        if (emailResult.success) {
          notification.status = 'sent';
          notification.sentAt = new Date();
          await notification.save();
          console.log('Group transaction email sent successfully');
        } else {
          notification.status = 'failed';
          await notification.save();
          console.log('Group transaction email failed');
        }
        
        results.push({
          contactId,
          success: true,
          notificationId: notification._id,
          emailSent: emailResult.success,
          emailError: emailResult.error || null
        });
        
      } catch (contactError) {
        console.error(`Error processing contact ${contactId}:`, contactError);
        results.push({
          contactId,
          success: false,
          error: contactError.message
        });
      }
    }
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Error creating group transaction notifications:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  createTransactionNotification,
  createGroupTransactionNotification
};
