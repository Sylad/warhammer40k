// @vitest-environment node
// L30 — générateur des données publiques de la page « Plan de travail » (modèle
// ol-companion L23 / finance-tracker L48) et preuve qu'aucun texte privé du plan
// (notes, verdicts UX, raisons d'abandon, titres bruts, titres de sous-tâches)
// n'atteint le JSON publié ni l'application construite.
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildPlan,
  checkPublicTitle,
  findLeaks,
  hiddenVisibleLots,
  isDenied,
  isProcessLot,
  privateTexts,
  readNewsTitles,
  readPlan,
  renderPlan,
  scanDir,
} from './plan-data.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const RAF = `${root}/docs/plan/raf.yaml`;
const NEWS = `${root}/frontend/public/nouveautes-data/nouveautes.json`;
const PLAN_JSON = `${root}/frontend/public/plan-data/plan.json`;
const DIST = `${root}/frontend/dist/frontend/browser`;

const raf = {
  version: 1,
  project: 'demo',
  prefix: 'L',
  lots: [
    {
      id: 'L1',
      title: 'Page publique (route /x, localStorage)',
      public: 'Une page publique',
      status: 'done',
      visible: true,
      estimate: 0.5,
      quickwin: true,
      created: '2026-09-01',
      started: '2026-09-02',
      finished: '2026-09-03',
      ux: { date: '2026-09-03', verdict: 'conforme après reprise du contraste' },
      notes: [{ date: '2026-09-02', text: 'note privée : réglage du serveur maison' }],
      tasks: [
        { id: 't1', title: 'Contraste du texte secondaire', public: 'Textes plus contrastés', status: 'done', notes: [{ date: '2026-09-02', text: 'sous-tâche : remarque privée' }] },
        { id: 't2', title: 'Clavier (tabindex) du panneau', status: 'todo', sha: 'abc1234' },
        { id: 't3', title: 'Étape abandonnée en route', status: 'dropped', reason: 'raison privée de la sous-tâche' },
      ],
    },
    { id: 'L2', title: 'Correctif interne', public: 'Interne', status: 'done', started: '2026-09-02', finished: '2026-09-02' },
    { id: 'L3', title: 'Lot visible: false', status: 'todo', visible: false },
    { id: 'L4', title: 'Nouvelle page (titre brut)', status: 'doing', visible: true, started: '2026-09-04' },
    { id: 'L5', title: 'Prévu sans titre public ni Nouveauté', status: 'todo', visible: true },
    { id: 'L6', title: 'Abandonné', public: 'Abandonné', status: 'dropped', visible: true, finished: '2026-09-04', reason: 'raison privée de l’abandon' },
    { id: 'L7', title: 'État inconnu', public: 'Inconnu', status: 'blocked', visible: true },
    { id: 'L8', title: 'Corriger une faille de sécurité', public: 'Plus robuste', status: 'done', visible: true },
    { id: 'L9', title: 'Écran X', public: 'Écran X', status: 'todo', visible: true, tasks: [{ id: 't1', title: 'Le PIN se lit en clair', status: 'todo' }] },
    { id: 'L10', title: 'Revue UX — Écran Y', status: 'done', visible: true, finished: '2026-09-05' },
    { id: 'L11', title: 'Revue UX — Écran Z', public: 'Un écran Z plus lisible', status: 'todo', visible: true },
  ],
};
// L4 et L10 ont une entrée Nouveautés ; L10 est un lot de processus (revue UX) sans `public:`.
const news = new Map([['L4', 'Une nouvelle page'], ['L10', 'Écran Y revu']]);

