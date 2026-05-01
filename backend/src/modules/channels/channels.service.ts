import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Channel } from '../videos/video.model.js';

@Injectable()
export class ChannelsService {
  private readonly channels: Channel[];

  constructor() {
    const filePath = path.resolve(process.cwd(), 'data', 'channels.json');
    this.channels = fs.existsSync(filePath)
      ? (JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Channel[])
      : [];
  }

  findAll(): Channel[] {
    return this.channels;
  }

  findPriority(): Channel[] {
    return this.channels.filter(c => c.priority);
  }

  findOne(id: string): Channel {
    const c = this.channels.find(x => x.id === id);
    if (!c) throw new NotFoundException(`Channel ${id} introuvable`);
    return c;
  }
}
