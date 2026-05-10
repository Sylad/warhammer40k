import { Controller, Get, Post, Delete, Body, Query, Param, BadRequestException, NotFoundException, UseGuards } from '@nestjs/common';
import { VideosService } from './videos.service.js';
import { YouTubeOEmbedService } from './youtube-oembed.service.js';
import { ChannelsService } from '../channels/channels.service.js';
import { PinGuard } from '../../guards/pin.guard.js';
import { DemoWriteGuard } from '../../guards/demo-write.guard.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { ImportVideoBodySchema } from './videos.schemas.js';
import type { ImportVideoBody } from './videos.schemas.js';
import type { Video, Channel } from './video.model.js';

interface PreviewResponse {
  videoId: string;
  title: string;
  authorName: string;
  authorUrl: string;
  thumbnailUrl: string;
  suggestedVideoId: string;
  suggestedChannelId: string;
  matchedChannel: Channel | null;
}

@Controller('videos')
export class VideosController {
  constructor(
    private readonly videos: VideosService,
    private readonly channels: ChannelsService,
    private readonly oembed: YouTubeOEmbedService,
  ) {}

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('langue') langue?: string,
  ) {
    return this.videos.findAll(type, langue);
  }

  @Get('preview')
  async preview(@Query('url') url?: string): Promise<PreviewResponse> {
    if (!url) throw new BadRequestException('url required');
    const meta = await this.oembed.fetchVideoMeta(url);

    const handle = this.oembed.extractHandle(meta.authorUrl);
    const suggestedChannelId = this.oembed.slugify(handle ?? meta.authorName);
    const matchedChannel =
      this.channels.findByUrl(meta.authorUrl)
      ?? (this.channels.exists(suggestedChannelId)
            ? this.channels.findOne(suggestedChannelId)
            : null);

    const suggestedVideoId = `${this.oembed.slugify(meta.title)}-${meta.videoId}`.slice(0, 80);

    return {
      videoId: meta.videoId,
      title: meta.title,
      authorName: meta.authorName,
      authorUrl: meta.authorUrl,
      thumbnailUrl: meta.thumbnailUrl,
      suggestedVideoId,
      suggestedChannelId,
      matchedChannel,
    };
  }

  @Post('import')
  @UseGuards(DemoWriteGuard, PinGuard)
  async import(
    @Body(new ZodValidationPipe(ImportVideoBodySchema)) body: ImportVideoBody,
  ): Promise<{ video: Video; channel: Channel }> {
    const meta = await this.oembed.fetchVideoMeta(body.url);

    // Resolve / create channel
    let channel: Channel;
    if (body.channelId && this.channels.exists(body.channelId)) {
      channel = this.channels.findOne(body.channelId);
    } else {
      const handle = this.oembed.extractHandle(meta.authorUrl);
      const suggestedId = this.oembed.slugify(handle ?? meta.authorName);
      const existingByUrl = this.channels.findByUrl(meta.authorUrl);
      if (existingByUrl) {
        channel = existingByUrl;
      } else {
        const finalId = body.channel?.id || suggestedId;
        if (this.channels.exists(finalId)) {
          channel = this.channels.findOne(finalId);
        } else {
          channel = this.channels.add({
            id: finalId,
            name: body.channel?.name || meta.authorName,
            description: body.channel?.description || `${(body.channel?.language ?? 'EN')} · chaîne YouTube`,
            language: (body.channel?.language as 'FR' | 'EN') ?? 'EN',
            url: body.channel?.url || meta.authorUrl,
            avatar: body.channel?.avatar || meta.authorName.split(' ').map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase() || 'YT',
            priority: body.channel?.priority ?? false,
          });
        }
      }
    }

    // Build video
    const videoId = body.videoId || `${this.oembed.slugify(meta.title)}-${meta.videoId}`.slice(0, 80);
    const video: Video = {
      id: videoId,
      titre: body.titre || meta.title,
      createur: meta.authorName,
      description: body.description ?? '',
      url: `https://youtu.be/${meta.videoId}`,
      embedId: meta.videoId,
      embedType: 'video',
      type: body.type ?? 'Chaîne lore',
      langue: body.langue ?? channel.language,
      tags: body.tags ?? [],
      incontournable: body.incontournable ?? false,
      thumbnail: body.titre || meta.title,
      duration: '—',
      category: body.category ?? 'lore',
      language: (body.langue as Video['language']) ?? channel.language,
      featured: body.incontournable ?? false,
      channelId: channel.id,
    };

    const saved = this.videos.add(video);
    return { video: saved, channel };
  }

  @Delete(':id')
  @UseGuards(DemoWriteGuard, PinGuard)
  remove(@Param('id') id: string): { deleted: string } {
    const ok = this.videos.remove(id);
    if (!ok) throw new NotFoundException(`Video ${id} not found`);
    return { deleted: id };
  }
}