describe('buildPlan', () => {
  const plan = buildPlan(raf, { newsTitles: news });

  it('publie les lots visibles ayant un titre public (public: puis Nouveauté), hors abandonnés, processus sans public:, liste noire et états inconnus', () => {
    expect(plan.lots.map((l) => l.id)).toEqual(['L1', 'L4', 'L9', 'L11']);
  });

  it('ne garde que id, titre public, état, dates et l’avancement n/m (jamais les titres des sous-tâches)', () => {
    expect(plan).toEqual({
      version: 1,
      project: 'demo',
      lots: [
        {
          id: 'L1',
          title: 'Une page publique',
          status: 'done',
          started: '2026-09-02',
          finished: '2026-09-03',
          tasks: { done: 1, total: 2 },
        },
        { id: 'L4', title: 'Une nouvelle page', status: 'doing', started: '2026-09-04' },
        // Seule sous-tâche de L9 sur la liste noire sécurité : retirée du décompte.
        { id: 'L9', title: 'Écran X', status: 'todo' },
        { id: 'L11', title: 'Un écran Z plus lisible', status: 'todo' },
      ],
    });
  });

  it('écarte les sous-tâches abandonnées (dropped) des deux nombres ; aucune restante = pas d’avancement', () => {
    const p = buildPlan({
      project: 'x',
      lots: [{
        id: 'L1', title: 'A', public: 'A', status: 'doing', visible: true,
        tasks: [
          { id: 't1', title: 'Abandonnée', status: 'dropped' },
          { id: 't2', title: 'Faite', status: 'done' },
          { id: 't3', title: 'À faire', status: 'todo' },
          { id: 't4', title: 'Abandonnée aussi', status: 'dropped' },
        ],
      }, {
        id: 'L2', title: 'B', public: 'B', status: 'todo', visible: true,
        tasks: [{ id: 't1', title: 'Seule, abandonnée', status: 'dropped' }],
      }],
    });
    expect(p.lots[0].tasks).toEqual({ done: 1, total: 2 });
    expect(p.lots[1].tasks).toBeUndefined();
  });

  it('ne publie pas la date de fin d’un lot non livré', () => {
    const p = buildPlan({ project: 'x', lots: [{ id: 'L1', title: 'A', public: 'A', status: 'doing', visible: true, started: '2026-09-01', finished: '2026-09-02' }] });
    expect(p.lots[0]).toEqual({ id: 'L1', title: 'A', status: 'doing', started: '2026-09-01' });
  });

  it('refuse un titre public non conforme (chemin, fichier, technique, identifiant, sécurité, > 80 caractères)', () => {
    const one = (pub) => ({ project: 'x', lots: [{ id: 'L1', title: 'A', public: pub, status: 'todo', visible: true }] });
    for (const bad of ['Route /plan', 'Plan depuis raf.yaml', 'Lu depuis plan.json', 'Pastille en localStorage', 'Suite de L12', 'Le PIN renforcé', 'x'.repeat(81), '   ']) {
      expect(() => buildPlan(one(bad)), bad).toThrow(/titre public/);
    }
    expect(() => buildPlan(one('y'.repeat(80)))).not.toThrow();
  });

  it('refuse aussi un titre de Nouveauté non conforme repris comme titre public', () => {
    const p = { project: 'x', lots: [{ id: 'L1', title: 'A', status: 'todo', visible: true }] };
    expect(() => buildPlan(p, { newsTitles: new Map([['L1', 'Voir docs/plan']]) })).toThrow(/titre public/);
  });

  it('accepte les dates déjà converties en Date par un autre lecteur YAML', () => {
    const p = buildPlan({ project: 'x', lots: [{ id: 'L1', title: 'A', public: 'A', status: 'doing', visible: true, started: new Date('2026-09-04T00:00:00Z') }] });
    expect(p.lots[0].started).toBe('2026-09-04');
  });

  it('refuse un plan sans liste de lots', () => {
    expect(() => buildPlan({ project: 'x' })).toThrow(/lots/);
  });
});

describe('hiddenVisibleLots', () => {
  it('liste les lots visibles non abandonnés masqués faute de titre public (ou par la liste noire)', () => {
    expect(hiddenVisibleLots(raf, { newsTitles: news })).toEqual([
      { id: 'L5', status: 'todo', why: 'sans titre public' },
      { id: 'L7', status: 'blocked', why: 'état non publié' },
      { id: 'L8', status: 'done', why: 'liste noire sécurité' },
      { id: 'L10', status: 'done', why: 'sans titre public' },
    ]);
  });
});

