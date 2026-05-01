import { Controller, Get, Param, Post } from '@nestjs/common';
import { SeriesService } from './series.service.js';
import { SeriesClaudeService } from './series-claude.service.js';

@Controller('series')
export class SeriesController {
  constructor(
    private readonly seriesService: SeriesService,
    private readonly claudeService: SeriesClaudeService,
  ) {}

  @Get()
  findAll() { return this.seriesService.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.seriesService.findOne(id); }

  @Post(':id/description')
  async generateDescription(@Param('id') id: string) {
    const cached = this.seriesService.getCachedDescription(id);
    if (cached) return { description: cached, fromCache: true };

    const serie = this.seriesService.findOne(id);
    const description = await this.claudeService.generateSerieDescription(serie);
    this.seriesService.setCachedDescription(id, description);
    return { description, fromCache: false };
  }
}
