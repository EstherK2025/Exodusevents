// ───────────────────────────────────────────────────────────
// Demande de devis du site (POST /api/devis) — fonction Vercel.
//
// Envoie la demande par courriel à l'agence (EXODUS_EMAIL_TO, défaut
// info@exodusevents.org) via l'API Resend, avec le client en « Répondre à ».
//
// Sans RESEND_API_KEY :
//   - en local / aperçu : mode simulation (la demande s'affiche dans la console) ;
//   - en production : erreur 503, et le site propose au client d'écrire
//     directement par courriel (aucune demande n'est perdue en silence).
// ───────────────────────────────────────────────────────────

const TO = process.env.EXODUS_EMAIL_TO || "info@exodusevents.org";
const FROM = process.env.EXODUS_EMAIL_FROM || "Exodus Events <onboarding@resend.dev>";

const texte = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const echapper = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== "object") return res.status(400).json({ error: "Requête invalide." });

  // Champ piège invisible : rempli uniquement par les robots.
  if (texte(body.website)) return res.status(200).json({ ok: true });

  const d = {
    type: texte(body.typeLabel || body.type, 80),
    services: Array.isArray(body.services) ? body.services.map((s) => texte(s, 80)).slice(0, 12) : [],
    date: texte(body.date, 20),
    lieu: texte(body.lieu, 120),
    invites: texte(body.invites, 10),
    budget: texte(body.budget, 60),
    nom: texte(body.nom, 120),
    courriel: texte(body.courriel, 160),
    telephone: texte(body.telephone, 40),
    contact: texte(body.contact, 30),
    message: texte(body.message, 3000),
  };

  if (!d.nom) return res.status(400).json({ error: "Indiquez votre nom." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.courriel))
    return res.status(400).json({ error: "Adresse courriel invalide." });
  if (!d.type) return res.status(400).json({ error: "Type d'événement manquant." });

  const lignes = [
    ["Événement", d.type],
    ["Services", d.services.join(", ") || "—"],
    ["Date", d.date || "À définir"],
    ["Invités", d.invites || "—"],
    ["Lieu", d.lieu || "À définir"],
    ["Budget", d.budget || "À discuter"],
    ["Nom", d.nom],
    ["Courriel", d.courriel],
    ["Téléphone", d.telephone || "—"],
    ["Contact préféré", d.contact || "—"],
  ];
  const sujet = `Demande de devis — ${d.type} — ${d.nom}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.VERCEL_ENV === "production") {
      console.error("RESEND_API_KEY manquante : demande de devis non envoyée.", sujet);
      return res.status(503).json({ error: "L'envoi en ligne n'est pas encore activé." });
    }
    console.log("\n📧 [SIMULATION] Demande de devis (aucune clé Resend configurée)");
    console.log("  À     :", TO);
    console.log("  Objet :", sujet);
    lignes.forEach(([k, v]) => console.log(`  ${k.padEnd(16)}: ${v}`));
    if (d.message) console.log("  Message         :", d.message);
    return res.status(200).json({ ok: true, simulated: true });
  }

  const html = `
  <div style="font-family:Georgia,serif;background:#0c0c0c;color:#fafaf8;padding:32px">
    <p style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;color:#b8965a;margin:0 0 8px">NOUVELLE DEMANDE DE DEVIS</p>
    <h1 style="font-weight:normal;margin:0 0 24px;color:#d4af6e">${echapper(d.type)} — ${echapper(d.nom)}</h1>
    <table style="border-collapse:collapse;width:100%;max-width:560px;font-family:Arial,sans-serif;font-size:14px">
      ${lignes
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px 12px 8px 0;color:#b8965a;border-bottom:1px solid #2a241c;white-space:nowrap">${k}</td><td style="padding:8px 0;border-bottom:1px solid #2a241c">${echapper(v)}</td></tr>`,
        )
        .join("")}
    </table>
    ${
      d.message
        ? `<p style="margin:24px 0 6px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;color:#b8965a">SA VISION</p>
           <p style="white-space:pre-wrap;font-size:16px;line-height:1.6;margin:0">${echapper(d.message)}</p>`
        : ""
    }
    <p style="margin-top:28px;font-family:Arial,sans-serif;font-size:12px;color:#888">Répondez directement à ce courriel pour écrire au client.</p>
  </div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: d.courriel, subject: sujet, html }),
    });
    if (!r.ok) {
      console.error("Resend a refusé l'envoi :", r.status, await r.text());
      return res.status(502).json({ error: "L'envoi n'a pas abouti." });
    }
  } catch (e) {
    console.error("Erreur réseau Resend :", e);
    return res.status(502).json({ error: "L'envoi n'a pas abouti." });
  }
  return res.status(200).json({ ok: true });
}
