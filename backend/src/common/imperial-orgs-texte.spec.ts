import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/** L191 : relecture des textes de `seed/imperial-orgs.json` (QA prod du 23-10). */
const brut = fs.readFileSync(path.join(__dirname, '../../seed/imperial-orgs.json'), 'utf8');

describe('Impériaux — relecture (L191)', () => {
  it('R1 — « mortal » (anglais) n\'apparaît plus : le français dit « mortel »', () => {
    expect(brut).not.toMatch(/\bmortal\b/);
  });
  it('R2 — la citation des Civils Impériaux garde son sens : « ce qu\'aucun mortel ne devrait voir »', () => {
    expect(brut).toContain("J'ai vu ce qu'aucun mortel ne devrait voir. Je l'écris quand même.");
  });
});
