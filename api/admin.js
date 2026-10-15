// Tableau de bord (GET/POST /api/admin) — protégé par ADMIN_PASSWORD.
//   GET  ?table=devis|partenaires        → liste des enregistrements
//   POST { table, id, statut }           → change le statut
import { timingSafeEqual } from "node:crypto";
import { lireCorps } from "./_mail.js";
import { dbActive, lister, changerStatut, TABLES, STATUTS } from "./_db.js";

function autorise(req) {
  const attendu = process.env.ADMIN_PASSWORD || "";
  const h = req.headers?.authorization || "";
  const fourni = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!attendu || !fourni) return false;
  const a = Buffer.from(attendu), b = Buffer.from(fourni);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.ADMIN_PASSWORD)
    return res.status(503).json({ error: "Tableau de bord non configuré : ajoutez ADMIN_PASSWORD dans Vercel." });
  if (!autorise(req)) return res.status(401).json({ error: "Mot de passe incorrect." });
  if (!dbActive)
    return res.status(503).json({ error: "Base de données non connectée : ajoutez DATABASE_URL (Neon) dans Vercel." });

  try {
    if (req.method === "GET") {
      const table = req.query?.table;
      if (!TABLES[table]) return res.status(400).json({ error: "Table inconnue." });
      return res.status(200).json({ lignes: await lister(table), statuts: STATUTS });
    }
    if (req.method === "POST") {
      const b = lireCorps(req) || {};
      if (!TABLES[b.table] || !STATUTS.includes(b.statut) || !Number.isInteger(b.id))
        return res.status(400).json({ error: "Requête invalide." });
      const n = await changerStatut(b.table, b.id, b.statut);
      return n ? res.status(200).json({ ok: true }) : res.status(404).json({ error: "Introuvable." });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  } catch (e) {
    console.error("Erreur tableau de bord :", e);
    return res.status(500).json({ error: "Erreur de base de données." });
  }
}
