// L15 (revue UX Lore : équipement, fiche) — les factions liées portent leur nom, pas l'identifiant du seed ;
// le texte de l'en-tête posé sur l'image tient 4,5:1 (WCAG 1.4.3) sous le voile, même sur une image blanche.
// La feuille `ship-detail.component.scss` est partagée par cinq fiches (vaisseau, Titan, Saint, chronologie, équipement) : le voile relevé
// est posé par les fiches équipement, vaisseau (L17), Titan (L18) et Saint (L19) (classe `hero-overlay-releve`) ; la chronologie a le sien (L16), l'ancien voile (0,85 → 0,55 → 0,4, R4) ne reste qu'à elle.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contraste } from '../../core/utils/teinte-lisible';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { WarhammerService } from '../../core/services/warhammer.service';
import { EquipmentDetailComponent } from './equipment-detail.component';

async function monter(factions$: unknown) {
  const service = fakeWarhammerService({
    getEquipmentItem: () => of({ id: 'b', name: 'Bolter', type: 'ranged', subCategory: 'bolt',
      factionIds: ['space-marines', 'inconnue'], description: 'd', citation: 'c' }),
    factions$,
  });
  await setupTestBed([EquipmentDetailComponent as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'b' })), snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(EquipmentDetailComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

describe('Équipement, fiche (L15)', () => {
  it('R1 — « Factions liées » et le bandeau affichent le nom de la faction, l\'identifiant seulement si elle est inconnue', async () => {
    const e = await monter(of([{ id: 'space-marines', nom: 'Space Marines' }]));
    const liens = Array.from(e.querySelectorAll('.row-link .rl-label')).map(x => x.textContent!.trim());
    expect(liens).toEqual(['Space Marines', 'inconnue']);
    expect(e.querySelector('.hero-faction')!.textContent!.trim()).toBe('Space Marines · inconnue');
  });

  it('R2 — la citation n\'a pas de style en ligne : sa mise en italique vient de la feuille de style', async () => {
    const e = await monter(of([]));
    expect(e.querySelector('#citation blockquote')!.getAttribute('style')).toBeNull();
  });

  it('R3 — .hero-epithet, .hero-faction et .hero-status sont ≥ 4,5:1 sur une image blanche sous le point le plus clair du voile .hero-overlay', () => {
    const scss = readFileSync(join(__dirname, '../ship-detail/ship-detail.component.scss'), 'utf8');
    const vars: Record<string, string> = { '--text': '#e6dfce', '--gold': '#c9a24a', '--gold-bright': '#f0d276' };
    const voile = /\.hero-overlay\.hero-overlay-releve\s*\{[^}]*background:\s*linear-gradient\(([^;]*)\)\s*;/.exec(scss)![1];
    const alphas = Array.from(voile.matchAll(/rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/g), m => Number(m[1]));
    expect(alphas.length).toBeGreaterThanOrEqual(2);
    const a = Math.min(...alphas);
    const fond = '#' + Array(3).fill(Math.round(255 * (1 - a)).toString(16).padStart(2, '0')).join('');
    for (const sel of ['.hero-epithet', '.hero-faction', '.hero-status, .hero-captain']) {
      const corps = new RegExp(`(?:^|\\n)${sel.replace(/[.,]/g, c => '\\' + c)}\\s*\\{([^}]*)\\}`).exec(scss)![1];
      const m = /(?:^|[\s;])color:\s*(?:var\((--[a-z-]+)\)|(#[0-9a-f]{6}))/.exec(corps)!;
      expect(contraste(m[1] ? vars[m[1]] : m[2], fond), `${sel} sur ${fond} (voile ${a})`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('R4 — le voile relevé (0,88 → 0,76 → 0,72) ne s\'applique qu\'aux fiches équipement, vaisseau (L17), Titan (L18) et Saint (L19) ; l\'ancien voile 0,85 → 0,55 → 0,4 reste à la chronologie', async () => {
    const dir = join(__dirname, '..');
    const scss = readFileSync(join(dir, 'ship-detail/ship-detail.component.scss'), 'utf8');
    const alphas = (sel: RegExp) => Array.from(sel.exec(scss)![1].matchAll(/rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/g), m => Number(m[1]));
    expect(alphas(/(?:^|\n)\.hero-overlay\s*\{[^}]*background:\s*linear-gradient\(([^;]*)\)\s*;/)).toEqual([0.85, 0.55, 0.4]);
    expect(alphas(/\.hero-overlay\.hero-overlay-releve\s*\{[^}]*background:\s*linear-gradient\(([^;]*)\)\s*;/)).toEqual([0.88, 0.76, 0.72]);
    for (const [dossier, fichier, relevee] of [['ship-detail', 'ship-detail', true], ['titan-detail', 'titan-detail', true],
      ['saint-detail', 'saint-detail', true], ['timeline-event-detail', 'timeline-event-detail', false],
      ['equipment-detail', 'equipment-detail', true]] as const) {
      const ts = readFileSync(join(dir, dossier, `${fichier}.component.ts`), 'utf8');
      const balise = /<div class="(hero-overlay[^"]*)"/.exec(ts)![1].split(/\s+/);
      expect(balise.includes('hero-overlay-releve'), `${dossier} : classe hero-overlay-releve`).toBe(relevee);
    }
    const e = await monter(of([]));
    expect(e.querySelector('.hero-overlay')!.classList.contains('hero-overlay-releve')).toBe(true);
  });
});
