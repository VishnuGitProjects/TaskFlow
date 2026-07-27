const nodemailer = require("nodemailer");

/**
 * Sends an email using Nodemailer.
 * Uses SMTP settings from process.env if available.
 * Otherwise, falls back to Ethereal (mock SMTP for developers) or console log.
 * 
 * @param {Object} options - { to, subject, text, html }
 * @returns {Promise<boolean>}
 */
async function sendEmail({ to, subject, text, html }) {
  try {
    let transporter;

    // Check if SMTP environment variables are configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587/other
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Fallback: Create ethereal test account for developer testing
      console.log("ℹ️ [sendEmail] SMTP credentials not found in env. Setting up Ethereal SMTP server...");
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } catch (err) {
        console.warn("⚠️ [sendEmail] Failed to create Ethereal SMTP test account. Falling back to console logger.");
        console.log(`\n=============================================`);
        console.log(`📧 SIMULATED EMAIL SENT TO: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Text:\n${text}`);
        console.log(`=============================================\n`);
        return true;
      }
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"TaskFlow Pro Support" <noreply@taskflowpro.com>',
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 [sendEmail] Email sent successfully! Message ID: ${info.messageId}`);
    
    // If using Ethereal, log preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 [sendEmail] Preview Email at Ethereal: ${previewUrl}`);
    }
    
    return true;
  } catch (error) {
    console.error("❌ [sendEmail] Failed to send email via nodemailer:", error.message || error);
    return false;
  }
}

module.exports = sendEmail;
