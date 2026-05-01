import { Module } from '@nestjs/common';
import { ImageImportController } from './image-import.controller.js';
import { ImageImportService } from './image-import.service.js';
import { ImagesModule } from '../images/images.module.js';

@Module({
  imports: [ImagesModule],
  controllers: [ImageImportController],
  providers: [ImageImportService],
})
export class ImageImportModule {}
