import { Controller, Get, Param, Query } from '@nestjs/common';
import { ChannelsService } from './channels.service.js';
import type { Channel } from '../videos/video.model.js';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly service: ChannelsService) {}

  @Get()
  findAll(@Query('priority') priority?: string): Channel[] {
    return priority === 'true' ? this.service.findPriority() : this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Channel {
    return this.service.findOne(id);
  }
}
