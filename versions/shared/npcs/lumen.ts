import type { World } from '../../../src/ecs/world';
import { loadGLTF } from '../../../src/controllers/assets/modelLoader';
import { PlayerObject } from '../../../src/controllers/actors/playerObject';

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
