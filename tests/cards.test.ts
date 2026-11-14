import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCard } from '../src/lib/cards';
import { exportBackup, parseBackup } from '../src/lib/backup';
import { listCards, replaceCards, saveCard, deleteCard } from '../src/lib/storage';

const photo = (text: string) => new Blob([text], { type: 'image/png' });

beforeEach(async () => { await replaceCards([]); });

describe('Kardy local photo wallet', () => {
  it('persists original image bytes, both sides and names, then deletes', async () => {
    const card = createCard('  Супермаркет  ', photo('FRONT-ORIGINAL'), photo('BACK-ORIGINAL'));
    await saveCard(card);
    const stored = await listCards();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.name).toBe('Супермаркет');
    expect(await stored[0]?.front.text()).toBe('FRONT-ORIGINAL');
    expect(await stored[0]?.back?.text()).toBe('BACK-ORIGINAL');
    await deleteCard(card.id);
    expect(await listCards()).toEqual([]);
  });

  it('round-trips cards with exact image contents', async () => {
    const one = createCard('Магазин', photo('one'), null);
    const two = createCard('Магазин 2', photo('front'), photo('back'));
    const archive = await exportBackup([one, two]);
    const restored = await parseBackup(archive);
    expect(restored.map((item) => item.id)).toEqual([one.id, two.id]);
    expect(await restored[0]?.front.text()).toBe('one');
    expect(restored[0]?.back).toBeNull();
    expect(await restored[1]?.back?.text()).toBe('back');
  });

  it('preserves bytes across multi-chunk base64 encoding', async () => {
    const bytes = new Uint8Array(65_539);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
    const card = createCard('Велика картка', new Blob([bytes], { type: 'image/jpeg' }), null);
    const [restored] = await parseBackup(await exportBackup([card]));
    expect(new Uint8Array(await restored!.front.arrayBuffer())).toEqual(bytes);
  });

  it('rejects invalid JSON, unsupported format and duplicate ids', async () => {
    await expect(parseBackup(new Blob(['not-json']))).rejects.toThrow();
    const card = createCard('Магазин', photo('data'), null);
    const original = JSON.parse(await (await exportBackup([card])).text()) as { cards: unknown[]; version: number };
    await expect(parseBackup(new Blob([JSON.stringify({ ...original, version: 999 })]))).rejects.toThrow();
    const tampered = structuredClone(original) as { cards: Array<{ front: { data: string } }> };
    tampered.cards[0]!.front.data = 'ZGFtYWdlZA==';
    await expect(parseBackup(new Blob([JSON.stringify(tampered)]))).rejects.toThrow();
    await expect(parseBackup(new Blob([JSON.stringify({ ...original, cards: [original.cards[0], original.cards[0]] })]))).rejects.toThrow();
  });

  it('does not mutate existing cards when archive validation fails', async () => {
    const original = createCard('Збережено', photo('original'), null);
    await saveCard(original);
    await expect(parseBackup(new Blob(['{bad'])).then(replaceCards)).rejects.toThrow();
    const cards = await listCards();
    expect(cards.map((item) => item.id)).toEqual([original.id]);
  });

  it('rolls back clear and all writes when a replacement transaction aborts', async () => {
    const original = createCard('Збережено', photo('original'), null);
    const replacement = createCard('Нова', photo('new'), null);
    await saveCard(original);
    await expect(replaceCards([replacement, replacement])).rejects.toThrow();
    const stored = await listCards();
    expect(stored.map((card) => card.id)).toEqual([original.id]);
    expect(await stored[0]?.front.text()).toBe('original');
  });
});
