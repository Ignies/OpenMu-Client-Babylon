import type { ISystemFactory } from '../world';

export const HighlightSystem: ISystemFactory = world => {
  const query = world.with('highlighted', 'modelObject', 'visibility');

  query.onEntityRemoved.subscribe(entity => {
    const layer = entity.highlighted.layer;
    if (entity.modelObject && layer) {
      entity.modelObject.getMeshes(true).forEach(mesh => {
        layer.removeMesh(mesh);
      });
    }

    entity.highlighted.layer = null;
  });

  const layer = world.scene.hl;

  return {
    update: () => {
      for (const { highlighted, modelObject, visibility } of query) {
        if (visibility.state === 'hidden') continue;
        if (!modelObject.Ready) continue;
        if (highlighted.layer) continue;

        modelObject.getMeshes(true).forEach(mesh => {
          layer.addMesh(mesh, highlighted.color);

          highlighted.layer = layer;
        });
      }
    },
  };
};
