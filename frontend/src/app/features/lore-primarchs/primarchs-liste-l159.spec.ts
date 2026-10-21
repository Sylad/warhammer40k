// L159 (revue UX L10, WCAG 2.4.1/2.4.7/4.1.2) — liste des Primarques : un seul lien par carte (60
// arrêts de tabulation → 20, image nommée « Lire le lore complet » ×20 supprimée) et compteurs à
// « — » (jamais « 0 ») tant que la liste charge, annoncés par une région role=status.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LorePrimarchsComponent } from './lore-primarchs.component';

const PRIMARCHS = JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/primarchs.json'), 'utf8'));

async function monter(primarchs$: unknown) {
  await setupTestBed([LorePrimarchsComponent], [provideRouter([]), { provide: WarhammerService, useValue: fakeWarhammerService({ primarchs$ }) }]);
  const f = TestBed.createComponent(LorePrimarchsComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  return { f, el: f.nativeElement as HTMLElement, settle };
}
const texte = (n: Element) => (n.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('Liste des Primarques — un lien par carte (L159)', () => {
  it('R1 — chaque carte n’a qu’un seul lien (20 arrêts de tabulation, pas 60), vers sa fiche', async () => {
    const { el } = await monter(of(PRIMARCHS));
    const cartes = [...el.querySelectorAll('.card')];
    expect(cartes).toHaveLength(20);
    for (const c of cartes) {
      const liens = [...c.querySelectorAll('a')];
      expect(liens).toHaveLength(1);
      expect(liens[0].getAttribute('href')).toMatch(/^\/lore\/primarchs\/[a-z0-9-]+$/);
    }
  });

  it('R2 — le nom accessible du lien est le nom du Primarque ; plus aucun « Lire le lore complet »', async () => {
    const { el } = await monter(of(PRIMARCHS));
    const noms = [...el.querySelectorAll('.card a')].map(texte);
    expect(noms).toEqual(PRIMARCHS.map((p: { name: string }) => p.name));
    expect(el.querySelectorAll('[aria-label="Lire le lore complet"]')).toHaveLength(0);
    expect(el.querySelectorAll('.card [aria-label]')).toHaveLength(0);
  });

  it('R3 — le lien couvre toute la carte (clic sur l’image et sur « Lire la fiche → » compris)', async () => {
    const scss = readFileSync(resolve(__dirname, 'lore-primarchs.component.scss'), 'utf8');
    expect(scss).toMatch(/\.card-name-link::after\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0/);
  });
});

describe('Liste des Primarques — chargement (L159)', () => {
  it('R4 — pendant le chargement : compteurs et onglets à « — », jamais « 0 »', async () => {
    const { el } = await monter(new Subject());
    const valeurs = [...el.querySelectorAll('.counter strong, .filter')].map(texte);
    expect(valeurs).toEqual(['—', '—', '—', 'Tous · —', 'Loyalistes · —', 'Traîtres · —', 'Perdus · —']);
  });

  it('R5 — une région role=status annonce le chargement, puis se vide quand les nombres arrivent', async () => {
    const flux = new Subject<unknown[]>();
    const { el, settle } = await monter(flux);
    const statut = el.querySelector('[role="status"]')!;
    expect(statut).not.toBeNull();
    expect(texte(statut)).toBe('Chargement des Primarques…');
    flux.next(PRIMARCHS);
    await settle();
    expect(el.querySelector('[role="status"]')).toBe(statut);
    expect(texte(statut)).toBe('');
    expect([...el.querySelectorAll('.counter strong')].map(texte)).toEqual(['9', '9', '2']);
  });
});
