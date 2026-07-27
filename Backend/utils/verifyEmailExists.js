/**
 * Utility: verifyEmailExists
 * 
 * FREE-TIER RATE LIMIT NOTICE:
 * Abstract API's free tier allows 250 requests/month (1 request/second).
 * If traffic/usage grows, upgrade to a paid Abstract API plan.
 */

const axios = require("axios");

/**
 * Verifies if an email address actually exists and is deliverable via Abstract API.
 * 
 * @param {string} email - The email address to verify.
 * @returns {Promise<boolean>} - Returns true if email is deliverable (or if API fails as fallback), false if undeliverable/unknown.
 */
async function verifyEmailExists(email) {
  const apiKey = process.env.ABSTRACT_EMAIL_API_KEY;

  if (!apiKey) {
    console.warn("⚠️ [verifyEmailExists] ABSTRACT_EMAIL_API_KEY is not defined in environment. Bypassing live verification.");
    // Fallback: do not block signup if API key is missing
    return true;
  }

  try {
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`;
    const response = await axios.get(url, { timeout: 10000 });
    const { deliverability, is_smtp_valid } = response.data;

    console.log(`[Abstract API] Deliverability for "${email}": ${deliverability}, SMTP Valid: ${is_smtp_valid?.value}`);

    if (deliverability === "DELIVERABLE") {
      return true;
    } else if (deliverability === "UNDELIVERABLE") {
      return false;
    } else if (deliverability === "UNKNOWN") {
      console.warn(`⚠️ [Abstract API] Email deliverability status is UNKNOWN for "${email}". Treating as invalid for signup safety.`);
      return false;
    } else {
      return false;
    }
  } catch (error) {
    // CRITICAL FALLBACK BEHAVIOR:
    // Third-party API failure (network error, rate limiting/429, API downtime, invalid key)
    // should NEVER prevent a user from signing up. Log the error and allow signup to proceed.
    console.error("⚠️ [verifyEmailExists] Abstract API request failed:", error.response?.data || error.message || error);
    return true;
  }
}

module.exports = verifyEmailExists;
