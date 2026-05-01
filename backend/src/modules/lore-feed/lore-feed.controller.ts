import { Controller, Get, Query } from '@nestjs/common';
import { LoreFeedService } from './lore-feed.service.js';
import type { LoreEvent } from './lore-feed.model.js';

@Controller('lore')
export class LoreFeedController {
  constructor(private readonly service: LoreFeedService) {}

  @Get()
  random(@Query('count') count?: string): LoreEvent[] {
    return this.service.random(count ? Number(count) : 3);
  }

  @Get('all')
  all(): LoreEvent[] {
    return this.service.findAll();
  }
}
