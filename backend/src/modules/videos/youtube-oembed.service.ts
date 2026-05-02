import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export interface YouTubeOEmbed {
  videoId: string;
  title: string;
  authorName: string;
  authorUrl: string;
  thumbnailUrl: string;
  embedHtml: string;
}

const OEMBED = 'https://www.youtube.com/oembed';

@Injectable()
export class YouTubeOEmbedService {
  private readonly logger = new Logger(YouTubeOEmbedService.name);

  /** Extrait le videoId depuis une URL YouTube (youtu.be/ID ou youtube.com/watch?v=ID). */
  extractVideoId(url: string): string | null {
    if (!url || !/^https?:\/\//.test(url)) return null;
    const m1 = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (m1) return m1[1];
    const m2 = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (m2) return m2[1];
    const m3 = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
    if (m3) return m3[1];
    const m4 = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
    if (m4) return m4[1];
    return null;
  }

  /** Tente de dériver un handle depuis https://www.youtube.com/@handle. */
  extractHandle(authorUrl: string): string | null {
    if (!authorUrl) return null;
    const m = authorUrl.match(/youtube\.com\/@([A-Za-z0-9._-]+)/);
    return m ? m[1] : null;
  }

  /** Slugify un nom en kebab-case ASCII pour servir d'id. */
  slugify(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  async fetchVideoMeta(url: string): Promise<YouTubeOEmbed> {
    const videoId = this.extractVideoId(url);
    if (!videoId) throw new BadRequestException('URL YouTube invalide (videoId introuvable)');

    const target = `${OEMBED}?url=${encodeURIComponent(`https://youtu.be/${videoId}`)}&format=json`;
    let res: Response;
    try {
      res = await fetch(target, { signal: AbortSignal.timeout(10_000) });
    } catch (err) {
      this.logger.warn(`oEmbed fetch failed: ${(err as Error).message}`);
      throw new BadRequestException('YouTube oEmbed unreachable');
    }
    if (!res.ok) {
      throw new BadRequestException(`oEmbed HTTP ${res.status}`);
    }
    const data = (await res.json()) as Record<string, string>;
    return {
      videoId,
      title: data['title'] ?? '',
      authorName: data['author_name'] ?? '',
      authorUrl: data['author_url'] ?? '',
      thumbnailUrl: data['thumbnail_url'] ?? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      embedHtml: data['html'] ?? '',
    };
  }
}
