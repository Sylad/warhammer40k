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

/**
 * Faux `Image` reproduisant les moteurs : YouTube répond 404 avec un JPEG décodable de 120×90 pour une vidéo retirée
 * (`onload`, jamais `onerror`) ; une vidéo existante donne 320×180. `coupees` : coupure réseau (`onerror`).
 */
function fauxImage(retirees: string[], coupees: string[] = []): void {
  vi.stubGlobal('Image', class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 0;
    naturalHeight = 0;
    set src(url: string) {
      queueMicrotask(() => {
        if (coupees.some(e => url.includes(`/vi/${e}/`))) { this.onerror?.(); return; }
        const retiree = retirees.some(e => url.includes(`/vi/${e}/`));
        this.naturalWidth = retiree ? 120 : 320;
        this.naturalHeight = retiree ? 90 : 180;
        this.onload?.();
      });
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
  it('vignette de remplacement 120×90 (404) : la carte porte le signe « Vidéo indisponible » (liste et incontournables)', async () => {
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

  it('coupure réseau (onerror) : la carte porte aussi le signe', async () => {
    fauxImage([], ['CcFcmPQklyY']);
    const el = await rendre();
    expect(carte(el, 'Titre raptors')[0].querySelector('[data-testid="video-indisponible"]')).not.toBeNull();
    expect(carte(el, 'Titre vivante')[0].querySelector('[data-testid="video-indisponible"]')).toBeNull();
  });

  it('le signe décrit le lien (aria-describedby) et son « ⚠ » est masqué aux lecteurs d\'écran', async () => {
    fauxImage(['CcFcmPQklyY', 'retiree5678']);
    const el = await rendre();
    const ids = new Set<string>();
    for (const c of [...carte(el, 'Titre raptors'), ...carte(el, 'Titre culte-retiree')]) {
      const signe = c.querySelector<HTMLElement>('[data-testid="video-indisponible"]')!;
      expect(signe.id).toBeTruthy();
      expect(ids.has(signe.id)).toBe(false);
      ids.add(signe.id);
      expect(c.querySelector('a.card-link')?.getAttribute('aria-describedby')).toBe(signe.id);
      expect(signe.querySelector('[aria-hidden="true"]')?.textContent).toContain('⚠');
    }
    const vivante = carte(el, 'Titre vivante')[0];
    expect(vivante.querySelector('a.card-link')?.hasAttribute('aria-describedby')).toBe(false);
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
