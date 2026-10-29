// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * L212 : QA prod du 29-10 (L17) — Indomitable Will et Or'es Tash'var affichaient la même image (le Battleship
 * ApocalypseClassBattleship2.jpg), Khaine une bataille de Nurgle (page « Battle of Iyanden »), Warp Skull un croiseur
 * loyaliste (« Strike Cruiser ») et Remembrance « Pathos.jpg » (page « Plaguefleet »). Chacun vise désormais une page du
 * wiki à son sujet ; les 15 requêtes sont distinctes (donc les 15 images : la requête fixe la page, la page son image).
 */
const vaisseaux = JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/legendary-ships.json'), 'utf8')) as {
  id: string;
  wikiQuery: string;
}[];
const requete = (id: string) => vaisseaux.find(v => v.id === id)?.wikiQuery;

describe('images des Vaisseaux légendaires', () => {
  it('R1 — Indomitable Will vise « Blood Angels » (son chapitre), pas le Battleship générique', () => {
    expect(requete('indomitable-will')).toBe('Blood Angels');
  });
  it('R2 — Or\'es Tash\'var vise la page du cuirassé T\'au « Or\'es El\'leath (Custodian)-class Battleship »', () => {
    expect(requete('hammerhead-tau')).toBe("Or'es El'leath (Custodian)-class Battleship");
  });
  it('R3 — Khaine vise « Wraithbone » (la matière d\'un vaisseau-monde), pas la bataille de Nurgle d\'Iyanden', () => {
    expect(requete('khaine')).toBe('Wraithbone');
  });
  it('R4 — Warp Skull vise « Alpha Legion », pas un Strike Cruiser loyaliste', () => {
    expect(requete('warp-skull')).toBe('Alpha Legion');
  });
  it('R5 — Remembrance vise « Death Guard » (sa légion), pas le Pathos de la flotte de peste', () => {
    expect(requete('remembrance')).toBe('Death Guard');
  });
  it('R6 — deux vaisseaux ne partagent jamais la même requête, et il y en a 15', () => {
    const vues = vaisseaux.map(v => v.wikiQuery.toLowerCase().trim());
    expect(vues).toHaveLength(15);
    expect(vues.filter((q, i) => vues.indexOf(q) !== i)).toEqual([]);
  });
});
