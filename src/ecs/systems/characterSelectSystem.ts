import {
  Color3,
  Constants,
  CreatePlane,
  DynamicTexture,
  Mesh,
  PointLight,
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
import {
  characterSlotAngle,
  characterSlotPosition,
} from '../../common/characterSelect';
import { setSceneHold } from '../../common/sceneGate';
import { PlayerAction } from '../../common/objects/enum';
import { genderedEmoteAction } from '../../common/emotes';

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

export const CharacterSelectSystem: ISystemFactory = world => {
  const spawned: Entity[] = [];

  let stagedFor: string | null = null;


  /** Visual ground circle for each spawned character. */
  const circleVisuals = new Map<Entity, CircleVisual>();

  /** Shared procedural texture for selection circles. */
  let sharedCircleTexture: DynamicTexture | null = null;

  /** Subtle dynamic light that illuminates the selected character and floor. */
  let selectionLight: PointLight | null = null;

  const getSharedTexture = (): DynamicTexture => {
    if (!sharedCircleTexture || sharedCircleTexture.isDisposed) {
      sharedCircleTexture = createSelectionCircleTexture(world.scene);
    }
    return sharedCircleTexture;
  };

  /** Name of the character that was focused on the previous frame. */
  let lastFocusedChar = '';

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Play greeting animation on the selected character.
   */
  let characterSelectLastAction: PlayerAction | null = null;
  const playGreeting = (entity: Entity) => {
    const actions: PlayerAction[] = [
      PlayerAction.PLAYER_SMILE1,
      PlayerAction.PLAYER_WIN1,
      PlayerAction.PLAYER_RESPECT1,
      PlayerAction.PLAYER_GREETING1,
      PlayerAction.PLAYER_CLAP1,
      PlayerAction.PLAYER_ROCK,
      PlayerAction.PLAYER_GESTURE1
    ];
    if (!entity.playerAnimation) return;

    const availableActions = actions.filter(action => action !== characterSelectLastAction);
    const characterAction = availableActions[Math.floor(Math.random() * availableActions.length)];
    characterSelectLastAction = characterAction;

    entity.playerAnimation.action = characterAction;
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
    let activeLightPos: Vector3 | null = null;
    let activeLightAlpha = 0;

    for (const entity of spawned) {
      const vis = circleVisuals.get(entity);
      if (!vis) continue;

      const isFocused = entity.objectNameInWorld === focusedName;
      const targetAlpha = isFocused ? 0.9 : 0.0;

      // Smooth fade in / fade out
      const fadeSpeed = isFocused ? 2.5 : 3.0;
      if (vis.alpha < targetAlpha) {
        vis.alpha = Math.min(targetAlpha, vis.alpha + deltaTime * fadeSpeed);
      } else if (vis.alpha > targetAlpha) {
        vis.alpha = Math.max(targetAlpha, vis.alpha - deltaTime * fadeSpeed);
      }

      const pos = entity.transform?.pos;
      if (pos) {
        vis.mesh.position.set(pos.x, pos.y + 0.02, pos.z);
      }

      // Gentle continuous rotation of the circle
      vis.mesh.rotation.y += deltaTime * 0.4;

      if (vis.alpha > 0.01) {
        vis.mesh.setEnabled(true);
        vis.material.alpha = vis.alpha;
      } else {
        vis.mesh.setEnabled(false);
        vis.material.alpha = 0;
      }

      if (isFocused && pos) {
        activeLightPos = pos;
        activeLightAlpha = vis.alpha;
      }
    }

    // Update the subtle PointLight
    if (selectionLight && !selectionLight.isDisposed) {
      if (activeLightPos && activeLightAlpha > 0.01) {
        selectionLight.setEnabled(true);
        selectionLight.position.set(
          activeLightPos.x,
          activeLightPos.y + 0.5,
          activeLightPos.z
        );
        selectionLight.intensity = 0.7 * (activeLightAlpha / 0.9);
      } else {
        selectionLight.setEnabled(false);
      }
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

    if (selectionLight) {
      selectionLight.dispose();
      selectionLight = null;
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

    if (!selectionLight || selectionLight.isDisposed) {
      selectionLight = new PointLight('charSelectLight', Vector3.Zero(), world.scene);
      selectionLight.range = 3.5;
      selectionLight.diffuse = new Color3(1.0, 0.88, 0.65);
      selectionLight.specular = new Color3(0.5, 0.44, 0.3);
      selectionLight.intensity = 0;
      selectionLight.setEnabled(false);
    }

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
      app.changed = true;

      // Create ground selection circle for this character
      const circleMesh = CreatePlane(
        `selectCircle_${character.Name}`,
        { size: 1.7 },
        world.scene
      );
      circleMesh.rotation.x = Math.PI / 2;
      circleMesh.position.set(position.x, position.y + 0.02, position.z);
      circleMesh.isPickable = false;
      circleMesh.setEnabled(false);

      const circleMat = new StandardMaterial(
        `selectCircleMat_${character.Name}`,
        world.scene
      );
      circleMat.diffuseTexture = getSharedTexture();
      circleMat.useAlphaFromDiffuseTexture = true;
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
    if (!target || !spawned.includes(target)) return;

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
