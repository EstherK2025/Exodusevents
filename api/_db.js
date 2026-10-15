// Base de données Neon (Postgres) — enregistre les demandes de devis et
// les candidatures partenaires. Fichier préfixé « _ » : pas une route.
//
// Connexion : DATABASE_URL (ou POSTGRES_URL), fournie par Neon / l'intégration
// Vercel. Sans connexion, le site fonctionne quand même (courriel seulement).
// Les tables sont créées automatiquement au premier enregistrement.
import pg from "pg";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
export const dbActive = Boolean(url);

let pool;
let pret;

function db() {
  if (!pool) pool = new pg.Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10_000 });
  return pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS demandes_devis (
  id             SERIAL PRIMARY KEY,
  cree_le        TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut         TEXT NOT NULL DEFAULT 'nouveau',
  type           TEXT,
  services       TEXT,
  date_evenement TEXT,
  lieu           TEXT,
  invites        TEXT,
  budget         TEXT,
  nom            TEXT,
  courriel       TEXT,
  telephone      TEXT,
  contact        TEXT,
  message        TEXT
);
CREATE TABLE IF NOT EXISTS partenaires (
  id         SERIAL PRIMARY KEY,
  cree_le    TIMESTAMPTZ NOT NULL DEFAULT now(),
  statut     TEXT NOT NULL DEFAULT 'nouveau',
  entreprise TEXT,
  nom        TEXT,
  domaine    TEXT,
  ville      TEXT,
  courriel   TEXT,
  telephone  TEXT,
  lien       TEXT,
  message    TEXT
);`;

export const TABLES = {
  devis: { nom: "demandes_devis", colonnes: ["type", "services", "date_evenement", "lieu", "invites", "budget", "nom", "courriel", "telephone", "contact", "message"] },
  partenaires: { nom: "partenaires", colonnes: ["entreprise", "nom", "domaine", "ville", "courriel", "telephone", "lien", "message"] },
};
export const STATUTS = ["nouveau", "en_cours", "traite", "archive"];

async function preparer() {
  if (!pret) pret = db().query(SCHEMA).catch((e) => { pret = null; throw e; });
  return pret;
}

// Enregistre une ligne ; renvoie son id, ou null si la base est absente ou en erreur.
export async function enregistrer(cle, valeurs) {
  if (!dbActive) return null;
  const t = TABLES[cle];
  try {
    await preparer();
    const cols = t.colonnes;
    const r = await db().query(
      `INSERT INTO ${t.nom} (${cols.join(", ")}) VALUES (${cols.map((_, i) => "$" + (i + 1)).join(", ")}) RETURNING id`,
      cols.map((c) => valeurs[c] ?? null),
    );
    return r.rows[0].id;
  } catch (e) {
    console.error(`Enregistrement impossible dans ${t.nom} :`, e.message);
    return null;
  }
}

export async function lister(cle) {
  await preparer();
  const r = await db().query(`SELECT * FROM ${TABLES[cle].nom} ORDER BY cree_le DESC LIMIT 1000`);
  return r.rows;
}

export async function changerStatut(cle, id, statut) {
  await preparer();
  const r = await db().query(`UPDATE ${TABLES[cle].nom} SET statut = $1 WHERE id = $2`, [statut, id]);
  return r.rowCount;
}
