import type { World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { PlayerObject } from '../playerObject';

// [NpcInfo(255, "Lumen the Barmaid")]
export class Lumen extends PlayerObject {
  async init(world: World) {
    const bmd = await loadGLTF('NPC/Female01.glb', world);

    this.load(bmd);

    this.setBodyPartsAsync(
      'NPC/',
      'FemaleHead',
      'FemaleUpper',
      'FemaleLower',
      '',
      'FemaleBoots',
      2
    );
  }
  // protected override void HandleClick() { }
}
