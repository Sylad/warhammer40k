// L167 — Panthéon du Chaos : la couleur d'un dieu ne sert plus de couleur de texte (2,19:1 Khorne,
// 2,91:1 Slaanesh, 4,0:1 Tzeentch) ; une teinte éclaircie ≥ 4,5:1 la remplace, la couleur d'origine
// reste sur les bordures et les sigils, le titre de la visionneuse passe à l'or.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { contraste, FOND_TEXTE_SOMBRE, teinteLisible } from '../../core/utils/teinte-lisible';
import { LoreChaosGodsComponent } from './lore-chaos-gods.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/chaos-gods.json'), 'utf8')) as {
  id: string; color: string;
}[];
const scss = readFileSync(join(__dirname, 'lore-chaos-gods.component.scss'), 'utf8');

async function rendre(): Promise<HTMLElement> {
  await setupTestBed([LoreChaosGodsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ chaosGods$: of(seed) }) },
  ]);
  const f = TestBed.createComponent(LoreChaosGodsComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

/** Corps d'une règle SCSS (le premier bloc de ce sélecteur). */
const regle = (sel: string): string => {
  const m = scss.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`));
  expect(m, `règle ${sel}`).not.toBeNull();
  return m![1];
};

describe('Panthéon du Chaos, contrastes (L167)', () => {
  it('R1 — la couleur d\'origine des dieux est sous 4,5:1 : le problème est réel', () => {
    const bas = seed.filter(g => contraste(g.color, FOND_TEXTE_SOMBRE) < 4.5).map(g => g.id);
    expect(bas).toContain('khorne');
    expect(bas).toContain('slaanesh');
    expect(bas).toContain('tzeentch');
  });

  it('R2 — la teinte de texte de chaque dieu fait au moins 4,5:1 sur le fond le plus clair du bandeau', () => {
    for (const g of seed) expect(contraste(teinteLisible(g.color), FOND_TEXTE_SOMBRE), g.id).toBeGreaterThanOrEqual(4.5);
  });

  it('R3 — la teinte reste celle du dieu : une couleur déjà lisible n\'est pas modifiée, les autres gardent leur teinte', () => {
    expect(teinteLisible('#ffffff')).toBe('#ffffff');
    const rouge = teinteLisible('#8b1a1a');
    const [r, g, b] = [1, 3, 5].map(i => parseInt(rouge.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it('R4 — chaque article expose --god-text (lisible) à côté de --god-color (d\'origine)', async () => {
    const el = await rendre();
    for (const g of seed) {
      const art = el.querySelector<HTMLElement>(`article#${g.id}`)!;
      expect(art.style.getPropertyValue('--god-color')).toBe(g.color);
      expect(art.style.getPropertyValue('--god-text')).toBe(teinteLisible(g.color));
    }
  });

  it('R5 — h2 et raccourcis du hero portent la teinte lisible, sigils et bordures la couleur d\'origine', async () => {
    const el = await rendre();
    for (const g of seed) {
      const h2 = el.querySelector<HTMLElement>(`article#${g.id} h2`)!;
      expect(h2.style.color).toBe(hexVersRgb(teinteLisible(g.color)));
      const sigil = el.querySelector<HTMLElement>(`article#${g.id} .god-sigil`)!;
      expect(sigil.style.color).toBe(hexVersRgb(g.color));
      const lien = el.querySelector<HTMLElement>(`a.quick-link[href$="#${g.id}"]`)!;
      expect(lien.style.color).toBe(hexVersRgb(teinteLisible(g.color)));
      expect(lien.style.getPropertyValue('--god-color')).toBe(g.color);
    }
    expect(regle('.quick-link')).toContain('border: 1px solid var(--god-color)');
  });

  it('R6 — titres de section, titres latéraux, daemons et « Voir fiche » lisent --god-text, jamais --god-color en couleur de texte', () => {
    for (const sel of ['.section-title', '.side-title', '.primarch-go']) {
      expect(regle(sel), sel).toMatch(/(^|[\s;])color:\s*var\(--god-text/);
    }
    expect(scss).not.toMatch(/(^|[\s;])color:\s*var\(--god-color/m);
    expect(regle('.notable-name')).toMatch(/color:\s*var\(--god-text/);
  });

  it('R7 — le titre de la visionneuse est en or (couleur de contexte du dieu écartée), pour un dieu comme pour un daemon', async () => {
    await setupTestBed([LoreChaosGodsComponent], [
      provideRouter([]),
      {
        provide: WarhammerService,
        useValue: fakeWarhammerService({
          chaosGods$: of(seed),
          getWikiImage: () => of({ imageUrl: 'http://img/x.jpg', pageTitle: null, pageUrl: null }),
        }),
      },
    ]);
    const f = TestBed.createComponent(LoreChaosGodsComponent);
    f.detectChanges();
    await f.whenStable();
    const cmp = f.componentInstance;
    const dieu = cmp.gods()[0];
    cmp.openGodLightbox(dieu);
    expect(cmp.lightbox()?.contextColor).toBe('#f0d276');
    cmp.closeLightbox();
    cmp.openDaemonLightbox(dieu, dieu.daemons.notable[0]);
    expect(cmp.lightbox()?.contextColor).toBe('#f0d276');
    expect(contraste('#f0d276', FOND_TEXTE_SOMBRE)).toBeGreaterThanOrEqual(4.5);
  });
});

function hexVersRgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}
