// L173 — Panthéon du Chaos : la conclusion compte les primarques réellement listés et
// ne contredit pas le chapeau (« dix mille ans »).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreChaosGodsComponent } from './lore-chaos-gods.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/chaos-gods.json'), 'utf8')) as {
  primarchsCorrupted: { name: string }[];
}[];

async function rendre(dieux: unknown[]): Promise<HTMLElement> {
  await setupTestBed([LoreChaosGodsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ chaosGods$: of(dieux) }) },
  ]);
  const f = TestBed.createComponent(LoreChaosGodsComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

const texte = (el: HTMLElement) => (el.querySelector('.cta-text')?.textContent ?? '').replace(/\s+/g, ' ');

describe('Panthéon du Chaos, conclusion (L173)', () => {
  it('R1 — la conclusion compte les primarques listés dans les fiches (4 dans le seed)', async () => {
    const listes = seed.reduce((n, g) => n + g.primarchsCorrupted.length, 0);
    expect(listes).toBe(4);
    const el = await rendre(seed);
    expect(el.querySelectorAll('.primarch-name').length).toBe(listes);
    expect(texte(el)).toContain('Quatre primarques nommés ici');
    expect(texte(el)).not.toContain('Trois primarques');
  });
  it('R2 — le nombre suit les données (deux primarques → « Deux primarques »)', async () => {
    const el = await rendre(seed.map((g, i) => ({ ...g, id: `d${i}`, primarchsCorrupted: i < 2 ? g.primarchsCorrupted : [] })));
    expect(texte(el)).toContain('Deux primarques nommés ici');
  });
  it('R3 — un seul primarque : singulier accordé', async () => {
    const el = await rendre(seed.map((g, i) => ({ ...g, id: `d${i}`, primarchsCorrupted: i < 1 ? g.primarchsCorrupted : [] })));
    expect(texte(el)).toContain('Un primarque nommé ici');
  });
  it('R4 — la durée de la conclusion est celle du chapeau : dix mille ans, pas six millénaires', async () => {
    const el = await rendre(seed);
    expect(el.querySelector('.lede')?.textContent).toContain('dix mille ans');
    expect(texte(el)).toContain('Dix mille ans de corruption');
    expect(texte(el)).not.toContain('millénaires');
  });
  it('R5 — aucun primarque listé : la conclusion n’en parle pas', async () => {
    const el = await rendre(seed.map((g, i) => ({ ...g, id: `d${i}`, primarchsCorrupted: [] })));
    expect(texte(el)).not.toContain('primarque nommé');
    expect(texte(el)).toContain('Quatre dieux. Dix mille ans de corruption.');
  });
});
