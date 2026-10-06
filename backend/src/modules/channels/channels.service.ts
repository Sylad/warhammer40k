import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { atomicWriteJsonSync } from '../../common/atomic-write.js';
import { readContent, userDataPath } from '../../common/content.js';
import type { Channel } from '../videos/video.model.js';



@Injectable()
export class ChannelsService {
  private channels: Channel[];

  constructor() {
    // L74 : chaînes ajoutées par POST /videos/import → volume ; à défaut, le seed.
    this.channels = fs.existsSync(userDataPath('channels.json'))
      ? (JSON.parse(fs.readFileSync(userDataPath('channels.json'), 'utf-8')) as Channel[])
      : readContent<Channel[]>('channels.json', []);
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

  exists(id: string): boolean {
    return this.channels.some(c => c.id === id);
  }

  findByUrl(url: string): Channel | undefined {
    if (!url) return undefined;
    const norm = url.replace(/\/+$/, '').toLowerCase();
    return this.channels.find(c => (c.url ?? '').replace(/\/+$/, '').toLowerCase() === norm);
  }

  add(channel: Channel): Channel {
    if (!channel.id || !channel.name) {
      throw new BadRequestException('id and name required');
    }
    if (this.exists(channel.id)) {
      throw new BadRequestException(`Channel ${channel.id} already exists`);
    }
    this.channels.push(channel);
    atomicWriteJsonSync(userDataPath('channels.json'), this.channels);
    return channel;
  }
}
