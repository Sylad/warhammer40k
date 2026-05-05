import { describe, it, expect, beforeEach } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { ClaudeService } from './claude.service.js';
import type { Unit } from './unit.model.js';
import type { Faction } from '../factions/faction.model.js';
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

const unit: Unit = {
  id: 'u1',
  factionId: 'f1',
  nom: 'Intercessor',
  type: 'Infanterie',
  est_hero: false,
};

const faction: Faction = {
  id: 'f1',
  nom: 'Adeptus Astartes',
  alignement: 'Imperium',
  description: '',
  couleurThematique: '#000',
  symbole: '',
};

function buildService() {
  const usage = fakeUsage();
  const config = fakeConfig();
  const service = new ClaudeService(
    config as unknown as ConfigService,
    usage as unknown as ClaudeUsageService,
  );
  const create = stubMessagesCreate(service);
  return { service, create, usage };
}

describe('ClaudeService.generateUnitDescription', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('returns the text from a successful Claude response and records usage', async () => {
    ctx.create.mockResolvedValueOnce(fakeTextResponse('Au nom de l Empereur.'));

    const out = await ctx.service.generateUnitDescription(unit, faction);

    expect(out).toBe('Au nom de l Empereur.');
    expect(ctx.usage.recordUsage).toHaveBeenCalledWith(10, 20);
    expect(ctx.create).toHaveBeenCalledOnce();
  });

  it('throws 401 CLAUDE_AUTH_FAILED on Anthropic.AuthenticationError', async () => {
    ctx.create.mockRejectedValueOnce(makeAuthError());

    await expect(ctx.service.generateUnitDescription(unit, faction))
      .rejects.toMatchObject({
        constructor: HttpException,
        message: 'CLAUDE_AUTH_FAILED',
        status: HttpStatus.UNAUTHORIZED,
      });
  });

  it('throws 429 CLAUDE_RATE_LIMITED on Anthropic.RateLimitError', async () => {
    ctx.create.mockRejectedValueOnce(makeRateLimitError());

    await expect(ctx.service.generateUnitDescription(unit, faction))
      .rejects.toMatchObject({
        constructor: HttpException,
        message: 'CLAUDE_RATE_LIMITED',
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
  });

  it('throws 402 CLAUDE_QUOTA_EXCEEDED on APIError with status 402', async () => {
    ctx.create.mockRejectedValueOnce(makeApiError(402, 'payment required'));

    await expect(ctx.service.generateUnitDescription(unit, faction))
      .rejects.toMatchObject({
        message: 'CLAUDE_QUOTA_EXCEEDED',
        status: HttpStatus.PAYMENT_REQUIRED,
      });
  });

  it('throws 402 CLAUDE_QUOTA_EXCEEDED when APIError message contains "credit balance"', async () => {
    ctx.create.mockRejectedValueOnce(
      makeApiError(400, 'Your credit balance is too low to access the API.'),
    );

    await expect(ctx.service.generateUnitDescription(unit, faction))
      .rejects.toMatchObject({
        message: 'CLAUDE_QUOTA_EXCEEDED',
        status: HttpStatus.PAYMENT_REQUIRED,
      });
  });

  it('throws 402 CLAUDE_QUOTA_EXCEEDED when APIError message contains "quota"', async () => {
    ctx.create.mockRejectedValueOnce(makeApiError(400, 'monthly quota exceeded'));

    await expect(ctx.service.generateUnitDescription(unit, faction))
      .rejects.toMatchObject({
        message: 'CLAUDE_QUOTA_EXCEEDED',
        status: HttpStatus.PAYMENT_REQUIRED,
      });
  });

  it('re-throws unknown errors as-is (not wrapped into HttpException)', async () => {
    const boom = new Error('network down');
    ctx.create.mockRejectedValueOnce(boom);

    await expect(ctx.service.generateUnitDescription(unit, faction)).rejects.toBe(boom);
  });

  it('throws when the response has no text block', async () => {
    ctx.create.mockResolvedValueOnce({
      content: [{ type: 'tool_use' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    await expect(ctx.service.generateUnitDescription(unit, faction))
      .rejects.toThrow(/réponse claude invalide/i);
  });
});
