import fs from 'fs';
import path from 'path';

// Read logo files and convert to base64
function loadLogoAsBase64(filename: string): string {
  const baseDir = path.resolve(path.join(process.cwd(), 'attached_assets'));
  const possiblePaths = [
    path.join(process.cwd(), 'attached_assets', filename),
    path.join(process.cwd(), '..', 'attached_assets', filename),
  ];
  
  for (const candidatePath of possiblePaths) {
    const resolvedPath = path.resolve(candidatePath);
    if (!resolvedPath.startsWith(baseDir + path.sep) && resolvedPath !== baseDir) {
      continue;
    }
    try {
      if (fs.existsSync(resolvedPath)) {
        const buffer = fs.readFileSync(resolvedPath);
        return `data:image/png;base64,${buffer.toString('base64')}`;
      }
    } catch {
      // Continue trying
    }
  }
  return '';
}

// Cache the base64 strings
let _logoTurquoise: string | null = null;
let _iconWhite: string | null = null;

export function getLogoTurquoise(): string {
  if (_logoTurquoise === null) {
    _logoTurquoise = loadLogoAsBase64('Constancia - Type Logo (Turquoise)_1764415510183.png');
  }
  return _logoTurquoise;
}

export function getIconWhite(): string {
  if (_iconWhite === null) {
    _iconWhite = loadLogoAsBase64('Constancia - Icon (White)_1764414896685.png');
  }
  return _iconWhite;
}
