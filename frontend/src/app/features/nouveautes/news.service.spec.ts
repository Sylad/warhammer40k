// L34 — la pastille des Nouveautés vaut aussi pour le visiteur qui n'ouvre jamais /nouveautes :
// le premier chargement du journal (sur n'importe quelle page) pose une base de référence.
import { setupTestBed, stubFetch } from '../../../testing/angular-testbed';
import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NewsService } from './news.service';
import { NEWS_SEEN_KEY } from './news-badge';

const entry = (slug: string, date: string) => ({ slug, title: slug, date, lots: [], captures: [], html: '' });
const JOURNAL = { project: 'warhammer40k', generated: '', entries: [entry('b', '2026-10-01'), entry('a', '2026-09-28')] };

async function freshService(): Promise<NewsService> {
  await setupTestBed([]);
  return TestBed.inject(NewsService);
}

describe('NewsService — base de référence (L34)', () => {
  beforeEach(() => {
    localStorage.clear();
    stubFetch({ '/nouveautes-data/nouveautes.json': JOURNAL, '/nouveautes-data/tailles.json': {} });
  });

  it('premier chargement, rien de mémorisé : base posée (tout vu, sans heure de visite), aucune pastille', async () => {
    const news = await freshService();
    await news.load();
    expect(JSON.parse(localStorage.getItem(NEWS_SEEN_KEY)!)).toEqual({ date: '2026-10-01', slugs: ['a', 'b'], all: true });
    expect(news.unseen()).toBe(0);
  });

  it('visiteur qui n’a jamais ouvert /nouveautes : une entrée publiée ensuite allume la pastille', async () => {
    await (await freshService()).load(); // première visite (accueil, par exemple)
    stubFetch({ '/nouveautes-data/nouveautes.json': { ...JOURNAL, entries: [entry('c', '2026-10-05'), ...JOURNAL.entries] } });
    const later = await freshService(); // visite suivante : nouvelle instance de l'application
    await later.load();
    expect(later.unseen()).toBe(1);
  });

  it('mémoire déjà en production (visite d’avant L34) : laissée telle quelle', async () => {
    const prod = JSON.stringify({ date: '2026-09-28', slugs: ['a'], at: '2026-09-29T08:30:00Z' });
    localStorage.setItem(NEWS_SEEN_KEY, prod);
    const news = await freshService();
    await news.load();
    expect(localStorage.getItem(NEWS_SEEN_KEY)).toBe(prod);
    expect(news.unseen()).toBe(1); // « b », publiée après la visite
  });

  it('journal illisible : rien n’est écrit', async () => {
    stubFetch({});
    const news = await freshService();
    await news.load();
    expect(localStorage.getItem(NEWS_SEEN_KEY)).toBeNull();
  });

  it('L85 : *titre* d’une entrée est servi en <em>, sans astérisque littéral', async () => {
    stubFetch({ '/nouveautes-data/nouveautes.json': { ...JOURNAL, entries: [{ ...entry('c', '2026-10-05'), html: '<p>*Horus Rising*</p>' }] } });
    const news = await freshService();
    await news.load();
    expect(news.entries()[0].html).toBe('<p><em>Horus Rising</em></p>');
  });
});
