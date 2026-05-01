import { Controller, Get, Param, Query } from '@nestjs/common';
import { ArtworksService } from './artworks.service.js';
import type { Artwork, ArtworkArtist, ArtworkCollection } from './artwork.model.js';

@Controller()
export class ArtworksController {
  constructor(private readonly service: ArtworksService) {}

  @Get('artworks')
  findAll(@Query('category') category?: string): Artwork[] {
    return category ? this.service.findByCategory(category) : this.service.findAll();
  }

  @Get('artworks/:id')
  findOne(@Param('id') id: string): Artwork {
    return this.service.findOne(id);
  }

  @Get('artwork-collections')
  collections(): ArtworkCollection[] {
    return this.service.collectionsAll();
  }

  @Get('artwork-artists')
  artists(): ArtworkArtist[] {
    return this.service.artistsAll();
  }
}
