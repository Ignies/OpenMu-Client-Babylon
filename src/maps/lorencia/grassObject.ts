import { ModelObject } from '../../common/modelObject';
import { MODEL_GRASS01 } from '../../common/objects/enum';
import { Vector2 } from '../../libs/babylon/exports';

const TERRAIN_OFFSET = -10;
const WIND_UPDATE_INTERVAL = 32;
const BASE_WIND_INTENSITY = 0.015;
const WIND_SMOOTH_SPEED = 0.2;
const WIND_WAVE_SPEED = 0.2;
const MAX_ANGLE = 0.25;
const RANDOM_INTENSITY = 0.25;
const HEIGHT_INFLUENCE = 1.0;
const HEIGHT_GRADIENT = 0.5;

export class GrassObject extends ModelObject {
  CastsShadow = false;

  private _lastWindUpdate = 0;
  private _currentAngleX = 0;
  private _currentAngleZ = 0;
  private _targetAngleX = 0;
  private _targetAngleZ = 0;
  private _windTime = 0;
  private _windOffset: Vector2 = Vector2.Zero();
  private _modelHeight = 1.0;

  async init(): Promise<void> {
    this._windOffset = new Vector2(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    await this.loadSpecificModelWithDynamicID(MODEL_GRASS01, 'Grass');
}
}
