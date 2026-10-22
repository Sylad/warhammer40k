// L157 (Nielsen n°3) — un Échap, une couche : la recherche Ctrl+K ouverte par-dessus une visionneuse
// (`figure-lightbox`, partagée et scellée par L120 R10 : on ne la touche pas) prend l'Échap seule ; le suivant
// ferme la visionneuse. Quel que soit l'ordre de création des deux composants.
import { afterEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { setupTestBed } from '../../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../../testing/fake-warhammer-service';
import { WarhammerService } from '../../../core/services/warhammer.service';
import { CommandPaletteComponent } from './command-palette.component';
import { FigureLightboxComponent, LightboxState } from '../figure-lightbox/figure-lightbox.component';

const ETAT = { title: 'Horus', mainUrl: 'a', thumbUrls: ['a'], selectedIdx: 0 } as unknown as LightboxState;

async function monter(paletteDabord: boolean) {
  await setupTestBed([CommandPaletteComponent as never, FigureLightboxComponent as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({}) },
  ]);
  const creerPalette = () => TestBed.createComponent(CommandPaletteComponent);
  const creerVisionneuse = () => {
    const v = TestBed.createComponent(FigureLightboxComponent);
    // Les entrées-signaux ne se posent pas sous TestBed JIT (cf. CLAUDE.md) : l'état est remplacé à la main.
    (v.componentInstance as unknown as { state: () => LightboxState }).state = () => ETAT;
    return v;
  };
  let palette: ReturnType<typeof creerPalette>;
  let visionneuse: ReturnType<typeof creerVisionneuse>;
  if (paletteDabord) { palette = creerPalette(); visionneuse = creerVisionneuse(); }
  else { visionneuse = creerVisionneuse(); palette = creerPalette(); }
  const fermetures: number[] = [];
  visionneuse.componentInstance.closed.subscribe(() => fermetures.push(1));
  palette.detectChanges();
  palette.componentInstance.open();
  palette.detectChanges();
  return { palette: palette.componentInstance, fermetures };
}
const echap = () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

describe('Échap : recherche Ctrl+K au-dessus de la visionneuse (L157)', () => {
  afterEach(() => TestBed.resetTestingModule());

  for (const paletteDabord of [true, false]) {
    it(`R11 — un Échap ferme la recherche seule, le suivant la visionneuse (${paletteDabord ? 'recherche' : 'visionneuse'} créée en premier)`, async () => {
      const { palette, fermetures } = await monter(paletteDabord);
      expect(palette.isOpen()).toBe(true);
      echap();
      expect(palette.isOpen(), 'recherche fermée').toBe(false);
      expect(fermetures, 'visionneuse encore ouverte').toHaveLength(0);
      echap();
      expect(fermetures, 'le second Échap ferme la visionneuse').toHaveLength(1);
    });
  }
});
