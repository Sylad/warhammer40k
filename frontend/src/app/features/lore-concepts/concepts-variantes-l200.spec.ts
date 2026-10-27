// L200 — QA prod L197/L198 : la galerie de la visionneuse des Concepts listait des vignettes de repli (Pict-File_Unavailable),
// hors sujet (Red_Templars_Biker pour le Codex Astartes, LorgarArt pour Cadia) ou la carte de l'Imperium, et 8 concepts sur 15
// lançaient 3-4 requêtes qui retombaient sur cette carte. Les variantes sont filtrées et enchaînées comme à L190.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreConceptsComponent } from './lore-concepts.component';
import { varianteDuSujet } from './concept-variantes';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/lore-concepts.json'), 'utf8'));
const concept = (id: string) => seed.find((c: { id: string }) => c.id === id);
type Rep = { imageUrl: string | null; pageTitle: string | null };

async function monter(reponse: (q: string) => Rep | 'ERREUR') {
  const demandes: string[] = [];
  await setupTestBed([LoreConceptsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      loreConcepts$: of(seed),
      getWikiImage: (q: string) => { demandes.push(q); const r = reponse(q); return r === 'ERREUR' ? throwError(() => new Error('HTTP')) : of({ ...r, pageUrl: null }); },
    }) },
  ]);
  const f = TestBed.createComponent(LoreConceptsComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  await settle();
  return { demandes, f, settle };
}

async function ouvrir(id: string, reponse: (q: string) => Rep | 'ERREUR') {
  const m = await monter(reponse);
  m.demandes.length = 0;
  m.f.componentInstance.openLightbox(concept(id));
  await m.settle();
  return { ...m, thumbs: m.f.componentInstance.lightbox()!.thumbUrls };
}

describe('Concepts — variantes de la visionneuse filtrées (L200)', () => {
  it('R1 — une variante dont l\'image est un fichier « indisponible » n\'est jamais listée (Pict-File_Unavailable)', () => {
    expect(varianteDuSujet(concept('codex-astartes'), { imageUrl: 'https://static.wikia.nocookie.net/x/Pict-File_Unavailable.png', pageTitle: 'Codex Astartes' })).toBe(false);
    expect(varianteDuSujet(concept('codex-astartes'), { imageUrl: 'https://static.wikia.nocookie.net/x/Codex.jpg', pageTitle: 'Codex Astartes' })).toBe(true);
  });

  it('R2 — une variante dont la page n\'est pas celle du sujet est écartée (Red Templars pour le Codex Astartes, Lorgar pour Cadia)', () => {
    expect(varianteDuSujet(concept('codex-astartes'), { imageUrl: 'http://i/Red_Templars_Biker.jpg', pageTitle: 'Red Templars' })).toBe(false);
    expect(varianteDuSujet(concept('cadia'), { imageUrl: 'http://i/LorgarArt.jpg', pageTitle: 'Lorgar' })).toBe(false);
    expect(varianteDuSujet(concept('cadia'), { imageUrl: 'http://i/Cadia2.jpg', pageTitle: 'Cadia' })).toBe(true);
  });

  it('R3 — une variante sans page (pageTitle absent) ni image est écartée', () => {
    expect(varianteDuSujet(concept('cadia'), { imageUrl: 'http://i/x.jpg', pageTitle: null })).toBe(false);
    expect(varianteDuSujet(concept('cadia'), { imageUrl: null, pageTitle: 'Cadia' })).toBe(false);
  });

  it('R4 — les variantes qui retombent sur l\'image de la carte : une seule requête, la galerie reste à l\'image du concept', async () => {
    const CARTE = 'http://img/carte-imperium';
    const { demandes, thumbs } = await ouvrir('imperium-sanctus', () => ({ imageUrl: CARTE, pageTitle: 'Imperium of Man' }));
    expect(demandes).toEqual(['Imperium of Man art']);
    expect(thumbs).toEqual([CARTE]);
  });

  it('R5 — une variante hors sujet est écartée et la chaîne continue ; une variante du sujet est listée', async () => {
    const { thumbs, demandes } = await ouvrir('cadia', q => q === 'Cadia art'
      ? { imageUrl: 'http://img/LorgarArt', pageTitle: 'Lorgar' }
      : { imageUrl: `http://img/${q}`, pageTitle: 'Cadia' });
    expect(thumbs).not.toContain('http://img/LorgarArt');
    expect(demandes.length).toBe(4);
    expect(thumbs.length).toBe(4);
  });

  it('R6 — une erreur HTTP sur une variante n\'arrête pas la chaîne (comme L193)', async () => {
    const { thumbs, demandes } = await ouvrir('cadia', q => q === 'Cadia art' ? 'ERREUR' : { imageUrl: `http://img/${q}`, pageTitle: 'Cadia' });
    expect(demandes.length).toBe(4);
    expect(thumbs.length).toBe(4);
  });
});