describe('textes privés et fuites', () => {
  const plan = buildPlan(raf, { newsTitles: news });
  const json = renderPlan(plan);

  it('privateTexts : notes (lots et sous-tâches), verdicts UX, raisons, titres bruts et titres de sous-tâches — jamais un titre publié', () => {
    const texts = privateTexts(raf, plan);
    for (const t of [
      'note privée : réglage du serveur maison',
      'sous-tâche : remarque privée',
      'conforme après reprise du contraste',
      'raison privée de l’abandon',
      'raison privée de la sous-tâche',
      'Page publique (route /x, localStorage)',
      'Nouvelle page (titre brut)',
      'Le PIN se lit en clair',
      'Contraste du texte secondaire',
      'Textes plus contrastés', // `public:` d'une sous-tâche : jamais publié non plus
    ]) {
      expect(texts).toContain(t);
    }
    // « Écran X » est à la fois titre brut et titre public de L9 : publié, donc pas privé.
    expect(texts).not.toContain('Écran X');
  });

  it('le JSON publié ne contient aucun texte privé', () => {
    expect(findLeaks(raf, json, plan)).toEqual([]);
    for (const leak of ['PIN', 'Textes plus', 'Contraste', 'note', 'privé', 'abc1234', 'estimate', 'quickwin', 'conforme', 'created', 'Revue UX', 'reason', 'verdict']) {
      expect(json).not.toContain(leak);
    }
  });

  it('findLeaks repère une note recopiée telle quelle ou échappée façon JSON / JS (\\uXXXX)', () => {
    const note = 'note privée : réglage du serveur maison';
    expect(findLeaks(raf, `bundle ${note} fin`, plan)).toEqual([note]);
    const ascii = JSON.stringify(note).replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
    expect(ascii).toContain('\\u00e9');
    expect(findLeaks(raf, `x=${ascii}`, plan)).toEqual([note]);
    const upper = ascii.replace(/\\u00e9/g, '\\u00E9');
    expect(findLeaks(raf, `x=${upper}`, plan)).toEqual([note]);
  });

  it('findLeaks repère une note accentuée écrite par esbuild en \\xHH (≤ 0xFF) et \\uHHHH au-delà', () => {
    const note = 'note privée : réglage du serveur maison';
    expect(findLeaks(raf, 'x="note priv\\xE9e : r\\xE9glage du serveur maison"', plan)).toEqual([note]);
    expect(findLeaks(raf, 'x="note priv\\xe9e : r\\xe9glage du serveur maison"', plan)).toEqual([note]);
    const reason = 'raison privée de l’abandon'; // é ≤ 0xFF, ’ = U+2019
    expect(findLeaks(raf, 'x="raison priv\\xE9e de l\\u2019abandon"', plan)).toEqual([reason]);
  });

  it('scanDir trouve une note accentuée plantée en \\xHH dans un bundle JS construit', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-dist-xhh-'));
    writeFileSync(join(dir, 'main-ABC.js'), 'var e="note priv\\xE9e : r\\xE9glage du serveur maison";');
    expect(scanDir(raf, plan, dir)).toEqual([{ file: 'main-ABC.js', text: 'note privée : réglage du serveur maison' }]);
  });

  it('findLeaks repère un texte privé dont les guillemets ou apostrophes ont été échappés en entités HTML', () => {
    const reason = 'raison privée de l’abandon';
    expect(findLeaks(raf, `<p>raison priv&#233;e de l&#8217;abandon</p>`, plan)).toEqual([reason]);
    expect(findLeaks(raf, `<p>raison priv&eacute;e de l&rsquo;abandon</p>`, plan)).toEqual([]); // entités nommées : hors portée, documenté
  });

  it('faux positif évité : un titre brut ou de sous-tâche générique (« Plan de travail ») présent dans l’interface n’est pas une fuite', () => {
    const r = {
      project: 'x',
      lots: [{
        id: 'L1', title: 'Page Plan de travail', public: 'Une page Plan de travail : ce qui se prépare', status: 'doing', visible: true,
        notes: [{ text: 'court mais privé' }], // 16 caractères : une note reste cherchée
        tasks: [
          { id: 't1', title: 'Plan de travail', status: 'done' },
          { id: 't2', title: 'Une page Plan de travail', status: 'todo' }, // contenu dans le titre publié
          { id: 't3', title: 'Lien Plan de travail dans le tiroir du téléphone', status: 'todo' },
        ],
      }],
    };
    const p = buildPlan(r);
    const ui = '<h1>Plan de travail</h1><p>Une page Plan de travail : ce qui se prépare</p>';
    expect(findLeaks(r, ui, p)).toEqual([]);
    // Vraies fuites, toujours vues : titre de sous-tâche long et note, même courte.
    expect(findLeaks(r, `${ui} "Lien Plan de travail dans le tiroir du téléphone"`, p)).toEqual(['Lien Plan de travail dans le tiroir du téléphone']);
    expect(findLeaks(r, `${ui} court mais privé`, p)).toEqual(['court mais privé']);
  });

  it('un titre brut long est toujours une fuite ; notes, verdicts et raisons restent cherchés dès 12 caractères', () => {
    const texts = privateTexts(raf, buildPlan(raf, { newsTitles: news }));
    expect(texts).toContain('Page publique (route /x, localStorage)');
    expect(texts).not.toContain('Correctif interne'); // titre brut de 17 caractères : trop générique pour être cherché
    expect(findLeaks(raf, 'x="Page publique (route /x, localStorage)"', buildPlan(raf, { newsTitles: news }))).toEqual(['Page publique (route /x, localStorage)']);
  });

  it('scanDir parcourt un dossier construit et nomme le fichier fautif', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plan-dist-'));
    mkdirSync(join(dir, 'media'));
    writeFileSync(join(dir, 'index.html'), '<html></html>');
    writeFileSync(join(dir, 'media', 'app.js'), 'const a = "rien";');
    expect(scanDir(raf, plan, dir)).toEqual([]);
    writeFileSync(join(dir, 'media', 'plan.js'), 'const n = "sous-tâche : remarque privée";');
    expect(scanDir(raf, plan, dir)).toEqual([{ file: join('media', 'plan.js'), text: 'sous-tâche : remarque privée' }]);
  });
});

