import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Serie } from './series.model.js';
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
export class SeriesClaudeService {
  private readonly client: Anthropic;
  private readonly logger = new Logger(SeriesClaudeService.name);

  constructor(
    private config: ConfigService,
    private usage: ClaudeUsageService,
  ) {
    this.client = new Anthropic({ apiKey: this.config.get<string>('anthropicApiKey') });
  }

  async generateSerieDescription(serie: Serie): Promise<string> {
    this.logger.log(`Génération description série : ${serie.titre}`);

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: `Tu es un expert passionné de la Black Library et de l'univers Warhammer 40 000. Tu rédiges des présentations de séries de romans en français, dans un style enthousiaste et érudit. Tu donnes envie de lire sans spoiler les intrigues principales. Tu mentionnes les thèmes, l'atmosphère, pourquoi la série est incontournable et à qui elle s'adresse. Tu écris pour un lecteur francophone qui adore le lore WH40k.`,
        messages: [{
          role: 'user',
          content: `Rédige une présentation détaillée et enthousiaste de la série Black Library suivante, en français :

Titre : ${serie.titre} (VO: ${serie.titreVO})
Auteur(s) : ${serie.auteurs.join(', ')}
Nombre de livres : ${serie.nbLivres}
Époque : ${serie.epoque}
Premier livre recommandé : ${serie.premierLivre}
Tags : ${serie.tags.join(', ')}
Niveau d'entrée : ${serie.niveauEntree}
Description courte : ${serie.description}

Développe en 4-5 paragraphes : l'atmosphère générale, les personnages principaux, pourquoi cette série est incontournable dans l'univers WH40k, à qui elle s'adresse et un conseil de lecture pratique. Sans spoiler les fins ou les retournements majeurs.`,
        }],
      });

      this.usage.recordUsage(response.usage.input_tokens, response.usage.output_tokens);
      const textBlock = response.content.find(b => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') throw new Error('Réponse Claude invalide');
      return textBlock.text;
    } catch (err) {
      const httpEx = toHttpException(classifyClaudeError(err));
      if (httpEx) throw httpEx;
      throw err;
    }
  }
}
