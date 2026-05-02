import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller.js';
import { VideosService } from './videos.service.js';
import { YouTubeOEmbedService } from './youtube-oembed.service.js';
import { ChannelsModule } from '../channels/channels.module.js';

@Module({
  imports: [ChannelsModule],
  controllers: [VideosController],
  providers: [VideosService, YouTubeOEmbedService],
})
export class VideosModule {}
