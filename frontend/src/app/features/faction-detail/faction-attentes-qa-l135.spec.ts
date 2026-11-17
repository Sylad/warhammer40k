// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** L135 : l'attendu QA de /factions/:id sans sous-faction, inscrit dans docs/qa/expectations.md (lu par qa-reviewer). */
const md = readFileSync(resolve(__dirname, '../../../../../docs/qa/expectations.md'), 'utf8');
const start = md.indexOf('\n## /factions/:id');
const section = md.slice(start, md.indexOf('\n## ', start + 1));

describe('attendus QA de /factions/:id', () => {
  it('R3 — une faction sans sous-faction (inquisition) n’a pas de section sous-factions, l’API peut répondre []', () => {
    expect(section).toMatch(/inquisition/);
    expect(section).toMatch(/sans sous-faction[^\n]*(section|lien)/);
    expect(section).toMatch(/api:[^\n]*subfactions\?factionId=[^\n]*\[\]/);
  });

  it('L233 — une faction inexistante affiche le message d’absence, et son 404 en console est permis', () => {
    const ligne = section.split('\n').find(l => l.startsWith('- 404 (visiter /factions/n-existe-pas)'));
    expect(ligne).toBeDefined();
    expect(ligne).toMatch(/Faction introuvable/);
    expect(ligne).toMatch(/\/api\/factions\/n-existe-pas[^\n]*404/);
    expect(ligne).toMatch(/erreur 404[^\n]*console est permise/);
  });
});
