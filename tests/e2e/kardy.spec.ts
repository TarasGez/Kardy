import { expect, test, type Page } from '@playwright/test';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64');

async function addCard(page: Page) {
  await page.getByRole('button', { name: 'Додати картку' }).first().click();
  await page.getByLabel('Назва магазину').fill('Мій магазин');
  await page.getByLabel('Вибрати фото: Лицьова сторона').setInputFiles({ name: 'front.png', mimeType: 'image/png', buffer: png });
  await page.getByLabel('Вибрати фото: Зворотна сторона').setInputFiles({ name: 'back.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Зберегти' }).click();
  await expect(page.getByRole('button', { name: 'Відкрити картку Мій магазин' })).toBeVisible();
}

test('add, search, view, zoom, flip, rename and delete', async ({ page }) => {
  await page.goto('/');
  await addCard(page);
  await page.getByRole('searchbox', { name: 'Пошук за назвою магазину' }).fill('інший');
  await expect(page.getByText('Нічого не знайдено')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Пошук за назвою магазину' }).fill('мій');
  await page.getByRole('button', { name: 'Відкрити картку Мій магазин' }).click();
  await expect(page.getByRole('dialog', { name: 'Картка Мій магазин' })).toBeVisible();
  await page.getByRole('button', { name: 'Збільшити' }).click();
  await expect(page.getByRole('button', { name: 'Скинути масштаб' })).toHaveText('125%');
  await page.getByRole('button', { name: 'Перевернути ↔' }).click();
  await expect(page.getByAltText('Мій магазин: зворотна сторона')).toBeVisible();
  await page.getByRole('button', { name: 'Назад до карток' }).click();
  await page.getByRole('button', { name: 'Редагувати Мій магазин' }).click();
  await page.getByLabel('Назва магазину').fill('Новий магазин');
  await page.getByRole('button', { name: 'Зберегти' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Видалити Новий магазин' }).click();
  await expect(page.getByText('Тут будуть ваші картки')).toBeVisible();
});

test('backup and restore; corrupt import preserves current cards', async ({ page }) => {
  await page.goto('/');
  await addCard(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Експорт' }).click()]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const original = Buffer.concat(chunks);
  await page.getByLabel('Імпорт резервної копії').setInputFiles({ name: 'corrupt.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Відкрити картку Мій магазин' })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Імпорт резервної копії').setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: original });
  await expect(page.getByText('Відновлено карток: 1.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Відкрити картку Мій магазин' })).toBeVisible();
});

test('offline after service-worker activation; local CRUD/search', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await addCard(page);
  await page.getByRole('searchbox', { name: 'Пошук за назвою магазину' }).fill('мій');
  await expect(page.getByRole('button', { name: 'Відкрити картку Мій магазин' })).toBeVisible();
  await context.setOffline(false);
});

test('no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
