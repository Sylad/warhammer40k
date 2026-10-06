import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { atomicWriteJsonSync } from '../../common/atomic-write.js';
import { readContent, userDataPath } from '../../common/content.js';
import type { Video } from './video.model.js';



@Injectable()
export class VideosService {
  private videos: Video[];

  constructor() {
    // Garde existsSync + try/catch comme tous les services frères : un
    // videos.json manquant/tronqué faisait crash-looper TOUT le backend
    // (throw dans le constructor = bootstrap Nest avorté). Review 2026-08-14.
    try {
      this.videos = fs.existsSync(userDataPath('videos.json'))
        ? (JSON.parse(fs.readFileSync(userDataPath('videos.json'), 'utf-8')) as Video[])
        : readContent<Video[]>('videos.json', []); // L74 : vidéos ajoutées → volume ; à défaut, le seed
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
