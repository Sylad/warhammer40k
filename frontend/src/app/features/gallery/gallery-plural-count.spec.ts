// L58 — Galerie : l'en-tête et les pastilles de catégories accordent « œuvre » (0 et 1 au
// singulier, 2 et plus au pluriel), jamais « 1 œuvres » (relevé QA du 04-10).
import { renderGallery } from '../../../testing/gallery-testbed';
import { describe, expect, it } from 'vitest';
import { of } from 'rxjs';

const art = (id: string, category: string) => ({ id, title: id, artist: 'A', image: `${id}.jpg`, category, faction: 'x', likes: 1 });

async function render(artworks: unknown[]): Promise<HTMLElement> {
  return (await renderGallery({ artworks$: of(artworks), factions$: of([]), images$: of([]) })).nativeElement as HTMLElement;
}

const compact = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

describe('Galerie — accord de « œuvre » (L58)', () => {
  it('une seule œuvre : « 1 œuvre triée… » et « 1 œuvre » sur sa catégorie', async () => {
    const el = await render([art('a1', 'Xénos')]);
    expect(compact(el.querySelector('.hero-desc')?.textContent)).toContain('1 œuvre triée, classée et archivée.');
    const compteurs = Array.from(el.querySelectorAll('.cat-count')).map((e) => compact(e.textContent));
    expect(compteurs).toContain('1 œuvre');
    expect(compteurs.some((t) => /\b1 œuvres/.test(t))).toBe(false);
  });

  it('plusieurs œuvres : pluriel partout', async () => {
    const el = await render([art('a1', 'Xénos'), art('a2', 'Xénos')]);
    expect(compact(el.querySelector('.hero-desc')?.textContent)).toContain('2 œuvres triées, classées et archivées.');
    expect(Array.from(el.querySelectorAll('.cat-count')).map((e) => compact(e.textContent))).toContain('2 œuvres');
  });
});
