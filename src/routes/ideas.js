const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");
const { Idea } = require("../models/Idea");
const { analyzeIdea, generateIdeaSuggestions } = require("../services/aiService");
const { mirrorIdeaSummaryToPostgres } = require("../services/hybridStore");
const { HttpError } = require("../utils/errors");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const createIdeaSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(20).max(3000)
});

const suggestionsSchema = z.object({
  topic: z.string().trim().min(3).max(120),
  audience: z.string().trim().max(120).optional().or(z.literal("")),
  market: z.string().trim().max(120).optional().or(z.literal(""))
});

router.use(requireAuth);

router.post("/suggestions", async (req, res, next) => {
  try {
    const { topic, audience, market } = suggestionsSchema.parse(req.body);
    const ideas = await generateIdeaSuggestions({ topic, audience, market });
    return res.json({ ideas });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { title, description } = createIdeaSchema.parse(req.body);

    const idea = await Idea.create({
      userId: req.auth.userId,
      title,
      description,
      status: "processing"
    });

    try {
      const report = await analyzeIdea(title, description);
      idea.report = report;
      idea.status = "completed";
      idea.errorMessage = null;
      await idea.save();
      await mirrorIdeaSummaryToPostgres(idea);
    } catch (aiError) {
      idea.status = "failed";
      idea.errorMessage = aiError.message;
      await idea.save();
      throw aiError;
    }

    return res.status(201).json({ id: idea._id.toString() });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const ideas = await Idea.find(
      { userId: req.auth.userId },
      { title: 1, status: 1, createdAt: 1, "report.risk_level": 1, "report.profitability_score": 1 }
    )
      .sort({ createdAt: -1 })
      .lean();

    return res.json(
      ideas.map((idea) => ({
        id: idea._id.toString(),
        title: idea.title,
        status: idea.status,
        createdAt: idea.createdAt,
        riskLevel: idea.report?.risk_level || null,
        profitabilityScore: idea.report?.profitability_score ?? null
      }))
    );
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new HttpError(400, "Invalid idea id.");
    }

    const idea = await Idea.findById(req.params.id).lean();
    if (!idea) {
      throw new HttpError(404, "Idea not found.");
    }

    if (idea.userId?.toString() !== req.auth.userId) {
      throw new HttpError(404, "Idea not found.");
    }

    return res.json({
      id: idea._id.toString(),
      title: idea.title,
      description: idea.description,
      status: idea.status,
      report: idea.report || null,
      errorMessage: idea.errorMessage,
      createdAt: idea.createdAt,
      updatedAt: idea.updatedAt
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new HttpError(400, "Invalid idea id.");
    }

    const deleted = await Idea.findOneAndDelete({ _id: req.params.id, userId: req.auth.userId });
    if (!deleted) {
      throw new HttpError(404, "Idea not found.");
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = { ideasRouter: router };
