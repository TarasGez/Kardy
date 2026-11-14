import { MAX_IMAGE_BYTES, normalizedName, validateImage, type Card } from './cards';

const FORMAT = 'kardy-backup';
const VERSION = 1;
const MAX_BACKUP_BYTES = 128 * 1024 * 1024;
const MAX_CARDS = 1000;

type SavedPhoto = { type: string; data: string; sha256: string };
type SavedCard = { id: string; name: string; createdAt: number; updatedAt: number; front: SavedPhoto; back: SavedPhoto | null };
type Backup = { format: typeof FORMAT; version: typeof VERSION; exportedAt: string; cards: SavedCard[] };

function assertObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Неправильна структура резервної копії.');
}

async function fileToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkBytes = 3 * 8192;
  const encoded: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += chunkBytes) {
    const end = Math.min(bytes.length, offset + chunkBytes);
    let binary = '';
    for (let i = offset; i < end; i++) binary += String.fromCharCode(bytes[i]!);
    encoded.push(btoa(binary));
  }
  return encoded.join('');
}

async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function encodePhoto(blob: Blob): Promise<SavedPhoto> {
  validateImage(blob);
  return { type: blob.type, data: await fileToBase64(blob), sha256: await sha256(blob) };
}

async function decodePhoto(value: unknown): Promise<Blob> {
  assertObject(value);
  const { data, type, sha256: checksum } = value;
  if (typeof type !== 'string' || typeof checksum !== 'string' || !/^[a-f0-9]{64}$/.test(checksum) || typeof data !== 'string' || data.length < 4 || data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 8 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 !== 0) {
    throw new Error('Резервна копія містить пошкоджене фото.');
  }
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let total = 0;
  for (let i = 0; i < data.length; i += 32768) {
    const decoded = atob(data.slice(i, i + 32768));
    const chunk = new Uint8Array(decoded.length);
    for (let j = 0; j < decoded.length; j++) chunk[j] = decoded.charCodeAt(j);
    total += chunk.length;
    if (total > MAX_IMAGE_BYTES) throw new Error('Фото в резервній копії завелике.');
    parts.push(chunk);
  }
  const photo = new Blob(parts, { type });
  validateImage(photo);
  if (await sha256(photo) !== checksum) throw new Error('Фото в резервній копії пошкоджене (контрольна сума).');
  return photo;
}

export async function exportBackup(cards: Card[]): Promise<Blob> {
  if (cards.length > MAX_CARDS) throw new Error('Завелика кількість карток для експорту.');
  const approximateBase64Bytes = cards.reduce((total, card) => total + Math.ceil(card.front.size / 3) * 4 + (card.back ? Math.ceil(card.back.size / 3) * 4 : 0) + 400, 1000);
  if (approximateBase64Bytes > MAX_BACKUP_BYTES) throw new Error('Резервна копія завелика для цього пристрою.');
  const saved: SavedCard[] = [];
  for (const card of cards) {
    saved.push({
      id: card.id,
      name: normalizedName(card.name),
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      front: await encodePhoto(card.front),
      back: card.back ? await encodePhoto(card.back) : null
    });
  }
  const backup: Backup = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), cards: saved };
  const json = JSON.stringify(backup);
  if (new Blob([json]).size > MAX_BACKUP_BYTES) throw new Error('Резервна копія завелика для цього пристрою.');
  return new Blob([json], { type: 'application/json' });
}

export async function parseBackup(file: Blob): Promise<Card[]> {
  if (file.size === 0 || file.size > MAX_BACKUP_BYTES) throw new Error('Резервна копія порожня або завелика.');
  let raw: unknown;
  try { raw = JSON.parse(await file.text()) as unknown; }
  catch { throw new Error('Цей файл не є коректною резервною копією Kardy.'); }
  assertObject(raw);
  if (raw.format !== FORMAT || raw.version !== VERSION || !Array.isArray(raw.cards) || raw.cards.length > MAX_CARDS || typeof raw.exportedAt !== 'string' || !Number.isFinite(Date.parse(raw.exportedAt))) {
    throw new Error('Непідтримувана або пошкоджена резервна копія Kardy.');
  }
  const seen = new Set<string>();
  const cards: Card[] = [];
  for (const entry of raw.cards as unknown[]) {
    assertObject(entry);
    if (typeof entry.id !== 'string' || entry.id.length < 1 || entry.id.length > 100 || seen.has(entry.id) || typeof entry.name !== 'string' || !Number.isSafeInteger(entry.createdAt) || !Number.isSafeInteger(entry.updatedAt) || (entry.createdAt as number) < 0 || (entry.updatedAt as number) < (entry.createdAt as number)) {
      throw new Error('Резервна копія містить некоректну картку.');
    }
    seen.add(entry.id);
    cards.push({
      id: entry.id,
      name: normalizedName(entry.name),
      createdAt: entry.createdAt as number,
      updatedAt: entry.updatedAt as number,
      front: await decodePhoto(entry.front),
      back: entry.back === null ? null : await decodePhoto(entry.back)
    });
  }
  return cards;
}
