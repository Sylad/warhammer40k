import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { LoreEvent } from './lore-feed.model.js';

@Injectable()
export class LoreFeedService {
  private readonly events: LoreEvent[];

  constructor() {
    const filePath = path.resolve(process.cwd(), 'data', 'lore-feed.json');
    this.events = fs.existsSync(filePath)
      ? (JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LoreEvent[])
      : [];
  }

  findAll(): LoreEvent[] { return this.events; }

  random(count = 3): LoreEvent[] {
    if (this.events.length <= count) return this.events;
    const shuffled = [...this.events].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}
