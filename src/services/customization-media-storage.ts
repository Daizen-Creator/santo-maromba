import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { CustomizationMediaInput } from '../shared/types';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const EXTENSIONS: Record<CustomizationMediaInput['mimeType'], string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'video/mp4': '.mp4'
};

export interface StoredCustomizationMedia {
  id: string;
  filePath: string;
  bytes: Buffer;
  mimeType: CustomizationMediaInput['mimeType'];
}

export class CustomizationMediaStorage {
  constructor(private readonly directory: string) {}

  save(input: CustomizationMediaInput): StoredCustomizationMedia {
    const bytes = Buffer.from(input.dataBase64, 'base64');
    if (!bytes.length || bytes.length > MAX_FILE_BYTES) {
      throw new Error('A mídia deve ter até 25 MB.');
    }
    if (!this.matchesSignature(bytes, input.mimeType)) {
      throw new Error('O conteúdo do arquivo não corresponde ao formato informado.');
    }

    fs.mkdirSync(this.directory, { recursive: true });
    const id = randomUUID();
    const filePath = path.join(this.directory, id + EXTENSIONS[input.mimeType]);
    fs.writeFileSync(filePath, bytes, { flag: 'wx' });
    return { id, filePath, bytes, mimeType: input.mimeType };
  }

  read(filePath: string): Buffer {
    if (!this.isInsideStorage(filePath)) throw new Error('Caminho de mídia inválido.');
    return fs.readFileSync(filePath);
  }

  remove(filePath: string): void {
    if (!this.isInsideStorage(filePath)) throw new Error('Caminho de mídia inválido.');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  private isInsideStorage(filePath: string): boolean {
    const root = path.resolve(this.directory) + path.sep;
    return path.resolve(filePath).startsWith(root);
  }

  private matchesSignature(bytes: Buffer, mimeType: CustomizationMediaInput['mimeType']): boolean {
    if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (mimeType === 'image/gif') return ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'));
    return bytes.subarray(4, 8).toString('ascii') === 'ftyp';
  }
}
