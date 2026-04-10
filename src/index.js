const { app } = require("./app");
const { connectMongo, connectPostgresIfEnabled } = require("./config/db");

// Initialize database connections
(async () => {
  await connectMongo();
  await connectPostgresIfEnabled();
})();

// Export for Vercel serverless
module.exports = app;
