const { getPgPool } = require("../config/db");

async function mirrorIdeaSummaryToPostgres(ideaDoc) {
  const pool = getPgPool();
  if (!pool) {
    return;
  }

  const report = ideaDoc.report || {};
  await pool.query(
    `
      INSERT INTO idea_reports (id, title, profitability_score, risk_level, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id)
      DO UPDATE SET
        title = EXCLUDED.title,
        profitability_score = EXCLUDED.profitability_score,
        risk_level = EXCLUDED.risk_level,
        created_at = EXCLUDED.created_at
    `,
    [
      ideaDoc._id.toString(),
      ideaDoc.title,
      report.profitability_score || 0,
      report.risk_level || "Medium",
      ideaDoc.createdAt
    ]
  );
}

module.exports = { mirrorIdeaSummaryToPostgres };
