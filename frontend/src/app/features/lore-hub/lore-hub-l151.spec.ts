// L151 (revue UX L8) — sommaire du lore : les compteurs des cartes sont ceux des pages, tirés des
// mêmes données (seed de backend/seed servi par l'API ; zones de la carte galactique).
// R1 — chaque compteur de carte égale le décompte du seed ; R2 — le décompte des Primarques
// (description) suit les allégeances du seed ; R3 — un jeu de données indisponible n'affiche
// aucun chiffre pour sa carte (jamais un chiffre périmé) ; R4 — les zones de la carte galactique
// sont comptées depuis la liste même qui dessine la carte.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { WarhammerService } from '../../core/services/warhammer.service';
import { HOT_ZONES } from '../lore-galaxy/lore-galaxy.data';
import { LoreHubComponent } from './lore-hub.component';

const seed = <T>(f: string): T[] => JSON.parse(readFileSync(join(process.cwd(), '../backend/seed', `${f}.json`), 'utf8'));
const distinct = (a: Record<string, unknown>[], k: string): number => new Set(a.map((x) => x[k])).size;

const primarchs = seed<{ allegiance: string }>('primarchs');
const gods = seed<{ daemons: { notable: unknown[] } }>('chaos-gods');
const orgs = seed<{ functions: unknown[] }>('imperial-orgs');
const concepts = seed<Record<string, unknown>>('lore-concepts');
const events = seed<Record<string, unknown>>('timeline-events');
const equipment = seed<Record<string, unknown>>('equipment');
const ships = seed<unknown>('legendary-ships');
const machines = seed<Record<string, unknown>>('god-machines');
const saints = seed<Record<string, unknown>>('living-saints');

async function rendre(overrides: Record<string, unknown> = {}): Promise<HTMLElement> {
  const service = fakeWarhammerService({
    primarchs$: of(primarchs), chaosGods$: of(gods), imperialOrgs$: of(orgs), loreConcepts$: of(concepts),
    timelineEvents$: of(events), equipment$: of(equipment), ships$: of(ships), godMachines$: of(machines),
    saints$: of(saints), ...overrides,
  });
  await setupTestBed([LoreHubComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
  const f = TestBed.createComponent(LoreHubComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}
const carte = (el: HTMLElement, route: string): HTMLElement => el.querySelector(`a.card[href="${route}"]`) as HTMLElement;
const meta = (el: HTMLElement, route: string): string => carte(el, route).querySelector('.meta')!.textContent!.trim();

describe('sommaire du lore — compteurs (L151)', () => {
  it('R1 — chaque compteur de carte égale le décompte du seed', async () => {
    const el = await rendre();
    const n = (a: { allegiance?: string }[]) => a.length;
    expect(meta(el, '/lore/primarchs')).toBe(`${n(primarchs)} fiches`);
    expect(meta(el, '/lore/chaos-gods')).toBe(`${gods.length} dieux · ${gods.reduce((s, g) => s + g.daemons.notable.length, 0)} daemons notables`);
    expect(meta(el, '/lore/civilians')).toBe(`${orgs.length} organisations · ${orgs.reduce((s, o) => s + o.functions.length, 0)} fonctions`);
    expect(meta(el, '/lore/concepts')).toBe(`${concepts.length} concepts · ${distinct(concepts, 'category')} catégories`);
    expect(meta(el, '/lore/equipment')).toBe(`${equipment.length} pièces · ${distinct(equipment, 'type')} types`);
    expect(meta(el, '/lore/timeline')).toBe(`${events.length} événements · ${distinct(events, 'era')} ères`);
    expect(meta(el, '/lore/ships')).toBe(`${(ships as unknown[]).length} vaisseaux · toutes factions`);
    expect(meta(el, '/lore/titans')).toBe(`${machines.length} dieux-machines · ${distinct(machines, 'category')} catégories`);
    expect(meta(el, '/lore/saints')).toBe(`${saints.length} figures · ${distinct(saints, 'category')} catégories`);
  });

  it('R1 — valeurs attendues par la revue : Concepts 15, Chronologie 35, Civils 13 organisations et 68 fonctions', async () => {
    const el = await rendre();
    expect(meta(el, '/lore/concepts')).toContain('15 concepts');
    expect(meta(el, '/lore/timeline')).toContain('35 événements');
    expect(meta(el, '/lore/civilians')).toBe('13 organisations · 68 fonctions');
  });

  it('R2 — la description des Primarques donne 9 Loyalistes, 9 Traîtres, 2 Perdus (allégeances du seed)', async () => {
    const el = await rendre();
    const compte = (a: string) => primarchs.filter((p) => p.allegiance === a).length;
    const texte = carte(el, '/lore/primarchs').querySelector('p')!.textContent!;
    expect(texte).toContain(`${compte('loyalist')} Loyalistes, ${compte('traitor')} Traîtres, ${compte('lost')} Perdus`);
    expect(texte).toContain('9 Loyalistes, 9 Traîtres, 2 Perdus');
    expect(texte).not.toContain('Disparus');
  });

  it('R3 — un flux en erreur ou vide : la carte n’affiche aucun chiffre', async () => {
    const el = await rendre({ timelineEvents$: throwError(() => new Error('500')), loreConcepts$: of([]) });
    expect(meta(el, '/lore/timeline')).toBe('');
    expect(meta(el, '/lore/concepts')).toBe('');
    expect(meta(el, '/lore/primarchs')).toBe('20 fiches');
  });

  it('R4 — Galaxie : zones et failles warp comptées depuis la liste qui dessine la carte', async () => {
    const el = await rendre();
    const failles = HOT_ZONES.filter((z) => z.type === 'rift').length;
    expect(meta(el, '/lore/galaxy')).toBe(`${HOT_ZONES.length} hot zones · ${failles} failles warp`);
    expect(HOT_ZONES.length).toBe(69);
  });
});
