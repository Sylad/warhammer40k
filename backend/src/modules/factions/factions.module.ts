import { Module } from '@nestjs/common';
import { FactionsController } from './factions.controller.js';
import { FactionsService } from './factions.service.js';

@Module({
  controllers: [FactionsController],
  providers: [FactionsService],
  exports: [FactionsService],
})
export class FactionsModule {}
