import { Store } from '../../store';
import { GUILD_FLAG_BONE, GuildFlag, isThunderHawkArmor } from '../../common/guildFlag';
import { isEmptyGuildMark } from '../../common/guildMark';
import { inChaosCastle } from '../../common/locomotion';
import type { Entity, ISystemFactory } from '../world';

/**
 * `RenderGuild` (ZzzCharacter.cpp:9450-9475, :6388): the guild mark flies on
 * bone 26 of every guild member in scope — a 5x7 textured plane, drawn for
 * `MODEL_PLAYER` only, never inside Chaos Castle, and gone while the wearer
 * is cloaked or fully transparent.
 *
 * The flag's link matrix folds in the wearer's own yaw on top of the bone
 * transform that already carries it, so it has to be rebuilt every frame —
 * that is one `AngleMatrix` per visible guild member, and nothing else.
 */
export const GuildFlagSystem: ISystemFactory = world => {
  const query = world.with('guild', 'modelObject', 'transform', 'playerAnimation');
  const flags = new Map<Entity, GuildFlag>();

  function drop(entity: Entity): void {
    flags.get(entity)?.dispose();
    flags.delete(entity);
  }

  query.onEntityRemoved.subscribe(drop);

  return {
    update: () => {
      const scene = world.scene;
      const castle = inChaosCastle(world.mapIndex);

      for (const entity of query) {
        const model = entity.modelObject;
        const guild = Store.guilds.get(entity.guild.id);
        const logo = guild?.logo;
        const wanted =
          !castle &&
          !!logo &&
          logo.length > 0 &&
          !isEmptyGuildMark(logo) &&
          entity.visibility?.state !== 'hidden' &&
          model.Visible;

        if (!wanted) {
          drop(entity);
          continue;
        }

        const bone = model.gltf?.skeleton?.bones[GUILD_FLAG_BONE + 1];
        const boneNode = bone?.getTransformNode();
        if (!boneNode) {
          // The model is still loading; the flag joins it the frame it exists.
          drop(entity);
          continue;
        }

        let flag = flags.get(entity);
        if (!flag) {
          flag = new GuildFlag(scene);
          flags.set(entity, flag);
        }

        flag.attach(boneNode);
        flag.setMark(logo);
        flag.visible = !model.OutOfView;
        flag.update(
          entity.transform.visualRotY ?? entity.transform.rot.y,
          isThunderHawkArmor(entity.charAppearance?.armor)
        );
      }
    },
  };
};
