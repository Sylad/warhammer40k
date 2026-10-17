// @vitest-environment node
// L139 (QA prod du 17-10) : R1 le bandeau .hero tient dans sa colonne à 320 px, R2 l'attente « never … 320 only »,
// R3 libellé d'époque de Gardiens du Trône, R4 attente des lettres « au plus une à true ».
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

const css = sass.compile(resolve(__dirname, 'series.component.scss')).css;
const racine = resolve(__dirname, '../../../../..');
const md = readFileSync(resolve(racine, 'docs/qa/expectations.md'), 'utf8');
const start = md.indexOf('\n## /romans');
const section = md.slice(start, md.indexOf('\n## ', start + 1));

/** Valeur de `prop` pour `sel` dans le conteneur donné (null = racine, sinon la requête @media). */
function decl(sel: string, prop: string, media: string | null): string {
  let out = '';
  postcss.parse(css).walkRules((rule) => {
    const p = rule.parent;
    const ok = media === null ? p?.type === 'root' : p?.type === 'atrule' && (p as postcss.AtRule).params === media;
    if (!ok || !rule.selectors.map((s) => s.trim()).includes(sel)) return;
    rule.walkDecls(prop, (d) => { out = d.value; });
  });
  return out;
}

describe('Romans : bandeau .hero à 320 px (L139)', () => {
  it('R1 — la colonne unique du bandeau est minmax(0, 1fr) : son contenu ne l\'élargit pas au-delà de 280 px', () => {
    expect(decl('.hero', 'grid-template-columns', '(max-width: 1100px)')).toBe('minmax(0, 1fr)');
  });
  it('R1 — .hero-text peut rétrécir (min-width: 0) et son champ de recherche aussi', () => {
    expect(decl('.hero-text', 'min-width', null)).toBe('0');
    expect(decl('.search-bar input', 'min-width', null)).toBe('0');
  });
  it('R1 — marges intérieures réduites du texte du bandeau sur petit téléphone', () => {
    expect(decl('.hero-text', 'padding', '(max-width: 480px)')).toBe('28px 20px 30px');
  });
});

describe('attendus QA de /romans (L139)', () => {
  it('R2 — « never » : accroche, description et recherche non coupées par le bandeau — 320 only', () => {
    const l = section.split('\n').find((x) => /^- never:.*bandeau/.test(x)) ?? '';
    expect(l).toMatch(/accroche/);
    expect(l).toMatch(/description/);
    expect(l).toMatch(/champ de recherche/);
    expect(l).toMatch(/320 only/);
  });
  it('R4 — les lettres : au plus une à true', () => {
    const l = section.split('\n').find((x) => /27 lettres/.test(x)) ?? '';
    expect(l).toMatch(/au plus une à true/);
    expect(l).not.toMatch(/une seule à true/);
  });
});

describe('libellé d\'époque (L139)', () => {
  const series = JSON.parse(readFileSync(resolve(racine, 'backend/seed/series.json'), 'utf8')) as { id: string; epoque: string }[];
  it('R3 — Gardiens du Trône : « de la 13e Croisade Noire »', () => {
    expect(series.find((s) => s.id === 'watchers-of-the-throne')?.epoque).toBe('M42 — Crise de la 13e Croisade Noire');
  });
  it('R3 — aucune époque ne dit « du 13e Croisade »', () => {
    expect(series.filter((s) => /du 13e Croisade/.test(s.epoque))).toEqual([]);
  });
});
