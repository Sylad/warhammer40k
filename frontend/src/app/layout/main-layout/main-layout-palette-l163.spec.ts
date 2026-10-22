// L163 (revue) — le fond de la recherche Ctrl+K doit couvrir toute la fenêtre : la palette ne doit pas
// vivre dans la barre du haut, dont le `backdrop-filter` devient le bloc conteneur du `position: fixed`
// (le fond mesurait alors 1434×69 px et « clic sur le fond » ne fermait rien).
import { setupTestBed, stubFetch } from '../../../testing/angular-testbed';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MainLayoutComponent } from './main-layout.component';

describe('Gabarit — place de la recherche (L163)', () => {
  it('R8 — la recherche n\'est pas dans la barre du haut (son backdrop-filter rétrécirait le fond)', async () => {
    stubFetch({ '/nouveautes-data/nouveautes.json': { project: 'warhammer40k', generated: '', entries: [] }, '/nouveautes-data/tailles.json': {} });
    await setupTestBed([MainLayoutComponent], [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]);
    const f = TestBed.createComponent(MainLayoutComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    const palette = root.querySelector('app-command-palette')!;
    expect(palette).toBeTruthy();
    expect(palette.closest('header.topbar')).toBeNull();
  });
});
