// L14 (revue UX Lore : galaxie) — filtres annoncés, carte nommée, outil de calibration réservé à l'édition.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import { PinService } from '../../core/services/pin.service';
import { LoreGalaxyComponent } from './lore-galaxy.component';

// jsdom n'a pas de rendu SVG : les polygones de Leaflet (Segmenta) y échouent, on les neutralise.
vi.mock('leaflet', async (orig) => {
  const L = await orig<typeof import('leaflet')>();
  return { ...L, polygon: () => ({ addTo: () => undefined }) };
});

async function monter() {
  await setupTestBed([LoreGalaxyComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({}) },
  ]);
  const f = TestBed.createComponent(LoreGalaxyComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}
const el = (f: Awaited<ReturnType<typeof monter>>) => f.nativeElement as HTMLElement;

describe('Galaxie (L14)', () => {
  beforeEach(() => { try { sessionStorage.clear(); } catch { /* ignoré */ } });

  it('R1 — les 3 filtres de la carte portent aria-pressed, tous à true au départ, et un clic le bascule', async () => {
    const f = await monter();
    const b = () => Array.from(el(f).querySelectorAll<HTMLButtonElement>('.map-filter-btn'));
    expect(b().map(x => x.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true']);
    b()[1].click();
    f.detectChanges();
    expect(b().map(x => x.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'true']);
    b().forEach(x => expect(x.type).toBe('button'));
  });

  it('R2 — la carte est une région nommée « Carte de la galaxie » et le bouton plein écran est un button', async () => {
    const f = await monter();
    const carte = el(f).querySelector('.leaflet-galaxy')!;
    expect(carte.getAttribute('role')).toBe('region');
    expect(carte.getAttribute('aria-label')).toBe('Carte de la galaxie');
    expect(el(f).querySelector('.lf-fs-btn')!.getAttribute('role')).toBe('button');
  });

  it('R3 — sans PIN, l\'outil de calibration n\'est pas proposé ; avec le PIN, il l\'est', async () => {
    const f = await monter();
    expect(el(f).querySelector('.calib-toggle')).toBeNull();
    TestBed.inject(PinService).set('1234');
    f.detectChanges();
    expect(el(f).querySelector('.calib-toggle')).not.toBeNull();
  });

  it('R4 — filtres, zones cliquables et liens « Voir lore » ont un anneau de focus clavier or', () => {
    const scss = readFileSync(join(__dirname, 'lore-galaxy.component.scss'), 'utf8');
    const bloc = scss.match(/\.map-filter-btn:focus-visible,\s*\.hz-btn:focus-visible,\s*\.rift-link:focus-visible\s*\{([^}]*)\}/);
    expect(bloc).not.toBeNull();
    expect(bloc![1]).toMatch(/outline:\s*2px solid var\(--gold-bright\)/);
  });
});
