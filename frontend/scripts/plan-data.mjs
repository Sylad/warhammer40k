#!/usr/bin/env node
// L30 — données PUBLIQUES de la page « Plan de travail », tirées du plan raf
// (docs/plan/raf.yaml). Reprise d'ol-companion L23 (lui-même repris de
// finance-tracker L48), avec les leçons de ses revues : sous-tâches réduites à
// l'avancement n/m (aucun titre de sous-tâche publié), abandonnées hors du compte.
//
//   node scripts/plan-data.mjs [--in ../docs/plan/raf.yaml] [--news ../docs/nouveautes]
//        [--out public/plan-data/plan.json] [--check]
//   node scripts/plan-data.mjs --leaks dist/frontend/browser   (fin de npm run build)
//   node scripts/plan-data.mjs --hidden   (lots visibles masqués faute de titre public)
//
// --check n'écrit rien et sort en code 1 si le JSON versionné n'est plus à jour.
// --leaks sort en code 1 si un texte privé du plan (note, verdict UX, raison
// d'abandon, titre brut, titre de sous-tâche) se trouve dans un fichier construit.
//
// L'application est publique. Règles dures (liste d'autorisation) :
//   1. seuls les lots `visible: true`, non abandonnés, d'un état publié sortent ;
//   2. seuls id, titre PUBLIC, état, dates de début / fin et avancement
//      { done, total } sortent — jamais le titre brut du plan, les notes,
//      estimations, shas, verdicts UX, raisons, titres de sous-tâches. Titre
//      public = champ `public:` du lot, sinon titre de sa Nouveauté, sinon lot
//      masqué ; les lots de processus (revues UX) exigent un `public:` ;
//   3. un titre public est validé (longueur, ni chemin, ni fichier, ni
//      identifiant de lot, ni vocabulaire de sécurité) : non conforme = erreur ;
//   4. filet de sécurité : un lot dont le titre BRUT évoque la sécurité n'est
//      jamais publié, et une telle sous-tâche sort du décompte n/m.
// Le JSON ne porte aucune date de génération : il ne dépend que du plan, ce
// qui permet au test de vérifier qu'il est à jour. Le build Docker (contexte
// frontend/) n'a pas docs/ : le JSON est versionné, comme nouveautes-data/.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

/** États raf publiés ; tout autre état (dropped, inconnu) est écarté. */
export const PUBLISHED_STATUSES = ['doing', 'todo', 'done'];

// Comparaison sans casse ni accents (« Sécurité » = « securite »).
const DENY = [
  /securit/, /faille/, /spoof/, /injection/, /\btoken/, /\bjeton/, /secret/,
  /mot de passe/, /password/, /\bpin\b/, /\bcve\b/, /vulnerab/, /\bxss\b/,
  /\bcsrf\b/, /x-forwarded/, /forgeable/, /\bauth/, /bypass/,
];

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Vrai si le titre évoque un sujet de sécurité : le lot n'est alors jamais publié. */
export function isDenied(title) {
  const t = fold(String(title));
  return DENY.some((re) => re.test(t));
}

function day(v) {
  if (v == null || v === '') return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return undefined;
  return s.slice(0, 10);
}

/** Lots de processus (revues UX…) : jamais publiés sans `public:` explicite. */
const PROCESS = [/^revue\b/, /^audit\b/, /^campagne\b/];
export const isProcessLot = (lot) => PROCESS.some((re) => re.test(fold(String(lot?.title ?? '')).trim()));

export const PUBLIC_TITLE_MAX = 80;

/**
 * Titre montré au visiteur : ≤ 80 caractères, sans chemin, fichier, nom de
 * technique, identifiant de lot ni vocabulaire de sécurité. Non conforme →
 * erreur (on corrige le plan, on ne publie pas).
 */
export function checkPublicTitle(title, where) {
  if (typeof title !== 'string') {
    throw new Error(`titre public de ${where} non conforme (pas du texte : ${JSON.stringify(title) ?? String(title)})`);
  }
  const t = title.trim();
  const why =
    !t ? 'vide'
      : /[\r\n\u2028\u2029]/.test(t) ? 'retour à la ligne'
      : t.length > PUBLIC_TITLE_MAX ? `${t.length} caractères (> ${PUBLIC_TITLE_MAX})`
        : /\//.test(t) ? 'contient « / »'
          : /\.(ya?ml|json|ts|mjs|js|md|scss|sh)\b/i.test(t) ? 'cite un fichier'
            : /localstorage|sessionstorage/i.test(t) ? 'nom de technique'
              : /\bL\d+\b/.test(t) ? 'cite un identifiant de lot'
                : isDenied(t) ? 'liste noire sécurité'
                  : null;
  if (why) throw new Error(`titre public de ${where} non conforme (${why}) : « ${t} »`);
  return t;
}

