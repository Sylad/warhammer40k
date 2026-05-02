import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { Video } from './video.model.js';

const FILE_PATH = path.resolve(process.cwd(), 'data', 'videos.json');

@Injectable()
export class VideosService {
  private videos: Video[];

  constructor() {
    this.videos = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8')) as Video[];
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
    fs.writeFileSync(FILE_PATH, JSON.stringify(this.videos, null, 2), 'utf-8');
    return video;
  }

  remove(id: string): boolean {
    const idx = this.videos.findIndex(v => v.id === id);
    if (idx < 0) return false;
    this.videos.splice(idx, 1);
    fs.writeFileSync(FILE_PATH, JSON.stringify(this.videos, null, 2), 'utf-8');
    return true;
  }
}
