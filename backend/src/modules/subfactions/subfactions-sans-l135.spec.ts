import { describe, expect, it } from 'vitest';
import { SubFactionsService } from './subfactions.service';

/**
 * L135 : l'attendu QA de /factions/:id — une faction sans sous-faction (inquisition) reçoit []
 * de /api/subfactions?factionId=, un tableau vide et non une erreur.
 */
describe('sous-factions d\'une faction qui n\'en a pas (L135)', () => {
  const service = new SubFactionsService();

  it('R2 — inquisition : list(factionId) répond [] sans lever', () => {
    expect(service.list('inquisition')).toEqual([]);
  });

  it('R2 — une faction qui en a (space-marines) répond une liste non vide', () => {
    expect(service.list('space-marines').length).toBeGreaterThan(0);
  });
});
