import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ImageImportService } from './image-import.service.js';
import { PinGuard } from '../../guards/pin.guard.js';
import { DemoWriteGuard } from '../../guards/demo-write.guard.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';

const SaveBodySchema = z.object({ url: z.string().url('URL invalide') });

@Controller('image-import')
export class ImageImportController {
  constructor(private readonly service: ImageImportService) {}

  @Get('reddit')
  async reddit(@Query('subreddit') subreddit?: string, @Query('limit') limit?: string) {
    const sub = subreddit?.trim() || 'Warhammer40k';
    const lim = limit ? Math.min(50, Math.max(1, parseInt(limit, 10) || 25)) : 25;
    return this.service.searchReddit(sub, lim);
  }

  @Post('save')
  @UseGuards(DemoWriteGuard, PinGuard)
  async save(@Body(new ZodValidationPipe(SaveBodySchema)) body: { url: string }) {
    return this.service.saveFromUrl(body.url);
  }
}
