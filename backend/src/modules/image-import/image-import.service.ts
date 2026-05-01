import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ImagesService } from '../images/images.service.js';

export interface WikiSearchResult {
  imageUrl: string | null;
  pageTitle: string | null;
  pageUrl: string | null;
}

export interface RedditPost {
  id: string;
  title: string;
  imageUrl: string;
  permalink: string;
  author: string;
  upvotes: number;
  thumbnail: string | null;
  postedAt: number; // unix seconds
}

export interface SaveResult {
  filename: string;
  size: number;
  mimeType: string;
}

const REDDIT_HEADERS = {
  'User-Agent': 'Warhammer40kCodex/1.0 (private app)',
  'Accept': 'application/json',
};

const VALID_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

@Injectable()
export class ImageImportService {
  private readonly logger = new Logger(ImageImportService.name);

  constructor(private readonly imagesService: ImagesService) {}

  async searchReddit(subreddit: string, limit = 25): Promise<RedditPost[]> {
    const safeSub = subreddit.replace(/[^a-zA-Z0-9_]/g, '');
    if (!safeSub) throw new BadRequestException('subreddit required');

    const url = `https://www.reddit.com/r/${safeSub}/.json?limit=${Math.min(50, Math.max(1, limit))}`;
    try {
      const res = await fetch(url, { headers: REDDIT_HEADERS, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        this.logger.warn(`Reddit ${safeSub} → HTTP ${res.status}`);
        return [];
      }
      const data = (await res.json()) as any;
      const children: any[] = data?.data?.children ?? [];
      const posts: RedditPost[] = [];
      for (const c of children) {
        const d = c?.data;
        if (!d) continue;
        const url = d.url_overridden_by_dest ?? d.url;
        if (typeof url !== 'string') continue;

        const isImage =
          /\.(jpe?g|png|webp|gif)(?:\?|$)/i.test(url) ||
          d.post_hint === 'image' ||
          /^https:\/\/i\.redd\.it\//i.test(url) ||
          /^https:\/\/i\.imgur\.com\//i.test(url);
        if (!isImage) continue;

        // Some i.redd.it URLs lack ext but are still images. Force a probable .jpg if missing.
        let imageUrl = url;
        if (!/\.(jpe?g|png|webp|gif)(?:\?|$)/i.test(imageUrl) && /^https:\/\/i\.redd\.it\//.test(imageUrl)) {
          imageUrl = `${imageUrl.split('?')[0]}.jpg`;
        }

        const thumbnail = typeof d.thumbnail === 'string' && d.thumbnail.startsWith('http') ? d.thumbnail : null;
        posts.push({
          id: d.id ?? '',
          title: d.title ?? '',
          imageUrl,
          permalink: d.permalink ? `https://reddit.com${d.permalink}` : '',
          author: d.author ?? '',
          upvotes: typeof d.ups === 'number' ? d.ups : 0,
          thumbnail,
          postedAt: typeof d.created_utc === 'number' ? d.created_utc : 0,
        });
      }
      return posts;
    } catch (err) {
      this.logger.warn(`Reddit fetch failed: ${(err as Error).message}`);
      return [];
    }
  }

  async saveFromUrl(url: string): Promise<SaveResult> {
    if (!url || !/^https?:\/\//.test(url)) {
      throw new BadRequestException('url must be http(s)');
    }

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': 'Warhammer40kCodex/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      throw new BadRequestException(`Failed to fetch: ${(err as Error).message}`);
    }
    if (!res.ok) throw new BadRequestException(`Source returned HTTP ${res.status}`);

    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    const ext = this.extFromMime(contentType) ?? this.extFromUrl(url);
    if (!ext || !VALID_EXTS.includes(ext)) {
      throw new BadRequestException(`Unsupported image type (${contentType || 'unknown'})`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) throw new BadRequestException('Empty response');
    if (buffer.length > 25 * 1024 * 1024) throw new BadRequestException('Image too large (>25 MB)');

    const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
    const filename = `${hash}${ext}`;

    fs.mkdirSync(this.imagesService.importedDir, { recursive: true });
    const fullPath = path.join(this.imagesService.importedDir, filename);
    fs.writeFileSync(fullPath, buffer);

    this.imagesService.invalidateCache();
    this.logger.log(`Imported image: ${filename} (${buffer.length} bytes)`);

    return {
      filename: `imported/${filename}`,
      size: buffer.length,
      mimeType: contentType || `image/${ext.slice(1)}`,
    };
  }

  private extFromMime(mime: string): string | null {
    const m = mime.split(';')[0].trim();
    if (m === 'image/jpeg' || m === 'image/jpg') return '.jpg';
    if (m === 'image/png') return '.png';
    if (m === 'image/webp') return '.webp';
    if (m === 'image/gif') return '.gif';
    return null;
  }

  private extFromUrl(url: string): string | null {
    const m = url.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
    if (!m) return null;
    const e = m[1].toLowerCase();
    return e === 'jpeg' ? '.jpg' : `.${e}`;
  }
}
