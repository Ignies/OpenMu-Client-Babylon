import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { Matrix, Vector3 } from '../../../libs/babylon/exports';
import { Store } from '../../../store';
import { classFromAppearance } from '../../../common/deserializeAppearance';
import { getClassName } from '../../../common/characterStats';
import { characterSelectView } from '../../../common/characterSelect';
import { t } from '../../../i18n';
import { TEXT_COLOR } from '../serversPage/layout';

/** How far above the model's root the plate hangs, in tiles (world units). */
const HEAD_HEIGHT = 2.3;

/**
 * Inline on purpose: `#root img { width: 100%; height: 100% }` (src/style.less)
 * carries an id, so no class selector in style.less can size these.
 */
const HINT_ICON = { width: 13, height: 13 } as const;

/**
 * The name plate over a line-up character: whoever is under the cursor, or
 * the focused character when nothing is. Follows the model on screen by
 * projecting its root each frame after render and writing the transform
 * straight to the DOM, so React only re-renders when the target changes.
 */
export const CharacterSelectionPlate = observer(() => {
  const ref = useRef<HTMLDivElement>(null);
  const [name, setName] = useState<string | null>(null);

  const world = Store.world;

  useEffect(() => {
    if (!world) return;

    const scene = world.scene;
    const engine = scene.getEngine();
    const named = world.with('objectNameInWorld', 'modelObject');
    const viewProjection = Matrix.Identity();
    const anchor = Vector3.Zero();
    const screen = Vector3.Zero();

    let current: string | null = null;

    const observer = scene.onAfterRenderObservable.add(() => {
      const hovered = world.currentPointerTarget;
      const target =
        (hovered && named.has(hovered) ? hovered : null) ??
        named.entities.find(e => e.objectNameInWorld === Store.focusedChar) ??
        null;

      const targetName = target?.objectNameInWorld ?? null;
      if (targetName !== current) {
        current = targetName;
        setName(targetName);
      }

      const el = ref.current;
      const camera = scene.activeCamera;
      if (!el || !target?.modelObject || !camera) return;

      camera.getViewMatrix().multiplyToRef(camera.getProjectionMatrix(), viewProjection);

      const renderW = engine.getRenderWidth();
      const renderH = engine.getRenderHeight();
      const viewport = camera.viewport.toGlobal(renderW, renderH);

      anchor.copyFrom(target.modelObject.node.getAbsolutePosition());
      anchor.y += HEAD_HEIGHT;
      Vector3.ProjectToRef(anchor, Matrix.IdentityReadOnly, viewProjection, viewport, screen);

      // Render pixels to CSS pixels (device pixel ratio / hardware scaling).
      const canvas = engine.getRenderingCanvas();
      const x = screen.x * ((canvas?.clientWidth || renderW) / renderW);
      const y = screen.y * ((canvas?.clientHeight || renderH) / renderH);

      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    });

    return () => {
      scene.onAfterRenderObservable.remove(observer);
    };
  }, [world]);

  const character = name ? Store.charactersList.find(c => c.Name === name) : undefined;

  return (
    <div ref={ref} className="char-sel-plate" hidden={!character}>
      {character && (
        <>
          <div className="char-sel-plate-name" style={{ color: TEXT_COLOR.brightYellow }}>
            {character.Name}
          </div>
          <div className="char-sel-plate-info">
            {getClassName(classFromAppearance(character.Appearance))} · Level {character.Level}
          </div>
          <div className="char-sel-plate-hint">
            {character.Name !== Store.focusedChar && (
              <span>
                <img src="/icons/mouse-left.svg" alt="" style={HINT_ICON} />
                {t('characters.hint.select')}
              </span>
            )}
            <span>
              <img src="/icons/mouse-right.svg" alt="" style={HINT_ICON} />
              {character.Name === characterSelectView.zoomedOn
                ? t('characters.hint.zoomOut')
                : t('characters.hint.zoomIn')}
            </span>
          </div>
        </>
      )}
    </div>
  );
});
