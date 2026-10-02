// L23 — pastille « nouveau » du lien Nouveautés (repris d'AetherWX / claude-code-codex L13) :
// combien d'entrées le visiteur n'a pas vues depuis sa dernière visite de /nouveautes.
// Mémoire localStorage simulée ; dates comparées en millisecondes, jamais en chaînes.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  NEWS_SEEN_KEY, badgeLabel, recordBaseline, countUnseen, isUnseen, markAllSeen, readSeen, seenSeparatorLabel,
  sinceLabel, unseenLabel, type StorageLike,
} from './news-badge';

class MemoryStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

const entries = [
  { slug: 'c', date: '2026-09-10' },
  { slug: 'b', date: '2026-09-10' },
  { slug: 'a', date: '2026-09-09' },
];

describe('pastille « nouveau » (news-badge) — L23', () => {
  it('premier visiteur (aucune visite mémorisée) : rien n’est marqué nouveau', () => {
    expect(countUnseen(entries, null)).toBe(0);
    expect(entries.some((e) => isUnseen(e, null))).toBe(false);
    expect(readSeen(null)).toBeNull();
    expect(readSeen(new MemoryStorage())).toBeNull();
  });

  it('visiter marque tout vu ; la pastille tombe à zéro', () => {
    const st = new MemoryStorage();
    const seen = markAllSeen(st, entries, new Date('2026-09-25T11:57:30Z'));
    // L34 : tous les slugs vus sont mémorisés (`all`), pas seulement ceux de la date la plus récente.
    expect(seen).toEqual({ date: '2026-09-10', slugs: ['a', 'b', 'c'], all: true, at: '2026-09-25T11:57:30.000Z' });
    expect(readSeen(st)).toEqual(seen);
    expect(countUnseen(entries, readSeen(st))).toBe(0);
  });

  it('une entrée du même jour non vue compte comme nouvelle ; une plus récente aussi', () => {
    const st = new MemoryStorage();
    markAllSeen(st, entries);
    const later = [{ slug: 'e', date: '2026-09-11' }, { slug: 'd', date: '2026-09-10' }, ...entries];
    expect(countUnseen(later, readSeen(st))).toBe(2);
    expect(later.map((e) => isUnseen(e, readSeen(st)))).toEqual([true, true, false, false, false]);
    markAllSeen(st, later);
    expect(readSeen(st)!.date).toBe('2026-09-11');
    expect(readSeen(st)!.slugs).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(countUnseen(later, readSeen(st))).toBe(0);
  });

  it('instants comparés en millisecondes : 13:15:00Z et 13:15Z sont le même instant', () => {
    const st = new MemoryStorage();
    st.setItem(NEWS_SEEN_KEY, JSON.stringify({ date: '2026-09-28T13:15:00Z', slugs: ['soir'] }));
    expect(countUnseen(
      [{ slug: 'soir', date: '2026-09-28T13:15Z' }, { slug: 'matin', date: '2026-09-28T07:20Z' }],
      readSeen(st),
    )).toBe(0);
    expect(countUnseen([{ slug: 'nuit', date: '2026-09-28T21:05Z' }], readSeen(st))).toBe(1);
  });

  it('mémoire corrompue ou stockage en panne : pas d’exception', () => {
    const st = new MemoryStorage();
    st.setItem(NEWS_SEEN_KEY, '{pas du json');
    expect(readSeen(st)).toBeNull();
    st.setItem(NEWS_SEEN_KEY, JSON.stringify({ date: 'hier', slugs: [] }));
    expect(readSeen(st)).toBeNull();
    st.setItem(NEWS_SEEN_KEY, JSON.stringify({ date: '2026-09-10', slugs: ['b', 3], at: 42 }));
    expect(readSeen(st)).toEqual({ date: '2026-09-10', slugs: ['b'] });
    const broken: StorageLike = {
      getItem: () => { throw new Error('quota'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => {},
    };
    expect(readSeen(broken)).toBeNull();
    expect(markAllSeen(broken, entries)!.date).toBe('2026-09-10');
    expect(markAllSeen(st, [])).toBeNull();
  });

  it('journal réel (nouveautes.json) : visite puis relecture → pastille éteinte', () => {
    const file = resolve(__dirname, '../../../../public/nouveautes-data/nouveautes.json');
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const st = new MemoryStorage();
    markAllSeen(st, data.entries);
    expect(badgeLabel(countUnseen(data.entries, readSeen(st)))).toBe('');
  });

  it('libellés : pastille vide à zéro, « 9+ » au-delà de neuf ; textes accordés', () => {
    expect(badgeLabel(0)).toBe('');
    expect(badgeLabel(3)).toBe('3');
    expect(badgeLabel(12)).toBe('9+');
    expect(unseenLabel(0)).toBe('');
    expect(unseenLabel(1)).toBe('1 nouveauté non vue');
    expect(unseenLabel(4)).toBe('4 nouveautés non vues');
    expect(sinceLabel(0)).toBe('');
    expect(sinceLabel(1)).toBe('1 nouveauté depuis votre dernière visite');
    expect(sinceLabel(2)).toBe('2 nouveautés depuis votre dernière visite');
  });

  it('séparateur « Déjà vu lors de votre visite du … » : date et heure en français', () => {
    expect(seenSeparatorLabel({ date: '2026-09-10', slugs: [], at: '2026-09-25T11:57:30Z' }, 'Europe/Paris'))
      .toBe('Déjà vu lors de votre visite du 25 septembre 2026 à 13:57');
    // L34 : mémoire sans heure de visite = base posée au premier chargement : rien n'a été « vu ».
    expect(seenSeparatorLabel({ date: '2026-09-10', slugs: [], all: true })).toBe('Déjà publié lors de votre première visite du codex');
  });

  it('L34 — base de référence : premier chargement de N’IMPORTE quelle page, rien de mémorisé → tout ce qui est publié est vu, sans heure de visite', () => {
    const st = new MemoryStorage();
    const base = recordBaseline(st, entries);
    expect(base).toEqual({ date: '2026-09-10', slugs: ['a', 'b', 'c'], all: true });
    expect(readSeen(st)).toEqual(base);
    expect(countUnseen(entries, readSeen(st))).toBe(0); // la première visite reste sans pastille
    // Une entrée publiée ensuite compte comme nouvelle, sans jamais avoir ouvert /nouveautes.
    expect(countUnseen([{ slug: 'd', date: '2026-09-12' }, ...entries], readSeen(st))).toBe(1);
  });

  it('L34 — base de référence : une mémoire existante (visite ou base) n’est jamais écrasée ; journal vide = rien', () => {
    const st = new MemoryStorage();
    const visit = JSON.stringify({ date: '2026-09-10', slugs: ['b', 'c'], at: '2026-09-25T11:57:30Z' });
    st.setItem(NEWS_SEEN_KEY, visit);
    expect(recordBaseline(st, [{ slug: 'z', date: '2026-09-30' }, ...entries])).toEqual(readSeen(st));
    expect(st.getItem(NEWS_SEEN_KEY)).toBe(visit);
    expect(recordBaseline(new MemoryStorage(), [])).toBeNull();
    expect(recordBaseline(null, entries)).toBeNull();
  });

  it('L34 — entrée antidatée publiée après la visite : nouvelle avec la mémoire complète (`all`)', () => {
    const st = new MemoryStorage();
    markAllSeen(st, entries);
    const backdated = { slug: 'oubliee', date: '2026-09-01' };
    expect(isUnseen(backdated, readSeen(st))).toBe(true);
    expect(countUnseen([...entries, backdated], readSeen(st))).toBe(1);
  });

  it('L34 — mémoire déjà en production (slugs du dernier jour seulement, sans `all`) : comportement inchangé', () => {
    const st = new MemoryStorage();
    st.setItem(NEWS_SEEN_KEY, JSON.stringify({ date: '2026-09-10', slugs: ['b', 'c'], at: '2026-09-25T11:57:30Z' }));
    const seen = readSeen(st)!;
    expect(seen).toEqual({ date: '2026-09-10', slugs: ['b', 'c'], at: '2026-09-25T11:57:30Z' });
    expect(countUnseen(entries, seen)).toBe(0); // « a », plus ancienne, reste vue
    expect(isUnseen({ slug: 'oubliee', date: '2026-09-01' }, seen)).toBe(false); // antidatée : indécidable, comme avant
    expect(isUnseen({ slug: 'd', date: '2026-09-10' }, seen)).toBe(true);
    st.setItem(NEWS_SEEN_KEY, JSON.stringify({ date: '2026-09-10', slugs: ['b'], all: 'oui' }));
    expect(readSeen(st)!.all).toBeUndefined(); // `all` non booléen ignoré
  });
});
