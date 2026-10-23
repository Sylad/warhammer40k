// L178 — Civils Impériaux : les badges de catégorie (couleur d'origine 2,32–3,33:1 sur le bandeau) et les filtres
// actifs (#050403 sur la couleur de catégorie : Militaire 2,95, Commerce 3,08…) passent à ≥ 4,5:1 au pire pixel.
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
  id: string; color: string; category: string; notableFigures: { name: string }[];
}[];
const scss = readFileSync(join(__dirname, 'lore-civilians.component.scss'), 'utf8');

const hexVersRgb = (hex: string): string => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

/** Mélange `part` de `a` avec le reste de `b` (comme `color-mix(in srgb, a part, b)`). */
const melange = (a: string, b: string, part: number): string =>
  '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * part + parseInt(b.slice(i, i + 2), 16) * (1 - part)).toString(16).padStart(2, '0')).join('');

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

const regle = (sel: string): string => {
  const m = scss.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`));
  expect(m, `règle ${sel}`).not.toBeNull();
  return m![1];
};

describe('Civils Impériaux, catégories et filtres (L178)', () => {
  it('R1 — la couleur d\'origine des catégories est sous 4,5:1 sur le bandeau : le problème est réel', async () => {
    const cmp = (await monter()).componentInstance;
    const bas = cmp.categories.filter(c => contraste(cmp.categoryColor(c), FOND_TEXTE_SOMBRE) < 4.5);
    expect(bas.length).toBeGreaterThanOrEqual(5);
  });

  it('R2 — le badge de chaque organisation porte la teinte lisible de sa catégorie, ≥ 4,5:1 sur le fond le plus clair du bandeau', async () => {
    const f = await monter();
    const cmp = f.componentInstance;
    const badges = (f.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('article.org .category');
    expect(badges.length).toBe(seed.length);
    seed.forEach((o, i) => {
      const teinte = teinteLisible(cmp.categoryColor(o.category as never));
      expect(badges[i].style.color, o.id).toBe(hexVersRgb(teinte));
      expect(contraste(teinte, FOND_TEXTE_SOMBRE), o.id).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('R3 — chaque filtre de catégorie expose --cat-text (lisible) à côté de --cat-color (d\'origine)', async () => {
    const f = await monter();
    const cmp = f.componentInstance;
    const boutons = (f.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('button.filter');
    cmp.categories.forEach((c, i) => {
      const b = boutons[i + 1];
      expect(b.style.getPropertyValue('--cat-color')).toBe(cmp.categoryColor(c));
      expect(b.style.getPropertyValue('--cat-text')).toBe(teinteLisible(cmp.categoryColor(c)));
    });
  });

  it('R4 — filtre actif : texte lisible sur un fond sombre teinté, ≥ 4,5:1 au pire pixel (fond le plus clair possible)', async () => {
    const cmp = (await monter()).componentInstance;
    const r = regle('.filter.active');
    expect(r).toMatch(/(^|[\s;])color:\s*var\(--cat-text/);
    const m = r.match(/background:\s*color-mix\(in srgb,\s*var\(--cat-color,\s*var\(--gold\)\)\s*(\d+)%,\s*(#[0-9a-f]{6})\)/i);
    expect(m, 'fond teinté').not.toBeNull();
    const [part, base] = [Number(m![1]) / 100, m![2]];
    for (const c of cmp.categories) {
      const fond = melange(cmp.categoryColor(c), base, part);
      expect(contraste(teinteLisible(cmp.categoryColor(c)), fond), c).toBeGreaterThanOrEqual(4.5);
    }
    // « Toutes » : l'or par défaut sur le même fond
    expect(contraste('#c9a24a', melange('#c9a24a', base, part))).toBeGreaterThanOrEqual(4.5);
  });
});
