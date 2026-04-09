const { app } = require("./app");
const { env } = require("./config/env");
const { connectMongo, connectPostgresIfEnabled } = require("./config/db");

async function start() {
  await connectMongo();
  await connectPostgresIfEnabled();

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  process.exit(1);
});
