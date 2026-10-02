// L39 — bibliothèque de l'audit des liens : inventaire STATIQUE de toutes les cibles de liens du site
// (gabarits Angular, code des composants, données d'amorçage) et vérification des liens internes
// contre la réalité (routes, identifiants des données, ancres, fichiers). Aucun réseau, aucun serveur.
//
// Utilisée par `scripts/liens.mjs` (rapport à la demande), `scripts/liens-crawl.mjs` (parcours de
// l'application en marche) et le test de garde `scripts/liens.test.mjs` (Vitest, CI).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = resolve(FRONTEND, '..');
export const APP = join(FRONTEND, 'src/app');
export const SEED = join(ROOT, 'backend/seed');
export const PUBLIC = join(FRONTEND, 'public');
export const DATASHEETS = join(ROOT, 'backend/public/datasheets');

/** Classes de l'inventaire. */
export const CLASSES = {
  route: 'route interne',
  anchor: 'ancre interne',
  asset: 'fichier interne',
  api: 'ressource servie par l’API',
  external: 'URL externe',
};

// ---------------------------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------------------------

/**
 * Routes de l'application, lues dans `app.routes.ts` (toutes enfants de la mise en page) :
 * `{ path: '/x/:id', redirect, component }` — `component` = fichier du composant chargé.
 */
export function readRoutes(file = join(APP, 'app.routes.ts')) {
  const src = readFileSync(file, 'utf8');
  const out = [];
  const re = /\{\s*path:\s*'([^']*)'([^{}]*?(?:\{[^{}]*\}[^{}]*?)*)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const [, path, body] = m;
    if (path === '' && /component:\s*MainLayoutComponent/.test(body)) continue;
    const redirect = /redirectTo:\s*'([^']*)'/.exec(body)?.[1] ?? (/redirectTo:/.test(body) ? '(fonction)' : null);
    const imp = /import\('\.\/([^']+)'\)/.exec(body)?.[1];
    out.push({ path: '/' + path, redirect, component: imp ? join(APP, imp + '.ts') : null });
  }
  return out;
}

/** Route (hors « ** ») qui sert ce chemin, ou null. */
export function matchRoute(routes, path) {
  const segs = path.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.path === '/**') continue;
    const rs = r.path.split('/').filter(Boolean);
    if (rs.length !== segs.length) continue;
    if (rs.every((s, i) => s.startsWith(':') || s === segs[i])) return r;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------------------------

export function loadSeed(dir = SEED) {
  const data = {};
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    data[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  }
  return data;
}

const ids = (list) => new Set((Array.isArray(list) ? list : []).map((x) => x.id));

/**
 * Identifiants valides par route paramétrée : ce que le backend sait servir (une fiche dont
 * l'identifiant n'est pas dans ces données affiche une page vide ou en erreur).
 */
export function routeIds(data) {
  return {
    '/factions/:id': ids(data.factions),
    '/units/:id': ids(data.units),
    '/subfactions/:id': ids(data.subfactions),
    '/lore/primarchs/:id': ids(data.primarchs),
    '/lore/ships/:id': ids(data['legendary-ships']),
    '/lore/titans/:id': ids(data['god-machines']),
    '/lore/saints/:id': ids(data['living-saints']),
    '/lore/timeline/:id': ids(data['timeline-events']),
    '/lore/equipment/:id': ids(data.equipment),
  };
}

/**
 * Ancres construites à partir des données (`[id]="x.id"` dans le gabarit de la page) : page →
 * { ids, binding } ; `binding` = expression qui DOIT figurer dans le gabarit (garde-fou : si la
 * page cesse de poser ces ancres, les liens vers elles deviennent morts).
 */
export function dataAnchors(data, news) {
  return {
    '/lore/concepts': { ids: ids(data['lore-concepts']), binding: '[id]="c.id"' },
    '/lore/chaos-gods': { ids: ids(data['chaos-gods']), binding: '[id]="god.id"' },
    '/nouveautes': { ids: new Set((news?.entries ?? []).map((e) => e.slug)), binding: 'news-anchor' },
  };
}

