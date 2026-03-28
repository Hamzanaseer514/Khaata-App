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
  const { type, amount, contactName, updatedBalance, description, userName, visitingCard } = transactionData;

  const isUserPaid = type === 'DEBIT';
  const amt = Math.round(Number(amount));
  const bal = Math.round(Math.abs(Number(updatedBalance)));
  const year = new Date().getFullYear();
  const date = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  let txnLine = '';
  let statusLine = '';

  if (isUserPaid) {
    txnLine = `${userName} paid — you owe Rs ${amt.toLocaleString()}`;
    statusLine = updatedBalance > 0
      ? `You owe Rs ${bal.toLocaleString()} to ${userName}`
      : updatedBalance < 0
      ? `Overpaid by Rs ${bal.toLocaleString()}`
      : `Settled`;
  } else {
    txnLine = `You paid Rs ${amt.toLocaleString()} to ${userName}`;
    statusLine = updatedBalance < 0
      ? `${userName} owes you Rs ${bal.toLocaleString()}`
      : updatedBalance > 0
      ? `You owe Rs ${bal.toLocaleString()} to ${userName}`
      : `Settled`;
  }

  // Visiting card block
  let cardBlock = '';
  if (visitingCard && visitingCard.cardData) {
    const c = visitingCard.cardData;
    const initials = (c.name || 'KW').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const infoRows = [
      c.phone ? `<tr><td style="padding:3px 0;color:#94a3b8;font-size:12px;">&#9742; ${c.phone}</td></tr>` : '',
      c.email ? `<tr><td style="padding:3px 0;color:#94a3b8;font-size:12px;">&#9993; ${c.email}</td></tr>` : '',
      c.website ? `<tr><td style="padding:3px 0;color:#94a3b8;font-size:12px;">&#127760; ${c.website}</td></tr>` : '',
      c.address ? `<tr><td style="padding:3px 0;color:#94a3b8;font-size:12px;">&#128205; ${c.address}</td></tr>` : '',
    ].filter(Boolean).join('');

    cardBlock = `
<tr><td style="padding:0 32px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;">
    <tr><td style="padding:20px;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td width="40" height="40" style="background:#0ea5e9;border-radius:20px;text-align:center;vertical-align:middle;color:#fff;font-size:15px;font-weight:800;">${initials}</td>
          <td style="padding-left:12px;vertical-align:middle;">
            <span style="display:block;color:#f1f5f9;font-size:15px;font-weight:700;">${c.name || userName}</span>
            ${c.title ? `<span style="display:block;color:#38bdf8;font-size:11px;margin-top:1px;">${c.title}</span>` : ''}
            ${c.company ? `<span style="display:block;color:#64748b;font-size:10px;margin-top:1px;">${c.company}</span>` : ''}
          </td>
        </tr>
      </table>
      ${infoRows ? `<table cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px solid #1e293b;padding-top:10px;">${infoRows}</table>` : ''}
    </td></tr>
  </table>
</td></tr>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:32px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

<!-- Logo -->
<tr><td align="center" style="padding:0 0 24px;">
  <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">Khaata</span><span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;color:#0ea5e9;letter-spacing:-0.5px;">Wise</span>
</td></tr>

<!-- Card -->
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">

  <!-- Banner -->
  <tr><td style="background:${isUserPaid ? '#dc2626' : '#16a34a'};padding:24px 32px;text-align:center;">
    <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);letter-spacing:2px;text-transform:uppercase;">${isUserPaid ? 'Amount Owed' : 'Payment Received'}</p>
    <p style="margin:8px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:32px;font-weight:800;color:#ffffff;">Rs ${amt.toLocaleString()}</p>
    <p style="margin:6px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.7);">${date} &middot; ${time}</p>
  </td></tr>

  <!-- Greeting -->
  <tr><td style="padding:28px 32px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#334155;line-height:22px;">
    Hi <strong style="color:#0f172a;">${contactName}</strong>,<br>A transaction has been recorded by <strong style="color:#0f172a;">${userName}</strong>.
  </td></tr>

  <!-- Details Table -->
  <tr><td style="padding:20px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <tr>
        <td style="padding:12px 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0;">Transaction</td>
        <td style="padding:12px 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#0f172a;font-weight:700;text-align:right;border-bottom:1px solid #e2e8f0;">${txnLine}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0;">Description</td>
        <td style="padding:12px 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#0f172a;font-weight:700;text-align:right;border-bottom:1px solid #e2e8f0;">${description || 'No description'}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#64748b;">Balance</td>
        <td style="padding:12px 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:800;text-align:right;color:${updatedBalance > 0 ? '#dc2626' : updatedBalance < 0 ? '#16a34a' : '#0f172a'};">Rs ${bal.toLocaleString()}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Status -->
  <tr><td style="padding:0 32px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${isUserPaid ? '#fef2f2' : '#f0fdf4'};border:1px solid ${isUserPaid ? '#fecaca' : '#bbf7d0'};border-radius:8px;">
      <tr><td style="padding:12px 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;color:${isUserPaid ? '#dc2626' : '#16a34a'};">${statusLine}</td></tr>
    </table>
  </td></tr>

  ${cardBlock}

</table>
</td></tr>

