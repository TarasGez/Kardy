import type { Card } from './cards';

const DB_NAME = 'kardy';
const DB_VERSION = 1;
const STORE = 'cards';
let pendingDb: Promise<IDBDatabase> | null = null;

export function openCardsDb(): Promise<IDBDatabase> {
  if (pendingDb) return pendingDb;
  pendingDb = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        pendingDb = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error('Не вдалося відкрити локальне сховище.'));
    req.onblocked = () => reject(new Error('Закрийте інші вкладки Kardy й повторіть.'));
  }).catch((error: unknown) => {
    pendingDb = null;
    throw error;
  });
  return pendingDb;
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Операцію збереження перервано.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Помилка IndexedDB.'));
  });
}

export async function listCards(): Promise<Card[]> {
  const db = await openCardsDb();
  return new Promise<Card[]>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as Card[]);
    req.onerror = () => reject(req.error ?? new Error('Не вдалося завантажити картки.'));
  });
}

export async function saveCard(card: Card): Promise<void> {
  const db = await openCardsDb();
  const transaction = db.transaction(STORE, 'readwrite');
  const done = completed(transaction);
  transaction.objectStore(STORE).put(card);
  await done;
}

export async function deleteCard(id: string): Promise<void> {
  const db = await openCardsDb();
  const transaction = db.transaction(STORE, 'readwrite');
  const done = completed(transaction);
  transaction.objectStore(STORE).delete(id);
  await done;
}

export async function replaceCards(cards: Card[]): Promise<void> {
  const db = await openCardsDb();
  const transaction = db.transaction(STORE, 'readwrite');
  const done = completed(transaction);
  const store = transaction.objectStore(STORE);
  store.clear();
  for (const card of cards) store.add(card);
  await done;
}
