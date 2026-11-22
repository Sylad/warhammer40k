import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { VideosService } from '../modules/videos/videos.service.js';
import { ChannelsService } from '../modules/channels/channels.service.js';
import type { Channel, Video } from '../modules/videos/video.model.js';
import { readContent } from './content.js';
import { CHAINES_RETIREES_DU_SEED, VIDEOS_RETIREES_DU_SEED } from './retires-du-seed.js';
import { fusionner, migrerAncienVolume } from './surcouche-utilisateur.js';

// L76 — référence (seed) et ajouts/retraits de l'utilisateur (volume) séparés, fusionnés à la lecture.

const video = (id: string, url = `https://youtu.be/${id.padEnd(11, 'x').slice(0, 11)}`): Video => ({
  id, titre: id, createur: 'x', description: '', url, type: 'Chaîne lore', langue: 'EN', tags: [], incontournable: false,
});
const chaine = (id: string, url = `https://www.youtube.com/@${id}`): Channel => ({
  id, name: id, description: '', language: 'EN', url, priority: false,
});

describe('fusionner (L76)', () => {
  const seed = [{ id: 'a', v: 1 }, { id: 'b', v: 1 }];

  it('sans surcouche : le seed tel quel', () => {
    expect(fusionner(seed, { ajouts: [], retraits: [] })).toEqual(seed);
  });

  it('un ajout s’ajoute après le seed', () => {
    expect(fusionner(seed, { ajouts: [{ id: 'u', v: 0 }], retraits: [] }).map(e => e.id)).toEqual(['a', 'b', 'u']);
  });

  it('un retrait ôte une entrée du seed', () => {
    expect(fusionner(seed, { ajouts: [], retraits: ['a'] }).map(e => e.id)).toEqual(['b']);
  });

  it('à identifiant égal, la référence gagne (une entrée reprise dans le seed y reçoit ses corrections)', () => {
    expect(fusionner(seed, { ajouts: [{ id: 'a', v: 0 }], retraits: [] })).toEqual(seed);
  });

  it('un seed corrigé passe tel quel sous la même surcouche', () => {
    const corrige = [{ id: 'a', v: 2 }, { id: 'b', v: 1 }, { id: 'c', v: 1 }];
    const s = { ajouts: [{ id: 'u', v: 0 }], retraits: ['b'] };
    expect(fusionner(corrige, s)).toEqual([{ id: 'a', v: 2 }, { id: 'c', v: 1 }, { id: 'u', v: 0 }]);
  });
});

describe('migrerAncienVolume (L76)', () => {
  const seed = [{ id: 'a', url: 'neuve' }, { id: 'b', url: 'neuve' }];
  const o = { idsRetiresDuSeed: ['ancien-du-seed'], retraitsPossibles: true };

  it('copie complète périmée du seed + ajouts : seuls les ajouts sont repris, les copies du seed non', () => {
    const ancien = [{ id: 'a', url: 'perimee' }, { id: 'b', url: 'perimee' }, { id: 'u1', url: 'x' }, { id: 'u2', url: 'y' }];
    const s = migrerAncienVolume(ancien, seed, o);
    expect(s).toEqual({ ajouts: [{ id: 'u1', url: 'x' }, { id: 'u2', url: 'y' }], retraits: [] });
    expect(fusionner(seed, s).map(e => e.url)).toEqual(['neuve', 'neuve', 'x', 'y']);
  });

  it('une entrée du seed absente de l’ancien fichier est un retrait de l’utilisateur', () => {
    expect(migrerAncienVolume([{ id: 'b', url: 'perimee' }], seed, o)).toEqual({ ajouts: [], retraits: ['a'] });
  });

  it('sans retrait possible (chaînes) : une absence n’est pas un retrait', () => {
    expect(migrerAncienVolume([{ id: 'b', url: 'p' }], seed, { ...o, retraitsPossibles: false })).toEqual({ ajouts: [], retraits: [] });
  });

  it('une entrée ôtée du seed n’est pas reprise comme ajout ; un doublon n’est repris qu’une fois', () => {
    const s = migrerAncienVolume([{ id: 'ancien-du-seed', url: 'p' }, { id: 'u', url: '1' }, { id: 'u', url: '2' }, ...seed], seed, o);
    expect(s).toEqual({ ajouts: [{ id: 'u', url: '1' }], retraits: [] });
  });

  it('les identifiants ôtés du seed ne sont plus dans le seed', () => {
    const ids = (f: string) => new Set(readContent<{ id: string }[]>(f, []).map(e => e.id));
    const v = ids('videos.json');
    const c = ids('channels.json');
    expect(v.size).toBeGreaterThan(0);
    expect(VIDEOS_RETIREES_DU_SEED.filter(id => v.has(id))).toEqual([]);
    expect(CHAINES_RETIREES_DU_SEED.filter(id => c.has(id))).toEqual([]);
  });
});

