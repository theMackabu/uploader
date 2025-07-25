import type { File } from '@/schema';
import { customAlphabet } from 'nanoid';

export const nanoid = customAlphabet('useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict', 21);
export const token = customAlphabet('useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict', 30);

export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';

  const sizes = ['b', 'kb', 'mb', 'gb', 'tb'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2);

  return `${size}${sizes[i]}`;
}

export function formatFile(file: File, hostname: string) {
  return {
    id: file.id,
    fileName: decodeURIComponent(file.name),
    createdAt: file.date,
    metadata: {
      url: `${hostname}/${file.id}/${encodeURIComponent(file.name)}`,
      view: `${hostname}/${file.id}/${encodeURIComponent(file.name)}?content=inline`,
      size: {
        raw: Number(file.size),
        formatted: formatFileSize(file.size)
      }
    }
  };
}