/** Titre public d'un lot (non validé) : `public:`, sinon Nouveauté (hors processus), sinon null. */
function publicTitleOf(lot, newsTitles) {
  if (lot.public != null) return lot.public;
  if (isProcessLot(lot)) return null;
  return newsTitles.get(String(lot.id)) ?? null;
}

/**
 * Plan raf (objet YAML) → données publiques. Pur, sans E/S.
 * Sous-tâches : seul l'avancement { done, total } sort, abandonnées exclues.
 */
export function buildPlan(raf, { newsTitles = new Map() } = {}) {
  if (!raf || !Array.isArray(raf.lots)) throw new Error('plan raf invalide : pas de liste « lots »');
  const lots = [];
  for (const lot of raf.lots) {
    if (lot?.visible !== true) continue;
    if (!PUBLISHED_STATUSES.includes(lot.status)) continue;
    if (isDenied(lot.title ?? '')) continue;
    const id = String(lot.id);
    const title = publicTitleOf(lot, newsTitles);
    if (title == null) continue;
    const out = { id, title: checkPublicTitle(title, id), status: lot.status };
    const started = day(lot.started);
    const finished = lot.status === 'done' ? day(lot.finished) : undefined;
    if (started) out.started = started;
    if (finished) out.finished = finished;
    const tasks = (Array.isArray(lot.tasks) ? lot.tasks : []).filter(
      (t) => t && t.status !== 'dropped' && !isDenied(t.title ?? ''),
    );
    if (tasks.length > 0) {
      out.tasks = { done: tasks.filter((t) => t.status === 'done').length, total: tasks.length };
    }
    lots.push(out);
  }
  return { version: 1, project: String(raf.project ?? ''), lots };
}

/**
 * Lots visibles et non abandonnés qui ne sont PAS publiés, avec la raison —
 * pour que l'humain rédige leur `public:`.
 */
export function hiddenVisibleLots(raf, { newsTitles = new Map() } = {}) {
  const out = [];
  for (const lot of raf?.lots ?? []) {
    if (lot?.visible !== true || lot.status === 'dropped') continue;
    const base = { id: String(lot.id), status: String(lot.status) };
    if (!PUBLISHED_STATUSES.includes(lot.status)) out.push({ ...base, why: 'état non publié' });
    else if (isDenied(lot.title ?? '')) out.push({ ...base, why: 'liste noire sécurité' });
    else if (publicTitleOf(lot, newsTitles) == null) out.push({ ...base, why: 'sans titre public' });
  }
  return out;
}

/**
 * Entrées Nouveautés (`docs/nouveautes/*.md`, front-matter cadence) → titre de
 * l'entrée la plus récente de chaque lot. Dossier absent = carte vide.
 */
export function readNewsTitles(dir) {
  const m = new Map();
  let files = [];
  try { files = readdirSync(dir).filter((f) => f.endsWith('.md')); } catch { return m; }
  const entries = [];
  for (const f of files) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(join(dir, f), 'utf8'));
    if (!fm) continue;
    const meta = parse(fm[1]) ?? {};
    if (!meta.title || !Array.isArray(meta.lots)) continue;
    entries.push({ key: `${day(meta.date) ?? ''} ${f}`, title: String(meta.title), lots: meta.lots.map(String) });
  }
  entries.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
  for (const e of entries) for (const id of e.lots) if (!m.has(id)) m.set(id, e.title);
  return m;
}

/** Longueur minimale d'une note, d'un verdict ou d'une raison recherchés (en deçà, coïncidences). */
const MIN_PRIVATE = 12;
/**
 * Longueur minimale d'un TITRE (brut de lot, de sous-tâche, `public:` de sous-tâche)
 * recherché. Un titre court est une étiquette (« Plan de travail », « Revue UX — Galerie »)
 * que l'interface peut afficher légitimement et qui ne révèle rien : la chercher ferait
 * échouer le build sur un faux positif. Les notes, verdicts et raisons, eux, restent
 * cherchés dès MIN_PRIVATE : ce sont eux qui portent le privé.
 */
const MIN_TITLE = 20;

/**
 * Textes du plan qui ne doivent JAMAIS sortir : notes (lots et sous-tâches),
 * verdicts UX, raisons d'abandon (dès 12 caractères), titres bruts, titres et
 * `public:` des sous-tâches (dès 20 caractères) — sauf un titre identique à un
 * titre de lot publié ou contenu dans l'un d'eux (texte public par définition).
 */
