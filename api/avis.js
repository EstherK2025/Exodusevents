// Avis clients (GET/POST /api/avis) — fonction Vercel.
//   GET  → avis approuvés (statut « publie ») à afficher sur le site
//   POST → nouvel avis, enregistré « nouveau » : il n'apparaît qu'après
//          approbation dans le tableau de bord (/admin, onglet Avis).
import { texte, courrielValide, lireCorps, gabarit, envoyer } from "./_mail.js";
import { enregistrer, avisPublies, dbActive } from "./_db.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    try {
      return res.status(200).json({ avis: await avisPublies() });
    } catch (e) {
      console.error("Lecture des avis impossible :", e.message);
      return res.status(200).json({ avis: [] });
    }
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }
  const body = lireCorps(req);
  if (!body) return res.status(400).json({ error: "Requête invalide." });
  if (texte(body.website)) return res.status(200).json({ ok: true });
  const en = body.lang === "en";

  const d = {
    nom: texte(body.nom, 80),
    organisation: texte(body.organisation, 120),
    note: Math.max(1, Math.min(5, parseInt(body.note, 10) || 0)),
    message: texte(body.message, 1200),
    courriel: texte(body.courriel, 160),
    langue: en ? "en" : "fr",
  };
  if (!d.nom) return res.status(400).json({ error: en ? "Please enter your name." : "Indiquez votre nom." });
  if (!parseInt(body.note, 10)) return res.status(400).json({ error: en ? "Please choose a rating." : "Choisissez une note." });
  if (d.message.length < 10) return res.status(400).json({ error: en ? "Please write a few words about your experience." : "Écrivez quelques mots sur votre expérience." });
  if (d.courriel && !courrielValide(d.courriel)) return res.status(400).json({ error: en ? "Invalid email address." : "Adresse courriel invalide." });
  if (body.consent !== "oui") return res.status(400).json({ error: en ? "Please allow us to publish your review." : "Autorisez-nous à publier votre avis." });

  if (!dbActive && process.env.VERCEL_ENV === "production")
    return res.status(503).json({ error: en ? "Reviews are not available yet." : "Les avis ne sont pas encore disponibles." });
  const id = await enregistrer("avis", d);
  const lignes = [
    ["N° d'avis", id ? `A-${id}` : "—"],
    ["Note", "★".repeat(d.note) + "☆".repeat(5 - d.note)],
    ["Nom", d.nom],
    ["Organisation", d.organisation || "—"],
    ["Courriel", d.courriel || "—"],
    ["Langue", en ? "Anglais" : "Français"],
  ];
  return envoyer(res, {
    sauvegarde: id != null,
    sujet: `Nouvel avis (${d.note}/5) — ${d.nom} — à approuver`,
    html: gabarit("NOUVEL AVIS À APPROUVER", `${d.note}/5 — ${d.nom}`, lignes, d.message + "\n\n→ Pour le publier : tableau de bord /admin, onglet Avis, statut « Publié »."),
    replyTo: d.courriel || undefined,
    lignes,
    message: d.message,
  });
}
