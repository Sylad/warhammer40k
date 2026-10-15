import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { ImagesService } from './images.service.js';
import * as path from 'path';
import * as fs from 'fs';

@Controller('images')
export class ImagesController {
  constructor(private readonly service: ImagesService) {}

  @Get()
  list() {
    return this.service.listImages();
  }

  @Get('random')
  random() {
    const images = this.service.listImages();
    const pick = images[Math.floor(Math.random() * images.length)];
    return { filename: pick };
  }

  @Get('file/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const fullPath = this.service.resolveFile(filename);
    if (!fullPath) throw new NotFoundException(`Image ${filename} not found`);
    res.sendFile(fullPath);
  }

  @Get('imported/:filename')
  serveImported(@Param('filename') filename: string, @Res() res: Response) {
    const fullPath = this.service.resolveFile(`imported/${filename}`);
    if (!fullPath) throw new NotFoundException(`Imported image ${filename} not found`);
    res.sendFile(fullPath);
  }

  /** Fiches techniques : scans 898×596 du profil, des armes et des aptitudes (jamais un portrait ni un insigne). */
  @Get('datasheets/:unitId')
  serveDatasheet(@Param('unitId') unitId: string, @Res() res: Response) {
    this.sendUnitJpeg('datasheets', unitId, res);
  }

  /** L120 : portraits et insignes locaux d'unités sans fiche technique ; la fiche unité les présente comme illustration. */
  @Get('portraits/:unitId')
  servePortrait(@Param('unitId') unitId: string, @Res() res: Response) {
    this.sendUnitJpeg('portraits', unitId, res);
  }

  private sendUnitJpeg(dir: 'datasheets' | 'portraits', unitId: string, res: Response): void {
    const safeName = path.basename(unitId).replace(/[^a-z0-9\-]/g, '');
    const fullPath = path.resolve(process.cwd(), 'public', dir, `${safeName}.jpg`);
    if (!fs.existsSync(fullPath)) throw new NotFoundException();
    res.sendFile(fullPath);
  }
}
