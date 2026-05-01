import { Module } from '@nestjs/common';
import { LoreFeedController } from './lore-feed.controller.js';
import { LoreFeedService } from './lore-feed.service.js';

@Module({
  controllers: [LoreFeedController],
  providers: [LoreFeedService],
  exports: [LoreFeedService],
})
export class LoreFeedModule {}
