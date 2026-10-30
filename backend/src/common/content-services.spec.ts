import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FactionsService } from '../modules/factions/factions.service.js';
import { UnitsService } from '../modules/units/units.service.js';
import { SeriesService } from '../modules/series/series.service.js';
import { SubFactionsService } from '../modules/subfactions/subfactions.service.js';
import { TimelineService } from '../modules/timeline/timeline.service.js';
import { LoreFeedService } from '../modules/lore-feed/lore-feed.service.js';
import { ImageMetaService } from '../modules/image-meta/image-meta.service.js';
import { VideosService } from '../modules/videos/videos.service.js';
import { ChannelsService } from '../modules/channels/channels.service.js';
import { ArtworksService } from '../modules/artworks/artworks.service.js';

/**
 * L74 : chaque service de contenu lit `seed/` (image), jamais `data/` (volume) ;
 * seuls videos.json et channels.json, écrits par POST/DELETE, viennent du volume
 * quand il en a un, et retombent sur le seed sinon.
 */
describe('services de contenu — seed/ prime sur data/ (L74)', () => {
  const cwd = process.cwd();
  const savedContentDir = process.env['CONTENT_DIR'];
  let dir: string;

  const write = (sub: string, file: string, value: unknown) => {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
    fs.writeFileSync(path.join(dir, sub, file), JSON.stringify(value));
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-content-'));
    delete process.env['CONTENT_DIR'];
    process.chdir(dir);
  });
  afterEach(() => {
    process.chdir(cwd);
    if (savedContentDir === undefined) delete process.env['CONTENT_DIR'];
    else process.env['CONTENT_DIR'] = savedContentDir;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /** Écrit `file` dans seed/ (valeur neuve) et dans data/ (valeur périmée). */
  const both = (file: string, seed: unknown, stale: unknown) => {
    write('seed', file, seed);
    write('data', file, stale);
  };

  it('FactionsService', () => {
    both('factions.json', [{ id: 'seed' }], [{ id: 'stale' }]);
    expect(new FactionsService().findAll().map((f) => f.id)).toEqual(['seed']);
  });

  it('UnitsService', () => {
    both('units.json', [{ id: 'seed' }], [{ id: 'stale' }]);
    expect(new UnitsService().findAll().map((u) => u.id)).toEqual(['seed']);
  });

  it('SeriesService', () => {
    both('series.json', [{ id: 'seed' }], [{ id: 'stale' }]);
    expect(new SeriesService().findAll().map((s) => s.id)).toEqual(['seed']);
  });

  it('SubFactionsService', () => {
    both('subfactions.json', [{ id: 'seed' }], [{ id: 'stale' }]);
    expect(new SubFactionsService().list().map((s) => s.id)).toEqual(['seed']);
  });

  it('TimelineService', () => {
    both('timeline-events.json', [{ id: 'seed' }], [{ id: 'stale' }]);
    expect(new TimelineService().findAll().map((e) => e.id)).toEqual(['seed']);
  });

  it('ArtworksService', () => {
    both('artworks.json', [{ id: 'seed', artist: 'A', collectionId: 'c' }], [{ id: 'stale', artist: 'B', collectionId: 'c' }]);
    both('artwork-collections.json', [{ id: 'c' }], [{ id: 'stale' }]);
    const s = new ArtworksService();
    expect(s.findAll().map((a) => a.id)).toEqual(['seed']);
  });

  it('LoreFeedService', () => {
    both('primarchs.json', [{ id: 'seed' }], [{ id: 'stale' }]);
    const s = new LoreFeedService();
    expect(s.getPrimarchs().map((p) => p.id)).toEqual(['seed']);
  });

  it('ImageMetaService.getSuggestedCategories', () => {
    both('factions.json', [{ nom: 'Seed' }], [{ nom: 'Stale' }]);
    both('subfactions.json', [{ name: 'SeedSub' }], [{ name: 'StaleSub' }]);
    both('primarchs.json', [{ name: 'SeedPrim' }], [{ name: 'StalePrim' }]);
    const c = new ImageMetaService().getSuggestedCategories();
    expect(c.factions).toEqual(['Seed']);
    expect(c.subfactions).toEqual(['SeedSub']);
    expect(c.primarchs).toEqual(['SeedPrim']);
  });

  describe('VideosService / ChannelsService', () => {
    it('sans fichier dans le volume : repli sur le seed', () => {
      write('seed', 'videos.json', [{ id: 'seed' }]);
      write('seed', 'channels.json', [{ id: 'seed' }]);
      expect(new VideosService().findAll().map((v) => v.id)).toEqual(['seed']);
      expect(new ChannelsService().findAll().map((c) => c.id)).toEqual(['seed']);
    });

    it('avec un fichier dans le volume : le volume gagne (données utilisateur)', () => {
      both('videos.json', [{ id: 'seed' }], [{ id: 'user' }]);
      both('channels.json', [{ id: 'seed' }], [{ id: 'user' }]);
      expect(new VideosService().findAll().map((v) => v.id)).toEqual(['user']);
      expect(new ChannelsService().findAll().map((c) => c.id)).toEqual(['user']);
    });

    it('R6 — les chaînes retirées (L41) disparaissent aussi du volume, sans toucher au reste ni au fichier', () => {
      const morte = (id: string, handle: string) => ({ id, url: `https://www.youtube.com/@${handle}` });
      const volume = [morte('indomitus-40k', 'Indomitus40k'), morte('warfo40k', 'warfo40k'), morte('vivante', 'Vivante')];
      write('data', 'channels.json', volume);
      write('data', 'videos.json', volume);
      expect(new ChannelsService().findAll().map((c) => c.id)).toEqual(['vivante']);
      expect(new ChannelsService().findPriority()).toEqual([]);
      expect(new VideosService().findAll().map((v) => v.id)).toEqual(['vivante']);
      expect(JSON.parse(fs.readFileSync(path.join(dir, 'data', 'channels.json'), 'utf-8'))).toHaveLength(3);
    });

    it('R7 — ChannelsService.add refuse une chaîne retirée (L41) : erreur explicite, rien n’est écrit', () => {
      write('data', 'channels.json', [{ id: 'vivante', url: 'https://www.youtube.com/@Vivante' }]);
      const s = new ChannelsService();
      expect(() => s.add({ id: 'indomitus-40k', name: 'Indomitus', url: 'https://www.youtube.com/@Indomitus40k/' } as never)).toThrow(
        /@Indomitus40k.*retirée/,
      );
      expect(s.findAll().map((c) => c.id)).toEqual(['vivante']);
      expect(JSON.parse(fs.readFileSync(path.join(dir, 'data', 'channels.json'), 'utf-8'))).toHaveLength(1);
    });

    it('R8 — VideosService.add refuse une vidéo dont l’adresse est une chaîne retirée (L41)', () => {
      write('data', 'videos.json', [{ id: 'vivante', url: 'https://youtu.be/abc' }]);
      const s = new VideosService();
      expect(() => s.add({ id: 'astartes-chaine', titre: 'Astartes', url: 'https://www.youtube.com/@Astartes40k' } as never)).toThrow(
        /@Astartes40k.*retirée/,
      );
      expect(s.findAll().map((v) => v.id)).toEqual(['vivante']);
      expect(JSON.parse(fs.readFileSync(path.join(dir, 'data', 'videos.json'), 'utf-8'))).toHaveLength(1);
    });

    it('ni volume ni seed : vide', () => {
      expect(new VideosService().findAll()).toEqual([]);
      expect(new ChannelsService().findAll()).toEqual([]);
    });
  });
});
