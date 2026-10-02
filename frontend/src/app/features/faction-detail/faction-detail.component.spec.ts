// Revue UX L39 — glyphes décoratifs des cartes « Médias » (▶, ▦) masqués aux technologies
// d'assistance : le nom accessible de la carte commence par son titre, pas par le glyphe.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { FactionDetailComponent } from './faction-detail.component';

describe('fiche faction — cartes Médias (L39)', () => {
  it('▶ et ▦ sont aria-hidden ; le texte de la carte reste lisible', async () => {
    const service = fakeWarhammerService({
      getFaction: () => of({ id: 'orks', nom: 'Orks', alignement: 'Xenos', symbole: '☠', description: 'd', couleurThematique: '#3a5' }),
      getUnits: () => of([]),
      getSubFactions: () => of([]),
      videos$: of([{ id: 'v', titre: 'Une vidéo', embedId: 'abc', embedType: 'video', featured: true }]),
      artworks$: of([]),
    });
    await setupTestBed([FactionDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'orks' })), snapshot: { fragment: null } } },
    ]);
    const f = TestBed.createComponent(FactionDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const cards = [...(f.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('a.media-card')];
    expect(cards).toHaveLength(2);
    for (const c of cards) {
      const glyph = c.querySelector('.play')!;
      expect(glyph.getAttribute('aria-hidden')).toBe('true');
    }
    expect(cards[0].querySelector('strong')!.textContent).toBe('Vidéo à la une');
  });
});
