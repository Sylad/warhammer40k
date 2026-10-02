// L39 — trois Chevaliers impériaux pointent vers la faction « imperial-knights », dont la fiche
// n'a jamais été écrite : le lien menait à une page bloquée sur « Chargement de la faction… ».
// Une faction absente des données s'affiche en texte (son nom), sans lien.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { TitanDetailComponent } from './titan-detail.component';

const machine = (factionId: string, factionName: string) => ({
  id: 'm', name: 'Machine', category: 'knight', scoutClass: 'c', size: 's', factionId, factionName,
  color: '#fff', wikiQuery: 'q', description: 'd',
});

async function render(factionId: string, factionName: string): Promise<HTMLElement> {
  const service = fakeWarhammerService({
    getGodMachine: () => of(machine(factionId, factionName)),
    factions$: of([{ id: 'adeptus-mechanicus', nom: 'Adeptus Mechanicus' }]),
  });
  await setupTestBed([TitanDetailComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'm' })) } },
  ]);
  const f = TestBed.createComponent(TitanDetailComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

describe('fiche Dieu-Machine — lien vers la faction (L39)', () => {
  it('faction connue : lien vers sa fiche', async () => {
    const el = await render('adeptus-mechanicus', 'Collegia Titanica');
    expect(el.querySelector('a.row-link')?.getAttribute('href')).toBe('/factions/adeptus-mechanicus');
  });

  it('faction sans fiche : aucun lien mort, le nom reste affiché', async () => {
    const el = await render('imperial-knights', 'Imperial Knights');
    expect(el.querySelector('a[href="/factions/imperial-knights"]')).toBeNull();
    expect(el.textContent).toContain('Imperial Knights');
  });
});
