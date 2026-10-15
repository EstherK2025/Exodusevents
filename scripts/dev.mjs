// Serveur local pour prévisualiser le site sans Vercel :
//   npm run dev   →   http://localhost:3000
// Sert public/ avec des URLs propres (/services → services.html)
// et exécute api/devis.js pour POST /api/devis.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import devis from "../api/devis.js";
import partenaire from "../api/partenaire.js";
import admin from "../api/admin.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const port = Number(process.env.PORT) || 3000;
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
};

async function fichier(p) {
  try { return (await stat(p)).isFile() ? p : null; } catch { return null; }
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  const api = { "/api/devis": devis, "/api/partenaire": partenaire, "/api/admin": admin }[url.pathname];
  if (api) {
    let raw = "";
    for await (const c of req) raw += c;
    let body = raw;
    try { body = JSON.parse(raw); } catch {}
    const r = {
      status(c) { res.statusCode = c; return r; },
      setHeader: (k, v) => res.setHeader(k, v),
      json(o) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); },
    };
    return api({ method: req.method, body, headers: req.headers, query: Object.fromEntries(url.searchParams) }, r);
  }

  const chemin = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const p =
    (await fichier(join(root, chemin))) ||
    (await fichier(join(root, chemin + ".html"))) ||
    (await fichier(join(root, chemin, "index.html")));
  if (!p) {
    res.statusCode = 404;
    res.setHeader("Content-Type", types[".html"]);
    return res.end((await fichier(join(root, "404.html"))) ? await readFile(join(root, "404.html")) : "Page introuvable");
  }
  res.setHeader("Content-Type", types[extname(p)] || "application/octet-stream");
  res.end(await readFile(p));
}).listen(port, () => console.log(`Exodus Events → http://localhost:${port}`));
