import { Module } from '@nestjs/common';
import { SeriesController } from './series.controller.js';
import { SeriesService } from './series.service.js';
import { SeriesClaudeService } from './series-claude.service.js';

@Module({
  controllers: [SeriesController],
  providers: [SeriesService, SeriesClaudeService],
})
export class SeriesModule {}
