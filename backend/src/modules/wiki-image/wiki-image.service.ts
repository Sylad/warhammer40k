import { Injectable } from '@nestjs/common';

export interface WikiImageResult {
  imageUrl: string | null;
  pageTitle: string | null;
  pageUrl: string | null;
}

const BASE = 'https://warhammer40k.fandom.com/api.php';
const CACHE = new Map<string, WikiImageResult>();

@Injectable()
export class WikiImageService {

  async getImage(query: string): Promise<WikiImageResult> {
    const key = query.toLowerCase().trim();
    if (CACHE.has(key)) return CACHE.get(key)!;

    try {
      // 1. Try direct page lookup first (finds character pages, not book pages)
      const directResult = await this.fetchPageImage(query);
      if (directResult.imageUrl) {
        CACHE.set(key, directResult);
        return directResult;
      }

      // 2. Fall back to search (for faction terms, generic units, etc.)
      const searchUrl = `${BASE}?action=query&list=search&srsearch=${encodeURIComponent(query + ' warhammer 40k')}&srlimit=5&format=json&origin=*`;
      const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'Warhammer40kLoreApp/1.0' } });
      const searchData = await searchRes.json() as any;

      const results: any[] = searchData?.query?.search ?? [];
      if (!results.length) {
        const empty = { imageUrl: null, pageTitle: null, pageUrl: null };
        CACHE.set(key, empty);
        return empty;
      }

      // Try each search result until we find one with an image
      for (const r of results) {
        const result = await this.fetchPageImage(r.title as string);
        if (result.imageUrl) {
          CACHE.set(key, result);
          return result;
        }
      }

      const empty = { imageUrl: null, pageTitle: null, pageUrl: null };
      CACHE.set(key, empty);
      return empty;

    } catch {
      const empty = { imageUrl: null, pageTitle: null, pageUrl: null };
      CACHE.set(key, empty);
      return empty;
    }
  }

  private async fetchPageImage(pageTitle: string): Promise<WikiImageResult> {
    const imgUrl = `${BASE}?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&format=json&pithumbsize=700&origin=*`;
    const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': 'Warhammer40kLoreApp/1.0' } });
    const imgData = await imgRes.json() as any;

    const pages = imgData?.query?.pages ?? {};
    const page = Object.values(pages)[0] as any;
    if (!page || page.missing !== undefined) return { imageUrl: null, pageTitle: null, pageUrl: null };

    const thumbnail = page?.thumbnail?.source ?? null;
    const resolvedTitle = (page?.title as string) ?? pageTitle;
    return {
      imageUrl: thumbnail,
      pageTitle: resolvedTitle,
      pageUrl: `https://warhammer40k.fandom.com/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`,
    };
  }
}
