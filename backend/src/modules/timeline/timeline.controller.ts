import { Controller, Get, Param } from '@nestjs/common';
import { TimelineService } from './timeline.service.js';
import type { TimelineEvent } from './timeline.model.js';

@Controller('timeline-events')
export class TimelineController {
  constructor(private readonly service: TimelineService) {}

  @Get()
  findAll(): TimelineEvent[] { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string): TimelineEvent { return this.service.findOne(id); }
}
