import { test, expect } from '@playwright/test';

test('mobile food, weight, and charts flows render', async ({ page }) => {
  await page.goto('/food');
  await expect(page.getByRole('heading', { name: 'Food' })).toBeVisible();

  await page.getByLabel('Name').fill('Oatmeal');
  await page.getByLabel('Brand').fill('Kitchen');
  await page.getByLabel('Serving amount').fill('1');
  await page.getByLabel('Unit').fill('bowl');
  await page.getByLabel('Calories').fill('300');
  await page.getByLabel('Protein').fill('12');
  await page.getByLabel('Carbs').fill('48');
  await page.getByLabel('Fat').fill('6');
  await page.getByRole('button', { name: 'Save food' }).click();
  await expect(page.getByText('Oatmeal')).toBeVisible();

  await page.getByLabel('Food').selectOption({ label: 'Oatmeal' });
  await page.getByRole('button', { name: 'Log entry' }).click();
  await expect(page.getByText('300 cal')).toBeVisible();

  await page.getByRole('link', { name: /Weight/ }).click();
  await expect(page.getByRole('heading', { name: 'Weight' })).toBeVisible();
  await page.getByLabel('Weight (lb)').fill('201.2');
  await page.getByRole('button', { name: 'Add weigh-in' }).click();
  await expect(page.getByText('201.2 lb')).toBeVisible();

  await page.getByRole('link', { name: /Charts/ }).click();
  await expect(page.getByRole('heading', { name: 'Charts' })).toBeVisible();
  await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
});
