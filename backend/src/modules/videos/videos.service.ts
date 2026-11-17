import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { atomicWriteJsonSync } from '../../common/atomic-write.js';
import { estChaineRetiree, motifChaineRetiree } from '../../common/chaines-retirees.js';
import { readContent, userDataPath } from '../../common/content.js';
import { estVideoRetiree, motifVideoRetiree } from '../../common/videos-retirees.js';
import type { Video } from './video.model.js';



@Injectable()
export class VideosService {
  private videos: Video[];

  constructor() {
    // Garde existsSync + try/catch comme tous les services frères : un
    // videos.json manquant/tronqué faisait crash-looper TOUT le backend
    // (throw dans le constructor = bootstrap Nest avorté). Review 2026-08-14.
    try {
      const lues = fs.existsSync(userDataPath('videos.json'))
        ? (JSON.parse(fs.readFileSync(userDataPath('videos.json'), 'utf-8')) as Video[])
        : readContent<Video[]>('videos.json', []); // L74 : vidéos ajoutées → volume ; à défaut, le seed
      // L41 (chaînes retirées) et L232 (vidéos supprimées de YouTube) : filtrées à la lecture.
      this.videos = lues.filter(v => !estChaineRetiree(v.url) && !estVideoRetiree(v));
    } catch {
      this.videos = [];
    }
  }

  findAll(type?: string, langue?: string): Video[] {
    let result = this.videos;
    if (type) result = result.filter(v => v.type === type);
    if (langue) result = result.filter(v => v.langue.includes(langue));
    return result;
  }

  exists(id: string): boolean {
    return this.videos.some(v => v.id === id);
  }

  add(video: Video): Video {
    if (!video.id || !video.titre || !video.url) {
      throw new BadRequestException('id, titre, url required');
    }
    if (this.exists(video.id)) {
      throw new BadRequestException(`Video ${video.id} already exists`);
    }
    const retiree = motifChaineRetiree(video.url); // L41 R8 : sinon l'entrée serait filtrée au prochain démarrage
    if (retiree) throw new BadRequestException(retiree);
    const supprimee = motifVideoRetiree(video); // L232 : même raison
    if (supprimee) throw new BadRequestException(supprimee);
    this.videos.push(video);
    atomicWriteJsonSync(userDataPath('videos.json'), this.videos);
    return video;
  }

  remove(id: string): boolean {
    const idx = this.videos.findIndex(v => v.id === id);
    if (idx < 0) return false;
    this.videos.splice(idx, 1);
    atomicWriteJsonSync(userDataPath('videos.json'), this.videos);
    return true;
  }
}
