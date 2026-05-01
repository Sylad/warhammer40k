import { Global, Module } from '@nestjs/common';
import { ClaudeUsageService } from './claude-usage.service.js';
import { ClaudeUsageController } from './claude-usage.controller.js';

@Global()
@Module({
  controllers: [ClaudeUsageController],
  providers: [ClaudeUsageService],
  exports: [ClaudeUsageService],
})
export class ClaudeUsageModule {}