/**
 * Références entre données que l'interface rend en LIEN — chaque entrée : fichier d'amorçage,
 * chemin du champ, gabarit de destination. Tenue à la main : un nouveau lien construit depuis
 * les données s'ajoute ici (le test de garde vérifie que chaque gabarit dynamique y est couvert).
 */
export const DATA_LINKS = [
  { seed: 'factions', field: 'notableHeroes[].unitId', to: '/units/:id', where: 'faction-detail' },
  { seed: 'factions', field: 'notableHeroes[].primarchId', to: '/lore/primarchs/:id', where: 'faction-detail' },
  { seed: 'primarchs', field: 'legionId', to: '/factions/:id', where: 'primarch-detail' },
  { seed: 'primarchs', field: 'relatedPrimarchIds[]', to: '/lore/primarchs/:id', where: 'primarch-detail' },
  { seed: 'subfactions', field: 'factionId', to: '/factions/:id', where: 'subfaction-detail' },
  { seed: 'subfactions', field: 'primarchId', to: '/lore/primarchs/:id', where: 'subfaction-detail' },
  { seed: 'subfactions', field: 'parentSubFactionId', to: '/subfactions/:id', where: 'subfaction-detail' },
  { seed: 'subfactions', field: 'unitIds[]', to: '/units/:id', where: 'subfaction-detail' },
  { seed: 'units', field: 'factionId', to: '/factions/:id', where: 'unit-detail' },
  { seed: 'units', field: 'relatedUnitIds[]', to: '/units/:id', where: 'unit-detail' },
  // Trois Chevaliers impériaux → « imperial-knights » : fiche jamais écrite ; la page n'affiche le
  // lien que si la faction existe (sinon le nom en texte). Le garde-fou doit rester dans le gabarit.
  {
    seed: 'god-machines', field: 'factionId', to: '/factions/:id', where: 'titan-detail',
    guard: { file: 'features/titan-detail/titan-detail.component.ts', marker: 'factionIds().has(m.factionId)' },
  },
  { seed: 'legendary-ships', field: 'factionId', to: '/factions/:id', where: 'ship-detail' },
  { seed: 'legendary-ships', field: 'relatedPrimarchId', to: '/lore/primarchs/:id', where: 'ship-detail' },
  { seed: 'equipment', field: 'factionIds[]', to: '/factions/:id', where: 'lore-equipment, equipment-detail' },
  { seed: 'chaos-gods', field: 'primarchsCorrupted[].primarchId', to: '/lore/primarchs/:id', where: 'lore-chaos-gods' },
  { seed: 'lore-concepts', field: 'relatedConcepts[].conceptId', to: '/lore/concepts#:id', where: 'lore-concepts' },
];

/** Valeurs d'un champ « a[].b » / « a[] » / « a » d'un enregistrement. */
export function fieldValues(rec, field) {
  let cur = [rec];
  for (const part of field.split('.')) {
    const arr = part.endsWith('[]');
    const key = arr ? part.slice(0, -2) : part;
    const next = [];
    for (const c of cur) {
      const v = c?.[key];
      if (v == null || v === '') continue;
      if (arr) next.push(...(Array.isArray(v) ? v : []));
      else next.push(v);
    }
    cur = next;
  }
  return cur.filter((v) => v != null && v !== '');
}

// ---------------------------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Fichiers sources de l'application (ni tests ni specs). */
export function sourceFiles(dir = APP) {
  return walk(dir).filter((f) => /\.(ts|html)$/.test(f) && !/\.spec\.ts$|\.test\./.test(f));
}

const lineOf = (src, index) => src.slice(0, index).split('\n').length;
const rel = (f) => relative(ROOT, f);

