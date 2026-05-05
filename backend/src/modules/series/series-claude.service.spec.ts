import { describe, it, expect, beforeEach } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { SeriesClaudeService } from './series-claude.service.js';
import type { Serie } from './series.model.js';
import type { ClaudeUsageService } from '../claude-usage/claude-usage.service.js';
import {
  fakeConfig,
  fakeUsage,
  fakeTextResponse,
  stubMessagesCreate,
  makeAuthError,
  makeRateLimitError,
  makeApiError,
} from '../../__test-utils__/mock-anthropic.js';

const serie: Serie = {
  id: 's1',
  titre: 'Hérésie d Horus',
  titreVO: 'Horus Heresy',
  auteurs: ['Dan Abnett', 'Graham McNeill'],
  nbLivres: 54,
  epoque: 'M30 / M31',
  factionIds: ['f1'],
  tags: ['Space Marines', 'Chaos'],
  premierLivre: 'L Ascension d Horus',
  description: 'La grande chute',
  niveauEntree: 'intermédiaire',
};

function buildService() {
  const usage = fakeUsage();
  const config = fakeConfig();
  const service = new SeriesClaudeService(
    config as unknown as ConfigService,
    usage as unknown as ClaudeUsageService,
  );
  const create = stubMessagesCreate(service);
  return { service, create, usage };
}

describe('SeriesClaudeService.generateSerieDescription', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('returns the text from a successful Claude response and records usage', async () => {
    ctx.create.mockResolvedValueOnce(fakeTextResponse('Une saga grimdark incontournable.'));

    const out = await ctx.service.generateSerieDescription(serie);

    expect(out).toBe('Une saga grimdark incontournable.');
    expect(ctx.usage.recordUsage).toHaveBeenCalledWith(10, 20);
  });

  it('throws 401 CLAUDE_AUTH_FAILED on Anthropic.AuthenticationError', async () => {
    ctx.create.mockRejectedValueOnce(makeAuthError());

    await expect(ctx.service.generateSerieDescription(serie))
      .rejects.toMatchObject({
        constructor: HttpException,
        message: 'CLAUDE_AUTH_FAILED',
        status: HttpStatus.UNAUTHORIZED,
      });
  });

  it('throws 429 CLAUDE_RATE_LIMITED on Anthropic.RateLimitError', async () => {
    ctx.create.mockRejectedValueOnce(makeRateLimitError());

    await expect(ctx.service.generateSerieDescription(serie))
      .rejects.toMatchObject({
        message: 'CLAUDE_RATE_LIMITED',
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
  });

  it('throws 402 CLAUDE_QUOTA_EXCEEDED on APIError with status 402 or "insufficient" in message', async () => {
    ctx.create.mockRejectedValueOnce(makeApiError(400, 'insufficient credits'));

    await expect(ctx.service.generateSerieDescription(serie))
      .rejects.toMatchObject({
        message: 'CLAUDE_QUOTA_EXCEEDED',
        status: HttpStatus.PAYMENT_REQUIRED,
      });
  });
});
