const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8080),
    CLIENT_ORIGIN: z
      .string()
      .min(1, "CLIENT_ORIGIN is required.")
      .default("http://localhost:5173")
      .refine(
        (value) =>
          value
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean)
            .every((origin) => {
              try {
                // eslint-disable-next-line no-new
                new URL(origin);
                return true;
              } catch {
                return false;
              }
            }),
        "CLIENT_ORIGIN must contain valid URL(s), separated by commas."
      ),
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required."),
    POSTGRES_URL: z.string().optional().or(z.literal("")),
    DATABASE_MODE: z.enum(["mongo", "hybrid"]).default("mongo"),
    OPENAI_API_KEY: z.string().optional().or(z.literal("")),
    OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters.")
  })
  .superRefine((raw, context) => {
    if (raw.DATABASE_MODE === "hybrid" && !raw.POSTGRES_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "POSTGRES_URL is required when DATABASE_MODE=hybrid.",
        path: ["POSTGRES_URL"]
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

const raw = parsed.data;

const env = {
  nodeEnv: raw.NODE_ENV,
  port: raw.PORT,
  clientOrigin: raw.CLIENT_ORIGIN,
  clientOrigins: raw.CLIENT_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  mongoUri: raw.MONGODB_URI,
  postgresUrl: raw.POSTGRES_URL || "",
  databaseMode: raw.DATABASE_MODE,
  openAiApiKey: (raw.OPENAI_API_KEY || "").trim(),
  openAiModel: raw.OPENAI_MODEL,
  jwtSecret: raw.JWT_SECRET
};

module.exports = { env };
