// L184 (revue UX L12, Nielsen 1) — Civils Impériaux, chargement : compteurs et filtres à « — » (jamais « 0 »),
// région role=status qui annonce le chargement, conclusion affichée seulement quand la liste est arrivée.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreCiviliansComponent } from './lore-civilians.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/imperial-orgs.json'), 'utf8')) as unknown[];

async function monter(imperialOrgs$: unknown) {
  await setupTestBed([LoreCiviliansComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        imperialOrgs$,
        getWikiImage: () => of({ imageUrl: null, pageTitle: null, pageUrl: null }),
      }),
    },
  ]);
  const f = TestBed.createComponent(LoreCiviliansComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  return { el: f.nativeElement as HTMLElement, settle };
}
const texte = (n: Element) => (n.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('Civils Impériaux, chargement (L184)', () => {
  it('R1 — pendant le chargement : compteurs et filtres à « — », jamais « 0 »', async () => {
    const { el } = await monter(new Subject());
    expect([...el.querySelectorAll('.counter strong')].map(texte)).toEqual(['—', '—', '—']);
    expect([...el.querySelectorAll('.filter')].map(texte)).toEqual([
      'Toutes · —', 'Gouvernance · —', 'Religion · —', 'Militaire · —', 'Psyker · —', 'Commerce · —', 'Formation · —',
    ]);
  });

  it('R2 — une région role=status annonce le chargement, puis se vide quand la liste arrive', async () => {
    const flux = new Subject<unknown[]>();
    const { el, settle } = await monter(flux);
    const statut = el.querySelector('[role="status"]')!;
    expect(statut).not.toBeNull();
    expect(texte(statut)).toBe('Chargement des civils impériaux…');
    flux.next(seed);
    await settle();
    expect(el.querySelector('[role="status"]')).toBe(statut);
    expect(texte(statut)).toBe('');
    expect(texte(el.querySelector('.counter strong')!)).toBe(String(seed.length));
  });

  it('R3 — la conclusion n’apparaît qu’après le chargement', async () => {
    const flux = new Subject<unknown[]>();
    const { el, settle } = await monter(flux);
    expect(el.querySelector('.cta-bottom')).toBeNull();
    flux.next(seed);
    await settle();
    expect(el.querySelector('.cta-bottom')).not.toBeNull();
  });

  it('R4 — en échec : « — », plus de chargement annoncé, la conclusion reste affichée', async () => {
    const { el } = await monter(throwError(() => new Error('500')));
    expect([...el.querySelectorAll('.counter strong')].map(texte)).toEqual(['—', '—', '—']);
    expect(texte(el.querySelector('[role="status"]')!)).toBe('');
    expect(el.querySelector('.cta-bottom')).not.toBeNull();
  });
});
