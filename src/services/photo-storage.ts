import fs from 'fs';
import path from 'path';

export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

const IMAGE_FORMATS = {
  'image/jpeg': { extension: 'jpg', mimeType: 'image/jpeg' },
  'image/png': { extension: 'png', mimeType: 'image/png' },
  'image/webp': { extension: 'webp', mimeType: 'image/webp' }
} as const;

type SupportedMimeType = keyof typeof IMAGE_FORMATS;

export interface StoredPhotoImage {
  bytes: Uint8Array;
  mimeType: SupportedMimeType;
}

export class PhotoStorage {
  constructor(private readonly directory: string) {
    fs.mkdirSync(directory, { recursive: true });
  }

  save(photoId: string, bytes: Uint8Array, mimeType: string): string {
    const format = IMAGE_FORMATS[mimeType as SupportedMimeType];
    if (!format) throw new Error('Formato de imagem não permitido. Use JPG, PNG ou WEBP.');
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) {
      throw new Error('A foto está vazia ou ultrapassa o limite de 15 MB.');
    }

    const buffer = Buffer.from(bytes);
    if (!this.hasValidSignature(buffer, mimeType as SupportedMimeType)) {
      throw new Error('O conteúdo do arquivo não corresponde ao formato da imagem.');
    }

    const fileName = this.createFileName(photoId, format.extension);
    const destination = path.join(this.directory, fileName);
    const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;

    try {
      fs.writeFileSync(temporary, buffer, { flag: 'wx' });
      fs.renameSync(temporary, destination);
    } catch (error) {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      throw error;
    }

    return fileName;
  }

  read(fileName: string): StoredPhotoImage {
    const safeName = this.validateFileName(fileName);
    const extension = path.extname(safeName).slice(1);
    const mimeType = extension === 'jpg' ? 'image/jpeg' : extension === 'png' ? 'image/png' : 'image/webp';
    const target = path.join(this.directory, safeName);
    if (fs.statSync(target).size > MAX_PHOTO_BYTES) throw new Error('O arquivo de foto ultrapassa o limite de 15 MB.');
    const bytes = fs.readFileSync(target);
    if (!this.hasValidSignature(bytes, mimeType)) throw new Error('O arquivo de foto está corrompido.');
    return { bytes, mimeType };
  }

  delete(fileName: string): void {
    const safeName = this.validateFileName(fileName);
    const target = path.join(this.directory, safeName);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }

  has(fileName: string): boolean {
    const safeName = this.validateFileName(fileName);
    return fs.existsSync(path.join(this.directory, safeName));
  }

  private createFileName(photoId: string, extension: string): string {
    if (!/^photo-[a-zA-Z0-9_-]{1,140}$/.test(photoId)) throw new Error('Identificador de foto inválido.');
    return this.validateFileName(`${photoId}.${extension}`);
  }

  private validateFileName(fileName: string): string {
    if (!/^photo-[a-zA-Z0-9_-]{1,140}\.(jpg|png|webp)$/.test(fileName) || path.basename(fileName) !== fileName) {
      throw new Error('Caminho de foto inválido.');
    }
    return fileName;
  }

  private hasValidSignature(bytes: Uint8Array, mimeType: SupportedMimeType): boolean {
    if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (mimeType === 'image/png') {
      return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
    }
    return bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF' &&
      Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP';
  }
}
