// Demande Exodus Digital (POST /api/digital) — fonction Vercel.
// Enregistrée avec les demandes (table demandes_devis) et envoyée par courriel.
import { texte, courrielValide, lireCorps, gabarit, envoyer } from "./_mail.js";
import { enregistrer } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }
  const body = lireCorps(req);
  if (!body) return res.status(400).json({ error: "Requête invalide." });
  if (texte(body.website)) return res.status(200).json({ ok: true });

  const d = {
    nom: texte(body.nom, 120),
    organisation: texte(body.organisation, 160),
    profil: texte(body.profil, 60),
    besoin: texte(body.besoin, 80),
    courriel: texte(body.courriel, 160),
    telephone: texte(body.telephone, 40),
    message: texte(body.message, 3000),
  };
  if (!d.nom) return res.status(400).json({ error: "Indiquez votre nom." });
  if (!d.profil || !d.besoin) return res.status(400).json({ error: "Précisez votre profil et votre besoin." });
  if (!courrielValide(d.courriel)) return res.status(400).json({ error: "Adresse courriel invalide." });

  const lignes = [
    ["Besoin", d.besoin],
    ["Profil", d.profil],
    ["Organisation", d.organisation || "—"],
    ["Nom", d.nom],
    ["Courriel", d.courriel],
    ["Téléphone", d.telephone || "—"],
  ];
  const id = await enregistrer("devis", {
    type: "Exodus Digital — " + d.profil,
    services: d.besoin,
    lieu: d.organisation,
    nom: d.nom,
    courriel: d.courriel,
    telephone: d.telephone,
    message: d.message,
  });
  if (id) lignes.unshift(["N° de demande", `D-${id}`]);
  return envoyer(res, {
    sauvegarde: id != null,
    sujet: `Exodus Digital — ${d.besoin} — ${d.organisation || d.nom}`,
    html: gabarit("EXODUS DIGITAL · NOUVELLE DEMANDE", `${d.besoin} — ${d.organisation || d.nom}`, lignes, d.message),
    replyTo: d.courriel,
    lignes,
    message: d.message,
  });
}
