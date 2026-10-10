// L80 (revue UX L2, Nielsen 8) : au téléphone la barre de statistiques disparaît, « sous-factions » passe sur la carte Factions.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { WarhammerService } from '../../core/services/warhammer.service';

const list = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));

async function render(sub: unknown) {
  const svc = {
    loreFeed: () => of([]),
    factions$: of(list(5)), series$: of(list(7)), videos$: of(list(9)), artworks$: of(list(11)),
    getSubFactions: () => sub,
  };
  await setupTestBed([DashboardComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService(svc) },
  ]);
  const f = TestBed.createComponent(DashboardComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}
const subs = (el: HTMLElement) => [...el.querySelectorAll('.shortcut-sub')].map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim());

describe('Accueil au téléphone (L80)', () => {
  it('la carte Factions, et elle seule, porte « 13 sous-factions »', async () => {
    const el = await render(of(list(13)));
    expect(subs(el)).toEqual(['13 sous-factions']);
    expect(el.querySelector('.shortcut[href="/factions"] .shortcut-sub')).not.toBeNull();
  });

  it('chargement : « — sous-factions », jamais « 0 »', async () => {
    expect(subs(await render(NEVER))).toEqual(['— sous-factions']);
  });
});
