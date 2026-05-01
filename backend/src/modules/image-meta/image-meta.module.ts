import { Module } from '@nestjs/common';
import { ImageMetaController } from './image-meta.controller.js';
import { ImageMetaService } from './image-meta.service.js';

@Module({
  controllers: [ImageMetaController],
  providers: [ImageMetaService],
})
export class ImageMetaModule {}
