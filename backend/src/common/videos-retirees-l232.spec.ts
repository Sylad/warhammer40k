import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import { VideosService } from '../modules/videos/videos.service.js';
import type { Video } from '../modules/videos/video.model.js';
import { readContent } from './content.js';
import { estVideoRetiree, idYouTube } from './videos-retirees.js';

// L232 — deux vidéos supprimées de YouTube (vignette et oEmbed en 404, QA prod du 2026-11-17)
// vivent dans le volume de prod : filtrées à la lecture, refusées à l'enregistrement.
// Ce test est hors réseau : il ne peut pas découvrir une NOUVELLE vidéo supprimée (il faudrait
// interroger YouTube) ; `npm run liens:externes` (frontend, à la demande) le fait via oEmbed.

const video = (id: string, embedId: string | null, url = `https://youtu.be/${embedId}`): Video => ({
  id, titre: id, createur: 'x', description: '', url, embedId, embedType: 'video', type: 'Animation fan',
  langue: 'EN', tags: [], incontournable: false,
});

describe('vidéos supprimées de YouTube (L232)', () => {
  const cwd = process.cwd();
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-l232-'));
    process.chdir(dir);
  });
  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const volume = (videos: Video[]) => {
    fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'data', 'videos.json'), JSON.stringify(videos));
  };

  it('R1 — un volume qui les porte encore ne les affiche plus, les autres vidéos restent', () => {
    volume([
      video('the-emperor-returns-the-galaxy-reacts-huKRew_nEGI', 'huKRew_nEGI'),
      video('garde', 'XjwJ-1bYL4A'),
      video('raptors-CcFcmPQklyY', 'CcFcmPQklyY'),
    ]);
    expect(new VideosService().findAll().map(v => v.id)).toEqual(['garde']);
  });

  it('R2 — l’enregistrement d’une vidéo retirée est refusé (400), sans réécrire le volume', () => {
    volume([video('garde', 'XjwJ-1bYL4A')]);
    const s = new VideosService();
    expect(() => s.add(video('raptors-CcFcmPQklyY', 'CcFcmPQklyY'))).toThrow(BadRequestException);
    expect(() => s.add(video('autre-nom', null, 'https://www.youtube.com/watch?v=huKRew_nEGI&t=3'))).toThrow(/L232/);
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'data', 'videos-utilisateur.json'), 'utf-8')).ajouts).toHaveLength(1);
  });

  it('R3 — l’identifiant est reconnu dans toutes les formes d’adresse, pas en sous-chaîne', () => {
    for (const u of [
      'https://youtu.be/CcFcmPQklyY', 'https://youtu.be/CcFcmPQklyY?si=x', 'https://www.youtube.com/watch?v=CcFcmPQklyY',
      'https://www.youtube.com/watch?feature=share&v=CcFcmPQklyY', 'https://www.youtube.com/embed/CcFcmPQklyY',
      'https://www.youtube.com/shorts/CcFcmPQklyY',
    ]) expect(idYouTube(u), u).toBe('CcFcmPQklyY');
    expect(idYouTube('https://youtu.be/CcFcmPQklyYZ')).toBeUndefined();
    expect(estVideoRetiree({ url: 'https://example.com/', embedId: 'huKRew_nEGI', embedType: 'video' })).toBe(true);
    // un identifiant de liste de lecture n'est pas un identifiant de vidéo
    expect(estVideoRetiree({ url: 'https://youtube.com/playlist?list=PLx', embedId: 'huKRew_nEGI', embedType: 'playlist' })).toBe(false);
    expect(estVideoRetiree({ url: undefined })).toBe(false);
  });

  it('R4 — le seed ne contient aucune vidéo retirée', () => {
    process.chdir(cwd);
    const seed = readContent<Video[]>('videos.json', []);
    expect(seed.length).toBeGreaterThan(0);
    expect(seed.filter(v => estVideoRetiree(v)).map(v => v.id)).toEqual([]);
  });
});