/** Balises ouvrantes d'un fichier : `{ tag, attrs, index }`. */
function tags(src) {
  const out = [];
  const re = /<([a-z][\w-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m;
  while ((m = re.exec(src))) out.push({ tag: m[1], attrs: m[2], index: m.index });
  return out;
}

const attr = (attrs, name) => {
  const esc = name.replace(/[[\]().]/g, (c) => '\\' + c);
  const m = new RegExp(`(?:^|\\s)${esc}\\s*=\\s*"([^"]*)"`).exec(attrs);
  return m ? m[1] : null;
};

/** Premier segment littéral d'un tableau de commandes de routeur : « ['/x', a.id] » → { base, params }. */
function parseCommands(expr) {
  const m = /^\s*\[\s*'([^']*)'\s*(?:,\s*([^\]]+))?\]\s*$/.exec(expr);
  if (!m) return null;
  const params = m[2] ? m[2].split(',').map((s) => s.trim()).filter(Boolean) : [];
  return { base: m[1], params };
}

/**
 * Chemin d'un tableau de commandes : segments littéraux (« 'orks' ») substitués — vérifiés contre
 * les données comme un lien écrit en dur —, segments calculés remplacés par « :param ».
 */
function commandsPath(c) {
  const segs = c.params.map((p) => /^'([^']*)'$/.exec(p)?.[1] ?? ':param');
  const dyn = c.params.filter((p) => !/^'[^']*'$/.test(p));
  return { path: c.base + segs.map((x) => '/' + x).join(''), dynamic: dyn.length ? dyn.join(', ') : null };
}

/**
 * Liens trouvés dans le code de l'application. Chaque lien : { cls, target, source, ... }.
 * - route : `target` = chemin (gabarit « /x/:param » si construit depuis une donnée).
 * - anchor : `target` = « chemin#ancre » (« ~#ancre » = même page que le composant).
 * - asset / external : URL telle qu'écrite.
 */
