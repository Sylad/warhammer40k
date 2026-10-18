// L142 — une vidéo retirée de YouTube (vignette en 404) est signalée « Vidéo indisponible » sur sa carte.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { VideosComponent } from './videos.component';
import type { Video } from '../../core/models/models';

const mk = (id: string, embedId: string, extra: Partial<Video> = {}): Video => ({
  id, titre: `Titre ${id}`, createur: 'Chaîne test', description: 'd', url: `https://www.youtube.com/watch?v=${embedId}`,
  embedId, embedType: 'video', type: 'animation', langue: 'FR', tags: [], incontournable: false,
  duration: '10:00', category: 'lore', language: 'FR', featured: false, ...extra,
} as unknown as Video);

const VIDEOS = [
  mk('raptors-CcFcmPQklyY', 'CcFcmPQklyY'),
  mk('vivante', 'vivante1234'),
  mk('culte-retiree', 'retiree5678', { featured: true, incontournable: true }),
];

/** Faux `Image` : charge sans erreur, sauf l'adresse d'une vidéo retirée (404). */
function fauxImage(retirees: string[]): void {
  vi.stubGlobal('Image', class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(url: string) {
      queueMicrotask(() => (retirees.some(e => url.includes(`/vi/${e}/`)) ? this.onerror : this.onload)?.());
    }
  });
}

async function rendre(): Promise<HTMLElement> {
  await setupTestBed([VideosComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ videos$: of(VIDEOS) }) },
  ]);
  const f = TestBed.createComponent(VideosComponent);
  for (let i = 0; i < 3; i++) { f.detectChanges(); await f.whenStable(); await Promise.resolve(); }
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

const carte = (el: HTMLElement, titre: string) =>
  Array.from(el.querySelectorAll<HTMLElement>('[data-testid="carte-video"]')).filter(c => c.textContent!.includes(titre));

afterEach(() => vi.unstubAllGlobals());

describe('L142 — vidéo indisponible', () => {
  it('vignette en 404 : la carte porte le signe « Vidéo indisponible » (liste et incontournables)', async () => {
    fauxImage(['CcFcmPQklyY', 'retiree5678']);
    const el = await rendre();
    const raptors = carte(el, 'Titre raptors-CcFcmPQklyY');
    expect(raptors.length).toBe(1);
    expect(raptors[0].querySelector('[data-testid="video-indisponible"]')?.textContent).toContain('Vidéo indisponible');
    expect(raptors[0].classList.contains('indisponible')).toBe(true);
    const culte = carte(el, 'Titre culte-retiree');
    expect(culte.length).toBe(2);
    expect(culte.every(c => c.querySelector('[data-testid="video-indisponible"]'))).toBe(true);
  });

  it('vignette chargée : aucun signe sur la carte', async () => {
    fauxImage(['CcFcmPQklyY']);
    const el = await rendre();
    const vivante = carte(el, 'Titre vivante')[0];
    expect(vivante.querySelector('[data-testid="video-indisponible"]')).toBeNull();
    expect(vivante.classList.contains('indisponible')).toBe(false);
  });

  it('la carte indisponible reste un lien (la fenêtre de lecture s\'ouvre encore)', async () => {
    fauxImage(['CcFcmPQklyY']);
    const el = await rendre();
    expect(carte(el, 'Titre raptors')[0].querySelector('a.card-link')?.getAttribute('href')).toContain('raptors-CcFcmPQklyY');
  });
});
