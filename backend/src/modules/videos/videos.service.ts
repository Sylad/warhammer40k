import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Video } from './video.model.js';

@Injectable()
export class VideosService {
  private readonly videos: Video[];

  constructor() {
    const filePath = path.resolve(process.cwd(), 'data', 'videos.json');
    this.videos = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Video[];
  }

  findAll(type?: string, langue?: string): Video[] {
    let result = this.videos;
    if (type) result = result.filter(v => v.type === type);
    if (langue) result = result.filter(v => v.langue.includes(langue));
    return result;
  }
}
