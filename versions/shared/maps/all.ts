// The shared maps, handed to the maps controller. Imported first by src/app/boot.tsx (and by
// src/version/testSetup.ts), not by the version modules: the Bun servers load those, and map
// entries reach client code.
import { registerMaps } from '@/controllers/maps';
import { MAP_LAYERS } from './layers';

registerMaps(MAP_LAYERS);
