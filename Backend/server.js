const dotenv = require("dotenv");
const { verifyEnvironment } = require("./config/env");
const { connectDatabase } = require("./config/database");
const { createApp } = require("./app");

dotenv.config();
verifyEnvironment();

const app = createApp();
const PORT = process.env.PORT || 5000;

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(() => {
    process.exit(1);
  });
