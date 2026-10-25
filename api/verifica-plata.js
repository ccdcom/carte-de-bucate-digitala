// api/verifica-plata.js
// Verifică, folosind session_id-ul primit după redirect de la Stripe,
// dacă plata a fost efectuată cu succes.

import Stripe from "stripe";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: "Server neconfigurat pentru plăți." });
  }

  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ error: "Lipsește session_id." });
  }

  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const platit = session.payment_status === "paid" || session.status === "complete";
    return res.status(200).json({ platit });
  } catch (err) {
    console.error("Eroare verificare Stripe:", err);
    return res.status(500).json({ error: "Nu am putut verifica plata." });
  }
}
