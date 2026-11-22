import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { UnitsService } from './units.service';

/**
 * L247 : les assassins des Temples relèvent de l'Officio Assassinorum, pas de l'Inquisition.
 * Source vérifiée le 2026-11-22 : fiches Imperial Agents (Faction Pack 11e éd., v1.3) — mot-clé
 * OFFICIO ASSASSINORUM sur Vindicare, Eversor, Callidus et Culexus Assassin
 * (https://www.wahapedia.ru/wh40k11ed/factions/imperial-agents/Vindicare-Assassin, etc.).
 * Le seed n'a pas de fiche Culexus : rien n'est créé.
 */
const ASSASSINS = ['inq-vindicare', 'inq-eversor', 'inq-callidus'];
const INQUISITION = ['inq-eisenhorn', 'inq-ravenor', 'inq-coteaz', 'inq-karamazov', 'inq-valeria', 'inq-agents', 'inq-henchmen'];

describe('assassins rattachés à l\'Officio Assassinorum (L247)', () => {
  const service = new UnitsService();

  it('les trois assassins ont le factionId de l\'Officio, une seule fiche chacun', () => {
    for (const id of ASSASSINS) {
      expect(service.findAll().filter((u) => u.id === id), id).toHaveLength(1);
      expect(service.findOne(id).factionId, id).toBe('officio-assassinorum');
      expect(service.findOne(id).sourceFaction, id).toMatch(/^https:\/\/www\.wahapedia\.ru\/wh40k11ed\/factions\/imperial-agents\//);
    }
    expect(service.findAll('officio-assassinorum').map((u) => u.id).sort()).toEqual([...ASSASSINS].sort());
  });

  it('l\'Inquisition garde toutes ses autres unités, et plus aucun assassin', () => {
    expect(service.findAll('inquisition').map((u) => u.id).sort()).toEqual([...INQUISITION].sort());
  });

  it('les héros notables de l\'Officio mènent à des unités de l\'Officio', () => {
    const factions = JSON.parse(readFileSync(resolve(__dirname, '../../../seed/factions.json'), 'utf8')) as
      { id: string; notableHeroes?: { unitId?: string }[] }[];
    const officio = factions.find((f) => f.id === 'officio-assassinorum');
    const liens = (officio?.notableHeroes ?? []).map((h) => h.unitId).filter(Boolean);
    expect(liens.sort()).toEqual([...ASSASSINS].sort());
    for (const id of liens) expect(service.findOne(id!).factionId).toBe('officio-assassinorum');
  });
});
