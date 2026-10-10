// L79 (revue UX L2, Nielsen 1) : pas de faux « 0 » pendant le chargement ni sur erreur d'API.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { WarhammerService } from '../../core/services/warhammer.service';

const list = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
const $ = (f: ComponentFixture<unknown>, sel: string) => (f.nativeElement as HTMLElement).querySelector(sel) as HTMLElement | null;
const $$ = (f: ComponentFixture<unknown>, sel: string) => [...(f.nativeElement as HTMLElement).querySelectorAll(sel)] as HTMLElement[];
const nums = (f: ComponentFixture<unknown>) => $$(f, '.shortcut .num, .stat strong').map((e) => (e.textContent ?? '').trim());

async function render(overrides: Record<string, unknown>): Promise<ComponentFixture<DashboardComponent>> {
  // Descripteurs copiés tels quels : un getter reste évalué à chaque lecture (rechargement).
  const svc = { loreFeed: () => of([]) };
  Object.defineProperties(svc, Object.getOwnPropertyDescriptors(overrides));
  await setupTestBed([DashboardComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService(svc) },
  ]);
  const f = TestBed.createComponent(DashboardComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

const OK = {
  factions$: of(list(5)), series$: of(list(7)), videos$: of(list(9)), artworks$: of(list(11)),
  getSubFactions: () => of(list(13)),
};

describe('Accueil — compteurs (L79)', () => {
  beforeEach(() => localStorage.clear());

  it('chargement : « — » partout, jamais « 0 », ni message d’erreur', async () => {
    const f = await render({ factions$: NEVER, series$: NEVER, videos$: NEVER, artworks$: NEVER, getSubFactions: () => NEVER });
    expect(nums(f)).toEqual(['—', '—', '—', '—', '—', '—', '—', '—', '—']);
    expect($(f, '[role="alert"]')).toBeNull();
  });

  it('succès : les vrais nombres', async () => {
    const f = await render(OK);
    expect(nums(f)).toEqual(['5', '7', '9', '11', '5', '13', '7', '9', '11']);
    expect($(f, '[role="alert"]')).toBeNull();
  });

  it('vrai zéro (liste vide chargée) : « 0 » reste affiché', async () => {
    const f = await render({ ...OK, videos$: of([]) });
    expect(nums(f)[2]).toBe('0');
  });

  it('erreur : « — » pour la source en échec, message et bouton Réessayer', async () => {
    const f = await render({ ...OK, videos$: throwError(() => new Error('500')) });
    expect(nums(f)[2]).toBe('—');
    expect(nums(f)[0]).toBe('5');
    expect(($(f, '[role="alert"]')?.textContent ?? '')).toContain('Certains chiffres n’ont pas pu être chargés');
    expect($(f, '[role="alert"] button')?.textContent?.trim()).toBe('Réessayer');
  });

  it('Réessayer : recharge, le message disparaît et les nombres arrivent', async () => {
    let fail = true;
    const f = await render({
      ...OK,
      get videos$() { return fail ? throwError(() => new Error('500')) : of(list(9)); },
    });
    expect($(f, '[role="alert"]')).not.toBeNull();
    fail = false;
    $(f, '[role="alert"] button')!.click();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect($(f, '[role="alert"]')).toBeNull();
    expect(nums(f)[2]).toBe('9');
  });
});
