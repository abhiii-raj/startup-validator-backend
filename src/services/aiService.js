const OpenAI = require("openai");
const { env } = require("../config/env");
const { analysisSchema } = require("../utils/analysisSchema");

const SYSTEM_PROMPT = `You are an expert startup consultant. Analyze the input startup idea and return ONLY valid JSON with fields: problem, customer, market, competitor, tech_stack, risk_level, profitability_score, justification. Rules: concise and realistic; competitor exactly 3 one-line entries; tech_stack 4-6 practical MVP technologies; profitability_score integer between 0 and 100; risk_level exactly one of Low, Medium, High.`;

const SUGGESTIONS_SYSTEM_PROMPT = `You are an expert startup ideation advisor. Return ONLY JSON with shape {"ideas":[{"title":"","description":"","angle":""}]}. Rules: generate exactly 3 ideas; each title 4-10 words; each description 18-45 words; each angle 8-20 words and clearly differentiates the idea.`;

const client = env.openAiApiKey ? new OpenAI({ apiKey: env.openAiApiKey }) : null;

function fallbackAnalysis(title, description) {
  return {
    problem: `The idea targets ${title}, but problem urgency should be validated with interviews before building.`,
    customer: "Primary users are early adopters who feel this pain weekly and can pay for time savings.",
    market: "The market appears moderately competitive with room for niche differentiation via speed and UX.",
    competitor: [
      "Notion AI: broad productivity suite, less focused workflow depth.",
      "Airtable AI: strong data tooling, steeper setup for non-technical teams.",
      "Zapier AI: automation-first, weaker domain-specific guidance."
    ],
    tech_stack: ["React", "Node.js", "Express", "MongoDB", "OpenAI API"],
    risk_level: "Medium",
    profitability_score: 64,
    justification: `The idea can monetize if it delivers clear ROI, but ${description.slice(0, 80)}... still needs validation against churn and acquisition costs.`
  };
}

function fallbackSuggestions(topic, audience, market) {
  const audienceText = audience ? ` for ${audience}` : " for early adopters";
  const marketText = market ? ` in ${market}` : " in a focused niche";

  return [
    {
      title: `${topic} Workflow Copilot`,
      description: `An AI workspace${audienceText} that automates repetitive decisions and provides guided next steps${marketText}, reducing setup friction and improving execution speed for small teams.`,
      angle: "Automation-first product with guided execution loops."
    },
    {
      title: `${topic} Insights Pulse`,
      description: `A lightweight intelligence platform${audienceText} that surfaces weekly trends, competitor moves, and customer pain points${marketText}, helping founders prioritize features with confidence.`,
      angle: "Decision-support tool centered on trend and risk visibility."
    },
    {
      title: `${topic} Revenue Engine`,
      description: `A conversion-focused product${audienceText} that combines lead capture, personalization, and follow-up automation${marketText}, designed to improve monetization without heavy operational overhead.`,
      angle: "Monetization-oriented approach from day-one launch."
    }
  ];
}

async function analyzeIdea(title, description) {
  if (!client) {
    return fallbackAnalysis(title, description);
  }

  try {
    const completion = await client.chat.completions.create({
      model: env.openAiModel,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({ title, description })
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const normalized = {
      ...parsed,
      profitability_score: Number(parsed.profitability_score)
    };

    return analysisSchema.parse(normalized);
  } catch (_error) {
    // Keep the app usable when OpenAI is unavailable or quota-limited.
    return fallbackAnalysis(title, description);
  }
}

async function generateIdeaSuggestions({ topic, audience, market }) {
  if (!client) {
    return fallbackSuggestions(topic, audience, market);
  }

  try {
    const completion = await client.chat.completions.create({
      model: env.openAiModel,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SUGGESTIONS_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({ topic, audience: audience || null, market: market || null })
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const ideas = Array.isArray(parsed.ideas) ? parsed.ideas.slice(0, 3) : [];

    if (ideas.length !== 3) {
      return fallbackSuggestions(topic, audience, market);
    }

    const normalized = ideas.map((idea) => ({
      title: String(idea.title || "").trim(),
      description: String(idea.description || "").trim(),
      angle: String(idea.angle || "").trim()
    }));

    const valid = normalized.every(
      (idea) => idea.title.length >= 4 && idea.description.length >= 20 && idea.angle.length >= 8
    );

    return valid ? normalized : fallbackSuggestions(topic, audience, market);
  } catch (_error) {
    return fallbackSuggestions(topic, audience, market);
  }
}

module.exports = { analyzeIdea, generateIdeaSuggestions };
