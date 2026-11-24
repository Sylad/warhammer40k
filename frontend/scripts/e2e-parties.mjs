// L256 — les e2e en plusieurs parties, chacune sur son runner (job matriciel de frontend-checks.yml).
// `vitest --shard` découpe par empreinte du chemin, sans tenir compte des durées : 574 s contre 350 s
// sur la mesure du 24-11, et l'équilibre change à chaque fichier ajouté. Ici, le plus long d'abord
// (LPT) sur les durées mesurées de e2e-durees.json ; un fichier absent de la table compte pour
// DUREE_INCONNUE (à ajouter à la table à la mesure suivante, artefacts e2e-junit-<partie> de la CI).
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const DUREE_INCONNUE = 30;

/** Table { chemin relatif au dossier frontend : secondes }. */
export function dureesMesurees(fichier = new URL('./e2e-durees.json', import.meta.url)) {
  return JSON.parse(readFileSync(fichier, 'utf8')).secondes;
}

/**
 * Répartit `fichiers` (chemins absolus) en `total` parties de durées voisines. Déterministe : même
 * entrée, même partage, quel que soit l'ordre des fichiers. `racine` = dossier des chemins de la table.
 */
export function partager(fichiers, total, durees, racine) {
  const poids = (f) => durees[path.relative(racine, f).split(path.sep).join('/')] ?? DUREE_INCONNUE;
  const tries = [...new Set(fichiers)].sort((a, b) => poids(b) - poids(a) || (a < b ? -1 : 1));
  const parties = Array.from({ length: total }, () => ({ fichiers: [], secondes: 0 }));
  for (const f of tries) {
    const cible = parties.reduce((m, p) => (p.secondes < m.secondes ? p : m));
    cible.fichiers.push(f);
    cible.secondes += poids(f);
  }
  return parties;
}

/** « 1/2 » → { partie: 1, total: 2 } ; vide → null (tous les fichiers, ex. npm run test:e2e en local). */
export function lirePartie(valeur) {
  if (!valeur) return null;
  const m = /^(\d+)\/(\d+)$/.exec(valeur);
  if (!m || +m[1] < 1 || +m[1] > +m[2]) throw new Error(`E2E_PARTIE invalide : « ${valeur} » (attendu k/n, 1 ≤ k ≤ n)`);
  return { partie: +m[1], total: +m[2] };
}
