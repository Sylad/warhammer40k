import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readContent } from './content';

// L41 : liens externes morts relevés par l'audit du 2026-10-02
// (docs/liens/audit-2026-10-02.md). Contrôle hors réseau sur les adresses.
interface Chaine { id: string; url: string }
interface Video { id: string; url: string }
interface Evenement { id: string; sources: string[] }

const chaines = readContent<Chaine[]>('channels.json', []);
const videos = readContent<Video[]>('videos.json', []);
const evenements = readContent<Evenement[]>('timeline-events.json', []);

const CHAINES_MORTES = ['Indomitus40k', 'Astartes40k', 'SireLambert', 'LaVoxObscura', 'BaldermortGW', 'WarFo40k'];
const PAGES_FANDOM_MORTES = ['Sebastian_Thor', 'Battle_for_Macragge', 'Pariah_Nexus', 'Arks_of_Omen', 'War_in_Heaven'];

describe('liens externes morts (L41)', () => {
  it.each(CHAINES_MORTES)('R1 — la chaîne YouTube @%s (introuvable) n’est plus listée', (handle) => {
    const urls = [...chaines, ...videos].map((x) => x.url.toLowerCase());
    expect(urls.some((u) => u.endsWith(`/@${handle.toLowerCase()}`))).toBe(false);
  });

  it.each(PAGES_FANDOM_MORTES)('R2 — plus de source Fandom /wiki/%s (page disparue)', (page) => {
    const sources = evenements.flatMap((e) => e.sources);
    expect(sources.filter((s) => s.includes('fandom.com') && s.endsWith(`/wiki/${page}`))).toEqual([]);
  });

  it('R3 — la Guerre dans le Ciel cite la page Fandom existante « War in Heaven (Necron) »', () => {
    const e = evenements.find((x) => x.id === 'war-in-heaven')!;
    expect(e.sources).toContain('https://warhammer40k.fandom.com/wiki/War_in_Heaven_(Necron)');
  });

  it('R5 — l’audit consigne la décision de Sylvain du 30-10 (six chaînes retirées, aucune remplacée) et plus aucune attente', () => {
    const audit = readFileSync(join(__dirname, '../../../docs/liens/audit-2026-10-02.md'), 'utf8');
    const suite = audit.slice(audit.indexOf('## Suite (L41'), audit.indexOf('## Non vérifié'));
    expect(suite).toMatch(/Décision de Sylvain \(30-10\)/);
    expect(suite).toMatch(/nouveau lot/);
    expect(suite).not.toMatch(/en attente de/i);
    expect(suite).not.toMatch(/Reste à faire sur la prod/);
    expect(suite).not.toMatch(/proposition/i);
  });

  it('R4 — chaque événement garde au moins une source (Lexicanum) après les retraits', () => {
    for (const e of evenements) expect(e.sources.length, e.id).toBeGreaterThan(0);
  });
});
