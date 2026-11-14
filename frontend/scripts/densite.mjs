#!/usr/bin/env node
// L40 — mesure de la densité de chaque gabarit dans l'application EN MARCHE, à 1440×900 et 390×844 :
// hauteur en écrans, liens et boutons par écran, titres et niveaux sautés, sommaire de page, blocs
// de texte (lignes affichées, caractères par ligne), plus longue liste, textes répétés ; puis écarts
// aux règles D1 à D6 (scripts/densite-lib.mjs, docs/densite/regles.md).
//
//   cd frontend && npm run densite -- [--base http://localhost:4201] [--out <fichier.json>] [--page /factions/space-marines]
//
// Prérequis : backend sur :3001 et `npm run dev:frontend` (:4201), ou l'application construite servie.
// Rien ne sort vers Internet : requêtes externes coupées, `/api/wiki-image` répond « pas d'image »
// (les hauteurs des cartes ne dépendent pas de l'image).
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { LARGEURS, PAGES, ecarts, mesurer, tableau } from './densite-lib.mjs';

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : def;
};
const BASE = arg('--base', 'http://localhost:4201');
const OUT = arg('--out', null);
const SEULE = arg('--page', null);
const origin = new URL(BASE).origin;

const browser = await chromium.launch();
const resultats = [];
// --page : une page de la liste (par son gabarit ou son adresse), ou n'importe quelle adresse.
const pages = SEULE ? (PAGES.filter(([g, p]) => p === SEULE || g === SEULE).length ? PAGES.filter(([g, p]) => p === SEULE || g === SEULE) : [[SEULE, SEULE]]) : PAGES;
for (const [gabarit, path] of pages) {
  const r = { gabarit, page: path, mesures: {} };
  for (const { nom, w, h } of LARGEURS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.route('**/*', (route) => {
      const u = route.request().url();
      if (!u.startsWith(origin) && !u.startsWith('http://localhost:3001')) return route.abort();
      if (u.includes('/api/wiki-image')) return route.fulfill({ json: { imageUrl: null, pageTitle: null, pageUrl: null } });
      return route.continue();
    });
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
      await page.locator('main h1').first().waitFor({ timeout: 10000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      r.mesures[nom] = await page.evaluate(mesurer);
    } catch (e) {
      r.erreur = e.message.slice(0, 120);
    } finally {
      await ctx.close();
    }
  }
  resultats.push(r);
  const ec = Object.entries(r.mesures).flatMap(([n, m]) => ecarts(m, n).map((e) => `${e.regle}@${n}`));
  process.stderr.write(`${path.padEnd(32)} ${r.mesures['bureau']?.ecrans ?? '?'} / ${r.mesures['téléphone']?.ecrans ?? '?'} écrans  ${ec.join(' ')}\n`);
}
await browser.close();
if (OUT) writeFileSync(OUT, JSON.stringify({ base: BASE, date: new Date().toISOString(), resultats }, null, 1));
console.log(tableau(resultats));
