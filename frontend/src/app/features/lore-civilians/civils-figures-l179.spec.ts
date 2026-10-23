// L179 — Civils Impériaux, cartes de figures : nom, rôle et description reposent sur un voile qui, même sur l'image
// la plus claire possible (blanc pur, le pire pixel), laisse ≥ 4,5:1 au texte (nom 1,02–3,12:1, rôle 3,81:1 au plus
// avant, description 2,03:1 pour Malcador).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { contraste } from '../../core/utils/teinte-lisible';
import { LoreCiviliansComponent } from './lore-civilians.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/imperial-orgs.json'), 'utf8')) as {
  id: string; color: string; notableFigures: { name: string }[];
}[];
const scss = readFileSync(join(__dirname, 'lore-civilians.component.scss'), 'utf8');
const styles = readFileSync(join(process.cwd(), 'src/styles.scss'), 'utf8');

const jeton = (nom: string): string => {
  const m = styles.match(new RegExp(`--${nom}:\\s*(#[0-9a-fA-F]{6})`));
  expect(m, `jeton --${nom}`).not.toBeNull();
  return m![1];
};

const regle = (sel: string): string => {
  const m = scss.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`));
  expect(m, `règle ${sel}`).not.toBeNull();
  return m![1];
};

/** Voile du contenu : alpha plein, fin du dégradé (px) et marge haute (px) qui le dépasse. */
function voile() {
  const r = regle('.figure-card-content');
  const g = r.match(/background:\s*linear-gradient\(180deg,\s*rgba\(5,\s*4,\s*3,\s*0\)\s*0,\s*rgba\(5,\s*4,\s*3,\s*([0-9.]+)\)\s*(\d+)px\)/);
  expect(g, 'dégradé du voile sous le texte').not.toBeNull();
  const pad = r.match(/padding:\s*(\d+)px/);
  expect(pad, 'padding haut du contenu').not.toBeNull();
  return { alpha: parseFloat(g![1]), finDegrade: parseInt(g![2], 10), margeHaute: parseInt(pad![1], 10) };
}

/** Pire pixel : image blanche pure sous le voile (rgb 5,4,3 à l'opacité du voile), en `#rrggbb`. */
function pirePixel(alpha: number): string {
  const c = Math.round(5 * alpha + 255 * (1 - alpha)).toString(16).padStart(2, '0');
  return `#${c}${c}${c}`;
}

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

describe('Civils Impériaux, cartes de figures (L179)', () => {
  it('R1 — la description (--text) est ≥ 4,5:1 sur le pire pixel de la carte (image blanche sous le voile)', () => {
    const bg = pirePixel(voile().alpha);
    expect(contraste(jeton('text'), bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('R2 — le rôle est en --gold (plus --gold-soft, 3,81:1 au mieux) et ≥ 4,5:1 sur le pire pixel', () => {
    expect(regle('.figure-role')).toMatch(/color:\s*var\(--gold\)\s*;/);
    expect(contraste(jeton('gold'), pirePixel(voile().alpha))).toBeGreaterThanOrEqual(4.5);
  });

  it('R3 — le nom de chaque figure, dans la teinte lisible de son organisation, est ≥ 4,5:1 sur le pire pixel', async () => {
    const f = await monter();
    const cmp = f.componentInstance;
    const bg = pirePixel(voile().alpha);
    const cartes = (f.nativeElement as HTMLElement).querySelectorAll('button.figure-card');
    expect(cartes.length).toBe(seed.reduce((n, o) => n + o.notableFigures.length, 0));
    seed.forEach(o => expect(contraste(cmp.lisible(o.color), bg), o.id).toBeGreaterThanOrEqual(4.5));
  });

  it('R4 — le voile atteint son opacité pleine avant le premier pixel de texte (marge haute ≥ fin du dégradé)', () => {
    const v = voile();
    expect(v.margeHaute).toBeGreaterThanOrEqual(v.finDegrade);
  });

  it('R5 — le contenu se cale en bas de la carte et ne couvre que son texte (hauteur propre, pas toute la carte)', () => {
    expect(regle('.figure-card-content')).not.toMatch(/height:\s*100%/);
    expect(regle('.figure-card')).toMatch(/display:\s*flex/);
  });
});
