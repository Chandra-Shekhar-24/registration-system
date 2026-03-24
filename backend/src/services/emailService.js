/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Email sending service with logging and retry capabilities.
*/

const { sendEmail } = require('../config/email');
const EmailLogModel = require('../models/emailLogModel');
const config = require('../config/env');

/**
 * Send an email and log the attempt
 * @param {Object} mailData - Email data
 * @param {string} mailData.to - Recipient email
 * @param {string} mailData.subject - Email subject
 * @param {string} mailData.html - HTML content
 * @param {string} mailData.emailType - Type from email_logs.email_type
 * @param {string} [mailData.text] - Plain text alternative (optional)
 * @returns {Promise<{success: boolean, logId: number}>} Result
 */
async function sendEmailWithLog(mailData) {
  // Create log entry with pending status
  const logEntry = await EmailLogModel.create({
    emailTo: mailData.to,
    emailType: mailData.emailType,
    subject: mailData.subject,
    content: mailData.html || mailData.text || ''
  });

  try {
    const mailOptions = {
      to: mailData.to,
      subject: mailData.subject,
      html: mailData.html,
      text: mailData.text
    };

    const info = await sendEmail(mailOptions, 1); // retry once

    // Mark log as sent
    await EmailLogModel.markAsSent(logEntry.id);

    return {
      success: true,
      logId: logEntry.id,
      messageId: info.messageId
    };
  } catch (error) {
    // Mark log as failed
    await EmailLogModel.markAsFailed(logEntry.id, error.message);

    return {
      success: false,
      logId: logEntry.id,
      error: error.message
    };
  }
}

/**
 * Send OTP email for registration
 * @param {string} email - Recipient email
 * @param {string} otpCode - 6-digit OTP
 * @returns {Promise<Object>} Result from sendEmailWithLog
 */
async function sendOtpEmail(email, otpCode) {
  const subject = 'Your OTP for Registration';
  const html = `
    <h2>Email Verification</h2>
    <p>Thank you for registering. Your OTP code is:</p>
    <h3 style="background: #f4f4f4; padding: 10px; font-family: monospace;">${otpCode}</h3>
    <p>This code will expire in ${config.otp.expiryMinutes} minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
  `;
  const text = `Your OTP code is: ${otpCode}. It expires in ${config.otp.expiryMinutes} minutes.`;

  return sendEmailWithLog({
    to: email,
    subject,
    html,
    text,
    emailType: 'otp'
  });
}

/**
 * Send password reset OTP email
 * @param {string} email - Recipient email
 * @param {string} otpCode - 6-digit OTP
 * @returns {Promise<Object>} Result
 */
async function sendPasswordResetEmail(email, otpCode) {
  const subject = 'Password Reset Request';
  const resetLink = `${config.frontendUrl}/reset-password?email=${encodeURIComponent(email)}&otp=${otpCode}`;
  const html = `
    <h2>Password Reset</h2>
    <p>You requested to reset your password. Your OTP code is:</p>
    <h3 style="background: #f4f4f4; padding: 10px; font-family: monospace;">${otpCode}</h3>
    <p>Alternatively, you can click the link below:</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>This code will expire in ${config.otp.expiryMinutes} minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
  `;
  const text = `Your password reset OTP is: ${otpCode}. Use this to reset your password. Link: ${resetLink}`;

  return sendEmailWithLog({
    to: email,
    subject,
    html,
    text,
    emailType: 'password_reset'
  });
}

/**
 * Send welcome email after successful registration
 * @param {string} email - Recipient email
 * @param {string} name - User name
 * @returns {Promise<Object>} Result
 */
async function sendWelcomeEmail(email, name) {
  const subject = 'Welcome to Registration System';
  const html = `
    <h2>Welcome, ${name}!</h2>
    <p>Your account has been successfully verified. You can now log in and access your dashboard.</p>
    <p>Thank you for joining us.</p>
  `;
  const text = `Welcome, ${name}! Your account has been verified. You can now log in.`;

  return sendEmailWithLog({
    to: email,
    subject,
    html,
    text,
    emailType: 'welcome'
  });
}

module.exports = {
  sendEmailWithLog,
  sendOtpEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};