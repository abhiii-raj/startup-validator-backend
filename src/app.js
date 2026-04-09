const express = require("express");
const cors = require("cors");
const { ZodError } = require("zod");
const { ideasRouter } = require("./routes/ideas");
const { authRouter } = require("./routes/auth");
const { env } = require("./config/env");

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (env.clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked for this origin."));
    }
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/ideas", ideasRouter);

app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message || "Invalid request data." });
  }

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? "Internal server error." : error.message;
  res.status(statusCode).json({ message });
});

module.exports = { app };
