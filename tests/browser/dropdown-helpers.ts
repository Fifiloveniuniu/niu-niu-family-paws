import { expect, type Locator } from '@playwright/test';

/** Exercise the visible custom control rather than its hidden form field. */
export async function chooseOption(
  control: Locator,
  choice: string | { label?: string; value?: string },
) {
  if (!(await control.isVisible())) {
    const menu = control.page().locator('.marketing-menu-toggle');
    if (await menu.isVisible()) await menu.click();
  }
  if ((await control.getAttribute('aria-expanded')) !== 'true') await control.click();
  const page = control.page();
  const value = typeof choice === 'string' ? choice : choice.value;
  const label = typeof choice === 'string' ? undefined : choice.label;
  if ((await control.getAttribute('aria-haspopup')) === 'menu') {
    const name = label ?? (value === 'zh' ? '简体中文' : 'English');
    await page.getByRole('menuitemradio', { name, exact: true }).click();
  } else {
    const list = page.getByRole('listbox');
    if (label) await list.getByRole('option', { name: label, exact: true }).click();
    else {
      const match = list.locator('[role="option"]').filter({ visible: true });
      const index = await match.evaluateAll(
        (items, selected) =>
          items.findIndex((item) => item.getAttribute('data-value') === selected),
        value ?? '',
      );
      expect(index, `Dropdown option ${value}`).toBeGreaterThanOrEqual(0);
      await match.nth(index).click();
    }
  }
}
