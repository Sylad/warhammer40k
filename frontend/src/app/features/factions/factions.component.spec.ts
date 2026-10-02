// L39 — 6 des 17 icônes de faction (adresses du wiki Fandom) répondent 404 : la carte montrait
// une image cassée et son texte de remplacement. Une icône qui ne se charge pas cède la place au
// symbole de la faction.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { FactionsComponent } from './factions.component';

const F = (id: string, iconUrl?: string) => ({
  id, nom: id, alignement: 'Imperium', symbole: '✠', description: 'd', couleurThematique: '#123456', iconUrl,
});

describe('liste des factions — icône introuvable (L39)', () => {
  it('l’image en erreur est remplacée par le symbole ; les autres icônes restent', async () => {
    const service = fakeWarhammerService({
      factions$: of([F('a', 'https://example.invalid/a.png'), F('b', 'https://example.invalid/b.png')]),
      getUnits: () => of([]),
    });
    await setupTestBed([FactionsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
    const f = TestBed.createComponent(FactionsComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const imgs = () => [...el.querySelectorAll<HTMLImageElement>('.card-sigil img')];
    expect(imgs()).toHaveLength(2);
    imgs()[0].dispatchEvent(new Event('error'));
    f.detectChanges();
    expect(imgs().map((i) => i.getAttribute('src'))).toEqual(['https://example.invalid/b.png']);
    expect(el.querySelector('.card-sigil span')?.textContent).toBe('✠');
  });
});
