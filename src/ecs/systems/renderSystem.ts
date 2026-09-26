import { Plane, Vector3 } from '../../libs/babylon/exports';
import { ISystemFactory } from '../world';
import { toRenderAngles } from '../../common/renderAngles';
import { publishViewPlanes } from '../../common/viewPlanes';
import { ENUM_WORLD } from '../../common/types';
import { weather } from '../../weather';
import { debuffBodyLight, debuffBrightBody } from '../../common/debuffBody';

const v3Temp = Vector3.Zero();
const v3Temp2 = Vector3.Zero();

/**
 * The original's TestFrustrum2D keeps everything in view on the login screen
 * (ZzzLodTerrain.cpp:2473-2475), so the emitters there are never gated.
 */
const UNGATED_WORLDS: ReadonlySet<number> = new Set([
  ENUM_WORLD.WD_55LOGINSCENE,
  ENUM_WORLD.WD_73NEW_LOGIN_SCENE,
  ENUM_WORLD.WD_77NEW_LOGIN_SCENE,
]);

/**
 * Tiles the camera frustum is widened by before a model is called off screen.
 * It has to cover how far a blob shadow can travel from its caster
 * (`LIGHT_SHADOW_MAX` = 3 tiles for the torch projection, a little more for
 * the sun skew), so that a caster just past the edge still draws the shadow
 * that reaches into view.
 */
const OFF_SCREEN_MARGIN = 8;

export const RenderSystem: ISystemFactory = world => {
  const query = world.with('transform', 'modelObject');

  /** Reused copy of `scene.frustumPlanes`, pushed out by OFF_SCREEN_MARGIN. */
  const widenedPlanes: Plane[] = [];

  let multiCameraBefore = false;

  function widenFrustum(): Plane[] | null {
    const source = world.scene.frustumPlanes;

    if (!source || source.length < 6) return null;

    if (widenedPlanes.length === 0) {
      for (let i = 0; i < 6; i++) widenedPlanes.push(new Plane(0, 0, 0, 0));
    }

    for (let i = 0; i < 6; i++) {
      // Babylon normalises the frustum planes and points their normals
      // inward, so raising `d` moves the plane outward by exactly that many
      // world units.
      widenedPlanes[i].normal.copyFrom(source[i].normal);
      widenedPlanes[i].d = source[i].d + OFF_SCREEN_MARGIN;
    }

    return widenedPlanes;
  }

  return {
    update: dt => {
      const map = world.mapIndex;

      const terrain = world.terrain;
      if (!terrain) return;

      const extraHeight = terrain.extraHeight;

      // Built from the previous `scene.render()`. One frame of lag is fine:
      // this only pauses looping clips, hides blob shadows and gates the map
      // emitters, and `updateFrustumVisibility` waits OUT_OF_VIEW_GRACE
      // frames first.
      const frustumPlanes = widenFrustum();

      // With a second camera up (the class preview) `scene.frustumPlanes` are
      // the last camera's, not the world's. Held a frame: the preview's
      // dispose clears `activeCameras` between frames, after a two-camera render.
      const multiCamera = (world.scene.activeCameras?.length ?? 0) > 1;

      publishViewPlanes(
        world.scene,
        UNGATED_WORLDS.has(map) || multiCamera || multiCameraBefore
          ? null
          : frustumPlanes
      );

      multiCameraBefore = multiCamera;

      for (const entity of query) {
        const { transform, modelObject } = entity;

        // Bone-linked children follow their root, so only roots are tested.
        if (!modelObject.Parent) {
          modelObject.updateFrustumVisibility(frustumPlanes);
        }

        modelObject.Update(world.gameTime);

        // Characters face their target yaw at once: the original assigns
        // Object.Angle[2] directly for players and monsters (the smoothed
        // TurnAngle2 variant in ZzzObject.cpp:3799 is commented-out door code).
        if (entity.playerAnimation || entity.monsterAnimation) {
          transform.visualRotY = transform.rot.y;
        }

        // A Freeze or Cold body is drawn at its own BodyLight instead of the terrain's.
        const player = !!entity.playerAnimation;
        const debuffLight = debuffBodyLight(entity.buffs, player);
        modelObject.setBrightBody(debuffBrightBody(entity.buffs, player));
        if (debuffLight) {
          modelObject.Light.set(debuffLight[0], debuffLight[1], debuffLight[2]);
        } else if (!modelObject.FixedLight) {
          const light = world.getTerrainLight(transform.pos.x, transform.pos.z);
          const self = modelObject.SelfLight;

          modelObject.Light.set(
            light.x + self.x,
            light.y + self.y,
            light.z + self.z
          );
        }

        toRenderAngles(transform.rot, v3Temp);
        if (transform.visualRotY !== undefined) {
          v3Temp.y = Math.PI * 2 - transform.visualRotY;
        }

        v3Temp2.copyFrom(transform.pos as any);
        if (transform.posOffset !== undefined) {
          // Component-wise, not addInPlace(): posOffset is an IVector3Like and
          // most writers (fresh drops, Chaos Castle ring floors, the Kanturu
          // tower sink, Lorencia walls) hand a plain {x, y, z}. Babylon's
          // addInPlace reads `_x`, undefined on those, which turned the whole
          // node position NaN - a model that never draws under a perfectly
          // placed name tag ("Zen 336" with nothing beneath it).
          const offset = transform.posOffset;
          v3Temp2.x += offset.x;
          v3Temp2.y += offset.y;
          v3Temp2.z += offset.z;
        }
        if (entity.dying) {
          // Sink while fading; the knock-up slide / castle fall displacement
          // and tilt (DeathSystem's `offset` / `pitch`, render-only).
          const { sink, offset, pitch } = entity.dying;
          v3Temp2.y -= sink;
          v3Temp2.x += offset.x;
          v3Temp2.y += offset.y;
          v3Temp2.z += offset.z;
          v3Temp.x += pitch;
        }
        // Settled snow is something you stand *in*, not on - but only where
        // it is actually lying. Rendered position only: transform.pos stays
        // where pathing and the server think it is.
        // Characters only. A prop out of the map's object list is placed at an
        // authored height that already fits its neighbours, and the sink is a
        // per-position number: it pulled every segment of a fence run down by a
        // different amount and the rail stopped meeting itself.
        if (!modelObject.IsMapObject) {
          v3Temp2.y -= weather.snowSinkDepth(
            world,
            map,
            v3Temp2.x,
            transform.pos.y,
            v3Temp2.z
          );
        }

modelObject.updateLocation(v3Temp2, transform.scale, v3Temp);

        modelObject.Draw(world.gameTime);
      }
    },
  };
};