export function codeLinks(files = sourceFiles()) {
  const out = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const source = (i) => `${rel(file)}:${lineOf(src, i)}`;
    const push = (l) => out.push({ file, ...l });

    for (const t of tags(src)) {
      const a = t.attrs;
      const lit = attr(a, 'routerLink');
      const bound = attr(a, '[routerLink]');
      const frag = attr(a, 'fragment');
      const fragB = attr(a, '[fragment]');
      const href = attr(a, 'href');
      const hrefB = attr(a, '[href]') ?? attr(a, '[attr.href]');
      const click = attr(a, '(click)');
      let path = null;
      let dynamic = null;
      if (lit != null) path = lit;
      else if (bound != null) {
        const quoted = /^\s*'([^']*)'\s*$/.exec(bound);
        const cmds = parseCommands(bound);
        if (quoted) path = quoted[1];
        else if (cmds && cmds.base === '' && cmds.params.length === 0) path = '~';
        else if (/^\s*\[\s*\]\s*$/.test(bound)) path = '~';
        else if (cmds) ({ path, dynamic } = commandsPath(cmds));
        else dynamic = bound.trim();
      }
      if (path != null || dynamic != null) {
        const p = path ?? '?';
        const routeExpr = path == null ? dynamic : null;
        if (frag) push({ cls: 'anchor', target: `${p}#${frag}`, source: source(t.index), tag: t.tag, routeExpr });
        else if (fragB) push({ cls: 'anchor', target: `${p}#{${fragB.trim()}}`, source: source(t.index), tag: t.tag, dynamic: fragB.trim(), routeExpr });
        push({ cls: 'route', target: p, source: source(t.index), tag: t.tag, dynamic });
        continue;
      }
      const h = href ?? (hrefB != null ? (/^\s*'([^']*)'\s*$/.exec(hrefB)?.[1] ?? `{${hrefB.trim()}}`) : null);
      if (h == null || t.tag !== 'a') continue;
      if (/^https?:\/\//.test(h)) push({ cls: 'external', target: h, source: source(t.index) });
      else if (/^\{(?!'#')/.test(h) || h.startsWith('${')) {
        // Adresse tirée d'une donnée (source d'un événement, URL d'une vidéo, galerie…) : relevée
        // à part, depuis les données (seedExternals) ; ici on note seulement l'emplacement.
        push({ cls: 'external', target: h, source: source(t.index), dynamic: h });
      }
      else if (/^#|^\{'#' \+/.test(h)) {
        // Ancre « nue » : avec <base href="/">, le navigateur la résout en « /#x » (accueil)
        // sauf si un gestionnaire (click) l'intercepte.
        push({ cls: 'anchor', target: `~${h.startsWith('#') ? h : '#' + h}`, source: source(t.index), bare: true, click: click ?? null });
      } else if (h.startsWith('/')) push({ cls: /\.[a-z0-9]{2,5}$/i.test(h) ? 'asset' : 'route', target: h, source: source(t.index) });
      else push({ cls: 'route', target: h, source: source(t.index), dynamic: h });
    }

    // Code TypeScript : objets de navigation, commandes du routeur, chaînes d'URL.
    for (const m of src.matchAll(/\b(?:route|link):\s*'(\/[^']*)'/g)) push({ cls: 'route', target: m[1], source: source(m.index) });
    for (const m of src.matchAll(/routerLink:\s*(\[[^\]]*\])/g)) {
      const c = parseCommands(m[1]);
      if (c) {
        const { path, dynamic } = commandsPath(c);
        push({ cls: 'route', target: path, source: source(m.index), dynamic });
      }
    }
    // router.navigate([...]) : un élément (chaîne, gabarit `…${x}`, variable) ou plusieurs.
    for (const m of src.matchAll(/\.navigate\(\s*(\[[^\]]*\])(?:\s*,\s*\{\s*fragment:\s*([^}]+?)\s*\})?/g)) {
      const arr = m[1];
      const tpl = /^\[\s*`([^`]*)`\s*\]$/.exec(arr)?.[1];
      const c = parseCommands(arr);
      let target;
      let dynamic = null;
      if (tpl != null) {
        target = tpl.replace(/\$\{[^}]+\}/g, ':param');
        dynamic = tpl.includes('${') ? tpl : null;
      } else if (c) ({ path: target, dynamic } = commandsPath(c));
      else {
        target = '?';
        dynamic = arr.replace(/^\[\s*|\s*\]$/g, '');
      }
      push({ cls: 'route', target, source: source(m.index), dynamic });
      if (m[2]) push({ cls: 'anchor', target: `${target}#{${m[2]}}`, source: source(m.index), dynamic: m[2], routeExpr: target === '?' ? dynamic : null });
    }
    for (const m of src.matchAll(/\bfragment:\s*'([^']+)'/g)) push({ cls: 'anchor', target: `~#${m[1]}`, source: source(m.index) });
    for (const m of src.matchAll(/'(https?:\/\/[^'\s$]+)'/g)) {
      if (/localhost|127\.0\.0\.1/.test(m[1])) continue;
      if (/href=|\[href\]/.test(src.slice(Math.max(0, m.index - 10), m.index))) continue; // déjà relevé dans le gabarit
      push({ cls: 'external', target: m[1], source: source(m.index) });
    }
    for (const m of src.matchAll(/'(\/[\w./-]+\.(?:jpe?g|png|webp|svg|gif|json))'/g)) push({ cls: 'asset', target: m[1], source: source(m.index) });
  }
  // Doublons exacts (même cible, même ligne) : une balise relevée par deux motifs.
  const seen = new Set();
  return out.filter((l) => {
    const k = `${l.cls}|${l.target}|${l.source}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Liens construits depuis les données d'amorçage (DATA_LINKS) : une entrée par valeur. */
export function dataLinks(data) {
  const out = [];
  for (const d of DATA_LINKS) {
    const list = data[d.seed];
    if (!Array.isArray(list)) continue;
    for (const rec of list) {
      for (const v of fieldValues(rec, d.field)) {
        const target = d.to.replace(':id', v);
        out.push({ cls: d.to.includes('#') ? 'anchor' : 'route', target, source: `backend/seed/${d.seed}.json#${rec.id}.${d.field}`, ref: d });
      }
    }
  }
  return out;
}

/** Zones cliquables de la carte galactique (données embarquées dans le composant). */
export function galaxyLinks(
  file = join(APP, 'features/lore-galaxy/lore-galaxy.component.ts'),
  utils = join(APP, 'features/lore-galaxy/lore-galaxy.utils.ts'),
) {
  const src = readFileSync(file, 'utf8');
  const out = [];
  const paths = linkToPaths(utils);
  for (const m of src.matchAll(/linkTo:\s*\{\s*type:\s*'(\w+)',\s*id:\s*'([^']+)'\s*\}/g)) {
    const prefix = paths[m[1]];
    const source = `${rel(file)}:${lineOf(src, m.index)}`;
    // Type sans chemin dans linkToPath : lien vers « ? », signalé comme cassé.
    out.push({ cls: 'route', target: prefix ? prefix + m[2] : `?type-inconnu-${m[1]}`, source, ...(prefix ? {} : { dynamic: `type « ${m[1]} » absent de linkToPath` }) });
  }
  for (const m of src.matchAll(/conceptId:\s*'([^']+)'/g)) {
    out.push({ cls: 'anchor', target: `/lore/concepts#${m[1]}`, source: `${rel(file)}:${lineOf(src, m.index)}` });
  }
  return out;
}

