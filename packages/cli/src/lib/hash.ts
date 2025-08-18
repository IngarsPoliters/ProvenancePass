import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

export async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    
    stream.on('error', (err) => reject(err));
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
  });
}

export function sha256String(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export function sha256Buffer(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export async function getFileSize(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  return stats.size;
}