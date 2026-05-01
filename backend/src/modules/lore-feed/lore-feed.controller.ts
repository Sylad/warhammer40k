import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { LoreFeedService } from './lore-feed.service.js';
import type { ChaosGod, Emperor, LoreEvent, Primarch } from './lore-feed.model.js';

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

  @Get('emperor')
  emperor(): Emperor {
    const e = this.service.getEmperor();
    if (!e) throw new NotFoundException('Emperor data not found');
    return e;
  }

  @Get('primarchs')
  primarchs(): Primarch[] {
    return this.service.getPrimarchs();
  }

  @Get('primarchs/:id')
  primarch(@Param('id') id: string): Primarch {
    const p = this.service.getPrimarch(id);
    if (!p) throw new NotFoundException(`Primarch ${id} not found`);
    return p;
  }

  @Get('chaos-gods')
  chaosGods(): ChaosGod[] {
    return this.service.getChaosGods();
  }

  @Get('chaos-gods/:id')
  chaosGod(@Param('id') id: string): ChaosGod {
    const g = this.service.getChaosGod(id);
    if (!g) throw new NotFoundException(`Chaos God ${id} not found`);
    return g;
  }
}
