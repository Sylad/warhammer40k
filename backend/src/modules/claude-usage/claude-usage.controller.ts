import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ClaudeUsageService } from './claude-usage.service.js';
import { PinGuard } from '../../guards/pin.guard.js';
import { DemoWriteGuard } from '../../guards/demo-write.guard.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';

const BalanceSchema = z.object({ balanceUsd: z.number().nonnegative() });

@Controller('claude')
export class ClaudeUsageController {
  constructor(private readonly service: ClaudeUsageService) {}

  @Get('usage')
  getUsage() {
    return this.service.getUsage();
  }

  @Put('balance')
  @UseGuards(DemoWriteGuard, PinGuard)
  setBalance(@Body(new ZodValidationPipe(BalanceSchema)) body: { balanceUsd: number }) {
    this.service.setBalance(body.balanceUsd);
    return this.service.getUsage();
  }
}
