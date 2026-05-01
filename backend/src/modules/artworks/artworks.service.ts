import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Artwork, ArtworkArtist, ArtworkCollection } from './artwork.model.js';

@Injectable()
export class ArtworksService {
  private readonly artworks: Artwork[];
  private readonly collections: ArtworkCollection[];
  private readonly artists: ArtworkArtist[];

  constructor() {
    this.artworks = this.load<Artwork[]>('artworks.json', []);
    this.collections = this.load<ArtworkCollection[]>('artwork-collections.json', []);
    this.artists = this.deriveArtists(this.artworks);
  }

  private load<T>(filename: string, fallback: T): T {
    const filePath = path.resolve(process.cwd(), 'data', filename);
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  }

  private deriveArtists(artworks: Artwork[]): ArtworkArtist[] {
    const counts = new Map<string, number>();
    for (const a of artworks) counts.set(a.artist, (counts.get(a.artist) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, artworkCount]) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name, artworkCount }))
      .sort((a, b) => b.artworkCount - a.artworkCount);
  }

  findAll(): Artwork[] { return this.artworks; }

  findByCategory(category: string): Artwork[] {
    return this.artworks.filter(a => a.category === category);
  }

  findOne(id: string): Artwork {
    const a = this.artworks.find(x => x.id === id);
    if (!a) throw new NotFoundException(`Artwork ${id} introuvable`);
    return a;
  }

  collectionsAll(): ArtworkCollection[] { return this.collections; }
  artistsAll(): ArtworkArtist[] { return this.artists; }
}
