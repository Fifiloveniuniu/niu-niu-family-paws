// Actual localhost walkthrough; writes only marked test identities in guarded demo emulators.
import { chromium, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
  admin = await adminContext.newPage();
const errors = [];
admin.on('pageerror', (e) => errors.push(e.message));
async function sign(page, email) {
  await page.goto('http://localhost:4180/app/access/?lang=en');
  return page.evaluate(async (email) => {
    const { auth } = await import('/apps/web/src/auth-client.ts');
    if (auth.app.options.projectId !== 'demo-niu-niu' || auth.emulatorConfig?.port !== 9099)
      throw Error('Demo only');
    const { GoogleAuthProvider, signInWithCredential } =
      await import('/node_modules/.vite/deps/firebase_auth.js');
    const jwt =
      [
        { alg: 'none', typ: 'JWT' },
        {
          iss: 'https://accounts.google.com',
          aud: 'demo-test',
          sub: email,
          email,
          email_verified: true,
          name: '[TEST] Access ' + email.split('@')[0],
        },
      ]
        .map((x) =>
          btoa(JSON.stringify(x)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''),
        )
        .join('.') + '.';
    await signInWithCredential(auth, GoogleAuthProvider.credential(jwt));
    return auth.currentUser.uid;
  }, email);
}
await sign(admin, 'local-admin@example.test');
await expect(admin.getByRole('heading', { name: 'Identity & access', exact: true })).toBeVisible();
await expect(admin.locator('.iam-account').first()).toBeVisible();
const email = 'iam-ui-' + randomUUID().slice(0, 8) + '@example.test';
// Persist a new real invitation through the actual API. No code is logged or captured.
await admin.getByRole('button', { name: 'Invite person', exact: true }).click();
await admin.getByRole('textbox', { name: 'Google account email' }).fill(email);
const house = admin.getByRole('dialog').locator('.iam-house-choice input').first();
await house.check();
await admin.getByRole('button', { name: 'Create invitation', exact: true }).click();
await expect(
  admin.getByRole('dialog', { name: 'Share invitation privately', exact: true }),
).toBeVisible();
const code = await admin.getByRole('textbox', { name: 'Invitation code' }).inputValue();
if (code.length !== 85) throw Error('Code');
await admin.getByRole('button', { name: 'Done', exact: true }).click();
await admin.getByRole('tab', { name: 'Invitations', exact: true }).click();
await expect(admin.locator('.iam-invite').filter({ hasText: email })).toContainText('Pending');
// Recipient uses their own verified Google identity and accepts from My profile.
const recipientContext = await browser.newContext({ viewport: { width: 390, height: 844 } }),
  recipient = await recipientContext.newPage();
recipient.on('pageerror', (e) => errors.push(e.message));
await sign(recipient, email);
await recipient.goto(
  'http://localhost:4180/app/account/profile/?lang=en&dialog.access-accept=true',
);
await expect(
  recipient.getByRole('dialog', { name: 'Accept invitation', exact: true }),
).toBeVisible();
await recipient.getByRole('textbox', { name: 'Invitation code' }).fill(code);
await recipient
  .getByRole('dialog')
  .getByRole('button', { name: 'Accept invitation', exact: true })
  .click();
await expect(recipient.getByText('Invitation accepted', { exact: true })).toBeVisible();
await recipient.getByRole('button', { name: 'Done', exact: true }).click();
await expect(recipient.locator('.profile-roles')).toContainText('Employee');
// Real role/house editing and status lifecycle for only this new test account.
await admin.getByRole('tab', { name: 'Accounts', exact: true }).click();
await admin.getByRole('searchbox').fill(email);
await expect(admin.locator('.iam-account')).toHaveCount(1, { timeout: 15000 });
await admin.getByRole('button', { name: 'Edit access', exact: true }).click();
await expect(admin.getByRole('checkbox', { name: /^Customer/ })).toBeDisabled();
await admin
  .getByRole('textbox', { name: 'Reason', exact: true })
  .fill('[TEST] UI backend walkthrough');
let dropped = false,
  originalPayload = '';
await admin.route('**/api/access/accounts/*', async (route) => {
  if (route.request().method() !== 'PUT') {
    await route.continue();
    return;
  }
  if (!dropped) {
    dropped = true;
    originalPayload = route.request().postData();
    await route.fetch();
    await route.abort('failed');
  } else {
    if (route.request().postData() !== originalPayload) throw Error('Retry changed payload');
    await route.continue();
  }
});
await admin.getByRole('button', { name: 'Save access', exact: true }).click();
await expect(admin.getByRole('alert')).toContainText('save result is unknown');
await expect(admin.getByRole('textbox', { name: 'Reason', exact: true })).toBeDisabled();
await admin.getByRole('dialog').getByRole('button', { name: 'Retry', exact: true }).click();
await expect(admin.getByRole('dialog')).toHaveCount(0);
await admin.unroute('**/api/access/accounts/*');

await expect(admin.getByRole('dialog')).toHaveCount(0);
await admin.getByRole('button', { name: 'Suspend access', exact: true }).click();
await admin.getByRole('textbox', { name: 'Reason', exact: true }).fill('[TEST] Suspend check');
await admin
  .getByRole('dialog')
  .getByRole('button', { name: 'Suspend access', exact: true })
  .click();
await expect(admin.locator('.iam-account')).toContainText('Suspended');
const response = await recipient.evaluate(async () => {
  const { auth } = await import('/apps/web/src/auth-client.ts');
  const token = await auth.currentUser.getIdToken();
  return (await fetch('/api/identity', { headers: { Authorization: 'Bearer ' + token } })).status;
});
if (response !== 401) throw Error('Suspension did not block old token');
await admin.getByRole('button', { name: 'Restore access', exact: true }).click();
await admin.getByRole('textbox', { name: 'Reason', exact: true }).fill('[TEST] Restore check');
await admin
  .getByRole('dialog')
  .getByRole('button', { name: 'Restore access', exact: true })
  .click();
await expect(admin.locator('.iam-account .iam-state')).toHaveText('Active');
await admin.reload();
await expect(admin.locator('.iam-account').first()).toBeVisible();
await admin.getByRole('searchbox').fill(email);
await expect(admin.locator('.iam-account')).toContainText('Employee');
await expect(admin.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled();
await admin.screenshot({
  path: 'docs/review/identity-access-2026-11-24/backend-desktop.png',
  fullPage: true,
});
await admin.getByRole('tab', { name: 'Change history', exact: true }).click();
await expect(admin.locator('.iam-history')).toContainText('[TEST] Restore check');
await admin.screenshot({
  path: 'docs/review/identity-access-2026-11-24/backend-history.png',
  fullPage: true,
});
await admin.setViewportSize({ width: 390, height: 844 });
await admin.goto('http://localhost:4180/app/access/?lang=zh');
await expect(admin.locator('.iam-account').first()).toBeVisible();
await admin.screenshot({
  path: 'docs/review/identity-access-2026-11-24/backend-phone-zh.png',
  fullPage: true,
});
await admin.locator('.iam-account').first().getByRole('button', { name: '编辑权限' }).click();
await expect(admin.getByRole('dialog')).toBeVisible();
await admin.screenshot({ path: 'docs/review/identity-access-2026-11-24/backend-dialog-zh.png' });
if (await admin.evaluate(() => document.documentElement.scrollWidth > innerWidth))
  throw Error('Phone overflow');
await admin.getByRole('button', { name: '取消', exact: true }).click();
for (const lang of ['en', 'es']) {
  await admin.goto('http://localhost:4180/app/access/?lang=' + lang);
  await expect(admin.locator('.iam-account').first()).toBeVisible();
  for (const palette of ['google', 'apple', 'vscode-light', 'vscode-dark']) {
    await admin.evaluate(async (palette) => {
      const { changeAppearance } = await import('/apps/web/src/theme-preferences.ts');
      changeAppearance({ palette });
    }, palette);
    if (await admin.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw Error('Overflow ' + lang + palette);
  }
}
if (errors.length) throw Error(JSON.stringify(errors));
console.log(
  'PASS actual localhost Chrome: invitation create/recipient accept, current employee display, access save, suspension blocks old token, restore, persistence, durable history and Chinese phone/dialog.',
);
await browser.close();
