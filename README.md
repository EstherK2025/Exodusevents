# Exodus Events Agency — site web

> *De la genèse à l'exaucement.*
> Agence événementielle de luxe & d'expériences immersives, Moncton (NB).

Site vitrine statique (HTML/CSS/JS, aucune dépendance) avec une fonction serveur
pour les demandes de devis. Conçu pour être déployé sur **Vercel**.

## Pages

| URL | Contenu |
| --- | --- |
| `/` | Accueil : héros, passion, 7 services, expériences signatures, ambiances, processus, offre de lancement |
| `/services` | Les 7 pôles en détail, types d'événements, FAQ |
| `/experiences` | Compositeur de parfum interactif (Shemen · Hadassa · Éden · Ruah), 9 saveurs Bubbl' Flow, 360, champagne wall |
| `/a-propos` | La Maison : vision, mission, valeurs, ambition, univers visuel |
| `/devis` | Formulaire de devis en 4 étapes → courriel à l'agence |
| `/profil` | Profil d'entreprise (version brochure) |

## Démarrer en local

```bash
npm run dev     # génère les pages puis ouvre http://localhost:3000
```

Sans clé Resend, les demandes de devis s'affichent dans la console (simulation).

## Modifier le site

- **Textes des pages** : `src/pages/*.html`
- **Menu et pied de page** (communs à toutes les pages) : `src/partials/`
- **Couleurs, typographies, mise en page** : `public/assets/exodus.css`
- **Interactions** (menu, parfum, formulaire) : `public/assets/exodus.js`
- **Logos** : `public/assets/logos/` (versions or, noir et ivoire sur fond transparent).
  Pour remplacer un logo, gardez le même nom de fichier. Idéalement, exportez-les
  depuis Canva en PNG à fond transparent.

Après une modification dans `src/`, lancer `npm run build` : les fichiers
`public/*.html` sont régénérés (Vercel le fait aussi automatiquement au déploiement).
`public/profil.html` est une page autonome, à modifier directement.

## Mise en ligne (Vercel)

1. Sur https://vercel.com → **Add New… → Project** → importer ce dépôt.
   Les réglages sont lus depuis `vercel.json` (rien à changer).
2. **Settings → Environment Variables** (voir `.env.example`) :
   - `RESEND_API_KEY` — clé https://resend.com pour envoyer les devis ;
   - `EXODUS_EMAIL_TO` — adresse qui reçoit les demandes (défaut `info@exodusevents.org`) ;
   - `EXODUS_EMAIL_FROM` — expéditeur, ex. `Exodus Events <devis@exodusevents.org>`
     (le domaine `exodusevents.org` doit être vérifié dans Resend).
3. **Settings → Domains** → ajouter `exodusevents.org` et `www.exodusevents.org`,
   puis créer les enregistrements DNS indiqués par Vercel chez votre registraire.

Tant que `RESEND_API_KEY` n'est pas renseignée en production, le formulaire
n'envoie rien : il affiche un message et propose au client d'écrire directement
à info@exodusevents.org ou d'appeler — aucune demande n'est perdue en silence.

## Structure

```
api/devis.js          fonction Vercel : POST /api/devis → courriel (Resend)
public/               site publié (pages générées + assets, robots.txt, sitemap.xml)
src/pages/            sources des pages (avec bloc title/description/nav en tête)
src/partials/         <head>, en-tête et pied de page communs
scripts/build.mjs     génère public/*.html à partir de src/
scripts/dev.mjs       serveur local (URLs propres + /api/devis)
```
