import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setupTestBed } from '../../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../../testing/fake-warhammer-service';
import { WarhammerService } from '../../../core/services/warhammer.service';
import { CommandPaletteComponent } from './command-palette.component';

async function monter(over: Record<string, unknown>, ouvrir = true) {
  await setupTestBed([CommandPaletteComponent as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService(over) },
  ]);
  const f = TestBed.createComponent(CommandPaletteComponent);
  f.detectChanges();
  await f.whenStable();
  const palette = f.componentInstance;
  if (ouvrir) { palette.open(); f.detectChanges(); }
  const chercher = (q: string) => { palette.query = q; palette.onQueryChange(q); f.detectChanges(); };
  return { f, palette, el: f.nativeElement as HTMLElement, chercher };
}

describe('palette Ctrl+K (L117)', () => {
  // Détruit les composants (donc annule le timer de focus) avant la fin du fichier.
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('une sous-faction est trouvable et mène à /subfactions/:id', async () => {
    const { el, chercher } = await monter({
      factions$: of([{ id: 'space-marines', nom: 'Space Marines', alignement: 'Imperium' }]),
      subFactions$: of([{ id: 'ultramarines', factionId: 'space-marines', name: 'Ultramarines', type: 'chapter' }]),
    });
    chercher('ultramarines');
    const item = Array.from(el.querySelectorAll<HTMLAnchorElement>('.cmdk-item'))
      .find(a => a.querySelector('.cmdk-type')?.textContent?.trim() === 'Sous-faction');
    expect(item).toBeTruthy();
    expect(item!.querySelector('.cmdk-label')!.textContent).toContain('Ultramarines');
    expect(item!.getAttribute('href')).toBe('/subfactions/ultramarines');
    expect(item!.querySelector('.cmdk-sub')!.textContent).toContain('Space Marines');
  });

  it('le sous-libellé d’un équipement est le libellé traduit, pas le code brut', async () => {
    const { el, chercher } = await monter({
      equipment$: of([{ id: 'x', name: 'Hache de Khorne', subCategory: 'daemon-weapon', type: 'weapon', factionIds: [] }]),
    });
    chercher('khorne');
    const sub = el.querySelector('.cmdk-sub')!.textContent!;
    expect(sub).toContain('Daemon weapon');
    expect(sub).not.toContain('daemon-weapon');
  });

  it('une sous-faction en échec au démarrage est relancée à la réouverture', async () => {
    let appels = 0;
    const { f, palette, el, chercher } = await monter({
      subFactions$: new (await import('rxjs')).Observable<unknown[]>((o) => {
        appels++;
        if (appels === 1) o.error(new Error('500'));
        else { o.next([{ id: 'ultramarines', factionId: 'f', name: 'Ultramarines', type: 'chapter' }]); o.complete(); }
      }),
    });
    expect(appels).toBe(1); // chargée à la première ouverture (échec)
    palette.close(); palette.open(); f.detectChanges(); await f.whenStable(); f.detectChanges();
    expect(appels).toBe(2); // relancée à la réouverture
    chercher('ultra');
    expect(el.textContent).toContain('Ultramarines');
    void f;
  });

  it('la liste complète des sous-factions (350 Ko) n’est demandée qu’à la première ouverture', async () => {
    let appels = 0;
    const src = new (await import('rxjs')).Observable<unknown[]>((o) => { appels++; o.next([]); o.complete(); });
    const { f, palette } = await monter({ subFactions$: src }, false);
    expect(appels).toBe(0);
    palette.open(); f.detectChanges(); await f.whenStable();
    expect(appels).toBe(1);
    palette.close(); palette.open(); f.detectChanges();
    expect(appels).toBe(1);
  });

  it('la destruction du composant annule le timer de focus (aucune exception, aucun focus)', async () => {
    vi.useFakeTimers();
    const { f, palette } = await monter({}, false);
    const focus = vi.spyOn(HTMLInputElement.prototype, 'focus');
    const avant = vi.getTimerCount();
    palette.open();
    const ouvert = vi.getTimerCount();
    expect(ouvert).toBeGreaterThan(avant); // le timer de focus est posé
    f.destroy();
    expect(vi.getTimerCount()).toBe(ouvert - 1); // la destruction a annulé le timer de focus (et lui seul)
    expect(() => vi.runAllTimers()).not.toThrow();
    expect(focus).not.toHaveBeenCalled();
    focus.mockRestore();
  });
});
