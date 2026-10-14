// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** L131 : les attendus QA de /units/:id inscrits dans docs/qa/expectations.md (lus par l'agent qa-reviewer). */
const md = readFileSync(resolve(__dirname, '../../../../../docs/qa/expectations.md'), 'utf8');
const start = md.indexOf('\n## /units/:id');
const section = md.slice(start, md.indexOf('\n## ', start + 1));

describe('attendus QA de /units/:id', () => {
  it('la barre d\'onglets est une nav nommée avec un seul aria-current', () => {
    expect(section).toMatch(/nav\.tabs/);
    expect(section).toMatch(/Sections de la fiche/);
    expect(section).toMatch(/un seul[^\n]*aria-current/);
  });
  it('Description et Histoire & Lore diffèrent, la citation n\'apparaît qu\'une fois', () => {
    expect(section).toMatch(/Description[^\n]*Histoire & Lore/);
    expect(section).toMatch(/citation[^\n]*une seule fois/);
  });
  it('CTA galerie filtrée, CTA vidéo nommé et absent sans vidéo', () => {
    expect(section).toMatch(/\/gallery\?faction=/);
    expect(section).toMatch(/Voir la vidéo :/);
    expect(section).toMatch(/sans vidéo[^\n]*absent|absent[^\n]*sans vidéo/);
  });
  it('cibles d\'au moins 44 px à 390', () => {
    expect(section).toMatch(/44 px[^\n]*390|390[^\n]*44 px/);
  });
  it('jamais deux badges de même sens', () => {
    expect(section).toMatch(/never:[^\n]*deux badges de même sens/);
  });
});
