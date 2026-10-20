import fs from 'fs';
import path from 'path';
import { ExerciseMediaRecord } from '../shared/types';

const EXTENSIONS: Record<ExerciseMediaRecord['mimeType'], string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'video/mp4': '.mp4'
};

function hasValidSignature(bytes: Uint8Array, mimeType: ExerciseMediaRecord['mimeType']): boolean {
  if (mimeType === 'image/png') {
    return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/gif') {
    return bytes.length >= 6 && Buffer.from(bytes.slice(0, 6)).toString('ascii').startsWith('GIF8');
  }
  return bytes.length >= 12 && Buffer.from(bytes.slice(4, 8)).toString('ascii') === 'ftyp';
}

export class ExerciseMediaStorage {
  constructor(private readonly directory: string) {}

  save(id: string, bytes: Uint8Array, mimeType: ExerciseMediaRecord['mimeType']): string {
    if (bytes.byteLength === 0 || bytes.byteLength > 50 * 1024 * 1024) {
      throw new Error('A mídia deve ter entre 1 byte e 50 MB.');
    }
    if (!hasValidSignature(bytes, mimeType)) throw new Error('O arquivo não corresponde ao formato declarado.');
    fs.mkdirSync(this.directory, { recursive: true });
    const fileName = id + EXTENSIONS[mimeType];
    const target = path.resolve(this.directory, fileName);
    if (path.dirname(target) !== path.resolve(this.directory)) throw new Error('Nome de arquivo inválido.');
    fs.writeFileSync(target, Buffer.from(bytes), { flag: 'wx' });
    return fileName;
  }

  read(fileName: string): Uint8Array {
    if (!/^[a-zA-Z0-9_-]+\.(png|jpg|gif|mp4)$/.test(fileName)) throw new Error('Arquivo de mídia não permitido.');
    const target = path.resolve(this.directory, fileName);
    if (path.dirname(target) !== path.resolve(this.directory)) throw new Error('Caminho de mídia inválido.');
    if (!fs.existsSync(target)) throw new Error('Mídia não encontrada.');
    return new Uint8Array(fs.readFileSync(target));
  }

  delete(fileName: string): void {
    if (!/^[a-zA-Z0-9_-]+\.(png|jpg|gif|mp4)$/.test(fileName)) return;
    const target = path.resolve(this.directory, fileName);
    if (path.dirname(target) === path.resolve(this.directory) && fs.existsSync(target)) fs.unlinkSync(target);
  }
}
