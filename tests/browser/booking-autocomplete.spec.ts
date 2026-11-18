import { test, expect } from '@playwright/test';
import { chooseOption } from './dropdown-helpers';
for (const lang of ['en', 'zh'])
  test(`customer-first booking autocomplete ${lang}`, async ({ page }) => {
    const t = (en: string, zh: string) => (lang === 'en' ? en : zh);
    await page.route('**/api/profile', (r) =>
      r.fulfill({ status: 401, json: { code: 'unauthenticated' } }),
    );
    await page.goto(`/app/calendar/?lang=${lang}`);
    await page.getByRole('button', { name: t('Add booking', '添加预约'), exact: true }).click();
    const dialog = page.getByRole('dialog', { name: t('Add booking', '添加预约'), exact: true });
    const customer = dialog.getByRole('combobox', { name: t('Customer', '客户'), exact: true });
    const pet = dialog.getByRole('combobox', { name: t('Pet', '宠物'), exact: true });
    await expect(customer).toBeFocused();
    await expect(pet).toBeDisabled();
    await customer.click();
    const count = await page.getByRole('option').count();
    expect(count).toBeGreaterThan(1);
    await customer.fill(t('Family 4', '家庭 4'));
    await expect(page.getByRole('option')).toHaveCount(1);
    await customer.press('ArrowDown');
    await customer.press('Enter');
    await expect(pet).toBeEnabled();
    await pet.click();
    await expect(page.getByRole('option', { name: 'Willow', exact: true })).toBeVisible();
    await expect(
      page.getByRole('option', { name: 'Willow', exact: true }).locator('.custom-autocomplete-pet'),
    ).toBeVisible();
    await pet.fill('Will');
    await expect(page.getByRole('option')).toHaveCount(1);
    await pet.press('Enter');
    await expect(pet).toHaveAttribute('data-value', 'Willow');
    await chooseOption(customer, '1');
    await expect(pet).toHaveAttribute('data-value', '');
    await pet.click();
    await expect(page.getByRole('option', { name: 'Willow', exact: true })).toHaveCount(0);
    await customer.focus();
    await customer.press('ArrowDown');
    await expect(page.getByRole('listbox')).toHaveCount(1);
    await customer.fill('');
    await expect(page.getByRole('option')).toHaveCount(count);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(page.locator('datalist, input[list]')).toHaveCount(0);
  });
