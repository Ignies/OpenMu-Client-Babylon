import { RenderSystem } from './systems/renderSystem';
import { World, type ISystemFactory } from './world';
import { PathfindingSystem } from './systems/pathfindingSystem';
import { PlayerControllerSystem } from './systems/playerControllerSystem';
import { MoveAlongPathSystem } from './systems/moveAlongPathSystem';
import { AnimationSystem } from './systems/animationSystem';
import { CombatSfxSystem } from './systems/combatSfxSystem';
import { WeaponTrailSystem } from './systems/weaponTrailSystem';
import { ImpactEffectSystem } from './systems/impactEffectSystem';
import { DropMotionSystem } from './systems/dropMotionSystem';
import { DeathSystem } from './systems/deathSystem';
import { NameTagSystem } from './systems/nameTagSystem';
import { HeadTrackingSystem } from './systems/headTrackingSystem';
import { ModelLoaderSystem } from './systems/modelLoaderSystem';
import { CameraFollowSystem } from './systems/cameraFollowSystem';
import { AmbientParticleSystem } from './systems/ambientParticleSystem';
import { WeatherSystem } from './systems/weatherSystem';
import { TerrainMaskSystem } from './systems/terrainMaskSystem';
import { FootprintSystem } from './systems/footprintSystem';
import { NetworkSystem } from './systems/networkSystem';
import { OutOfScopeSystem } from './systems/outOfScopeSystem';
import { CalculateVisibilitySystem } from './systems/calculateVisibilitySystem';
import { CalculateScreenPositionSystem } from './systems/calculateScreenPositionSystem';
import { AppearanceSystem } from './systems/appearanceSystem';
import { ItemGlowSystem } from './systems/itemGlowSystem';
import { CharacterLightSystem } from './systems/characterLightSystem';
import { DrawDebugSystem } from './systems/drawDebugSystem';
import { HighlightSystem } from './systems/highlightSystem';
import type { TestScene } from '../scenes/testScene';
import { PointerInputSystem } from './systems/pointerInputSystem';
import { KeyboardInputSystem } from './systems/keyboardInputSystem';
import { InteractiveAreaSystem } from './systems/interactiveAreaSystem';
import { SoundSystem } from './systems/soundSystem';
import { GateSystem } from './systems/gateSystem';
import { RestObjectSystem } from './systems/restObjectSystem';
import { LoginSceneSystem } from './systems/loginSceneSystem';
import { CharacterSelectSystem } from './systems/characterSelectSystem';
import { SceneReadySystem } from './systems/sceneReadySystem';
import { AttackSystem } from './systems/attackSystem';
import { MuHelperSystem } from './systems/muHelperSystem';
import { SkillCastSystem } from './systems/skillCastSystem';
import { SkillSystem } from './systems/skillSystem';
import { ObjectEffectSystem } from './systems/objectEffectSystem';
import { EffectSystem } from './systems/effectSystem';
import { ItemPickupSystem } from './systems/itemPickupSystem';
import { NpcTalkSystem } from './systems/npcTalkSystem';
import { TerrainLightSystem } from './systems/terrainLightSystem';
import { EventSystem } from './systems/eventSystem';
import { CursorSystem } from './systems/cursorSystem';
import { EmoteSystem } from './systems/emoteSystem';
import { MapDoorSystem } from './systems/mapDoorSystem';
import { CeilingHideSystem } from './systems/ceilingHideSystem';
import { EmojiBubbleSystem } from './systems/emojiBubbleSystem';
import { QuestSystem } from './systems/questSystem';
import { PetSystem } from './systems/petSystem';
import { GuildFlagSystem } from './systems/guildFlagSystem';
import { perfOverlayVisible, recordSystemTime } from '../libs/perfOverlay';

