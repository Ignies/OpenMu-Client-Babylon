import { ModelObject } from './modelObject';

/**
 * A map object's lights without its body.
 *
 * A type that carries a light (Noria's lamp flowers, a torch post) used to
 * stay on the per-object path for the light alone: `MapObjectLights.attach`
 * hangs off a `ModelObject`'s node, and `RenderSystem` feeds the light's
 * colour back into the body through `SelfLight`. The body now goes to the
 * prop batches and this stands in for the model: the loader gives it the
 * node, the lights and the visibility radius exactly as it would a model,
 * it reports `Ready` at once, and it is never drawn. The batch reads its
 * `Light` (terrain plus self, the sum `RenderSystem` keeps) into the
 * placement's instance attribute, so the flower still glows with its lamp.
 */
export class LightCarrier extends ModelObject {
  init(): Promise<void> {
    this.Visible = false;
    this.CastsShadow = false;
    this.Ready = true;

    return Promise.resolve();
  }
}
