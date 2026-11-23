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
// Parties communes par langue : header.html (fr) / header-en.html (en), etc.
const parts = {
  fr: { head: part("head"), header: part("header"), footer: part("footer") },
  en: { head: part("head").replace('<html lang="fr-CA">', '<html lang="en-CA">'), header: part("header-en"), footer: part("footer-en") },
};
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
  const lang = meta.lang === "en" ? "en" : "fr";
  const { head, header, footer } = parts[lang];
  // Lien vers la même page dans l'autre langue (meta « alt »), sinon l'accueil.
  const alt = meta.alt || (lang === "en" ? "/" : "/en");
  const self = meta.path || (lang === "en" ? "/en" : "/");
  const nav = header
    .replaceAll("{{alt}}", alt)
    .replace("{{headerClass}}", meta.header === "solid" ? " is-solid" : "")
    .replaceAll(`data-nav="${meta.nav}"`, 'aria-current="page"')
    .replace(/ data-nav="[^"]*"/g, "");
  const html =
    head.replaceAll("{{frPath}}", lang === "fr" ? self : alt).replaceAll("{{enPath}}", lang === "en" ? self : alt).replaceAll("{{self}}", self).replaceAll("{{alt}}", alt).replaceAll("{{title}}", esc(meta.title)).replaceAll("{{robots}}", meta.robots || "index, follow").replaceAll("{{description}}", esc(meta.description)) +
    nav +
    raw.slice(m[0].length) +
    footer.replaceAll("{{alt}}", alt);
  writeFileSync(join(out, file), html);
  console.log("✓ public/" + file);
}
