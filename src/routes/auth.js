const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { User } = require("../models/User");
const { env } = require("../config/env");
const { HttpError } = require("../utils/errors");

const router = express.Router();

const authSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters.")
});

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email
    },
    env.jwtSecret,
    { expiresIn: "7d" }
  );
}

router.post("/signup", async (req, res, next) => {
  try {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || "Invalid signup request.");
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      throw new HttpError(409, "An account already exists with this email.");
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({ email, passwordHash });

    const token = signToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || "Invalid login request.");
    }

    const email = parsed.data.email.toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!passwordOk) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = { authRouter: router };
