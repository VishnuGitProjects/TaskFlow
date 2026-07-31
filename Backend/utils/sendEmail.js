const transporter = require("../config/mail");

/**
 * Sends an email using Resend (via our custom transporter wrapper).
 * 
 * @param {Object} options - { to, subject, text, html }
 * @returns {Promise<boolean>}
 */
async function sendEmail({ to, subject, text, html }) {
  try {
    await transporter.sendMail({ to, subject, text, html });
    return true;
  } catch (error) {
    console.error("❌ [sendEmail] Failed to send email via Resend:", error.message || error);
    return false;
  }
}

module.exports = sendEmail;
