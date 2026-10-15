// Candidature d'un prestataire partenaire (POST /api/partenaire) — fonction Vercel.
import { texte, courrielValide, lireCorps, gabarit, envoyer } from "./_mail.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }
  const body = lireCorps(req);
  if (!body) return res.status(400).json({ error: "Requête invalide." });
  if (texte(body.website)) return res.status(200).json({ ok: true });

  const d = {
    entreprise: texte(body.entreprise, 120),
    nom: texte(body.nom, 120),
    domaine: texte(body.domaine, 80),
    ville: texte(body.ville, 80),
    courriel: texte(body.courriel, 160),
    telephone: texte(body.telephone, 40),
    lien: texte(body.lien, 200),
    message: texte(body.message, 3000),
  };
  if (!d.entreprise || !d.nom) return res.status(400).json({ error: "Indiquez votre nom et celui de votre entreprise." });
  if (!d.domaine) return res.status(400).json({ error: "Choisissez votre domaine." });
  if (!courrielValide(d.courriel)) return res.status(400).json({ error: "Adresse courriel invalide." });

  const lignes = [
    ["Entreprise", d.entreprise],
    ["Contact", d.nom],
    ["Domaine", d.domaine],
    ["Ville", d.ville || "—"],
    ["Courriel", d.courriel],
    ["Téléphone", d.telephone || "—"],
    ["Site / Instagram", d.lien || "—"],
  ];
  return envoyer(res, {
    sujet: `Nouveau partenaire — ${d.domaine} — ${d.entreprise}`,
    html: gabarit("CANDIDATURE PARTENAIRE", `${d.entreprise} — ${d.domaine}`, lignes, d.message),
    replyTo: d.courriel,
    lignes,
    message: d.message,
  });
}
