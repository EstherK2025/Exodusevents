// Génère les pages du site Exodus Events (public/*.html) à partir de
// src/pages/*.html + en-tête et pied de page communs.
//
//   npm run build
//
// Chaque page commence par un bloc de métadonnées :
//   <!--
//   title: Titre de l'onglet
//   description: Description pour Google
//   nav: services            (lien de menu à surligner)
//   header: solid            (optionnel : en-tête opaque dès le départ)
//   -->
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const out = join(root, "public");
const part = (n) => readFileSync(join(src, "partials", n + ".html"), "utf8");
const [head, header, footer] = ["head", "header", "footer"].map(part);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

for (const file of readdirSync(join(src, "pages")).filter((f) => f.endsWith(".html"))) {
  const raw = readFileSync(join(src, "pages", file), "utf8");
  const m = raw.match(/^<!--([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${file} : bloc de métadonnées manquant`);
  const meta = Object.fromEntries(
    m[1].trim().split("\n").map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  const nav = header
    .replace("{{headerClass}}", meta.header === "solid" ? " is-solid" : "")
    .replaceAll(`data-nav="${meta.nav}"`, 'aria-current="page"')
    .replace(/ data-nav="[^"]*"/g, "");
  const html =
    head.replaceAll("{{title}}", esc(meta.title)).replaceAll("{{robots}}", meta.robots || "index, follow").replaceAll("{{description}}", esc(meta.description)) +
    nav +
    raw.slice(m[0].length) +
    footer;
  writeFileSync(join(out, file), html);
  console.log("✓ public/" + file);
}
