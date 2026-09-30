
export type TextureScript = {
  bright: boolean;
  hiddenMesh: boolean;
  streamMesh: boolean;
  noneBlendMesh: boolean;
  shadowMesh: 0 | 1 | 2;
};

const MAX_TOKEN_LENGTH = 5;

const NAME_LIMIT = 32;

export function parseTextureScript(fileName: string): TextureScript | null {
  const name = fileName.slice(0, NAME_LIMIT);

  const start = name.indexOf('_');
  if (start === -1) return null;

  const token = name.slice(start).split('.')[0];

const script: TextureScript = {
    bright: false,
    hiddenMesh: false,
    streamMesh: false,
    noneBlendMesh: false,
    shadowMesh: 0,
  };

  let isScript = false;
  const length = Math.min(MAX_TOKEN_LENGTH, token.length);

  for (let i = 1; i < length; i++) {
    switch (token[i]) {
      case 'R':
        script.bright = true;
        isScript = true;
        break;
      case 'H':
        script.hiddenMesh = true;
        isScript = true;
        break;
      case 'S':
        script.streamMesh = true;
        isScript = true;
        break;
      case 'N':
        script.noneBlendMesh = true;
        isScript = true;
        break;
      case 'D':
        if (token[i + 1] === 'C') {
          script.shadowMesh = 1;
          isScript = true;
        } else if (token[i + 1] === 'T') {
          script.shadowMesh = 2;
          isScript = true;
        }
        break;
      default:
        return null;
    }
  }

  return isScript ? script : null;
}

export function parseTextureScriptFromPath(
  texturePath: string
): TextureScript | null {
  const baseName = texturePath.split(/[\\/]/).pop();
  if (!baseName) return null;

  return parseTextureScript(baseName);
}
