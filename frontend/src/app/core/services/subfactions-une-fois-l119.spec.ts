// L119 — /api/subfactions (350 Ko) téléchargé une seule fois par visite : l'accueil (compteur
// « Sous-factions ») et la palette Ctrl+K (recherche) lisent le même flux mis en cache.
import { setupTestBed } from '../../../testing/angular-testbed';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';
import { WarhammerService } from './warhammer.service';
import { DashboardComponent } from '../../features/dashboard/dashboard.component';
import { CommandPaletteComponent } from '../../shared/components/command-palette/command-palette.component';

const SOUS_FACTIONS = [
  { id: 'ultramarines', factionId: 'space-marines', name: 'Ultramarines', type: 'chapter' },
  { id: 'blood-angels', factionId: 'space-marines', name: 'Blood Angels', type: 'chapter' },
];
const estListe = (r: { url: string }) => /\/subfactions$/.test(r.url);

describe('/api/subfactions au plus une fois par visite (L119)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('service : deux abonnés successifs en take(1), une seule requête', async () => {
    await setupTestBed([], [provideHttpClient(), provideHttpClientTesting()]);
    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(WarhammerService);
    const premier = firstValueFrom(service.subFactions$.pipe(take(1)));
    http.expectOne(estListe).flush(SOUS_FACTIONS);
    expect(await premier).toEqual(SOUS_FACTIONS);
    expect(await firstValueFrom(service.subFactions$)).toEqual(SOUS_FACTIONS);
    http.expectNone(estListe);
  });

  it('service : une erreur n\'est pas gardée, le réessai redemande', async () => {
    await setupTestBed([], [provideHttpClient(), provideHttpClientTesting()]);
    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(WarhammerService);
    const echec = firstValueFrom(service.subFactions$).catch((e: unknown) => e);
    http.expectOne(estListe).flush('', { status: 502, statusText: 'Bad Gateway' });
    expect(await echec).toBeTruthy();
    const reprise = firstValueFrom(service.subFactions$);
    http.expectOne(estListe).flush(SOUS_FACTIONS);
    expect(await reprise).toEqual(SOUS_FACTIONS);
    http.expectNone(estListe);
  });

  it('accueil puis ouverture de la palette : un seul GET /api/subfactions, et chacun affiche les données', async () => {
    await setupTestBed([DashboardComponent, CommandPaletteComponent as never], [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
    ]);
    const http = TestBed.inject(HttpTestingController);
    const requetes: TestRequest[] = [];
    const flushAutres = () => {
      for (const r of http.match((req) => !estListe(req))) {
        if (!r.cancelled) r.flush([]);
      }
    };

    const accueil = TestBed.createComponent(DashboardComponent);
    accueil.detectChanges();
    const premiers = http.match(estListe);
    expect(premiers).toHaveLength(1);
    requetes.push(...premiers);
    premiers[0].flush(SOUS_FACTIONS);
    flushAutres();
    accueil.detectChanges();
    await accueil.whenStable();
    accueil.detectChanges();
    const compteurs = [...(accueil.nativeElement as HTMLElement).querySelectorAll('.shortcut .num, .stat strong')]
      .map((e) => (e.textContent ?? '').trim());
    expect(compteurs).toContain(String(SOUS_FACTIONS.length));

    const palette = TestBed.createComponent(CommandPaletteComponent);
    palette.detectChanges();
    palette.componentInstance.open();
    palette.detectChanges();
    http.expectNone(estListe);
    palette.componentInstance.query = 'ultra';
    palette.componentInstance.onQueryChange('ultra');
    palette.detectChanges();
    const libelles = [...(palette.nativeElement as HTMLElement).querySelectorAll('.cmdk-item .cmdk-label')]
      .map((e) => e.textContent ?? '');
    expect(libelles.some((l) => l.includes('Ultramarines'))).toBe(true);
    expect(requetes).toHaveLength(1);
  });
});
