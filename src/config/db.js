const mongoose = require("mongoose");
const { Pool } = require("pg");
const { env } = require("./env");

let pgPool = null;

async function connectMongo() {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is required for mongo mode.");
  }

  await mongoose.connect(env.mongoUri);
}

async function connectPostgresIfEnabled() {
  const isHybrid = env.databaseMode === "hybrid";
  const hasPostgres = Boolean(env.postgresUrl);

  if (!isHybrid || !hasPostgres) {
    return null;
  }

  pgPool = new Pool({ connectionString: env.postgresUrl });
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS idea_reports (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      profitability_score INT NOT NULL,
      risk_level TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL
    )
  `);

  return pgPool;
}

function getPgPool() {
  return pgPool;
}

module.exports = { connectMongo, connectPostgresIfEnabled, getPgPool };
