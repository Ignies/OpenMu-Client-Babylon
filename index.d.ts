type Byte = number;
type ShortLittleEndian = number;
type ShortBigEndian = number;
type IntegerLittleEndian = number;
type IntegerBigEndian = number;
type LongBigEndian = number;
type LongLittleEndian = number;
type Binary = DataView;

type Float = number;
type Int = number;
type UInt = number;
type UShort = number;
type Short = number;

type Disposer = () => void;
type ExtractPromise<T> = T extends PromiseLike<infer U> ? U : T;

declare module '*.gltf' {
  const content: string;
  export default content;
}

declare module '*.glb' {
  const content: string;
  export default content;
}

declare module '*.babylon' {
  const content: string;
  export default content;
}

declare module '*.mp3?url' {
  const content: string;
  export default content;
}

declare module '*.wav?url' {
  const content: string;
  export default content;
}

declare const APP_VERSION: string;
/** One per build (vite.config.ts): the asset cache worker is registered with it. */
declare const BUILD_ID: string;
declare const APP_STAGE: 'dev' | 'prod' | 'cprod';
declare const QA_ENABLED: string | undefined;