const factories: ISystemFactory[] = [
  CharacterSelectSystem,
  ModelLoaderSystem,
  PointerInputSystem,
  KeyboardInputSystem,
  InteractiveAreaSystem,
  GateSystem,
  ItemPickupSystem,
  NpcTalkSystem,
  PlayerControllerSystem,
  // Before AttackSystem/SkillCastSystem: the helper's cast and pickup
  // requests are consumed the same frame; player input always wins.
  MuHelperSystem,
  AttackSystem,
  // Skill layer: steps delays / buff clocks before the cast system asks canUse.
  SkillSystem,
  SkillCastSystem,
  RestObjectSystem,
  EmoteSystem,
  CursorSystem,
  // After CursorSystem: reads this frame's hovered object (SelectedNpc / SelectedCharacter).
  NameTagSystem,
  PathfindingSystem,
  CalculateVisibilitySystem,
  NetworkSystem,
  MoveAlongPathSystem,
  HighlightSystem,
  DeathSystem,
  AnimationSystem,
  CombatSfxSystem,
  // After AnimationSystem: a swing clip that just (re)started gets its
  // weapon blur once it reaches the start key (CreateWeaponBlur).
  WeaponTrailSystem,
  // Fresh drops fall and tumble in; Icarus drops bob. Render-only posOffset.
  DropMotionSystem,
  HeadTrackingSystem,
  AppearanceSystem,
  // After AnimationSystem + AppearanceSystem: mounts follow this frame's
  // rider pose, and the angel needs its owner's safe-zone flag.
  PetSystem,
  // After AnimationSystem: the shoulder flag reads this frame's bone 26 pose.
  GuildFlagSystem,
  ItemGlowSystem,
  // Light layer: NPCs/monsters with a CHARACTER_LIGHTS row carry a light.
  CharacterLightSystem,
  CameraFollowSystem,
  // Weather layer: the rain ramp, the settled snow, the wetness — stepped
  // before anything reads them .
  WeatherSystem,
  // After movement: weather volumes follow this frame's hero position.
  AmbientParticleSystem,
  TerrainMaskSystem,
  // After the mask: a print asks it whether the tile it is landing on is
  // open, to decide whether there is snow underfoot to press into.
  FootprintSystem,
  // Before the projection: it places the side bubbles' world anchor, which
  // CalculateScreenPositionSystem then projects.
  EmojiBubbleSystem,
  QuestSystem, // reads the entities EmojiBubbleSystem projects; after it
  // After movement + camera so labels are projected from this frame's state.
  CalculateScreenPositionSystem,
  LoginSceneSystem,
  OutOfScopeSystem,
  // Sound layer, after movement: the wind is muted by the tile under the
  // hero's feet and the footsteps read this frame's clip, so
  // it has to see this frame's position.
  SoundSystem,
  // After SoundSystem: the footsteps entry counted this frame's footfalls;
  // the dust puff and the ObjectHit sparks are spawned here.
  ImpactEffectSystem,
  DrawDebugSystem,
  ObjectEffectSystem,
  // Effects layer: bolts, columns, rings, auras step after movement.
  EffectSystem,
  TerrainLightSystem,
  // Events layer: match clocks + the 30 s countdown line, before the HUD reads them.
  EventSystem,
  // After movement: doors react to this frame's hero position; before
  // RenderSystem so the new pose is drawn this frame.
  MapDoorSystem,
  CeilingHideSystem,
  RenderSystem,
  SceneReadySystem,
];

export function createWorld(scene: TestScene) {
  const world = new World(scene);

  const systems = factories.map((f, index) => ({
    name: f.name || `system${index}`,
    update: f(world).update,
  }));

  return {
    world,
    updateSystems: (dt: number) => {
      if (!perfOverlayVisible()) {
        for (const system of systems) system.update?.(dt);
        return;
      }

      for (const system of systems) {
        if (!system.update) continue;
        const started = performance.now();
        system.update(dt);
        recordSystemTime(system.name, performance.now() - started);
      }
    },
  } as const;
}
