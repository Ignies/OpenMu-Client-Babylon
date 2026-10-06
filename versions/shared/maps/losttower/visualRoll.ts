/** `Luminosity = (float)(rand() % 30 + 70) * 0.01f`, rolled once a frame per object (ZzzObject.cpp:2737). */
export const visualLuminosity = (): number => 0.7 + Math.floor(Math.random() * 30) * 0.01;

/** `Rotation = (float)((int)(WorldTime * 0.1f) % 360)` (ZzzObject.cpp:2902, :2915), degrees. */
export const visualTurn = (ms: number): number => Math.floor(ms * 0.1) % 360;
