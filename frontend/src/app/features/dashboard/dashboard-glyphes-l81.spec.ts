// L81 (revue UX L2, WCAG 1.1.1 / 4.1.2) : les glyphes décoratifs de l'accueil (⚔ ▤ ▶ ▦ ✠ ⚜ ☠ →)
// sont masqués aux technologies d'assistance, comme en L39 ailleurs — le nom accessible d'un lien
// ne commence plus par « ⚔ » ou « ✠ ».
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { WarhammerService } from '../../core/services/warhammer.service';

const GLYPHES = /[⚔▤▶▦✠⚜☠→]/;

// Texte lu par un lecteur d'écran : les sous-arbres aria-hidden sont ignorés.
function texteAccessible(n: Node): string {
  if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? '';
  if (n.nodeType !== Node.ELEMENT_NODE) return '';
  if ((n as Element).getAttribute('aria-hidden') === 'true') return '';
  return [...n.childNodes].map(texteAccessible).join('');
}

describe('Accueil — glyphes décoratifs (L81)', () => {
  it('aucun glyphe n’est lu : tous sont dans un élément aria-hidden', async () => {
    await setupTestBed([DashboardComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: fakeWarhammerService({
        loreFeed: () => of([]), factions$: of([]), series$: of([]), videos$: of([]), artworks$: of([]), getSubFactions: () => of([]),
      }) },
    ]);
    const f = TestBed.createComponent(DashboardComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    const liens = [...root.querySelectorAll<HTMLElement>('a.cta-primary, a.cta-secondary, a.ql-card, a.shortcut')];
    expect(liens).toHaveLength(9);
    for (const a of liens) expect(texteAccessible(a)).not.toMatch(GLYPHES);
    expect(texteAccessible(root.querySelector('a.cta-primary')!).trim()).toBe('Explorer les factions');
    expect(texteAccessible(root.querySelector('a.cta-secondary')!).trim()).toBe('Le Trône d\'Or');
    // Le texte visible reste affiché (glyphe toujours présent dans le DOM).
    expect(root.querySelector('a.cta-primary')!.textContent).toContain('⚔');
  });
});
