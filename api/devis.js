// Demande de devis du site (POST /api/devis) — fonction Vercel.
// Envoyée par courriel à l'agence (voir api/_mail.js), client en « Répondre à ».
import { texte, courrielValide, lireCorps, gabarit, envoyer } from "./_mail.js";
import { enregistrer } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }
  const body = lireCorps(req);
  if (!body) return res.status(400).json({ error: "Requête invalide." });

  // Champ piège invisible : rempli uniquement par les robots.
  if (texte(body.website)) return res.status(200).json({ ok: true });

  const d = {
    type: texte(body.typeLabel || body.type, 80),
    services: Array.isArray(body.services) ? body.services.map((s) => texte(s, 80)).slice(0, 16) : [],
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
  if (!courrielValide(d.courriel)) return res.status(400).json({ error: "Adresse courriel invalide." });
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
  const id = await enregistrer("devis", {
    type: d.type, services: d.services.join(", "), date_evenement: d.date, lieu: d.lieu, invites: d.invites,
    budget: d.budget, nom: d.nom, courriel: d.courriel, telephone: d.telephone, contact: d.contact, message: d.message,
  });
  if (id) lignes.unshift(["N° de demande", `D-${id}`]);
  return envoyer(res, {
    sauvegarde: id != null,
    sujet: `Demande de devis — ${d.type} — ${d.nom}`,
    html: gabarit("NOUVELLE DEMANDE DE DEVIS", `${d.type} — ${d.nom}`, lignes, d.message),
    replyTo: d.courriel,
    lignes,
    message: d.message,
  });
}
