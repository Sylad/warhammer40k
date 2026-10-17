// L136 (logique des onglets de la page Romans, revue UX L5) : R1–R2 chargement et erreur,
// R3 « Continuer ma lecture », R4–R5 « Ordre de lecture » par clé d'époque.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError, type Observable } from 'rxjs';
import { SeriesComponent } from './series.component';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Serie } from '../../core/models/models';

function serie(id: string, over: Partial<Serie> = {}): Serie {
  return {
    id, titre: id, titreVO: id, auteurs: ['Auteur'], nbLivres: 4, epoque: 'M41', epoqueOrdre: 410,
    factionIds: [], tags: [], premierLivre: 'Livre', description: 'Desc', niveauEntree: 'Facile', readBooks: 0, ...over,
  };
}

async function render(series$: Observable<Serie[]>): Promise<ComponentFixture<SeriesComponent>> {
  await setupTestBed([SeriesComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ series$ }) },
  ]);
  const f = TestBed.createComponent(SeriesComponent);
  document.body.appendChild(f.nativeElement);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}
const $ = (f: ComponentFixture<unknown>, sel: string) => (f.nativeElement as HTMLElement).querySelector(sel) as HTMLElement | null;
const $$ = (f: ComponentFixture<unknown>, sel: string) => [...(f.nativeElement as HTMLElement).querySelectorAll(sel)] as HTMLElement[];
const tick = async (f: ComponentFixture<unknown>) => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
const titles = (f: ComponentFixture<unknown>) => $$(f, '.card-title').map((e) => e.textContent?.trim());
const text = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).textContent ?? '';

beforeEach(() => { document.body.innerHTML = ''; });

describe('Romans — chargement et erreur (L136)', () => {
  it('R1 — pendant le chargement : liste aria-busy, aucun compteur, ni « Aucune série » ni « 0 % »', async () => {
    const f = await render(new Subject<Serie[]>());
    expect($(f, '#liste-series')?.getAttribute('aria-busy')).toBe('true');
    expect(text(f)).not.toContain('Aucune série');
    expect(text(f)).not.toContain('0%');
    expect(text(f)).not.toContain('Total : 0');
    expect($(f, '.prog-total')?.textContent).toContain('—');
    expect($(f, '.prog-list')?.textContent).not.toMatch(/\b0\b/);
    expect($(f, '[role=status]')?.textContent).toContain('Chargement');
  });

  it('R1 — une fois chargé : plus aria-busy, les compteurs reviennent', async () => {
    const src = new Subject<Serie[]>();
    const f = await render(src);
    src.next([serie('a', { readBooks: 4 })]);
    await tick(f);
    expect($(f, '#liste-series')?.getAttribute('aria-busy')).toBe('false');
    expect($(f, '.prog-total')?.textContent).toContain('Total : 4 romans');
    expect($(f, '.donut-pct')?.textContent).toContain('100%');
  });

  it('R2 — après une erreur : compteurs masqués, pas de « Aucune série », message d’erreur seul', async () => {
    const f = await render(throwError(() => new Error('500')));
    expect($(f, '#liste-series')?.getAttribute('aria-busy')).toBe('false');
    expect($(f, 'app-load-error')).not.toBeNull();
    expect(text(f)).not.toContain('Aucune série');
    expect(text(f)).not.toContain('0%');
    expect($(f, '.prog-total')?.textContent).not.toContain('0');
    expect($(f, '.prog-total')?.textContent).toContain('—');
  });

  it('R1 — une liste réellement vide (chargée) garde son message', async () => {
    const f = await render(of([]));
    expect($(f, '.empty')?.textContent).toContain('Aucune série à afficher.');
  });
});

describe('Romans — Continuer ma lecture (L136)', () => {
  const list = [
    serie('Eisenhorn', { nbLivres: 3, readBooks: 3 }),
    serie('Gaunt', { nbLivres: 15, readBooks: 3 }),
    serie('Horus', { nbLivres: 4, readBooks: 3 }),
    serie('Jamais', { nbLivres: 4, readBooks: 0 }),
  ];

  it('R3 — ne garde que les séries commencées et non terminées, les plus avancées d’abord', async () => {
    const f = await render(of(list));
    $$(f, '.link-list button').find((b) => b.textContent?.includes('Continuer'))!.click();
    await tick(f);
    expect(titles(f)).toEqual(['Horus', 'Gaunt']);
  });

  it('R3 — choisir un onglet sort du mode « Continuer » : la bibliothèque montre aussi les séries terminées', async () => {
    const f = await render(of(list));
    $$(f, '.link-list button').find((b) => b.textContent?.includes('Continuer'))!.click();
    await tick(f);
    $$(f, '.tab').find((t) => t.textContent?.trim() === 'Ma bibliothèque')!.click();
    await tick(f);
    expect(titles(f)).toContain('Eisenhorn');
  });

  it('R3 — la note et « Voir toute ma bibliothèque » n’existent qu’en mode « Continuer » ; le bouton en sort', async () => {
    const f = await render(of(list));
    expect($(f, '.continue-note')).toBeNull();
    $$(f, '.link-list button').find((b) => b.textContent?.includes('Continuer'))!.click();
    await tick(f);
    expect($(f, '.continue-note')).not.toBeNull();
    expect(titles(f)).not.toContain('Eisenhorn');
    $$(f, '.continue-note button').find((b) => b.textContent?.includes('Voir toute ma bibliothèque'))!.click();
    await tick(f);
    expect($(f, '.continue-note')).toBeNull();
    expect(titles(f)).toContain('Eisenhorn');
  });

  it('R3 — rien en cours : l’état vide nomme « Continuer ma lecture »', async () => {
    const f = await render(of([serie('Fini', { nbLivres: 2, readBooks: 2 })]));
    $$(f, '.link-list button').find((b) => b.textContent?.includes('Continuer'))!.click();
    await tick(f);
    expect($(f, '.empty')?.textContent).toContain('Continuer ma lecture');
  });
});

describe('Romans — Ordre de lecture (L136)', () => {
  const list = [
    serie('Siège de Terra', { epoque: 'M30 — Apogée de l’Hérésie', epoqueOrdre: 302 }),
    serie('Dawn', { epoque: 'M42 — Ère Indomitus', epoqueOrdre: 460 }),
    serie('Hérésie', { epoque: 'M30 — Grande Croisade & Hérésie', epoqueOrdre: 300 }),
    serie('Ancien', { epoque: 'M41', epoqueOrdre: 410 }),
  ];

  it('R4 — l’ordre suit la clé d’époque, pas l’alphabet du texte libre', async () => {
    const f = await render(of(list));
    $$(f, '.tab').find((t) => t.textContent?.trim() === 'Ordre de lecture')!.click();
    await tick(f);
    expect(titles(f)).toEqual(['Hérésie', 'Siège de Terra', 'Ancien', 'Dawn']);
  });

  it('R4 — à clé égale, l’ordre alphabétique des titres départage', async () => {
    const f = await render(of([serie('Zeta'), serie('Alpha')]));
    $$(f, '.tab').find((t) => t.textContent?.trim() === 'Ordre de lecture')!.click();
    await tick(f);
    expect(titles(f)).toEqual(['Alpha', 'Zeta']);
  });

  it('R5 — l’époque est affichée sur chaque carte', async () => {
    const f = await render(of(list));
    const eras = $$(f, '.card-epoque').map((e) => e.textContent?.trim());
    expect(eras).toHaveLength(4);
    expect(eras).toContain('M42 — Ère Indomitus');
  });
});
