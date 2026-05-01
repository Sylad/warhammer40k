import { Module } from '@nestjs/common';
import { SubFactionsController } from './subfactions.controller.js';
import { SubFactionsService } from './subfactions.service.js';

@Module({
  controllers: [SubFactionsController],
  providers: [SubFactionsService],
})
export class SubFactionsModule {}
