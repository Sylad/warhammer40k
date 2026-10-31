// L220 — Galerie : « Réessayer » des images personnelles (état de chargement, nouvelle annonce après un
// nouvel échec), noms accessibles distincts quand catalogue et images perso échouent ensemble, blocs compacts.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { provideRouter, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

const ARTWORKS = [{ id: 'aw-001', title: 'Ultramarines', artist: 'A', image: 'u.jpg', category: 'Space Marines', faction: 'space-marines', likes: 1 }];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ROUTES: Routes = [{ path: 'gallery', component: GalleryComponent }];

async function setup(images$: Observable<unknown>, artworks$: Observable<unknown> = of(ARTWORKS)) {
  await setupTestBed([GalleryComponent], [
    provideRouter(ROUTES),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      artworks$, factions$: of([]), images$,
      getImageMeta: () => of({}),
      getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
    }) },
  ]);
  const h = await RouterTestingHarness.create();
  await h.navigateByUrl('/gallery', GalleryComponent);
  const settle = async () => { await wait(150); h.detectChanges(); };
  await settle();
  const q = (id: string) => h.routeNativeElement!.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  return { h, settle, q };
}

describe('galerie — Réessayer des images personnelles (L220)', () => {
  it('R1 — pendant la relecture : « Chargement de Mes images… » annoncé, l’alerte et le bouton (focus) restent', async () => {
    const pending = new Subject<string[]>();
    let relecture = false;
    let calls = 0;
    const images$ = new Observable<string[]>((s) => { if (!relecture) return s.error(new Error('500')); calls++; return pending.subscribe(s); });
    const { settle, q } = await setup(images$);
    const bouton = q('bouton-reessayer-images')!;
    bouton.focus();
    relecture = true;
    bouton.click();
    await settle();
    expect(q('message-erreur-images')).toBeNull();
    expect(q('message-chargement-images')?.textContent).toBe('Chargement de Mes images…');
    expect(q('message-chargement-images')?.getAttribute('role')).toBe('status');
    expect(q('bouton-reessayer-images')).toBe(bouton); // même nœud : le focus n'est pas perdu
    expect(bouton.getAttribute('aria-disabled')).toBe('true');
    expect(calls).toBe(1);
    const avant = calls;
    bouton.click(); // ignoré pendant la lecture
    await settle();
    expect(calls).toBe(avant);
    pending.next(['perso.jpg']); pending.complete();
    await settle();
    expect(q('message-chargement-images')).toBeNull();
    expect(q('bouton-reessayer-images')).toBeNull();
  });

  it('R2 — nouvel échec après « Réessayer » : l’alerte est réinsérée (nouveau nœud, donc ré-annoncée)', async () => {
    let relecture: Subject<string[]> | null = null; // 1re lecture : échec immédiat ; relecture : échec plus tard, comme une requête HTTP
    const images$ = new Observable<string[]>((s) => {
      if (!relecture) { s.error(new Error('500')); return; }
      return relecture.subscribe(s);
    });
    const { h, settle, q } = await setup(images$);
    const premiere = q('message-erreur-images')!;
    relecture = new Subject<string[]>();
    q('bouton-reessayer-images')!.click();
    await settle();
    expect(q('message-chargement-images')).not.toBeNull();
    relecture.error(new Error('500'));
    await settle();
    const seconde = q('message-erreur-images')!;
    expect(seconde.textContent).toBe('Impossible de charger Mes images.');
    expect(seconde.getAttribute('role')).toBe('alert');
    expect(seconde).not.toBe(premiere);
    expect(q('message-chargement-images')).toBeNull();
  });

  it('R2 — première lecture : aucun message de chargement des images', async () => {
    const { q } = await setup(of(['perso.jpg']));
    expect(q('message-chargement-images')).toBeNull();
  });

  it('R3 — catalogue et images perso en échec : deux « Réessayer » de noms accessibles distincts', async () => {
    const { h, q } = await setup(throwError(() => new Error('500')), throwError(() => new Error('500')));
    const boutons = Array.from(h.routeNativeElement!.querySelectorAll<HTMLElement>('button')).filter((b) => b.textContent?.trim() === 'Réessayer');
    expect(boutons).toHaveLength(2);
    const noms = boutons.map((b) => b.getAttribute('aria-label'));
    expect(new Set(noms).size).toBe(2);
    expect(q('bouton-reessayer')!.getAttribute('aria-label')).toBe('Réessayer le chargement de la galerie');
    expect(q('bouton-reessayer-images')!.getAttribute('aria-label')).toBe('Réessayer le chargement de Mes images');
  });

  it('R4 — les blocs d’échec ne sont plus le grand encadré « .empty » et sont espacés du suivant', async () => {
    const { q } = await setup(throwError(() => new Error('500')), throwError(() => new Error('500')));
    expect(q('message-erreur')!.parentElement!.className).toBe('etat-erreur');
    expect(q('message-erreur-images')!.parentElement!.className).toBe('etat-erreur');
    const css = readFileSync(resolve(__dirname, '../../../styles/_gallery-filtres.scss'), 'utf8');
    const regle = css.match(/\.etat-erreur \{([^}]*)\}/)![1];
    expect(regle).toMatch(/margin: 0 0 16px/);
    expect(regle).toMatch(/padding: 12px 16px/);
  });
});
