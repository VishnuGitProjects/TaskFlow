const { Resend } = require("resend");

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

const transporter = {
  /**
   * Wrapper function to send emails via Resend HTTP API.
   * Maps to the Nodemailer transporter.sendMail signature.
   * 
   * @param {Object} options - { from, to, subject, html, text }
   * @returns {Promise<Object>} Resend response data
   */
  sendMail: async (options) => {
    // Gmail/Yahoo domains are blocked as senders in Resend unless you own the domain.
    // Use configured EMAIL_FROM or default to onboarding@resend.dev.
    const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
    const to = Array.isArray(options.to) ? options.to : [options.to];

    console.log(`[Resend] Sending email to: ${to} (Sender: ${from})`);

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: options.subject,
      html: options.html,
      text: options.text || undefined,
    });

    if (error) {
      console.error("[Resend Error] Failed to send email:", error);
      throw new Error(error.message || "Failed to send email via Resend API.");
    }

    console.log(`[Resend Success] Email sent successfully! ID: ${data.id}`);
    return data;
  }
};

module.exports = transporter;