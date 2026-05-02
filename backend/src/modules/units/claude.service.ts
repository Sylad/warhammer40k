import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Unit } from './unit.model.js';
import { Faction } from '../factions/faction.model.js';
import { ClaudeUsageService } from '../claude-usage/claude-usage.service.js';

type ClaudeErrorKind = 'auth' | 'rate' | 'quota' | null;

function classifyClaudeError(err: unknown): ClaudeErrorKind {
  if (err instanceof Anthropic.AuthenticationError) return 'auth';
  if (err instanceof Anthropic.RateLimitError) return 'rate';
  if (err instanceof Anthropic.APIError) {
    const msg = (err.message ?? '').toLowerCase();
    if (err.status === 402 || msg.includes('credit') || msg.includes('quota') || msg.includes('insufficient')) {
      return 'quota';
    }
  }
  return null;
}

function toHttpException(kind: ClaudeErrorKind): HttpException | null {
  if (kind === 'auth') return new HttpException('CLAUDE_AUTH_FAILED', HttpStatus.UNAUTHORIZED);
  if (kind === 'rate') return new HttpException('CLAUDE_RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS);
  if (kind === 'quota') return new HttpException('CLAUDE_QUOTA_EXCEEDED', HttpStatus.PAYMENT_REQUIRED);
  return null;
}

@Injectable()
export class ClaudeService {
  private readonly client: Anthropic;
  private readonly logger = new Logger(ClaudeService.name);

  constructor(
    private config: ConfigService,
    private usage: ClaudeUsageService,
  ) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('anthropicApiKey'),
    });
  }

  async generateUnitDescription(unit: Unit, faction: Faction): Promise<string> {
    this.logger.log(`Génération description : ${unit.nom} (${faction.nom})`);

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `Tu es un narrateur expert de l'univers Warhammer 40 000, spécialisé dans les descriptions épiques et grimdark en français. Tu rédiges des textes immersifs, riches en atmosphère, dans le style des codex Games Workshop. Utilise un ton solennel, dramatique, et évoque la brutalité, la gloire, la foi ou la terreur selon le contexte. Limite-toi à 3-4 paragraphes percutants. N'utilise aucun formatage Markdown (pas de #, **, *, ni listes à puces). Écris uniquement du texte brut en paragraphes.`,
        messages: [{
          role: 'user',
          content: `Rédige une description narrative détaillée pour l'unité suivante de Warhammer 40 000 :

Faction : ${faction.nom} (alignement : ${faction.alignement})
Unité : ${unit.nom}
Type : ${unit.type}
${unit.est_hero ? 'Rôle : Héros / Personnage nommé' : ''}
${unit.pointsCost ? `Coût en points : ${unit.pointsCost}` : ''}

Décris son histoire, son rôle sur le champ de bataille, ses capacités caractéristiques et son importance dans la faction. Style grimdark, en français.`,
        }],
      });

      this.usage.recordUsage(response.usage.input_tokens, response.usage.output_tokens);
      const textBlock = response.content.find(b => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('Réponse Claude invalide');
      }
      return textBlock.text;
    } catch (err) {
      const httpEx = toHttpException(classifyClaudeError(err));
      if (httpEx) throw httpEx;
      throw err;
    }
  }
}