/** Chemins de linkToPath (lore-galaxy.utils.ts) : « case 'x': return `/chemin/${link.id}` ». */
export function linkToPaths(utils = join(APP, 'features/lore-galaxy/lore-galaxy.utils.ts')) {
  const src = readFileSync(utils, 'utf8');
  const body = /function linkToPath\([^)]*\)[^{]*\{([\s\S]*?)\n\}/.exec(src)?.[1] ?? '';
  const out = {};
  for (const m of body.matchAll(/case\s+'(\w+)':\s*return\s*`([^`$]*)\$\{link\.id\}`/g)) out[m[1]] = m[2];
  return out;
}

/** Liens du HTML des Nouveautés (rendu par [innerHTML] sur /nouveautes, donc lus sur le JSON construit). */
export function newsLinks(news = readNews()) {
  const out = [];
  for (const e of news?.entries ?? []) {
    for (const m of (e.html ?? '').matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)) {
      const h = m[1].replace(/&amp;/g, '&');
      const source = `frontend/public/nouveautes-data/nouveautes.json#${e.slug}`;
      if (/^https?:\/\//.test(h)) out.push({ cls: 'external', target: h, source });
      else if (h.startsWith('#')) out.push({ cls: 'anchor', target: `/nouveautes${h}`, source, bare: true, click: null });
      else if (h.startsWith('/')) {
        const [p, frag] = h.split('#');
        if (/\.[a-z0-9]{2,5}$/i.test(p)) out.push({ cls: 'asset', target: p, source });
        else {
          out.push({ cls: 'route', target: p.split('?')[0], source });
          if (frag) out.push({ cls: 'anchor', target: `${p.split('?')[0]}#${frag}`, source });
        }
      } else out.push({ cls: 'route', target: h, source, dynamic: `adresse relative « ${h} »` });
    }
  }
  return out;
}

/** URL externes des données d'amorçage (toute chaîne http(s) d'un enregistrement). */
export function seedExternals(data) {
  const out = [];
  const visit = (v, src) => {
    if (typeof v === 'string') {
      if (/^https?:\/\//.test(v)) out.push({ cls: 'external', target: v, source: src });
    } else if (Array.isArray(v)) v.forEach((x) => visit(x, src));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, src.includes('.') ? src : `${src}.${k}`);
  };
  for (const [name, list] of Object.entries(data)) {
    const arr = Array.isArray(list) ? list : [list];
    arr.forEach((rec, i) => {
      for (const [k, v] of Object.entries(rec ?? {})) visit(v, `backend/seed/${name}.json#${rec?.id ?? i}.${k}`);
    });
  }
  return out;
}

/** Ressources servies par l'API : fiches techniques des unités, requêtes d'image du wiki. */
export function apiAssets(data) {
  const out = [];
  for (const u of data.units ?? []) {
    out.push({ cls: 'api', kind: 'datasheet', target: `/api/images/datasheets/${u.id}`, file: `backend/public/datasheets/${u.id}.jpg`, source: `backend/seed/units.json#${u.id}` });
  }
  const queries = new Map();
  const visit = (v, key, src) => {
    if (typeof v === 'string' && /^(wikiQuery|primarchWikiQuery|loreImageQuery|image|thumbnail)$/.test(key) && !/^https?:|\.(jpe?g|png|webp)$/i.test(v)) {
      if (!queries.has(v)) queries.set(v, src);
    } else if (Array.isArray(v)) v.forEach((x) => (typeof x === 'string' && /Queries$/.test(key) ? visit(x, 'wikiQuery', src) : visit(x, key, src)));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, k, src);
  };
  for (const [name, list] of Object.entries(data)) {
    (Array.isArray(list) ? list : [list]).forEach((rec, i) => visit(rec, '', `backend/seed/${name}.json#${rec?.id ?? i}`));
  }
  for (const [q, src] of queries) out.push({ cls: 'api', kind: 'wiki-image', target: `/api/wiki-image?q=${encodeURIComponent(q)}`, query: q, source: src });
  return out;
}