describe('checkPublicTitle', () => {
  it.each(['a/b', 'raf.yaml', 'plan.json', 'localStorage', 'voir L48', 'z'.repeat(81), '', 'Mot de passe oublié'])('rejette « %s »', (t) => {
    expect(() => checkPublicTitle(t, 'L1')).toThrow(/titre public/);
  });
  it.each(['Ligne 1\nligne 2', 'Retour\r chariot', 'Séparateur\u2028de ligne'])('rejette un retour à la ligne (%j)', (t) => {
    expect(() => checkPublicTitle(t, 'L1')).toThrow(/titre public.*ligne/);
  });
  it.each([2026, true, { a: 1 }, ['x'], null, undefined])('rejette une valeur qui n’est pas du texte (%j)', (t) => {
    expect(() => checkPublicTitle(t, 'L1')).toThrow(/titre public/);
  });
  it('YAML « public: 2026 » (nombre) refusé à la génération', () => {
    expect(() => buildPlan({ project: 'x', lots: [{ id: 'L1', title: 'A', public: 2026, status: 'todo', visible: true }] })).toThrow(/pas du texte/);
  });
  it('accepte « Une page Plan de travail : ce qui se prépare »', () => {
    expect(checkPublicTitle('  Une page Plan de travail : ce qui se prépare ', 'L30')).toBe('Une page Plan de travail : ce qui se prépare');
  });
});

describe('isProcessLot', () => {
  it('reconnaît les revues UX', () => {
    expect(isProcessLot({ title: 'Revue UX — Accueil' })).toBe(true);
    expect(isProcessLot({ title: 'Page Nouveautés' })).toBe(false);
  });
});

describe('readNewsTitles', () => {
  it('lit nouveautes.json (ordre de cadence, celui de la page) : titre de la PREMIÈRE entrée de chaque lot', () => {
    const dir = mkdtempSync(join(tmpdir(), 'news-'));
    const file = join(dir, 'nouveautes.json');
    // Deux entrées le même jour pour L1 : cadence a départagé par `created`, la page lie la première.
    writeFileSync(file, JSON.stringify({ entries: [
      { slug: '2026-09-10-b', title: 'Créée en dernier', date: '2026-09-10', lots: ['L1'] },
      { slug: '2026-09-10-a', title: 'Créée en premier', date: '2026-09-10', lots: ['L1', 'L2'] },
      { slug: '2026-09-01-c', title: 'Ancienne', date: '2026-09-01', lots: ['L2', 'L3'] },
    ] }));
    const m = readNewsTitles(file);
    expect(m.get('L1')).toBe('Créée en dernier');
    expect(m.get('L2')).toBe('Créée en premier');
    expect(m.get('L3')).toBe('Ancienne');
  });
  it('fichier absent ou illisible = aucune Nouveauté', () => {
    expect(readNewsTitles(join(tmpdir(), 'n-existe-pas-l30.json')).size).toBe(0);
  });
});

