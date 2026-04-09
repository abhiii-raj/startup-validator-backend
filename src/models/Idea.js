const mongoose = require("mongoose");

const ideaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 3000
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing"
    },
    report: {
      problem: String,
      customer: String,
      market: String,
      competitor: [String],
      tech_stack: [String],
      risk_level: String,
      profitability_score: Number,
      justification: String
    },
    errorMessage: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Idea = mongoose.model("Idea", ideaSchema);

module.exports = { Idea };
