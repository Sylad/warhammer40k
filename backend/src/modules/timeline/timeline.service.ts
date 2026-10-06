import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { contentPath } from '../../common/content.js';
import type { TimelineEvent } from './timeline.model.js';

@Injectable()
export class TimelineService {
  private readonly events: TimelineEvent[];

  constructor() {
    const filePath = contentPath('timeline-events.json');
    this.events = fs.existsSync(filePath)
      ? (JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TimelineEvent[])
      : [];
  }

  findAll(): TimelineEvent[] {
    return this.events;
  }

  findOne(id: string): TimelineEvent {
    const event = this.events.find(e => e.id === id);
    if (!event) throw new NotFoundException(`Timeline event ${id} introuvable`);
    return event;
  }
}
