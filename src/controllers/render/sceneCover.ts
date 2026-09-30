/**
 * Whether an opaque page is standing over the 3D scene - the world picker,
 * with the login scene loading behind it. Once that scene has loaded, the
 * render loop draws it only now and then: nobody can see it, and a hidden
 * scene at full rate is GPU spent on nothing.
 */
let covered = false;

export function setSceneCovered(value: boolean): void {
  covered = value;
}

export function sceneCovered(): boolean {
  return covered;
}
