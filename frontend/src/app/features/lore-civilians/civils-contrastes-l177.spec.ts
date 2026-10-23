// L177 — Civils Impériaux : la couleur d'une organisation ne sert plus de couleur de texte (Arbites #3a3a3a 1,59:1,
// Knights 2,19:1, Navigators 2,23:1…) ; une teinte éclaircie ≥ 4,5:1 la remplace, la couleur d'origine reste sur les
// bordures et les sigils, le titre de la visionneuse passe à l'or (comme L167).
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
import { LoreCiviliansComponent } from './lore-civilians.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/imperial-orgs.json'), 'utf8')) as {
  id: string; color: string; notableFigures: { name: string }[];
}[];
const scss = readFileSync(join(__dirname, 'lore-civilians.component.scss'), 'utf8');

const hexVersRgb = (hex: string): string => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

async function monter() {
  await setupTestBed([LoreCiviliansComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        imperialOrgs$: of(seed),
        getWikiImage: () => of({ imageUrl: 'http://img/x.jpg', pageTitle: null, pageUrl: null }),
      }),
    },
  ]);
  const f = TestBed.createComponent(LoreCiviliansComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

/** Corps d'une règle SCSS (le premier bloc de ce sélecteur). */
const regle = (sel: string): string => {
  const m = scss.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`));
  expect(m, `règle ${sel}`).not.toBeNull();
  return m![1];
};

describe('Civils Impériaux, contrastes (L177)', () => {
  it('R1 — la couleur d\'origine des organisations est sous 4,5:1 : le problème est réel', () => {
    const bas = seed.filter(o => contraste(o.color, FOND_TEXTE_SOMBRE) < 4.5);
    expect(bas.length).toBeGreaterThanOrEqual(10);
  });

  it('R2 — la teinte de texte de chaque organisation fait au moins 4,5:1 sur le fond le plus clair du bandeau', () => {
    for (const o of seed) expect(contraste(teinteLisible(o.color), FOND_TEXTE_SOMBRE), o.id).toBeGreaterThanOrEqual(4.5);
  });

  it('R3 — chaque article expose --org-text (lisible) à côté de --org-color (d\'origine)', async () => {
    const el = (await monter()).nativeElement as HTMLElement;
    const arts = el.querySelectorAll<HTMLElement>('article.org');
    expect(arts.length).toBe(seed.length);
    seed.forEach((o, i) => {
      const art = arts[i];
      expect(art.style.getPropertyValue('--org-color')).toBe(o.color);
      expect(art.style.getPropertyValue('--org-text')).toBe(teinteLisible(o.color));
    });
  });

  it('R4 — le h2 porte la teinte lisible, le sigil la couleur d\'origine', async () => {
    const el = (await monter()).nativeElement as HTMLElement;
    const arts = el.querySelectorAll<HTMLElement>('article.org');
    seed.forEach((o, i) => {
      const h2 = arts[i].querySelector<HTMLElement>('h2')!;
      expect(h2.style.color).toBe(hexVersRgb(teinteLisible(o.color)));
      const sigil = arts[i].querySelector<HTMLElement>('.org-sigil')!;
      expect(sigil.style.color).toBe(hexVersRgb(o.color));
    });
  });

  it('R5 — titres de section, titres latéraux, noms de figures et guillemets lisent --org-text, jamais --org-color en couleur de texte', () => {
    for (const sel of ['.section-title', '.side-title', '.figure-name']) {
      expect(regle(sel), sel).toMatch(/(^|[\s;])color:\s*var\(--org-text/);
    }
    expect(regle('.citation .quote')).toMatch(/(^|[\s;])color:\s*var\(--org-text/);
    expect(scss).not.toMatch(/(^|[\s;])color:\s*var\(--org-color/m);
  });

  it('R6 — le titre de la visionneuse est en or (couleur de l\'organisation écartée), lisible', async () => {
    const f = await monter();
    const cmp = f.componentInstance;
    const org = cmp.orgs().find(o => o.notableFigures.length > 0)!;
    cmp.openLightbox(org, org.notableFigures[0]);
    expect(cmp.lightbox()?.contextColor).toBe('#f0d276');
    expect(contraste('#f0d276', FOND_TEXTE_SOMBRE)).toBeGreaterThanOrEqual(4.5);
  });
});
