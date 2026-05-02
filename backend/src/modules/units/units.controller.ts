import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UnitsService } from './units.service.js';
import { FactionsService } from '../factions/factions.service.js';
import { ClaudeService } from './claude.service.js';
import { PinGuard } from '../../guards/pin.guard.js';

@Controller('units')
export class UnitsController {
  constructor(
    private readonly unitsService: UnitsService,
    private readonly factionsService: FactionsService,
    private readonly claudeService: ClaudeService,
  ) {}

  @Get()
  findAll(@Query('factionId') factionId?: string) {
    return this.unitsService.findAll(factionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Post(':id/description')
  @UseGuards(PinGuard)
  async generateDescription(@Param('id') id: string) {
    const cached = this.unitsService.getCachedDescription(id);
    if (cached) {
      return { description: cached, fromCache: true };
    }
    const unit = this.unitsService.findOne(id);
    const faction = this.factionsService.findOne(unit.factionId);
    const description = await this.claudeService.generateUnitDescription(unit, faction);
    this.unitsService.setCachedDescription(id, description);
    return { description, fromCache: false };
  }
}
