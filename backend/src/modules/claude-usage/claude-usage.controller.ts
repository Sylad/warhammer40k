import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ClaudeUsageService } from './claude-usage.service.js';
import { PinGuard } from '../../guards/pin.guard.js';

@Controller('claude')
export class ClaudeUsageController {
  constructor(private readonly service: ClaudeUsageService) {}

  @Get('usage')
  getUsage() {
    return this.service.getUsage();
  }

  @Put('balance')
  @UseGuards(PinGuard)
  setBalance(@Body() body: { balanceUsd: number }) {
    this.service.setBalance(body.balanceUsd);
    return this.service.getUsage();
  }
}