describe('VideosService / ChannelsService sur un volume (L76)', () => {
  const cwd = process.cwd();
  const savedContentDir = process.env['CONTENT_DIR'];
  let dir: string;
  const write = (sub: string, file: string, value: unknown) => {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
    fs.writeFileSync(path.join(dir, sub, file), typeof value === 'string' ? value : JSON.stringify(value));
  };
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(dir, 'data', file), 'utf-8'));
  const ids = (l: { id: string }[]) => l.map(e => e.id);

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-l76-'));
    delete process.env['CONTENT_DIR'];
    process.chdir(dir);
  });
  afterEach(() => {
    process.chdir(cwd);
    if (savedContentDir === undefined) delete process.env['CONTENT_DIR'];
    else process.env['CONTENT_DIR'] = savedContentDir;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('migration du volume de prod : seed corrigé visible, ajouts gardés, ancien fichier intact', () => {
    // état de prod relevé le 2026-11-22 : copie du seed d'avant 0171157 (adresse périmée) + vidéos importées
    write('seed', 'videos.json', [video('luetin09', 'https://www.youtube.com/@luetin09'), video('miniac')]);
    const ancien = [video('luetin09', 'https://youtube.com/@luetin09'), video('miniac'), video('importee'), video('baldermort', 'https://www.youtube.com/@BaldermortGW')];
    write('data', 'videos.json', ancien);
    const s = new VideosService();
    expect(ids(s.findAll())).toEqual(['luetin09', 'miniac', 'importee']);
    expect(s.findAll()[0].url).toBe('https://www.youtube.com/@luetin09');
    expect(read('videos-utilisateur.json')).toEqual({ version: 1, ajouts: [video('importee')], retraits: [] });
    expect(read('videos.json')).toEqual(ancien);
  });

  it('une vidéo du seed supprimée par l’utilisateur avant L76 reste supprimée', () => {
    write('seed', 'videos.json', [video('a'), video('b')]);
    write('data', 'videos.json', [video('b')]);
    expect(ids(new VideosService().findAll())).toEqual(['b']);
    expect(read('videos-utilisateur.json').retraits).toEqual(['a']);
  });

  it('la surcouche, une fois là, est seule lue (l’ancien fichier est ignoré) ; un seed corrigé y passe', () => {
    write('seed', 'videos.json', [video('a', 'https://www.youtube.com/@corrigee'), video('neuve-du-seed')]);
    write('data', 'videos.json', [video('perimee-ignoree')]);
    write('data', 'videos-utilisateur.json', { version: 1, ajouts: [video('u')], retraits: [] });
    const s = new VideosService();
    expect(ids(s.findAll())).toEqual(['a', 'neuve-du-seed', 'u']);
    expect(s.findAll()[0].url).toBe('https://www.youtube.com/@corrigee');
  });

  it('ajout puis retrait d’un ajout : la surcouche suit, le seed n’est pas touché', () => {
    write('seed', 'videos.json', [video('a')]);
    const s = new VideosService();
    s.add(video('u'));
    expect(ids(s.findAll())).toEqual(['a', 'u']);
    expect(read('videos-utilisateur.json')).toEqual({ version: 1, ajouts: [video('u')], retraits: [] });
    expect(ids(new VideosService().findAll())).toEqual(['a', 'u']); // relu au redémarrage
    expect(s.remove('u')).toBe(true);
    expect(read('videos-utilisateur.json')).toEqual({ version: 1, ajouts: [], retraits: [] });
    expect(fs.readFileSync(path.join(dir, 'seed', 'videos.json'), 'utf-8')).toBe(JSON.stringify([video('a')]));
  });

  it('retrait d’une entrée du seed : noté dans retraits, tenu au redémarrage ; un id inconnu → faux', () => {
    write('seed', 'videos.json', [video('a'), video('b')]);
    const s = new VideosService();
    expect(s.remove('a')).toBe(true);
    expect(s.remove('a')).toBe(false);
    expect(s.remove('inconnue')).toBe(false);
    expect(read('videos-utilisateur.json').retraits).toEqual(['a']);
    expect(ids(new VideosService().findAll())).toEqual(['b']);
  });

  it('réimport d’une vidéo du seed retirée : le retrait est levé', () => {
    write('seed', 'videos.json', [video('a')]);
    const s = new VideosService();
    s.remove('a');
    s.add(video('a'));
    expect(ids(new VideosService().findAll())).toEqual(['a']);
    expect(read('videos-utilisateur.json').retraits).toEqual([]);
  });

  it('surcouche illisible : repli sur le seed, écriture refusée, fichier intact', () => {
    write('seed', 'videos.json', [video('a')]);
    write('data', 'videos-utilisateur.json', '{ tronqué');
    const s = new VideosService();
    expect(ids(s.findAll())).toEqual(['a']);
    expect(() => s.add(video('u'))).toThrow(/illisible/);
    expect(() => s.remove('a')).toThrow(/illisible/);
    expect(fs.readFileSync(path.join(dir, 'data', 'videos-utilisateur.json'), 'utf-8')).toBe('{ tronqué');
  });

  it('ancien fichier illisible : pas de migration, rien d’écrit, écritures refusées', () => {
    write('seed', 'channels.json', [chaine('a')]);
    write('data', 'channels.json', '[ tronqué');
    const s = new ChannelsService();
    expect(ids(s.findAll())).toEqual(['a']);
    expect(() => s.add(chaine('u'))).toThrow(/illisible/);
    expect(fs.existsSync(path.join(dir, 'data', 'channels-utilisateur.json'))).toBe(false);
  });

  it('chaînes : migration (ajouts seulement), seed corrigé visible, findByUrl sur l’adresse corrigée', () => {
    write('seed', 'channels.json', [chaine('a', 'https://www.youtube.com/@A'), chaine('b')]);
    write('data', 'channels.json', [chaine('a', 'https://youtube.com/@A'), chaine('indomitus-40k', 'https://www.youtube.com/@Indomitus40k'), chaine('u')]);
    const s = new ChannelsService();
    expect(ids(s.findAll())).toEqual(['a', 'b', 'u']);
    expect(s.findByUrl('https://www.youtube.com/@A/')?.id).toBe('a');
    expect(read('channels-utilisateur.json')).toEqual({ version: 1, ajouts: [chaine('u')], retraits: [] });
    s.add(chaine('v'));
    expect(ids(new ChannelsService().findAll())).toEqual(['a', 'b', 'u', 'v']);
  });
});
