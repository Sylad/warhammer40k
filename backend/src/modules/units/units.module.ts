import { Module } from '@nestjs/common';
import { UnitsController } from './units.controller.js';
import { UnitsService } from './units.service.js';
import { ClaudeService } from './claude.service.js';
import { FactionsModule } from '../factions/factions.module.js';

@Module({
  imports: [FactionsModule],
  controllers: [UnitsController],
  providers: [UnitsService, ClaudeService],
})
export class UnitsModule {}
