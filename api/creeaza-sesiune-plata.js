// api/creeaza-sesiune-plata.js
// Creează o sesiune Stripe Checkout pentru abonamentul lunar.
// Necesită variabilele de mediu STRIPE_SECRET_KEY și STRIPE_PRICE_ID (vezi README).

import Stripe from "stripe";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!secretKey || !priceId) {
    console.error("Lipsesc STRIPE_SECRET_KEY sau STRIPE_PRICE_ID din variabilele de mediu.");
    return res.status(500).json({ error: "Server neconfigurat pentru plăți." });
  }

  const stripe = new Stripe(secretKey);

  // Originea site-ului (ex: https://carte-de-bucate-digitala.vercel.app),
  // dedusă automat din request, ca linkurile de succes/anulare să funcționeze
  // indiferent de domeniul folosit.
  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?plata=succes&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?plata=anulata`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Eroare Stripe:", err);
    return res.status(500).json({ error: "Nu am putut porni plata. Încearcă din nou." });
  }
}
