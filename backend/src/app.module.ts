import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { HealthModule } from './modules/health/health.module.js';
import { FactionsModule } from './modules/factions/factions.module.js';
import { UnitsModule } from './modules/units/units.module.js';
import { SeriesModule } from './modules/series/series.module.js';
import { VideosModule } from './modules/videos/videos.module.js';
import { ImagesModule } from './modules/images/images.module.js';
import { WikiImageModule } from './modules/wiki-image/wiki-image.module.js';
import { ClaudeUsageModule } from './modules/claude-usage/claude-usage.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { ChannelsModule } from './modules/channels/channels.module.js';
import { ArtworksModule } from './modules/artworks/artworks.module.js';
import { LoreFeedModule } from './modules/lore-feed/lore-feed.module.js';
import { ImageMetaModule } from './modules/image-meta/image-meta.module.js';
import { ImageImportModule } from './modules/image-import/image-import.module.js';
import { SubFactionsModule } from './modules/subfactions/subfactions.module.js';
import { TimelineModule } from './modules/timeline/timeline.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    EventsModule,
    ClaudeUsageModule,
    HealthModule,
    FactionsModule,
    UnitsModule,
    SeriesModule,
    VideosModule,
    ImagesModule,
    WikiImageModule,
    ChannelsModule,
    ArtworksModule,
    LoreFeedModule,
    ImageMetaModule,
    ImageImportModule,
    SubFactionsModule,
    TimelineModule,
  ],
})
export class AppModule {}
