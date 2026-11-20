import { Injectable, Logger } from '@nestjs/common';
import { rechercherImageWiki, type WikiImageResult } from './fandom-lookup.js';

export type { WikiImageResult };

@Injectable()
export class WikiImageService {
  private readonly logger = new Logger(WikiImageService.name);

  /**
   * Toujours 200 : `imageUrl: null` seul = le wiki a répondu sans image ; avec `erreur: true` = la recherche a
   * échoué (L238 r3). Un champ plutôt qu'un statut 502 : les autres pages, qui se passent d'image sans rien
   * afficher, gardent leur comportement ; la visionneuse de la galerie lit le champ.
   */
  getImage(query: string): Promise<WikiImageResult> {
    return rechercherImageWiki(query, {
      surEchec: (message) => this.logger.warn(`Wiki image lookup failed for "${query}": ${message}`),
    });
  }
}