export function privateTexts(raf, plan) {
  const published = (plan?.lots ?? []).map((l) => l.title);
  const out = new Set();
  const add = (v, min) => {
    if (v == null) return;
    const s = String(v).trim();
    if (s.length >= min && !published.some((p) => p.includes(s))) out.add(s);
  };
  const walk = (item, isTask) => {
    add(item?.title, MIN_TITLE);
    if (isTask) add(item?.public, MIN_TITLE);
    add(item?.reason, MIN_PRIVATE);
    add(item?.ux?.verdict, MIN_PRIVATE);
    for (const n of Array.isArray(item?.notes) ? item.notes : []) add(n?.text ?? n, MIN_PRIVATE);
    for (const t of Array.isArray(item?.tasks) ? item.tasks : []) walk(t, true);
  };
  for (const lot of raf?.lots ?? []) walk(lot, false);
  return [...out];
}

/**
 * Non-ASCII échappé comme dans un littéral JS : \uHHHH, ou \xHH pour les points de
 * code ≤ 0xFF quand `xhh` (forme écrite par esbuild : « pr\xE9pare »), hexadécimal
 * en minuscules ou majuscules.
 */
const escapeNonAscii = (s, upper, xhh) =>
  s.replace(/[^\x00-\x7f]/g, (c) => {
    const code = c.charCodeAt(0);
    const hex = (n) => { const h = code.toString(16).padStart(n, '0'); return upper ? h.toUpperCase() : h; };
    return xhh && code <= 0xff ? `\\x${hex(2)}` : `\\u${hex(4)}`;
  });

/**
 * Formes sous lesquelles un texte peut apparaître dans un fichier construit :
 * brut, échappé JSON, non-ASCII en \uXXXX ou \xHH (minuscules ou majuscules),
 * non-ASCII en entités HTML numériques (&#NNNN;). Les entités nommées (&eacute;)
 * ne sont pas cherchées : ni Angular ni esbuild n'en produisent.
 */
function forms(s) {
  const json = JSON.stringify(s).slice(1, -1);
  const html = s.replace(/[^\x00-\x7f]/g, (c) => `&#${c.codePointAt(0)};`);
  const escaped = [false, true].flatMap((upper) => [false, true].map((xhh) => escapeNonAscii(json, upper, xhh)));
  return [...new Set([s, json, ...escaped, html])];
}

/** Textes privés du plan présents dans `text`. */
export function findLeaks(raf, text, plan) {
  return privateTexts(raf, plan).filter((s) => forms(s).some((f) => text.includes(f)));
}

/** Parcourt un dossier construit ; retourne { file, text } pour chaque fuite. */
export function scanDir(raf, plan, dir) {
  const walk = (d) =>
    readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  const out = [];
  for (const file of walk(dir).sort()) {
    const text = readFileSync(file).toString('utf8');
    for (const t of findLeaks(raf, text, plan)) out.push({ file: relative(dir, file), text: t });
  }
  return out;
}

export const renderPlan = (plan) => JSON.stringify(plan, null, 2) + '\n';

export const readPlan = (path) => parse(readFileSync(path, 'utf8'));

function main(argv) {
  const arg = (name, def) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
  };
  const input = arg('--in', '../docs/plan/raf.yaml');
  const output = arg('--out', 'public/plan-data/plan.json');
  const newsDir = arg('--news', '../docs/nouveautes');
  if (argv.includes('--leaks')) {
    const dir = arg('--leaks', 'dist/frontend/browser');
    if (!existsSync(input)) {
      // Build Docker (contexte frontend/) : pas de plan brut à comparer ; la CI
      // « Contrôles frontend » et le build local font la vérification.
      console.log(`plan-data : ${input} absent, vérification des fuites sautée.`);
      return;
    }
    const leaks = scanDir(readPlan(input), JSON.parse(readFileSync(output, 'utf8')), dir);
    if (leaks.length > 0) {
      for (const l of leaks) console.error(`FUITE du plan dans ${dir}/${l.file} : « ${l.text.slice(0, 80)} »`);
      process.exit(1);
    }
    console.log(`plan-data : aucun texte privé du plan dans ${dir}/.`);
    return;
  }
  const raf = readPlan(input);
  const newsTitles = readNewsTitles(newsDir);
  if (argv.includes('--hidden')) {
    for (const h of hiddenVisibleLots(raf, { newsTitles })) console.log(`${h.id}\t${h.status}\t${h.why}`);
    return;
  }
  const json = renderPlan(buildPlan(raf, { newsTitles }));
  if (argv.includes('--check')) {
    let current = '';
    try { current = readFileSync(output, 'utf8'); } catch { /* absent = pas à jour */ }
    if (current !== json) {
      console.error(`${output} n'est pas à jour avec ${input} : lancer « cd frontend && npm run plan », puis commiter le JSON.`);
      process.exit(1);
    }
    console.log(`${output} à jour.`);
    return;
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, json);
  const n = JSON.parse(json).lots.length;
  console.log(`${output} : ${n} lot(s) publié(s).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
