// Utilitaires partagés par les fonctions /api (fichier préfixé « _ » :
// Vercel ne l'expose pas comme route).

export const TO = process.env.EXODUS_EMAIL_TO || "info@exodusevents.org";
const FROM = process.env.EXODUS_EMAIL_FROM || "Exodus Events <onboarding@resend.dev>";

export const texte = (v, max = 200) => String(v ?? "").trim().slice(0, max);
export const echapper = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const courrielValide = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// Lit le corps JSON (déjà parsé par Vercel, ou texte brut en local).
export function lireCorps(req) {
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  return body && typeof body === "object" ? body : null;
}

// Courriel HTML aux couleurs d'Exodus : titre, tableau de lignes, message.
export function gabarit(surtitre, titre, lignes, message) {
  return `
  <div style="font-family:Georgia,serif;background:#0c0c0c;color:#fafaf8;padding:32px">
    <p style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;color:#b8965a;margin:0 0 8px">${echapper(surtitre)}</p>
    <h1 style="font-weight:normal;margin:0 0 24px;color:#d4af6e">${echapper(titre)}</h1>
    <table style="border-collapse:collapse;width:100%;max-width:560px;font-family:Arial,sans-serif;font-size:14px">
      ${lignes
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px 12px 8px 0;color:#b8965a;border-bottom:1px solid #2a241c;white-space:nowrap">${echapper(k)}</td><td style="padding:8px 0;border-bottom:1px solid #2a241c">${echapper(v)}</td></tr>`,
        )
        .join("")}
    </table>
    ${
      message
        ? `<p style="margin:24px 0 6px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;color:#b8965a">MESSAGE</p>
           <p style="white-space:pre-wrap;font-size:16px;line-height:1.6;margin:0">${echapper(message)}</p>`
        : ""
    }
    <p style="margin-top:28px;font-family:Arial,sans-serif;font-size:12px;color:#888">Répondez directement à ce courriel pour écrire à l'expéditeur.</p>
  </div>`;
}

// Envoie à l'agence. « sauvegarde » indique que la demande est déjà
// enregistrée dans la base : dans ce cas, un échec du courriel ne fait pas
// échouer la demande (rien n'est perdu).
// Sans RESEND_API_KEY et sans base : simulation en local / aperçu,
// erreur 503 en production (le site propose alors d'écrire directement).
export async function envoyer(res, { sujet, html, replyTo, lignes, message, sauvegarde = false }) {
  const ok = (extra = {}) => res.status(200).json({ ok: true, enregistre: sauvegarde, ...extra });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (sauvegarde) return ok();
    if (process.env.VERCEL_ENV === "production") {
      console.error("Ni RESEND_API_KEY ni base de données : message non transmis.", sujet);
      return res.status(503).json({ error: "L'envoi en ligne n'est pas encore activé." });
    }
    console.log("\n📧 [SIMULATION] (aucune clé Resend configurée)");
    console.log("  À     :", TO);
    console.log("  Objet :", sujet);
    lignes.forEach(([k, v]) => console.log(`  ${k.padEnd(16)}: ${v}`));
    if (message) console.log("  Message         :", message);
    return ok({ simulated: true });
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: replyTo, subject: sujet, html }),
    });
    if (!r.ok) {
      console.error("Resend a refusé l'envoi :", r.status, await r.text());
      return sauvegarde ? ok() : res.status(502).json({ error: "L'envoi n'a pas abouti." });
    }
  } catch (e) {
    console.error("Erreur réseau Resend :", e);
    return sauvegarde ? ok() : res.status(502).json({ error: "L'envoi n'a pas abouti." });
  }
  return ok();
}
