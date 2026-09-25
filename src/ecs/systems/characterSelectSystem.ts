import {
  Color3,
  Constants,
  CreatePlane,
  DynamicTexture,
  type IVector3Like,
  Mesh,
  PointerEventTypes,
  Scene,
  StandardMaterial,
  Vector3,
} from '../../libs/babylon/exports';
import type { Entity, ISystemFactory } from '../world';
import { Store, UIState } from '../../store';
import { ENUM_WORLD } from '../../common';
import { spawnPlayer } from '../../logic';
import { deserializeAppearance } from '../../common/deserializeAppearance';
import { runInAction } from 'mobx';
import {
  characterSelectView,
  characterSlotAngle,
  characterSlotPosition,
} from '../../common/characterSelect';
import { setSceneHold } from '../../common/sceneGate';
import { createCharacterSelectBackdrop } from '../../common/characterSelectBackdrop';
import { PlayerAction } from '../../common/objects/enum';
import { genderedEmoteAction } from '../../common/emotes';
import { isRidingMount } from '../../common/pets';
import {
  registerPointLightEmitter,
  type PointLightEmitter,
} from '../../common/pointLightPool';
import { PRIORITY_EFFECT } from '../../lighting/lightSource';
import type { TerrainLightColor } from '../../common/terrainDynamicLight';

type CircleVisual = {
  mesh: Mesh;
  material: StandardMaterial;
  alpha: number;
};

/**
 * Creates a glowing circular magical pedestal texture with soft ground illumination,
 * concentric rings, and delicate rune tick marks.
 */
function createSelectionCircleTexture(scene: Scene): DynamicTexture {
  const size = 512;
  const tex = new DynamicTexture(
    'charSelectCircleTex',
    { width: size, height: size },
    scene,
    false
  );
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  const center = size / 2;

  ctx.clearRect(0, 0, size, size);

  // 1. Soft inner ground light glow (subtle illumination pool)
  const innerGrad = ctx.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center * 0.85
  );
  innerGrad.addColorStop(0, 'rgba(255, 230, 160, 0.45)');
  innerGrad.addColorStop(0.3, 'rgba(255, 200, 110, 0.28)');
  innerGrad.addColorStop(0.65, 'rgba(235, 170, 70, 0.12)');
  innerGrad.addColorStop(1, 'rgba(200, 140, 40, 0)');

  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(center, center, center * 0.85, 0, Math.PI * 2);
  ctx.fill();

  // 2. Main glowing ring
  const ringRadius = center * 0.76;
  const ringGrad = ctx.createRadialGradient(
    center,
    center,
    ringRadius - 22,
    center,
    center,
    ringRadius + 22
  );
  ringGrad.addColorStop(0, 'rgba(255, 210, 100, 0)');
  ringGrad.addColorStop(0.5, 'rgba(255, 235, 180, 0.9)');
  ringGrad.addColorStop(1, 'rgba(255, 190, 80, 0)');

  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(center, center, ringRadius + 22, 0, Math.PI * 2);
  ctx.arc(center, center, ringRadius - 22, 0, Math.PI * 2, true);
  ctx.fill();

  // 3. Crisp inner accent ring
  ctx.strokeStyle = 'rgba(255, 245, 210, 0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(center, center, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Secondary fine concentric ring
  ctx.strokeStyle = 'rgba(255, 220, 140, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(center, center, center * 0.60, 0, Math.PI * 2);
  ctx.stroke();

  // 5. Decorative radial tick marks
  const numTicks = 24;
  for (let i = 0; i < numTicks; i++) {
    const angle = (i * 2 * Math.PI) / numTicks;
    const isMajor = i % 4 === 0;
    const r1 = ringRadius - (isMajor ? 12 : 6);
    const r2 = ringRadius + (isMajor ? 12 : 6);

    ctx.strokeStyle = isMajor
      ? 'rgba(255, 250, 220, 0.9)'
      : 'rgba(255, 210, 120, 0.5)';
    ctx.lineWidth = isMajor ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(center + Math.cos(angle) * r1, center + Math.sin(angle) * r1);
    ctx.lineTo(center + Math.cos(angle) * r2, center + Math.sin(angle) * r2);
    ctx.stroke();
  }

  tex.hasAlpha = true;
  tex.update();
  return tex;
}

