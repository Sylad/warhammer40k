import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setupTestBed } from '../../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../../testing/fake-warhammer-service';
import { WarhammerService } from '../../../core/services/warhammer.service';
import { CommandPaletteComponent } from './command-palette.component';

async function monter(over: Record<string, unknown>) {
  await setupTestBed([CommandPaletteComponent as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService(over) },
  ]);
  const f = TestBed.createComponent(CommandPaletteComponent);
  f.detectChanges();
  await f.whenStable();
  const palette = f.componentInstance;
  palette.open();
  f.detectChanges();
  const chercher = (q: string) => { palette.query = q; palette.onQueryChange(q); f.detectChanges(); };
  return { f, el: f.nativeElement as HTMLElement, chercher };
}

describe('palette Ctrl+K (L117)', () => {
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

  it('une sous-faction en échec au démarrage est relancée à l’ouverture', async () => {
    let appels = 0;
    const { f, el, chercher } = await monter({
      subFactions$: new (await import('rxjs')).Observable<unknown[]>((o) => {
        appels++;
        if (appels === 1) o.error(new Error('500'));
        else { o.next([{ id: 'ultramarines', factionId: 'f', name: 'Ultramarines', type: 'chapter' }]); o.complete(); }
      }),
    });
    expect(appels).toBe(2); // 1 démarrage (échec) + relance à l'ouverture
    chercher('ultra');
    expect(el.textContent).toContain('Ultramarines');
    void f;
  });
});
