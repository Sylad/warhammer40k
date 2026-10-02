// L42 — bloc « Médias » des pages faction : une vidéo et une illustration DE la faction, plus le
// même contenu partout (la page Nécrons montrait la vidéo « à la une » sur l'Empereur et la
// première illustration du catalogue, un bouclier Ultramarines). Données réelles d'amorçage.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { artworkForFaction, videoForFaction } from './faction-media';

const seed = <T>(f: string): T => JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed', f), 'utf8')) as T;
type V = { id: string; tags: string[]; featured?: boolean; incontournable?: boolean };
const videos = seed<V[]>('videos.json');
const artworks = seed<{ id: string; faction?: string; likes?: number }[]>('artworks.json');
const subfactions = seed<{ name: string; factionId: string }[]>('subfactions.json');
const names = (id: string, nom: string) => [nom, ...subfactions.filter((s) => s.factionId === id).map((s) => s.name)];

describe('videoForFaction (L42)', () => {
  it('Nécrons : aucune vidéo étiquetée → null (plus la vidéo sur l’Empereur)', () => {
    expect(videoForFaction(videos, names('necrons', 'Nécrons'))).toBeNull();
  });
  it('Orks : la vidéo étiquetée « Orks » (Helsreach)', () => {
    expect(videoForFaction(videos, names('orks', 'Orks'))?.id).toBe('helsreach');
  });
  it('Inquisition, Astra Militarum : leurs vidéos étiquetées', () => {
    expect(videoForFaction(videos, names('inquisition', 'Inquisition'))?.id).toMatch(/^lord-inquisitor/);
    expect(videoForFaction(videos, names('astra-militarum', 'Astra Militarum'))?.id).toBe('imperial-iterator-fallen-crown');
  });
  it('étiquette d’une sous-faction de la faction (« Blood Angels » → Space Marines), à la une d’abord', () => {
    const v = [
      { id: 'a', tags: ['Blood Angels'] },
      { id: 'b', tags: ['Orks'], featured: true },
      { id: 'c', tags: ['blood angels'], incontournable: true },
    ];
    expect(videoForFaction(v, ['Space Marines', 'Blood Angels'])?.id).toBe('c');
  });
  it('accents et casse ignorés ; une étiquette qui CONTIENT le nom ne suffit pas', () => {
    expect(videoForFaction([{ id: 'x', tags: ['NECRONS'] }], ['Nécrons'])?.id).toBe('x');
    expect(videoForFaction([{ id: 'y', tags: ['Chaos Space Marines'] }], ['Space Marines'])).toBeNull();
    expect(videoForFaction([{ id: 'z' }], ['Orks'])).toBeNull();
  });
});

describe('artworkForFaction (L42)', () => {
  it('Nécrons : une illustration Nécrons, pas le bouclier Ultramarines (aw-001)', () => {
    const a = artworkForFaction(artworks, 'necrons');
    expect(a?.faction).toBe('necrons');
    expect(a?.id).not.toBe('aw-001');
  });
  it('Orks : l’illustration Orks ; faction sans illustration → null', () => {
    expect(artworkForFaction(artworks, 'orks')?.faction).toBe('orks');
    expect(artworkForFaction(artworks, 'leagues-of-votann')).toBeNull();
  });
  // Relecture : aw-008 « Callidus Assassin » était étiquetée inquisition (Temple Callidus =
  // Officio Assassinorum, factions.json) ; la page Inquisition montrait une assassine.
  it('Callidus Assassin (aw-008) : Officio Assassinorum, pas Inquisition (Eisenhorn reste à l’Inquisition)', () => {
    const factionIds = new Set(seed<{ id: string }[]>('factions.json').map((f) => f.id));
    expect(factionIds.has('officio-assassinorum')).toBe(true);
    expect(artworks.find((a) => a.id === 'aw-008')?.faction).toBe('officio-assassinorum');
    expect(artworkForFaction(artworks, 'officio-assassinorum')?.id).toBe('aw-008');
    expect(artworkForFaction(artworks, 'inquisition')?.id).toBe('aw-030');
  });
  it('chaque illustration étiquetée l’est d’un identifiant de faction existant', () => {
    const factionIds = new Set(seed<{ id: string }[]>('factions.json').map((f) => f.id));
    expect(artworks.filter((a) => a.faction && !factionIds.has(a.faction)).map((a) => a.id)).toEqual([]);
  });
  it('la première de la faction dans l’ordre des données', () => {
    expect(artworkForFaction([{ id: '0', faction: 'g' }, { id: '1', faction: 'f' }, { id: '2', faction: 'f' }], 'f')?.id).toBe('1');
  });
});
