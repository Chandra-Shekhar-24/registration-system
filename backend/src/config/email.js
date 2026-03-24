/*
DEVELOPER: Chandra Shekhar Bansal
EMAIL: chandrashekharbansal.2006@gmail.com
FILE VERSION: 1.0.0
FILE DESCRIPTION: Email transporter configuration using Nodemailer; sets up SMTP connection with retry logic.
*/

const nodemailer = require('nodemailer');
const config = require('./env');

/**
 * Create and configure the email transporter
 * 
 * In development, it may use Ethereal or a test account;
 * in production, it uses the configured SMTP settings.
 */
let transporter = null;

/**
 * Creates the transporter instance with proper configuration.
 * Returns the same instance if already created.
 */
function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const smtpConfig = {
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.auth.user,
      pass: config.email.auth.pass
    },
    // Connection timeouts (in milliseconds)
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  };

  transporter = nodemailer.createTransport(smtpConfig);

  // Verify connection configuration on startup
  transporter.verify((error, success) => {
    if (error) {
      console.error('SMTP connection verification failed:', error.message);
    } else {
      if (config.nodeEnv === 'development') {
        console.log('SMTP server is ready to send emails');
      }
    }
  });

  return transporter;
}

/**
 * Send an email with retry logic
 * @param {Object} mailOptions - Standard Nodemailer mail options (to, subject, html, etc.)
 * @param {number} retries - Number of retries (default 1)
 * @returns {Promise<Object>} - Info about the sent mail
 */
async function sendEmail(mailOptions, retries = 1) {
  const transporterInstance = getTransporter();
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const info = await transporterInstance.sendMail({
        from: config.email.from,
        ...mailOptions
      });
      return info;
    } catch (err) {
      lastError = err;
      console.error(`Email send attempt ${attempt} failed:`, err.message);
      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw lastError;
}

module.exports = {
  getTransporter,
  sendEmail
};