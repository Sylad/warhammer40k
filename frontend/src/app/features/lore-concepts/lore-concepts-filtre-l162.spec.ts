// L162 — Concepts : une carte « lien inter-concepts » dont le concept visé est masqué par le filtre de catégorie
// remet le filtre à « Tous » puis mène à la section (comme la frise), au lieu de ne rien faire.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreConceptsComponent } from './lore-concepts.component';

const concept = (id: string, category: string, relies: { name: string; conceptId?: string }[] = []) => ({
  id, number: 1, name: id, title: id, category, color: '#fff', sigil: '✦', wikiQuery: '',
  description: '', loreLong: '', keyFacts: [], relatedConcepts: relies,
});

afterEach(() => history.replaceState(null, '', '/'));

async function monter(filtre: 'imperial' | 'all') {
  await setupTestBed([LoreConceptsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      loreConcepts$: of([
        concept('trone', 'imperial', [{ name: 'Webway', conceptId: 'webway' }, { name: 'Palais', conceptId: 'palais' }]),
        concept('palais', 'imperial'),
        concept('webway', 'warp'),
      ]),
    }) },
  ]);
  const f = TestBed.createComponent(LoreConceptsComponent);
  f.detectChanges();
  await f.whenStable();
  f.componentInstance.setFilter(filtre);
  f.detectChanges();
  document.body.appendChild(f.nativeElement as HTMLElement);
  return f;
}

describe('Concepts : lien vers un concept masqué par le filtre (L162)', () => {
  it('R1 — filtre Impérial, lien vers un concept du Warp : le filtre revient à « Tous », la section reçoit le focus et #id', async () => {
    const f = await monter('imperial');
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('#webway')).toBeNull();
    const defile = vi.fn();
    Element.prototype.scrollIntoView = defile;
    el.querySelector<HTMLAnchorElement>('a.related-card')!.click();
    f.detectChanges();
    await new Promise(r => setTimeout(r, 120));
    expect(f.componentInstance.filterCategory()).toBe('all');
    const cible = el.querySelector<HTMLElement>('#webway')!;
    expect(cible).not.toBeNull();
    expect(document.activeElement).toBe(cible);
    expect(location.hash).toBe('#webway');
    expect(defile).toHaveBeenCalled();
    el.remove();
  });

  it('R2 — le concept visé est déjà visible : le filtre en cours est conservé', async () => {
    const f = await monter('imperial');
    const el = f.nativeElement as HTMLElement;
    Element.prototype.scrollIntoView = vi.fn();
    const carte = [...el.querySelectorAll<HTMLAnchorElement>('a.related-card')].find(a => a.textContent?.includes('Palais'))!;
    carte.click();
    f.detectChanges();
    await new Promise(r => setTimeout(r, 120));
    expect(f.componentInstance.filterCategory()).toBe('imperial');
    expect(document.activeElement).toBe(el.querySelector('#palais'));
    el.remove();
  });
});
