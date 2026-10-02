#!/usr/bin/env node
// L39 — inventaire STATIQUE de tous les liens du site et vérification des liens internes
// (routes, identifiants des données, ancres, fichiers, fiches techniques). Sans réseau.
//
//   cd frontend && npm run liens               # résumé + liens internes cassés (code 1 s'il y en a)
//   cd frontend && npm run liens -- --json f   # inventaire complet en JSON
//
// Compléments à la demande : `npm run liens:crawl` (application en marche) et
// `npm run liens:externes` (liens externes, avec ménagement). Le test de garde
// `scripts/liens.test.mjs` rejoue la vérification interne à chaque `npm test` (CI comprise).
import { writeFileSync } from 'node:fs';
import { CLASSES, checkInternal, inventory, unlinkedData } from './liens-lib.mjs';

const inv = inventory();
const broken = checkInternal(inv);
const count = {};
for (const l of inv) {
  const k = l.kind ? `${l.cls}/${l.kind}` : l.cls;
  count[k] = (count[k] ?? 0) + 1;
}
console.log('Inventaire des liens (occurrences) :');
for (const [k, n] of Object.entries(count)) console.log(`  ${(CLASSES[k.split('/')[0]] + (k.includes('/') ? ` (${k.split('/')[1]})` : '')).padEnd(42)} ${n}`);
const unique = new Set(inv.filter((l) => !l.dynamic).map((l) => `${l.cls}|${l.target}`));
console.log(`  ${'cibles distinctes'.padEnd(42)} ${unique.size}`);
const unlinked = unlinkedData(inv);
if (unlinked.length) {
  console.log(`\nAffichés en texte (fiche jamais écrite) : ${unlinked.length}`);
  for (const l of unlinked) console.log(`  ${l.target} ← ${l.source}`);
}
console.log(`\nLiens internes cassés : ${broken.length}`);
for (const b of broken) console.log(`  ${b.target}  ← ${b.source}\n      ${b.cause}`);
const i = process.argv.indexOf('--json');
if (i > 0) {
  writeFileSync(process.argv[i + 1], JSON.stringify({ count, broken, links: inv.map(({ file, ref, ...l }) => l) }, null, 1));
  console.log(`→ ${process.argv[i + 1]}`);
}
process.exit(broken.length ? 1 : 0);
