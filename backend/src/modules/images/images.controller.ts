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
    const fullPath = this.service.resolveFile(decodeURIComponent(filename));
    if (!fullPath) throw new NotFoundException(`Image ${filename} not found`);
    res.sendFile(fullPath);
  }

  @Get('datasheets/:unitId')
  serveDatasheet(@Param('unitId') unitId: string, @Res() res: Response) {
    const safeName = path.basename(unitId).replace(/[^a-z0-9\-]/g, '');
    const fullPath = path.resolve(process.cwd(), 'public', 'datasheets', `${safeName}.jpg`);
    if (!fs.existsSync(fullPath)) throw new NotFoundException();
    res.sendFile(fullPath);
  }
}
