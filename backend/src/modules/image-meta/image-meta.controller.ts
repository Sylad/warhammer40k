import { Body, Controller, Get, Post, BadRequestException } from '@nestjs/common';
import { ImageMetaService } from './image-meta.service.js';

interface CategorizeBody {
  filename: string;
  categories?: string[];
  category?: string; // legacy single
  title?: string;
  faction?: string;
  artist?: string;
}

@Controller('image-meta')
export class ImageMetaController {
  constructor(private readonly service: ImageMetaService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Get('categories')
  getCustomCategories() {
    return this.service.getCustomCategories();
  }

  @Post()
  set(@Body() body: CategorizeBody) {
    if (!body?.filename || typeof body.filename !== 'string') {
      throw new BadRequestException('filename required');
    }
    return this.service.set(body.filename, body);
  }
}