<!-- Footer -->
<tr><td align="center" style="padding:24px 0 0;">
  <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#94a3b8;line-height:18px;">This is an automated notification from KhaataWise.</p>
  <p style="margin:8px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;color:#cbd5e1;">&copy; ${year} KhaataWise. All rights reserved.</p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;

  return {
    subject: `KhaataWise — Rs ${amt.toLocaleString()} ${isUserPaid ? 'Owed' : 'Received'}`,
    html,
    text: `KhaataWise\n\nHi ${contactName},\n\n${txnLine}\nDescription: ${description || 'No description'}\nBalance: Rs ${bal.toLocaleString()}\nStatus: ${statusLine}\n\n${visitingCard?.cardData?.name ? '— ' + visitingCard.cardData.name + (visitingCard.cardData.title ? ', ' + visitingCard.cardData.title : '') + (visitingCard.cardData.phone ? ' | ' + visitingCard.cardData.phone : '') : '— ' + userName}\n\nKhaataWise`
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

// ===== App update broadcast email =====

const getAppUpdateTemplate = ({ name, version, message, updateUrl, subject }) => {
  const safeName = name || 'there';
  const safeSubject = subject || `Khaata App Update — v${version || 'latest'}`;
  const safeVersion = version || 'latest';
  const safeMessage =
    message ||
    'A new version of Khaata is available. Please update to enjoy the latest improvements.';
  const safeUpdateUrl = updateUrl || '#';

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: 'Inter', Arial, sans-serif; background:#f4f6fb; padding:0; margin:0; color:#0f172a; }
          a { color: inherit; }
          .wrapper { max-width:680px; margin:0 auto; padding:24px; }
          .card { background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 12px 32px rgba(15,23,42,0.08); }
          .hero { background:linear-gradient(135deg, #1fb6ff, #20B2AA); color:#ffffff; padding:24px 24px 18px; }
          .hero h1 { margin:0; font-size:22px; letter-spacing:-0.2px; }
          .hero p { margin:8px 0 0; font-size:14px; opacity:0.9; }
          .content { padding:24px; }
          .pill { display:inline-block; background:#e0f2fe; color:#075985; padding:6px 12px; border-radius:999px; font-weight:700; font-size:12px; letter-spacing:0.2px; }
          .message { margin:16px 0 18px; line-height:1.65; color:#334155; white-space:pre-line; }
          .cta { display:inline-block; background:#20B2AA; color:#fff; padding:13px 22px; border-radius:12px; text-decoration:none; font-weight:800; letter-spacing:0.2px; box-shadow:0 8px 20px rgba(32,178,170,0.25); }
          .linkline { margin-top:14px; font-size:13px; color:#64748b; word-break:break-all; }
          .footer { padding:18px 24px 22px; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="card">
            <div class="hero">
              <h1>Khaata App Update</h1>
              <p>Hi ${safeName}, a new version is ready.</p>
            </div>
            <div class="content">
              <span class="pill">Version ${safeVersion}</span>
              <p class="message">${safeMessage}</p>
              <a class="cta" href="${safeUpdateUrl}" target="_blank" rel="noopener noreferrer">Update Now</a>
              <p class="linkline">If the button doesn’t work, copy & paste: ${safeUpdateUrl}</p>
            </div>
            <div class="footer">
              <p>Thanks for being part of Khaata. Need help? Reply to this email.</p>
              <p>© ${new Date().getFullYear()} Khaata. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `Hello ${safeName},

A new Khaata update is available: v${safeVersion}

${safeMessage}

Update here: ${safeUpdateUrl}

Thank you for using Khaata.`;

  return {
    subject: safeSubject,
    html,
    text,
  };
};

const sendAppUpdateEmail = async (recipientEmail, data) => {
  try {
    const transporter = createTransporter();
    const emailTemplate = getAppUpdateTemplate(data);

    const mailOptions = {
      from: `"Khaata" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending app update email:', error);
    return { success: false, error: error.message };
  }
};


// ===== Forgot Password template =====

const getForgotPasswordTemplate = ({ name, code }) => {
  const brandPrimary = '#20B2AA';
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset your password – Khaata</title>
      <style>
        body { background:#f5f7fb; margin:0; padding:24px; font-family:Arial, Helvetica, sans-serif; color:#111827; }
        .wrap { max-width:640px; margin:0 auto; }
        .brand { text-align:center; font-weight:800; color:${brandPrimary}; font-size:22px; margin-bottom:12px; }
        .card { background:#ffffff; border-radius:14px; box-shadow:0 10px 30px rgba(16,24,40,.08); border:1px solid #eef2f7; overflow:hidden; }
        .header { padding:18px 22px; border-bottom:1px solid #eef2f7; background:linear-gradient(135deg, #ffffff, #f9fbff); }
        .title { margin:0; font-size:18px; font-weight:800; color:#0f172a; }
        .body { padding:24px 22px; }
        .lead { margin:8px 0 18px; color:#475569; line-height:1.5; }
        .code { display:inline-block; font-size:32px; letter-spacing:8px; font-weight:900; padding:16px 24px; border-radius:12px; background:#f1faf9; color:#0b7d79; border:2px dashed ${brandPrimary}; margin:12px 0; }
        .meta { margin-top:10px; color:#64748b; font-size:13px; }
        .footer { text-align:center; color:#94a3b8; font-size:12px; padding:16px 0 6px; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="brand">Khaata</div>
        <div class="card">
          <div class="header"><h1 class="title">Reset your password</h1></div>
          <div class="body">
            <p class="lead">Hi ${name || 'there'}, we received a request to reset your password. Use the following code to continue. The code expires in <b>10 minutes</b>.</p>
            <div style="text-align:center;"><span class="code">${code}</span></div>
            <p class="meta">If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
          <div class="footer">© ${new Date().getFullYear()} Khaata. All rights reserved.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    subject: 'Reset your Khaata password',
    html,
    text: `Your password reset code is: ${code}. It expires in 10 minutes.`
  };
};

module.exports = {
  sendNotificationEmail,
  getEmailTemplate,
  sendAppUpdateEmail,
  getAppUpdateTemplate,
  getForgotPasswordTemplate
};