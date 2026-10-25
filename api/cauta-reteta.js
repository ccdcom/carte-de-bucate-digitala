// api/cauta-reteta.js
// Funcție serverless (Vercel) care primește o interogare de preparat
// și cere modelului Claude o poveste + o rețetă rustică + o rețetă Michelin.
//
// Cheia API NU trebuie pusă niciodată în cod. Se citește din variabila
// de mediu ANTHROPIC_API_KEY, setată în dashboard-ul Vercel (Project ->
// Settings -> Environment Variables) sau local într-un fișier .env
// (vezi .env.example).

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5"; // schimbă cu "claude-haiku-4-5-20251001" pentru costuri mai mici

// Limitare simplă de rată, în memorie (per instanță serverless).
// Pentru trafic real / mai multe instanțe, înlocuiește cu Redis/Upstash.
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 oră
const RATE_LIMIT_MAX = 20; // cereri / oră / IP

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

function buildPrompt(query) {
  return `You are CCD, a warm and knowledgeable bilingual (Romanian and English) culinary guide. A user asked about this dish or craving: "${query}"

Detect whether the user wrote in Romanian or English (if ambiguous, default to Romanian) and respond ENTIRELY in that language for every text field below.

Identify the single most relevant dish. Then produce, in your own words:
1. A short, engaging story about the dish's origin, cultural context or history (2-3 short paragraphs).
2. A rustic / traditional / home-style ("peasant") version of the recipe, humble ingredients, simple technique.
3. An elevated, Michelin-3-star-level reinterpretation of the same dish: refined technique, premium ingredients, precise plating, still recognizably the same dish at its core.

Respond ONLY with a JSON object, no markdown fences, no extra text, matching exactly this shape:
{
  "language": "ro" or "en",
  "dish_name": "string, the dish's name in the detected language",
  "story_paragraphs": ["paragraph 1", "paragraph 2", ...],
  "rustic": {
    "title": "short label for this version, e.g. 'Varianta de la țară' or 'The Farmhouse Version'",
    "intro": "one sentence framing this version",
    "ingredients": ["ingredient 1", "ingredient 2", ...],
    "steps": ["step 1", "step 2", ...]
  },
  "michelin": {
    "title": "short label, e.g. 'Interpretare Michelin ★★★' or 'Michelin 3-Star Interpretation'",
    "intro": "one sentence framing this version",
    "ingredients": ["ingredient 1", "ingredient 2", ...],
    "steps": ["step 1", "step 2", ...],
    "plating": "one or two sentences describing the refined plating and presentation"
  }
}`;
}

function extractJson(text) {
  // Modelul poate uneori încadra răspunsul în ```json ... ```; îl curățăm.
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

export default async function handler(req, res) {
  // CORS de bază — ajustează originile permise dacă frontend-ul e pe alt domeniu.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: "Prea multe cereri. Încearcă din nou peste o oră. / Too many requests, try again later.",
    });
  }

  const { query } = req.body || {};
  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "Lipsește câmpul 'query'." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY nu este setată.");
    return res.status(500).json({ error: "Server neconfigurat (lipsește cheia API)." });
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        messages: [{ role: "user", content: buildPrompt(query) }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "Eroare la motorul AI. Încearcă din nou." });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) {
      return res.status(502).json({ error: "Răspuns neașteptat de la motorul AI." });
    }

    const parsed = extractJson(textBlock.text);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Eroare handler:", err);
    return res.status(500).json({ error: "Eroare internă de server." });
  }
}