describe('isDenied (filet de sécurité)', () => {
  it.each([
    'Sécurité : PIN absent en prod',
    'démo décidée sur X-Forwarded-Host forgeable',
    'Corriger une faille',
    'Injection SQL',
    'Renouveler le token',
    'Secret Kubernetes',
    'CVE-2026-1234',
    'Guard : bypass du quota',
  ])('écarte « %s »', (title) => {
    expect(isDenied(title)).toBe(true);
  });

  it.each(['Page Nouveautés', 'Revue UX — Galerie', 'Primarques', 'Saints & Saintes', 'Opinion'])('laisse passer « %s »', (title) => {
    expect(isDenied(title)).toBe(false);
  });
});

// ── Le vrai plan du dépôt ─────────────────────────────────────────────────────
describe('plan publié (docs/plan/raf.yaml → public/plan-data/plan.json)', () => {
  it('titre d’un lot et lien « Voir la nouveauté » viennent de la même entrée (première du lot dans nouveautes.json)', () => {
    const { entries } = JSON.parse(readFileSync(NEWS, 'utf8'));
    const titles = readNewsTitles(NEWS);
    for (const [lot, title] of titles) expect(entries.find((e) => e.lots.includes(lot)).title).toBe(title);
  });

  const realRaf = readPlan(RAF);
  const committedText = () => readFileSync(PLAN_JSON, 'utf8');
  const committed = () => JSON.parse(committedText());

  it('plan.json est à jour avec docs/plan/raf.yaml et docs/nouveautes (sinon : npm run plan)', () => {
    expect(committedText()).toBe(renderPlan(buildPlan(realRaf, { newsTitles: readNewsTitles(NEWS) })));
  });

  it('le plan réel a bien des textes privés à protéger, et AUCUN n’apparaît dans plan.json', () => {
    const notes = realRaf.lots.flatMap((l) => (l.notes ?? []).map((n) => String(n.text)));
    expect(notes.length).toBeGreaterThan(5);
    expect(privateTexts(realRaf, committed()).length).toBeGreaterThan(30);
    expect(findLeaks(realRaf, committedText(), committed())).toEqual([]);
  });

  it('plan.json ne porte que les clés autorisées', () => {
    const p = committed();
    expect(Object.keys(p).sort()).toEqual(['lots', 'project', 'version']);
    for (const l of p.lots) {
      for (const k of Object.keys(l)) expect(['id', 'title', 'status', 'started', 'finished', 'tasks']).toContain(k);
      if (l.tasks) expect(Object.keys(l.tasks).sort()).toEqual(['done', 'total']);
    }
  });

  it('aucun titre publié ne contient de chemin, de fichier, de technique, d’identifiant de lot, ni ne dépasse 80 caractères', () => {
    const titles = committed().lots.map((l) => l.title);
    expect(titles.length).toBeGreaterThan(0);
    for (const t of titles) {
      expect(t).not.toMatch(/\/|\.ya?ml|\.json|localStorage|\bL\d+\b/i);
      expect(t.length).toBeLessThanOrEqual(80);
      expect(isDenied(t)).toBe(false);
    }
  });

  it('aucun module de l’application n’importe le plan brut (raf.yaml)', () => {
    const walk = (d) =>
      readdirSync(d).flatMap((f) => {
        const p = join(d, f);
        return statSync(p).isDirectory() ? walk(p) : [p];
      });
    // Une chaîne (import, fetch, ?raw…) qui vise le plan brut ; les commentaires peuvent le citer.
    const offenders = walk(`${root}/frontend/src`).filter(
      (f) => /['"`][^'"`\n]*(raf\.ya?ml|docs\/plan)[^'"`\n]*['"`]/.test(readFileSync(f, 'utf8')) && !/\.spec\.ts$/.test(f),
    );
    expect(offenders).toEqual([]);
  });

  // L'application construite (npm run build, qui relance aussi cette vérification) :
  // aucune note, aucun verdict UX, aucun titre brut du plan dans les fichiers servis.
  it.skipIf(!existsSync(DIST))('dist/ (application construite) ne contient aucun texte privé du plan', () => {
    expect(scanDir(realRaf, committed(), DIST)).toEqual([]);
  });
});
