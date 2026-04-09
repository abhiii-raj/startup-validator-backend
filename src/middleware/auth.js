const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { env } = require("../config/env");
const { HttpError } = require("../utils/errors");

function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new HttpError(401, "Authentication required."));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (!payload || !mongoose.Types.ObjectId.isValid(payload.sub)) {
      throw new HttpError(401, "Invalid authentication token.");
    }

    req.auth = {
      userId: payload.sub,
      email: payload.email
    };

    return next();
  } catch (_error) {
    return next(new HttpError(401, "Invalid or expired authentication token."));
  }
}

module.exports = { requireAuth };
