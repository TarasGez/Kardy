export interface Card {
  id: string;
  name: string;
  front: Blob;
  back: Blob | null;
  createdAt: number;
  updatedAt: number;
}

export type CardSide = 'front' | 'back';
export const MAX_IMAGE_BYTES = 24 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif', 'image/gif']);

export function validateImage(file: Blob): void {
  if (!(file instanceof Blob) || !IMAGE_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Оберіть фото у форматі JPEG, PNG, WebP, HEIC, HEIF, AVIF або GIF.');
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error('Фотографія має бути ненульовою та не більшою за 24 МБ.');
  }
}

export function normalizedName(name: string): string {
  const value = name.trim().replace(/\s+/g, ' ');
  if (value.length < 1 || value.length > 100) {
    throw new Error('Назва магазину має містити від 1 до 100 символів.');
  }
  return value;
}

export function createCard(name: string, front: Blob, back: Blob | null): Card {
  validateImage(front);
  if (back) validateImage(back);
  const now = Date.now();
  return { id: crypto.randomUUID(), name: normalizedName(name), front, back, createdAt: now, updatedAt: now };
}

export function userError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') return 'Недостатньо місця на пристрої. Звільніть пам’ять і повторіть.';
    if (error.name === 'InvalidStateError' || error.name === 'NotFoundError') return 'Сховище недоступне. Перезапустіть Kardy.';
  }
  return error instanceof Error ? error.message : 'Сталася непередбачена помилка.';
}
