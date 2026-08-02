const getAllowedOrigins = () => [
  process.env.CLIENT_URL,
  "https://taskflow-front.netlify.app",
  "https://customary-shrapnel-backboned.ngrok-free.dev",
].filter(Boolean);

const createCorsOptions = () => {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("netlify.app") ||
        origin.includes("ngrok-free.dev") ||
        origin.includes("ngrok")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  };
};

module.exports = {
  createCorsOptions,
};