/** Inventaire complet. */
export function inventory({ data = loadSeed(), files = sourceFiles() } = {}) {
  return [...codeLinks(files), ...dataLinks(data), ...galaxyLinks(), ...newsLinks(), ...seedExternals(data), ...apiAssets(data)];
}

// ---------------------------------------------------------------------------------------------
// Vérification des liens internes
// ---------------------------------------------------------------------------------------------

/** Contenu des gabarits d'un composant (code + .html éventuel). */
function componentText(file) {
  if (!file || !existsSync(file)) return '';
  let src = readFileSync(file, 'utf8');
  const tu = /templateUrl:\s*'([^']+)'/.exec(src)?.[1];
  if (tu) src += readFileSync(join(dirname(file), tu), 'utf8');
  return src;
}

/** Composant qui contient ce fichier source (le .ts du même dossier pour un .html). */
function ownerComponent(file) {
  if (file.endsWith('.html')) return file.replace(/\.html$/, '.ts');
  return file;
}

function literalIds(text) {
  return new Set([...text.matchAll(/\sid="([^"{}]+)"/g)].map((m) => m[1]));
}

/** Chemin réel d'un fichier en respectant la casse (la prod est sous Linux). */
export function existsCaseSensitive(base, relPath) {
  let dir = base;
  for (const part of relPath.split('/').filter(Boolean)) {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return false;
    if (!readdirSync(dir).includes(part)) return false;
    dir = join(dir, part);
  }
  return existsSync(dir);
}

/**
 * Liens dont la destination est une variable : chacun est vérifié AILLEURS, et dit où. Un nouveau
 * lien calculé fait échouer le test de garde tant qu'il n'est pas déclaré ici.
 */
export const COVERED = {
  'frontend/src/app/features/lore-galaxy/lore-galaxy.component.ts|path': 'linkToPath(hz.linkTo) : zones vérifiées par galaxyLinks, chemins lus dans linkToPath',
  'frontend/src/app/features/dashboard/dashboard.component.ts|s.route': 'littéraux « route: » du même fichier',
  'frontend/src/app/features/lore-hub/lore-hub.component.ts|c.route': 'littéraux « route: » du même fichier',
  'frontend/src/app/features/faction-detail/faction-detail.component.ts|l.route': 'littéraux « route: » de toQuickLink',
  'frontend/src/app/features/faction-detail/faction-detail.component.ts|r.route': 'littéraux « route: » de toResourceLink',
  'frontend/src/app/shared/components/breadcrumb/breadcrumb.component.ts|c.link': 'breadcrumb.utils.spec.ts : seuls les préfixes servis par une route sont liés',
  'frontend/src/app/shared/components/command-palette/command-palette.component.ts|r.routerLink': 'littéraux « routerLink: [...] » du même fichier (gabarits paramétrés)',
};

/**
 * Vérifie chaque lien interne de l'inventaire. Retourne la liste des liens cassés :
 * `{ ...lien, cause }`. Les liens dynamiques du code (« /units/:param ») sont vérifiés sur la
 * forme (une route paramétrée existe) ; leurs valeurs le sont par les liens de données.
 */
/** Liens de données gardés (cible absente → texte simple) : à lister dans le rapport. */
export function unlinkedData(links, data = loadSeed()) {
  const rids = routeIds(data);
  return links.filter((l) => {
    const g = l.ref?.guard;
    if (!g || rids[l.ref.to]?.has(l.target.split('/').at(-1))) return false;
    return readFileSync(join(APP, g.file), 'utf8').includes(g.marker);
  });
}

export function checkInternal(links, { routes = readRoutes(), data = loadSeed(), news = readNews() } = {}) {
  const broken = [];
  const rids = routeIds(data);
  const anchors = dataAnchors(data, news);
  const routeFor = (p) => matchRoute(routes, p);
  const isPage = (p) => {
    const r = routeFor(p);
    return r && (!r.redirect || r.redirect === '(fonction)' || routeFor('/' + r.redirect.replace(/^\//, ''))) ? r : null;
  };
  for (const l of links) {
    const fail = (cause) => broken.push({ ...l, cause });
    if (l.cls === 'route') {
      if (l.target === '~') continue;
      if (l.dynamic && !l.target.startsWith('/')) {
        const key = `${l.file ? rel(l.file) : ''}|${l.dynamic}`;
        if (!COVERED[key]) fail(`destination calculée sans vérification déclarée (${l.dynamic}) : l'ajouter à COVERED avec ce qui la vérifie`);
        continue;
      }
      const path = l.target.split(/[?#]/)[0];
      const r = isPage(path);
      if (!r) {
        fail(`aucune route ne sert « ${path} » (le routeur renvoie vers /factions)`);
        continue;
      }
      if (!l.dynamic) {
        const set = rids[r.path];
        const id = path.split('/').filter(Boolean).at(-1);
        if (set && !set.has(id)) {
          const g = l.ref?.guard;
          if (g && readFileSync(join(APP, g.file), 'utf8').includes(g.marker)) continue; // affiché en texte
          fail(`identifiant « ${id} » absent des données (${r.path})${g ? ` et garde-fou « ${g.marker} » absent` : ''}`);
        }
      }
    } else if (l.cls === 'anchor') {
      if (l.bare && !l.click) {
        fail('ancre nue sans (click) : avec <base href="/">, le navigateur va à « /#… » (accueil)');
        continue;
      }
      const [p, frag] = l.target.split('#');
      if (p === '?') {
        // Lien dont la route ET l'ancre sont des variables : couvert comme sa route.
        if (!COVERED[`${rel(l.file)}|${l.routeExpr}`]) fail(`destination calculée sans vérification déclarée (${l.routeExpr})`);
        continue;
      }
      if (frag.startsWith('{')) {
        // Ancre calculée : sur la même page, ses valeurs sont les « fragment: '…' » du fichier
        // (vérifiés un par un) ; vers une autre page, celle-ci doit poser des ancres de données.
        if (p === '~' || p === '') continue;
        const r = isPage(p);
        if (!r) fail(`aucune route ne sert « ${p} »`);
        else if (!anchors[r.path]) fail(`ancre calculée vers ${r.path}, qui ne pose aucune ancre tirée des données`);
        continue;
      }
      let comp;
      let path = p;
      if (p === '~' || p === '') {
        comp = ownerComponent(l.file);
        path = routes.find((r) => r.component === comp)?.path ?? '~';
      } else {
        const r = isPage(p);
        if (!r) {
          fail(`aucune route ne sert « ${p} »`);
          continue;
        }
        comp = r.component;
        path = r.path;
      }
      const text = componentText(comp);
      const dyn = anchors[path];
      if (literalIds(text).has(frag)) continue;
      if (dyn && dyn.ids.has(frag)) {
        if (!text.includes(dyn.binding)) fail(`la page ${path} ne pose plus ses ancres (${dyn.binding} absent)`);
        continue;
      }
      fail(`ancre « #${frag} » absente de la page ${path}`);
    } else if (l.cls === 'asset') {
      const path = decodeURIComponent(l.target.split(/[?#]/)[0]);
      if (!existsCaseSensitive(PUBLIC, path)) fail(`fichier ${path} absent de frontend/public (casse comprise)`);
    } else if (l.cls === 'api' && l.kind === 'datasheet') {
      if (!existsCaseSensitive(ROOT, l.file)) fail(`fiche technique ${l.file} absente`);
    }
  }
  return broken;
}

export function readNews(file = join(PUBLIC, 'nouveautes-data/nouveautes.json')) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { entries: [] };
}

/** Fils d'Ariane : chaque préfixe lié d'une route doit être une page (breadcrumb.utils). */
export function breadcrumbPrefixes(routes = readRoutes()) {
  const out = [];
  for (const r of routes) {
    if (r.redirect || r.path === '/**') continue;
    const segs = r.path.split('/').filter(Boolean);
    for (let i = 1; i < segs.length; i++) out.push({ route: r.path, prefix: '/' + segs.slice(0, i).join('/') });
  }
  return out;
}
