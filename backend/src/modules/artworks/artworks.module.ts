import { Module } from '@nestjs/common';
import { ArtworksController } from './artworks.controller.js';
import { ArtworksService } from './artworks.service.js';

@Module({
  controllers: [ArtworksController],
  providers: [ArtworksService],
  exports: [ArtworksService],
})
export class ArtworksModule {}
