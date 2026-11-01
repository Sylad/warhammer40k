// L222 — WarhammerService.unitImageIndex() : requête unique, repli `null` si l'API échoue.
import { setupTestBed } from '../../../testing/angular-testbed';
import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { WarhammerService } from './warhammer.service';

describe('WarhammerService.unitImageIndex (L222)', () => {
  let http: HttpTestingController;
  let service: WarhammerService;

  beforeEach(async () => {
    await setupTestBed([], [provideHttpClient(), provideHttpClientTesting()]);
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(WarhammerService);
  });

  it('une seule requête GET /images/unit-images pour plusieurs abonnés, même successifs', async () => {
    const index = { datasheets: ['a'], portraits: ['b'] };
    const premier = firstValueFrom(service.unitImageIndex());
    const second = firstValueFrom(service.unitImageIndex());
    const reqs = http.match((r) => r.url.endsWith('/images/unit-images'));
    expect(reqs).toHaveLength(1);
    reqs[0].flush(index);
    expect(await premier).toEqual(index);
    expect(await second).toEqual(index);
    expect(await firstValueFrom(service.unitImageIndex())).toEqual(index);
    http.expectNone((r) => r.url.endsWith('/images/unit-images'));
  });

  it('une erreur HTTP (502) donne null, sans rejet, et n\'est pas redemandée', async () => {
    const premier = firstValueFrom(service.unitImageIndex());
    http.expectOne((r) => r.url.endsWith('/images/unit-images')).flush('', { status: 502, statusText: 'Bad Gateway' });
    expect(await premier).toBeNull();
    expect(await firstValueFrom(service.unitImageIndex())).toBeNull();
    http.expectNone((r) => r.url.endsWith('/images/unit-images'));
  });
});
