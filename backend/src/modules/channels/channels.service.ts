import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { estChaineRetiree, motifChaineRetiree } from '../../common/chaines-retirees.js';
import { CHAINES_RETIREES_DU_SEED } from '../../common/retires-du-seed.js';
import { DepotFusionne } from '../../common/surcouche-utilisateur.js';
import type { Channel } from '../videos/video.model.js';

@Injectable()
export class ChannelsService {
  // L76 : seed (référence) + data/channels-utilisateur.json (chaînes ajoutées par
  // POST /videos/import), fusionnés à la lecture. Aucun endpoint ne retire une chaîne : une
  // chaîne du seed absente de l'ancien data/channels.json n'est pas un retrait à la migration.
  private readonly depot = new DepotFusionne<Channel>({
    nom: 'channels',
    idsRetiresDuSeed: CHAINES_RETIREES_DU_SEED,
    retraitsPossibles: false,
    masquee: c => estChaineRetiree(c.url),
  });

  private get channels(): Channel[] {
    return this.depot.tout();
  }

  findAll(): Channel[] {
    return this.channels;
  }

  findPriority(): Channel[] {
    return this.channels.filter(c => c.priority);
  }

  findOne(id: string): Channel {
    const c = this.channels.find(x => x.id === id);
    if (!c) throw new NotFoundException(`Channel ${id} introuvable`);
    return c;
  }

  exists(id: string): boolean {
    return this.channels.some(c => c.id === id);
  }

  findByUrl(url: string): Channel | undefined {
    if (!url) return undefined;
    const norm = url.replace(/\/+$/, '').toLowerCase();
    return this.channels.find(c => (c.url ?? '').replace(/\/+$/, '').toLowerCase() === norm);
  }

  add(channel: Channel): Channel {
    if (!channel.id || !channel.name) {
      throw new BadRequestException('id and name required');
    }
    if (this.exists(channel.id)) {
      throw new BadRequestException(`Channel ${channel.id} already exists`);
    }
    const retiree = motifChaineRetiree(channel.url); // L41 R7 : sinon l'entrée serait filtrée au prochain démarrage
    if (retiree) throw new BadRequestException(retiree);
    this.depot.ajouter(channel);
    return channel;
  }
}
