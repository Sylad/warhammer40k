import { z } from 'zod';

/**
 * Validation schema for `POST /api/videos/import` body.
 * Mirrors the legacy `ImportBody` interface but enforces presence + types
 * at the boundary instead of trusting `@Body() body: ImportBody` blindly.
 */

const videoTypeEnum = z.enum([
  'Parodie',
  'Animation fan',
  'Série officielle',
  'Chaîne lore',
  'Chaîne officielle',
]);

const videoCategoryEnum = z.enum(['lore', 'animation', 'official', 'other']);

const channelInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  language: z.enum(['FR', 'EN']).optional(),
  url: z.string().optional(),
  avatar: z.string().optional(),
  priority: z.boolean().optional(),
});

export const ImportVideoBodySchema = z.object({
  url: z.string().min(1, 'url required'),
  videoId: z.string().optional(),
  titre: z.string().optional(),
  description: z.string().optional(),
  type: videoTypeEnum.optional(),
  langue: z.string().optional(),
  category: videoCategoryEnum.optional(),
  tags: z.array(z.string()).optional(),
  incontournable: z.boolean().optional(),
  channelId: z.string().optional(),
  channel: channelInputSchema.optional(),
});

export type ImportVideoBody = z.infer<typeof ImportVideoBodySchema>;
