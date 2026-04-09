const { z } = require("zod");

const analysisSchema = z.object({
  problem: z.string().min(1),
  customer: z.string().min(1),
  market: z.string().min(1),
  competitor: z.array(z.string().min(1)).length(3),
  tech_stack: z.array(z.string().min(1)).min(4).max(6),
  risk_level: z.enum(["Low", "Medium", "High"]),
  profitability_score: z.number().int().min(0).max(100),
  justification: z.string().min(1)
});

module.exports = { analysisSchema };
