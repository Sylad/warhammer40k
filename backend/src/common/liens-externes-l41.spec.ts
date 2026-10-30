import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readContent } from './content';
import { estChaineRetiree } from './chaines-retirees';

// L41 : liens externes morts relevés par l'audit du 2026-10-02
// (docs/liens/audit-2026-10-02.md). Contrôle hors réseau sur les adresses.
interface Chaine { id: string; url: string }
interface Video { id: string; url: string; channelId?: string }
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

  it('R5 — le fond de la décision du 30-10 : les six chaînes sont retirées, aucune remplacée, et l’audit la consigne comme confirmée', () => {
    // le fond : aucune des six adresses ne subsiste, et le retrait n’a pas été compensé par une chaîne de remplacement
    expect(chaines.length).toBe(6);
    const tout = [...chaines, ...videos].map((x) => x.url);
    expect(tout.filter((u) => estChaineRetiree(u))).toEqual([]);
    // l’audit : décision confirmée, plus aucune attente sur ces six chaînes
    const audit = readFileSync(join(__dirname, '../../../docs/liens/audit-2026-10-02.md'), 'utf8');
    const suite = audit.slice(audit.indexOf('## Suite (L41'), audit.indexOf('## Non vérifié'));
    expect(suite).toMatch(/Décision de Sylvain \(30-10\)/);
    expect(suite).not.toMatch(/en attente de/i);
    const lignes = audit.split('\n').filter((l) => l.startsWith('| `https://www.youtube.com/@'));
    expect(lignes.length).toBe(6);
    for (const l of lignes) {
      expect(l, l).toMatch(/\*\*retirée\*\*/);
      expect(l, l).not.toMatch(/à retirer|retrouver le nouveau nom/);
    }
  });

  it('R11 — aucune vidéo ne garde le channelId d’une chaîne retirée ou absente de channels.json', () => {
    const ids = new Set(readContent<{ id: string }[]>('channels.json', []).map((c) => c.id));
    const orphelines = videos.filter((v) => v.channelId && !ids.has(v.channelId)).map((v) => `${v.id}→${v.channelId}`);
    expect(orphelines).toEqual([]);
  });

  it('R10 — l’audit distingue la décision de Sylvain (chaînes) des choix de la session à confirmer (Fandom, Imperial Knights)', () => {
    const audit = readFileSync(join(__dirname, '../../../docs/liens/audit-2026-10-02.md'), 'utf8');
    const suite = audit.slice(audit.indexOf('## Suite (L41'), audit.indexOf('## Non vérifié'));
    expect(suite).toMatch(/Choix de la session, à confirmer par Sylvain/);
  });

  it('R4 — chaque événement garde au moins une source (Lexicanum) après les retraits', () => {
    for (const e of evenements) expect(e.sources.length, e.id).toBeGreaterThan(0);
  });

  it('R9 — une adresse de chaîne retirée est reconnue avec un suffixe (/videos, ?query) comme sans', () => {
    for (const u of ['https://www.youtube.com/@Astartes40k', 'https://www.youtube.com/@Astartes40k/', 'https://www.youtube.com/@Astartes40k/videos', 'https://www.youtube.com/@astartes40k?si=x'])
      expect(estChaineRetiree(u), u).toBe(true);
    expect(estChaineRetiree('https://www.youtube.com/@Astartes40kFan/videos')).toBe(false);
    expect(estChaineRetiree(undefined)).toBe(false);
  });
});
