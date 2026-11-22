import { Injectable, BadRequestException } from '@nestjs/common';
import { estChaineRetiree, motifChaineRetiree } from '../../common/chaines-retirees.js';
import { VIDEOS_RETIREES_DU_SEED } from '../../common/retires-du-seed.js';
import { DepotFusionne } from '../../common/surcouche-utilisateur.js';
import { estVideoRetiree, motifVideoRetiree } from '../../common/videos-retirees.js';
import type { Video } from './video.model.js';

@Injectable()
export class VideosService {
  // L76 : seed (référence, dans l'image) + data/videos-utilisateur.json (ajouts et retraits de
  // l'utilisateur), fusionnés à la lecture. Un volume illisible ne fait pas tomber le backend
  // (repli sur le seed, écritures refusées) : avant, un throw ici avortait le bootstrap Nest.
  // L41 (chaînes retirées) et L232 (vidéos supprimées de YouTube) : masquées à la lecture.
  private readonly depot = new DepotFusionne<Video>({
    nom: 'videos',
    idsRetiresDuSeed: VIDEOS_RETIREES_DU_SEED,
    retraitsPossibles: true,
    masquee: v => estChaineRetiree(v.url) || estVideoRetiree(v),
  });

  findAll(type?: string, langue?: string): Video[] {
    let result = this.depot.tout();
    if (type) result = result.filter(v => v.type === type);
    if (langue) result = result.filter(v => v.langue.includes(langue));
    return result;
  }

  exists(id: string): boolean {
    return this.depot.tout().some(v => v.id === id);
  }

  add(video: Video): Video {
    if (!video.id || !video.titre || !video.url) {
      throw new BadRequestException('id, titre, url required');
    }
    if (this.exists(video.id)) {
      throw new BadRequestException(`Video ${video.id} already exists`);
    }
    const retiree = motifChaineRetiree(video.url); // L41 R8 : sinon l'entrée serait masquée à la lecture
    if (retiree) throw new BadRequestException(retiree);
    const supprimee = motifVideoRetiree(video); // L232 : même raison
    if (supprimee) throw new BadRequestException(supprimee);
    this.depot.ajouter(video);
    return video;
  }

  remove(id: string): boolean {
    return this.depot.retirer(id);
  }
}
