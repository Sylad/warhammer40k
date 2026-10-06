// @vitest-environment node
// L23 — journal des Nouveautés : données générées par `cadence news build`
// (cd frontend && npm run news) dans public/nouveautes-data/, VERSIONNÉES :
// la CI construit l'image nginx sans cadence, la page /nouveautes lit ce JSON.
// Ces tests vérifient que le JSON versionné suit bien docs/nouveautes/.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../../..');
const ENTRIES = join(ROOT, 'docs/nouveautes');
const DATA = join(ROOT, 'frontend/public/nouveautes-data');
const JSON_FILE = join(DATA, 'nouveautes.json');
const SIZES_FILE = join(DATA, 'tailles.json');

interface Entry {
  slug: string;
  date: string;
  captures: string[];
}

const readJson = (): { entries: Entry[] } => JSON.parse(readFileSync(JSON_FILE, 'utf8'));
const mdFiles = () => (existsSync(ENTRIES) ? readdirSync(ENTRIES).filter((f) => f.endsWith('.md')) : []);

/** En-tête YAML minimal des entrées (clé: valeur). */
function header(file: string): Record<string, string> {
  const src = readFileSync(join(ENTRIES, file), 'utf8');
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error(`${file} : en-tête absent`);
  const out: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

const pngSize = (file: string): [number, number] => {
  const buf = readFileSync(file);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
};

function cadenceAvailable(): boolean {
  try {
    execFileSync('cadence', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

describe('données des Nouveautés (public/nouveautes-data) — L23', () => {
  it('le JSON versionné existe et porte une entrée par fichier de docs/nouveautes/', () => {
    expect(existsSync(JSON_FILE), 'nouveautes.json absent (cd frontend && npm run news)').toBe(true);
    const slugs = readJson().entries.map((e) => e.slug).sort();
    expect(slugs).toEqual(mdFiles().map((f) => f.replace(/\.md$/, '')).sort());
  });

  it('ordre DÉCROISSANT : date puis heure de création (created), la plus récente en haut', () => {
    const order = readJson().entries.map((e) => e.slug);
    const expected = mdFiles()
      .map((f) => {
        const h = header(f);
        return { slug: f.replace(/\.md$/, ''), date: h['date'] ?? '', created: h['created'] ?? '' };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || Date.parse(b.created) - Date.parse(a.created));
    expect(order).toEqual(expected.map((e) => e.slug));
  });

  it('chaque entrée a au moins une capture, servie depuis public/nouveautes-data/', () => {
    for (const e of readJson().entries) {
      expect(e.captures.length, `${e.slug} : aucune capture`).toBeGreaterThan(0);
      for (const c of e.captures) expect(existsSync(join(DATA, c)), `${e.slug} : ${c} manquante`).toBe(true);
    }
  });

  it('pas de page index.html de cadence sous /nouveautes-data/ (doublon non habillé de /nouveautes)', () => {
    expect(existsSync(join(DATA, 'index.html'))).toBe(false);
  });

  it('npm run news supprime l’index.html de cadence et régénère tailles.json', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'frontend/package.json'), 'utf8'));
    expect(pkg.scripts.news).toContain('cadence news build -o public/nouveautes-data');
    expect(pkg.scripts.news).toContain('rm -f public/nouveautes-data/index.html');
    expect(pkg.scripts.news).toContain('scripts/nouveautes-tailles.mjs');
  });

  it('tailles.json donne la taille réelle de chaque capture (place réservée avant chargement)', () => {
    const sizes: Record<string, [number, number]> = JSON.parse(readFileSync(SIZES_FILE, 'utf8'));
    const captures = readJson().entries.flatMap((e) => e.captures);
    expect(Object.keys(sizes).sort()).toEqual([...new Set(captures)].sort());
    for (const c of captures) expect(sizes[c], c).toEqual(pngSize(join(DATA, c)));
  });

  it('captures lisibles : aucune plus de 6 fois plus large que haute', () => {
    for (const c of readJson().entries.flatMap((e) => e.captures)) {
      const [w, h] = pngSize(join(DATA, c));
      expect(w / h, `${c} : ${w}×${h}`).toBeLessThanOrEqual(6);
    }
  });

  it('capture de téléphone (nom en « -telephone ») prise à 390 px de large', () => {
    for (const c of readJson().entries.flatMap((e) => e.captures).filter((c) => /-telephone\.png$/.test(c))) {
      expect(pngSize(join(DATA, c))[0], c).toBe(390);
    }
  });

  it('L64 : la Nouveauté de la pagination porte une capture de téléphone (390 px), pas seulement de bureau', () => {
    const entry = readJson().entries.find((e) => e.slug.startsWith('2026-10-06-galerie-24-cartes'));
    expect(entry, 'entrée L64 absente').toBeDefined();
    expect(entry!.captures.some((c) => /-telephone\.png$/.test(c)), entry!.captures.join(', ')).toBe(true);
  });

  it('L64 : le texte de la Nouveauté ne chiffre pas le total de la pagination (la prod et le seed diffèrent)', () => {
    const file = mdFiles().find((f) => f.startsWith('2026-10-06-galerie-24-cartes'))!;
    const body = readFileSync(join(ENTRIES, file), 'utf8').split(/\r?\n---\r?\n/).slice(1).join('\n');
    expect(body).not.toMatch(/1–24 sur \d+/);
  });

  it('guillemets français tenus par une espace fine insécable (U+202F)', () => {
    for (const f of mdFiles()) {
      const src = readFileSync(join(ENTRIES, f), 'utf8');
      const bad = src.match(/«[  \t]|[  \t]»|«(?=[^ ])|(?<=[^ ])»/g);
      expect(bad, `${f} : ${bad?.length} guillemet(s) sans U+202F`).toBeNull();
    }
  });

  it.skipIf(!cadenceAvailable())('le JSON versionné est à jour avec docs/nouveautes/ (sinon : npm run news)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'wh-news-'));
    try {
      execFileSync('cadence', ['news', 'build', '-o', tmp], { cwd: ROOT, stdio: 'pipe' });
      const fresh = JSON.parse(readFileSync(join(tmp, 'nouveautes.json'), 'utf8'));
      expect(readJson().entries).toEqual(fresh.entries);
      for (const c of fresh.entries.flatMap((e: Entry) => e.captures)) {
        expect(readFileSync(join(DATA, c)).equals(readFileSync(join(tmp, c))), `${c} différente de la source`).toBe(true);
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
