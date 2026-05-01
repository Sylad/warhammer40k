import { Body, Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
import { ImageImportService } from './image-import.service.js';

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
  async save(@Body() body: { url?: string }) {
    if (!body?.url) throw new BadRequestException('url required');
    return this.service.saveFromUrl(body.url);
  }
}
