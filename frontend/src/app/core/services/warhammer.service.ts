import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Faction, Unit, DescriptionResponse, Serie, Video,
  Channel, Artwork, ArtworkCollection, ArtworkArtist, LoreEvent,
  SubFaction, Emperor, Primarch, ChaosGod, ImperialOrganization, LoreConcept, Equipment,
} from '../models/models';

export interface WikiImageResult {
  imageUrl: string | null;
  pageTitle: string | null;
  pageUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class WarhammerService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  readonly factions$: Observable<Faction[]> = this.http
    .get<Faction[]>(`${this.base}/factions`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  getFaction(id: string): Observable<Faction> {
    return this.http.get<Faction>(`${this.base}/factions/${id}`);
  }

  // === SubFactions ===
  getSubFactions(factionId?: string): Observable<SubFaction[]> {
    const url = factionId
      ? `${this.base}/subfactions?factionId=${encodeURIComponent(factionId)}`
      : `${this.base}/subfactions`;
    return this.http.get<SubFaction[]>(url);
  }

  getSubFaction(id: string): Observable<SubFaction> {
    return this.http.get<SubFaction>(`${this.base}/subfactions/${id}`);
  }

  getSubFactionSuccessors(id: string): Observable<SubFaction[]> {
    return this.http.get<SubFaction[]>(`${this.base}/subfactions/${id}/successors`);
  }

  getUnits(factionId?: string): Observable<Unit[]> {
    const url = factionId
      ? `${this.base}/units?factionId=${factionId}`
      : `${this.base}/units`;
    return this.http.get<Unit[]>(url);
  }

  getUnit(id: string): Observable<Unit> {
    return this.http.get<Unit>(`${this.base}/units/${id}`);
  }

  generateDescription(unitId: string): Observable<DescriptionResponse> {
    return this.http.post<DescriptionResponse>(
      `${this.base}/units/${unitId}/description`, {}
    );
  }

  readonly series$: Observable<Serie[]> = this.http
    .get<Serie[]>(`${this.base}/series`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  getSerie(id: string): Observable<Serie> {
    return this.http.get<Serie>(`${this.base}/series/${id}`);
  }

  generateSerieDescription(serieId: string): Observable<DescriptionResponse> {
    return this.http.post<DescriptionResponse>(
      `${this.base}/series/${serieId}/description`, {}
    );
  }

  readonly videos$: Observable<Video[]> = this.http
    .get<Video[]>(`${this.base}/videos`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  readonly images$: Observable<string[]> = this.http
    .get<string[]>(`${this.base}/images`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  imageUrl(filename: string): string {
    if (filename.startsWith('imported/')) {
      return `${this.base}/images/imported/${encodeURIComponent(filename.slice('imported/'.length))}`;
    }
    return `${this.base}/images/file/${encodeURIComponent(filename)}`;
  }

  datasheetUrl(unitId: string): string {
    return `${this.base}/images/datasheets/${unitId}`;
  }

  getWikiImage(query: string): Observable<WikiImageResult> {
    return this.http.get<WikiImageResult>(`${this.base}/wiki-image?q=${encodeURIComponent(query)}`);
  }

  // === Channels (YouTube) ===
  readonly channels$: Observable<Channel[]> = this.http
    .get<Channel[]>(`${this.base}/channels`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  readonly channelsPriority$: Observable<Channel[]> = this.http
    .get<Channel[]>(`${this.base}/channels?priority=true`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  // === Artworks (Galerie) ===
  readonly artworks$: Observable<Artwork[]> = this.http
    .get<Artwork[]>(`${this.base}/artworks`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  artworksByCategory(category: string): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.base}/artworks?category=${encodeURIComponent(category)}`);
  }

  getArtwork(id: string): Observable<Artwork> {
    return this.http.get<Artwork>(`${this.base}/artworks/${id}`);
  }

  readonly artworkCollections$: Observable<ArtworkCollection[]> = this.http
    .get<ArtworkCollection[]>(`${this.base}/artwork-collections`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  readonly artworkArtists$: Observable<ArtworkArtist[]> = this.http
    .get<ArtworkArtist[]>(`${this.base}/artwork-artists`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  // === Lore feed ===
  loreFeed(count = 3): Observable<LoreEvent[]> {
    return this.http.get<LoreEvent[]>(`${this.base}/lore?count=${count}`);
  }

  readonly loreFeedAll$: Observable<LoreEvent[]> = this.http
    .get<LoreEvent[]>(`${this.base}/lore/all`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  // === Lore special : Empereur + Primarques ===
  readonly emperor$: Observable<Emperor> = this.http
    .get<Emperor>(`${this.base}/lore/emperor`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  readonly primarchs$: Observable<Primarch[]> = this.http
    .get<Primarch[]>(`${this.base}/lore/primarchs`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  getPrimarch(id: string): Observable<Primarch> {
    return this.http.get<Primarch>(`${this.base}/lore/primarchs/${id}`);
  }

  readonly chaosGods$: Observable<ChaosGod[]> = this.http
    .get<ChaosGod[]>(`${this.base}/lore/chaos-gods`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  getChaosGod(id: string): Observable<ChaosGod> {
    return this.http.get<ChaosGod>(`${this.base}/lore/chaos-gods/${id}`);
  }

  readonly imperialOrgs$: Observable<ImperialOrganization[]> = this.http
    .get<ImperialOrganization[]>(`${this.base}/lore/imperial-orgs`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  getImperialOrg(id: string): Observable<ImperialOrganization> {
    return this.http.get<ImperialOrganization>(`${this.base}/lore/imperial-orgs/${id}`);
  }

  readonly loreConcepts$: Observable<LoreConcept[]> = this.http
    .get<LoreConcept[]>(`${this.base}/lore/concepts`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  getLoreConcept(id: string): Observable<LoreConcept> {
    return this.http.get<LoreConcept>(`${this.base}/lore/concepts/${id}`);
  }

  readonly equipment$: Observable<Equipment[]> = this.http
    .get<Equipment[]>(`${this.base}/lore/equipment`)
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  getEquipmentItem(id: string): Observable<Equipment> {
    return this.http.get<Equipment>(`${this.base}/lore/equipment/${id}`);
  }

  // === Image meta (catégorisation user) ===
  getImageMeta(): Observable<Record<string, ImageMeta>> {
    return this.http.get<Record<string, ImageMeta>>(`${this.base}/image-meta`);
  }

  saveImageMeta(filename: string, meta: ImageMeta): Observable<Record<string, ImageMeta>> {
    return this.http.post<Record<string, ImageMeta>>(`${this.base}/image-meta`, {
      filename,
      ...meta,
    });
  }

  // === Image import ===
  searchReddit(subreddit = 'Warhammer40k', limit = 25): Observable<RedditPost[]> {
    return this.http.get<RedditPost[]>(
      `${this.base}/image-import/reddit?subreddit=${encodeURIComponent(subreddit)}&limit=${limit}`,
    );
  }

  saveImportedImage(url: string): Observable<ImportSaveResult> {
    return this.http.post<ImportSaveResult>(`${this.base}/image-import/save`, { url });
  }
}

export interface ImageMeta {
  categories?: string[];
  title?: string;
  faction?: string;
  artist?: string;
}

export interface RedditPost {
  id: string;
  title: string;
  imageUrl: string;
  permalink: string;
  author: string;
  upvotes: number;
  thumbnail: string | null;
  postedAt: number;
}

export interface ImportSaveResult {
  filename: string;
  size: number;
  mimeType: string;
}
