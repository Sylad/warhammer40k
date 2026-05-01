import { Controller, Get, Param, Query } from '@nestjs/common';
import { SubFactionsService } from './subfactions.service.js';

@Controller('subfactions')
export class SubFactionsController {
  constructor(private readonly service: SubFactionsService) {}

  @Get()
  list(@Query('factionId') factionId?: string) {
    return this.service.list(factionId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Get(':id/successors')
  successors(@Param('id') id: string) {
    return this.service.successors(id);
  }
}
