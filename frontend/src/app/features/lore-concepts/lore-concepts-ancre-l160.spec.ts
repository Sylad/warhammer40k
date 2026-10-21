// L160 — Concepts : une carte « lien inter-concepts » mène vraiment à la section du concept lié
// (focus sur la section, #id écrit), au lieu de ne changer que le fragment du routeur.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreConceptsComponent } from './lore-concepts.component';

const concept = (id: string, relies: { name: string; conceptId?: string }[] = []) => ({
  id, number: 1, name: id, title: id, category: 'world', color: '#fff', sigil: '✦', wikiQuery: '',
  description: '', loreLong: '', keyFacts: [], relatedConcepts: relies,
});

afterEach(() => history.replaceState(null, '', '/'));

describe('Concepts : liens inter-concepts (L160)', () => {
  it('R1 — activer une carte liée donne le focus à la section du concept visé et écrit son #id', async () => {
    await setupTestBed([LoreConceptsComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: fakeWarhammerService({
        loreConcepts$: of([concept('cadia', [{ name: 'Eye of Terror', conceptId: 'eye-of-terror' }]), concept('eye-of-terror')]),
      }) },
    ]);
    const f = TestBed.createComponent(LoreConceptsComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    document.body.appendChild(el);
    const cible = el.querySelector<HTMLElement>('#eye-of-terror')!;
    cible.scrollIntoView = vi.fn();
    el.querySelector<HTMLAnchorElement>('a.related-card')!.click();
    expect(document.activeElement).toBe(cible);
    expect(location.hash).toBe('#eye-of-terror');
    expect(cible.scrollIntoView).toHaveBeenCalled();
    el.remove();
  });
});
