// api/vizitatori.js
// Contorul de vizitatori pentru Atlasul Culinar (/atlas).
//   GET /api/vizitatori?nou=1  -> adaugă un vizitator nou și întoarce totalul
//   GET /api/vizitatori        -> întoarce doar totalul
// Numărul e păstrat gratuit de serviciul Abacus (abacus.jasoncameron.dev).

const BASE = "https://abacus.jasoncameron.dev";
const KEY = "ccd-culinary-atlas/vizitatori";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const nou = req.query.nou === "1";
  try {
    let r = await fetch(`${BASE}/${nou ? "hit" : "get"}/${KEY}`);
    // primul vizitator: contorul nu există încă
    if (!r.ok && !nou && r.status === 404) return res.status(200).json({ vizitatori: 0 });
    if (!r.ok) throw new Error("status " + r.status);
    const j = await r.json();
    return res.status(200).json({ vizitatori: Number(j.value) || 0 });
  } catch (e) {
    return res.status(503).json({ error: "Contorul nu e disponibil acum." });
  }
}
