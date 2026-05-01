import { Controller, Get, Query } from '@nestjs/common';
import { VideosService } from './videos.service.js';

@Controller('videos')
export class VideosController {
  constructor(private readonly service: VideosService) {}

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('langue') langue?: string,
  ) {
    return this.service.findAll(type, langue);
  }
}
