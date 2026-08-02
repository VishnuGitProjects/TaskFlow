const REQUIRED_ENV_VARS = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL", "BACKEND_URL", "RESEND_API_KEY"];

const verifyEnvironment = () => {
  REQUIRED_ENV_VARS.forEach((varName) => {
    if (!process.env[varName]) {
      console.warn(`[WARNING] Production Environment check failed: Missing ${varName}`);
    }
  });
};

module.exports = {
  verifyEnvironment,
};