/** This system's name on the loading gate (`common/sceneGate.ts`). */
const GATE = 'characterSelect';

/** Opacity the ring settles at once its character has the focus. */
const FOCUSED_ALPHA = 0.9;

/** Ring fade, in alpha per second: in slower than out, so a sweep reads. */
const FADE_IN_PER_SECOND = 2.5;
const FADE_OUT_PER_SECOND = 3.0;

/** Turns per second of the ring's tick marks. */
const RING_SPIN = 0.4;

/** Ring diameter and its lift off the floor, both in tiles. */
const RING_SIZE = 1.7;
const RING_LIFT = 0.02;

/** Where the key sits over the character's feet, and how far it reaches. */
const LIGHT_HEIGHT = 0.5;
const LIGHT_RANGE = 3.5;

/**
 * The key against a pool slot's own peak, which is a torch standing next to
 * the object (`pointLightPool.ts` INTENSITY). Half of one: the ring is the
 * thing that says "selected", the light only has to keep the face from
 * sitting in the ambient. This is the number to move if it reads hot.
 */
const LIGHT_GAIN = 0.5;

/** The warm candle tint; the pool reads the peak channel as the magnitude. */
const LIGHT_TINT = { r: 1.0, g: 0.88, b: 0.65 };

/**
 * The ring's glow on the focused character itself, added to its body light
 * (`SelfLight`, which RenderSystem sums onto the terrain light every frame -
 * the original's `BodyLight`). A uniform the model already binds, so it
 * costs nothing and lifts the character in Classic too, where the pool above
 * has no slots. Rides the ring's fade.
 */
const BODY_GLOW = 0.3;

