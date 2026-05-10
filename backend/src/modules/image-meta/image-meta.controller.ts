import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ImageMetaService } from './image-meta.service.js';
import { PinGuard } from '../../guards/pin.guard.js';
import { DemoWriteGuard } from '../../guards/demo-write.guard.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';

const CategorizeBodySchema = z.object({
  filename: z.string().min(1, 'filename required'),
  categories: z.array(z.string()).optional(),
  category: z.string().optional(),
  title: z.string().optional(),
  faction: z.string().optional(),
  artist: z.string().optional(),
});

type CategorizeBody = z.infer<typeof CategorizeBodySchema>;

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

  @Get('suggested-categories')
  getSuggestedCategories() {
    return this.service.getSuggestedCategories();
  }

  @Post()
  @UseGuards(DemoWriteGuard, PinGuard)
  set(@Body(new ZodValidationPipe(CategorizeBodySchema)) body: CategorizeBody) {
    return this.service.set(body.filename, body);
  }
}
