#!/usr/bin/env node
// L44 — veille du contenu : une seule source de vérité pour la date de revue.
//
//   public/veille-data/veille.json : `revueLe` (date de la dernière revue, la SEULE écrite à la main),
//     `rythmeJours` (prochaine revue au plus tard revueLe + rythmeJours), `actualites` (actualités de
//     l'univers, chacune avec sa source https et sa date de consultation).
//   public/jeux-data/jeux.json : chaque jeu porte `source` (https) et `consulteLe` ; `verifieLe` est
//     RECOPIÉ de revueLe par ce script (la page Jeux vidéo l'affiche), jamais écrit à la main.
//
//   node scripts/veille-data.mjs           recopie revueLe dans jeux.json, puis contrôle
//   node scripts/veille-data.mjs --check   contrôle seulement (code 1 si un fait est sans source datée)
//
// Méthode et rythme : docs/veille/README.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
export const VEILLE_JSON = resolve(ICI, '../public/veille-data/veille.json');
export const JEUX_JSON = resolve(ICI, '../public/jeux-data/jeux.json');

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Date d'un événement à la précision connue : année, mois ou jour. */
const DATE_PRECISION = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/** « 2026-11-22 » valide (jour existant) ? */
export function isoValide(s) {
  const m = typeof s === 'string' ? ISO.exec(s) : null;
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function httpsValide(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !!u.hostname && u.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Un fait = { source, consulteLe } : source https, consultée à une date valide, pas après la revue. */
function controlerSource(nom, f, revueLe, erreurs, { leJourDeLaRevue = false } = {}) {
  if (!httpsValide(f.source)) erreurs.push(`${nom} : source absente ou pas en https (${JSON.stringify(f.source)})`);
  if (!isoValide(f.consulteLe)) erreurs.push(`${nom} : date de consultation absente ou invalide (${JSON.stringify(f.consulteLe)})`);
  else if (f.consulteLe > revueLe) erreurs.push(`${nom} : consultée le ${f.consulteLe}, après la revue du ${revueLe}`);
  else if (leJourDeLaRevue && f.consulteLe !== revueLe) {
    erreurs.push(`${nom} : consultée le ${f.consulteLe}, mais la page dit « vérifiées le ${revueLe} »`);
  }
}

/** Contrôle des deux fichiers ; renvoie la liste des écarts (vide = conforme). */
export function controlerVeille(veille, jeux) {
  const erreurs = [];
  const revueLe = veille?.revueLe;
  if (!isoValide(revueLe)) {
    erreurs.push(`veille.json : revueLe absente ou invalide (${JSON.stringify(revueLe)})`);
    return erreurs;
  }
  if (!Number.isInteger(veille.rythmeJours) || veille.rythmeJours < 1 || veille.rythmeJours > 92) {
    erreurs.push(`veille.json : rythmeJours doit être un nombre de jours entre 1 et 92 (${JSON.stringify(veille.rythmeJours)})`);
  }
  const ids = new Set();
  for (const [i, a] of (Array.isArray(veille.actualites) ? veille.actualites : []).entries()) {
    const nom = `actualité ${a?.id ?? `#${i}`}`;
    if (!a?.id || ids.has(a.id)) erreurs.push(`${nom} : identifiant absent ou en double`);
    ids.add(a?.id);
    if (!a?.titre?.trim() || !a?.resume?.trim()) erreurs.push(`${nom} : titre ou résumé vide`);
    if (!DATE_PRECISION.test(a?.date ?? '') || a.date > revueLe) erreurs.push(`${nom} : date d'événement invalide ou après la revue (${JSON.stringify(a?.date)})`);
    controlerSource(nom, a ?? {}, revueLe, erreurs);
  }
  if (!Array.isArray(veille.actualites)) erreurs.push('veille.json : actualites doit être une liste');

  if (jeux) {
    if (jeux.verifieLe !== revueLe) {
      erreurs.push(`jeux.json : verifieLe (${jeux.verifieLe}) ≠ revueLe de veille.json (${revueLe}) — lancer npm run veille`);
    }
    for (const j of [...(jeux.aVenir ?? []), ...(jeux.existants ?? [])]) {
      controlerSource(`jeu ${j?.id}`, j ?? {}, revueLe, erreurs, { leJourDeLaRevue: true });
    }
  }
  return erreurs;
}

/** Recopie revueLe dans jeux.json (seule écriture de ce script) ; renvoie true si le fichier a changé. */
export function synchroniser(veillePath = VEILLE_JSON, jeuxPath = JEUX_JSON) {
  const veille = JSON.parse(readFileSync(veillePath, 'utf8'));
  const jeux = JSON.parse(readFileSync(jeuxPath, 'utf8'));
  if (jeux.verifieLe === veille.revueLe) return false;
  writeFileSync(jeuxPath, `${JSON.stringify({ ...jeux, verifieLe: veille.revueLe }, null, 2)}\n`);
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  if (!check && synchroniser()) console.log(`jeux.json : verifieLe recopié de veille.json`);
  const erreurs = controlerVeille(JSON.parse(readFileSync(VEILLE_JSON, 'utf8')), JSON.parse(readFileSync(JEUX_JSON, 'utf8')));
  for (const e of erreurs) console.error(`✗ ${e}`);
  if (erreurs.length) process.exit(1);
  console.log('veille : chaque fait a sa source https datée');
}