export const CharacterSelectSystem: ISystemFactory = world => {
  const spawned: Entity[] = [];

  let stagedFor: string | null = null;

  /** Visual ground circle for each spawned character. */
  const circleVisuals = new Map<Entity, CircleVisual>();

  /** Shared procedural texture for selection circles. */
  let sharedCircleTexture: DynamicTexture | null = null;

  // The texture is disposed and nulled together in `clear()`, so the field
  // being null is the whole of "there is none".
  const getSharedTexture = (): DynamicTexture => {
    if (!sharedCircleTexture) {
      sharedCircleTexture = createSelectionCircleTexture(world.scene);
    }
    return sharedCircleTexture;
  };

  /**
   * The focused character's key light. It takes a slot from the shared pool
   * (`common/pointLightPool.ts`) instead of adding a `PointLight` of its own:
   * every object material in the scene is compiled with `2 + budget` light
   * slots (`common/lightingQuality.ts`), and Babylon fills a mesh's
   * `lightSources` from layer masks, never from range - so a light outside
   * the pool is a shader recompile plus a slot that every object pixel in the
   * scene evaluates, reached or not. On Classic the budget is 0 by design
   * (the original has no per-pixel lights), and going through the pool is
   * what keeps this out of that tier rather than making it the one exception.
   */
  const lightPosition = { x: 0, y: 0, z: 0 };
  const lightColor: TerrainLightColor = { r: 0, g: 0, b: 0 };
  let releaseLight: (() => void) | null = null;

  const selectionEmitter: PointLightEmitter = {
    position: lightPosition,
    heightOffset: LIGHT_HEIGHT,
    range: LIGHT_RANGE,
    gain: LIGHT_GAIN,
    // The circle's own alpha below is the fade; the pool's 0.35 s swell on
    // top of it would read as the light lagging the ring.
    instant: true,
    priority: PRIORITY_EFFECT,
    color: () => lightColor,
  };

  /** Name of the character that was focused on the previous frame. */
  let lastFocusedChar = '';

  /** The painted scene behind the walls, up while the line-up is staged. */
  let backdrop: { dispose(): void } | null = null;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * The greeting pool, as male base clips: `genderedEmoteAction` picks the
   * female variant where the action table has one. Respect and Rock have
   * only the one, which is why they are safe to list beside the rest.
   */
  const GREETINGS: readonly PlayerAction[] = [
    PlayerAction.PLAYER_SMILE1,
    PlayerAction.PLAYER_WIN1,
    PlayerAction.PLAYER_RESPECT1,
    PlayerAction.PLAYER_GREETING1,
    PlayerAction.PLAYER_CLAP1,
    PlayerAction.PLAYER_ROCK,
    PlayerAction.PLAYER_GESTURE1,
  ];

  /**
   * The clip the line-up last greeted with, male base index - so the draw
   * below excludes it whichever character played it and whichever variant
   * that character used.
   */
  let lastGreeting: PlayerAction | null = null;

  /** Greet with a social clip, never the one the previous greeting used. */
  const playGreeting = (entity: Entity) => {
    if (!entity.playerAnimation) return;
    // A rider is pinned to his mount and the emote clips have no ride
    // variant, so greeting would stand him up off the saddle.
    if (isRidingMount(entity.charAppearance?.pet)) return;

    const available = GREETINGS.filter(action => action !== lastGreeting);
    const greeting = available[Math.floor(Math.random() * available.length)];

    lastGreeting = greeting;

    // `SetActionClass`: a female character plays the clip right after the
    // male one. Without this an Elf or a Summoner greets on the Dark Knight's
    // animation, which is the mismatch `genderedEmoteAction` exists for.
    entity.playerAnimation.action = genderedEmoteAction(
      greeting,
      entity.attributeSystem?.isAboveZero('isFemale') ?? false
    );
  };

  /**
   * Cancel any greeting and return to idle when character loses focus.
   */
  const resetToIdle = (entity: Entity) => {
    if (!entity.playerAnimation) return;
    // Setting to PLAYER_SET (not a one-shot action) prompts AnimationSystem
    // to recalculate and play the correct idle animation for the character.
    entity.playerAnimation.action = PlayerAction.PLAYER_SET;
  };

  /**
   * Update circle positions, rotation, fade-in/out alpha, and dynamic illumination.
   */
  const updateCircleVisuals = (deltaTime: number, focusedName: string): void => {
    let activeLightPos: IVector3Like | null = null;
    let activeLightAlpha = 0;

    for (const entity of spawned) {
      const vis = circleVisuals.get(entity);
      if (!vis) continue;

      const isFocused = entity.objectNameInWorld === focusedName;
      const targetAlpha = isFocused ? FOCUSED_ALPHA : 0;

      // Smooth fade in / fade out
      const fadeSpeed = isFocused ? FADE_IN_PER_SECOND : FADE_OUT_PER_SECOND;
      if (vis.alpha < targetAlpha) {
        vis.alpha = Math.min(targetAlpha, vis.alpha + deltaTime * fadeSpeed);
      } else if (vis.alpha > targetAlpha) {
        vis.alpha = Math.max(targetAlpha, vis.alpha - deltaTime * fadeSpeed);
      }

      const pos = entity.transform?.pos;
      if (pos) {
        vis.mesh.position.set(pos.x, pos.y + RING_LIFT, pos.z);
      }

      // Gentle continuous rotation of the circle. The plane is pitched flat,
      // and Babylon applies yaw outermost, so this spins it in place.
      vis.mesh.rotation.y += deltaTime * RING_SPIN;

      if (vis.alpha > 0.01) {
        vis.mesh.setEnabled(true);
        vis.material.alpha = vis.alpha;
      } else {
        vis.mesh.setEnabled(false);
        vis.material.alpha = 0;
      }

      const glow = (BODY_GLOW * vis.alpha) / FOCUSED_ALPHA;
      entity.modelObject?.SelfLight.set(
        LIGHT_TINT.r * glow,
        LIGHT_TINT.g * glow,
        LIGHT_TINT.b * glow
      );

      if (isFocused && pos) {
        activeLightPos = pos;
        activeLightAlpha = vis.alpha;
      }
    }

    // The key rides the same alpha as the ring. It holds a pool slot only
    // while it is actually lighting something: the line-up stands on the
    // Fortress art, whose torches are emitters of their own, and an emitter
    // at zero still costs whichever slot it outranks.
    if (activeLightPos && activeLightAlpha > 0.01) {
      lightPosition.x = activeLightPos.x;
      lightPosition.y = activeLightPos.y;
      lightPosition.z = activeLightPos.z;

      const level = activeLightAlpha / FOCUSED_ALPHA;

      lightColor.r = LIGHT_TINT.r * level;
      lightColor.g = LIGHT_TINT.g * level;
      lightColor.b = LIGHT_TINT.b * level;

      releaseLight ??= registerPointLightEmitter(selectionEmitter);
    } else if (releaseLight) {
      releaseLight();
      releaseLight = null;
    }
  };

  // -------------------------------------------------------------------------
  // Scene staging
  // -------------------------------------------------------------------------

  const clear = () => {
    for (const entity of spawned) {
      entity.modelObject?.dispose();
      world.remove(entity);
    }

    for (const [, vis] of circleVisuals) {
      vis.mesh.dispose();
      vis.material.dispose();
    }
    circleVisuals.clear();

    if (releaseLight) {
      releaseLight();
      releaseLight = null;
    }

    if (sharedCircleTexture) {
      sharedCircleTexture.dispose();
      sharedCircleTexture = null;
    }

    spawned.length = 0;
    stagedFor = null;
    lastFocusedChar = '';
  };

  const stage = () => {
    clear();

    // Kept across restages (a create, delete or level up) so the texture does
    // not reload and flash black; torn down when the screen is left.
    backdrop ??= createCharacterSelectBackdrop(world.scene);

    for (const character of Store.charactersList) {
      const position = characterSlotPosition(character.SlotIndex);

      if (!position) continue;

      const appearance = deserializeAppearance(character.Appearance);
      const entity = spawnPlayer(world, { cls: appearance.cls });

      world.addComponent(
        entity,
        'worldIndex',
        ENUM_WORLD.WD_74NEW_CHARACTER_SCENE
      );

      entity.transform.pos.x = position.x;
      entity.transform.pos.y = position.y;
      entity.transform.pos.z = position.z;

      entity.transform.posOffset = Vector3.ZeroReadOnly;

      entity.transform.rot.y = characterSlotAngle(character.SlotIndex);

      entity.objectNameInWorld = character.Name;

      world.addComponent(entity, 'interactable', true);

      const app = entity.charAppearance;

      app.leftHand = appearance.leftHand;
      app.rightHand = appearance.rightHand;
      app.helm = appearance.helm;
      app.armor = appearance.armor;
      app.pants = appearance.pants;
      app.gloves = appearance.gloves;
      app.boots = appearance.boots;
      // ReadEquipmentExtended fills the wing and helper slots on the
      // character-list path too (ZzzCharacter.cpp:12918-12960), so the
      // line-up wears them like the world does: wings on the back, the
      // mount under the rider.
      app.wings = appearance.wings;
      app.pet = appearance.pet;
      app.changed = true;

      // Create ground selection circle for this character
      const circleMesh = CreatePlane(
        `selectCircle_${character.Name}`,
        { size: RING_SIZE },
        world.scene
      );
      circleMesh.rotation.x = Math.PI / 2;
      circleMesh.position.set(position.x, position.y + RING_LIFT, position.z);
      circleMesh.isPickable = false;
      circleMesh.setEnabled(false);

      const circleMat = new StandardMaterial(
        `selectCircleMat_${character.Name}`,
        world.scene
      );
      circleMat.diffuseTexture = getSharedTexture();
      circleMat.useAlphaFromDiffuseTexture = true;
      // `disableLighting` holds the diffuse base at 1, so the tint has to
      // come from the emissive term alone: left on the default white
      // `diffuseColor`, the sum clamps to 1 before emissive adds anything
      // and the ring draws as the raw texture.
      circleMat.diffuseColor = Color3.Black();
      circleMat.emissiveColor = new Color3(1.0, 0.85, 0.55);
      circleMat.disableLighting = true;
      circleMat.backFaceCulling = false;
      circleMat.alphaMode = Constants.ALPHA_ADD;
      circleMat.alpha = 0;

      circleMesh.material = circleMat;

      circleVisuals.set(entity, {
        mesh: circleMesh,
        material: circleMat,
        alpha: 0,
      });

      spawned.push(entity);
    }
  };

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  world.scene.onPointerObservable.add(event => {
    if (event.type !== PointerEventTypes.POINTERDOWN) return;
    if (Store.uiState !== UIState.Characters) return;

    const target = world.currentPointerTarget;
    const hovered = target && spawned.includes(target) ? target.objectNameInWorld : null;

    // Right click on a character closes in on it; again on the same one, or
    // anywhere else, goes back to the line-up. Selection is left alone.
    if (event.event.button === 2) {
      runInAction(() => {
        characterSelectView.zoomedOn =
          hovered && hovered !== characterSelectView.zoomedOn ? hovered : null;
      });
      return;
    }

    // Left click selects; middle does nothing here.
    if (event.event.button !== 0) return;

    if (!target || !hovered) return;

    const name = target.objectNameInWorld;
    if (!name) return;

    if (name === Store.focusedChar) {
      // Re-trigger greeting on click even if already focused
      playGreeting(target);
      return;
    }

    Store.focusedChar = name;

    Store.focusCharacterRequest(name);
  });

  return {
    update: (deltaTime: number) => {
      const staged =
        Store.uiState === UIState.Characters &&
        world.mapIndex === ENUM_WORLD.WD_74NEW_CHARACTER_SCENE &&
        !!world.terrain;

      if (!staged) {
        if (stagedFor !== null) clear();
        backdrop?.dispose();
        backdrop = null;
        // The line-up is part of this screen's load, so the loading screen
        // has to wait for it: the terrain lands first and the character list
        // is still in flight, and without this hold the gate lifted on an
        // empty scene with the characters walking in behind it.
        setSceneHold(GATE, Store.uiState === UIState.Characters);
        return;
      }

      const key = Store.charactersList
        .map(c => `${c.SlotIndex}:${c.Name}:${c.Level}`)
        .join('|');

      if (key !== stagedFor) {
        stage();
        stagedFor = key;
      }

      // Spawned: from here the models are counted by the ready check like
      // every other one in the scene.
      setSceneHold(GATE, Store.loadingCharactersList);

      // -----------------------------------------------------------------
      // Character selection greeting animation
      // -----------------------------------------------------------------

      const focused = Store.focusedChar;

      if (focused !== lastFocusedChar) {
        // Return previously selected character to idle.
        if (lastFocusedChar) {
          const prev = spawned.find(e => e.objectNameInWorld === lastFocusedChar);
          if (prev) resetToIdle(prev);
        }

        // Play greeting animation on newly focused character.
        if (focused) {
          const next = spawned.find(e => e.objectNameInWorld === focused);
          if (next) playGreeting(next);
        }

        lastFocusedChar = focused;
      }

      // Update circle illumination visuals.
      updateCircleVisuals(deltaTime, focused);
    },
  };
};
