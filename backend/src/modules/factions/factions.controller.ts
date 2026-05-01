import { Controller, Get, Param } from '@nestjs/common';
import { FactionsService } from './factions.service.js';

@Controller('factions')
export class FactionsController {
  constructor(private readonly service: FactionsService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
}
