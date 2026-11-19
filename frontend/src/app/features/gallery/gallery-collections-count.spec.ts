// L64 — « Collections populaires » : le compteur de chaque collection est écrit avec l'accord
// français (1 au singulier, 2 et plus au pluriel), jamais « 1 œuvres ».
import { renderGallery } from '../../../testing/gallery-testbed';
import { describe, expect, it } from 'vitest';
import { of } from 'rxjs';

const COLLECTIONS = [
  { id: 'c1', name: 'Seule', count: 1 },
  { id: 'c2', name: 'Deux', count: 2 },
];

describe('Galerie — compteurs de « Collections populaires » (L64)', () => {
  it('accorde « œuvre » au singulier pour 1, au pluriel dès 2', async () => {
    const f = await renderGallery({ artworkCollections$: of(COLLECTIONS) });
    const textes = Array.from((f.nativeElement as HTMLElement).querySelectorAll('.col-row small')).map((e) => e.textContent?.trim());
    expect(textes).toEqual(['1 œuvre', '2 œuvres']);
  });
});
