import { Frame } from '@playwright/test';
import { expect, test } from './fixture/base-fixture';

let onWebpackOverlay = (frame: Frame) => {
  let promise = frame
      .$('#webpack-dev-server-client-overlay-div')
      .then((element) => element?.innerText())
      .then((content) => {
        if (typeof content === 'string' && content.includes('Uncaught runtime errors:\n')) {
          throw new Error(content);
        }
      }, () => {
        /* not a webpack error frame */
      });
  onWebpackOverlayPromise.push(promise);
};

let onWebpackOverlayPromise: any[] = [];

test.beforeEach(({ page }) => {
  page.on('frameattached', onWebpackOverlay);
});

test.afterEach(async ({ page }) => {
  await Promise.all(onWebpackOverlayPromise);
  page.off('frameattached', onWebpackOverlay);
})

test('open dialog for different Dses', async ({ page, }) => {
  // Open on no DS selected
  await page.land('/');
  const dsDialog = await page.openDsDialog();

  // Must be empty on empty DS
  expect(await dsDialog.editor.getContent()).toMatch(/^\s*$/);
  expect(await dsDialog.tab.first().textContent()).toEqual('Filtering');

  // Switch to a DS with filtering available
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('combobox').filter({ hasText: 'New Data Set 1111 Data Set' }).locator('#textPanel').click();
  await page.getByRole('button', { name: '[x]Data Set 2222' }).click();
  await page.getByRole('img', { name: 'Filtering' }).click();

  // Must be non-empty filtering JSON. Tab title must be the same.
  expect(await dsDialog.editor.getContent()).not.toMatch(/^\s*$/);
  expect(await dsDialog.tab.first().textContent()).toEqual('Filtering');
});

test('edit filter as JSON and apply', async ({ page, }) => {
  // Open on a DS with filtering available
  await page.land('/?id=2222');
  const dsDialog = await page.openDsDialog();

  // Fill new content (by parsing and updating existing content as an object)
  let content = await dsDialog.editor.getContent();
  let obj: any;
  try {
    obj = JSON.parse(content);
  } catch (e) {
    expect(content, { message: e?.toString() }).toBe('a valid json');
  }
  expect(obj instanceof Array).toBeTruthy();
  expect(obj).toHaveLength(2);
  expect(obj[0].selected).toEqual([]);
  obj[0].selected = [{ id: '1', name: 'Moscow' }];
  content = JSON.stringify(obj, undefined, 2);
  await dsDialog.editor.setContent(content);
  // await page.waitForTimeout(2000);
  await page.getByText('OK', { exact: true }).click();

  // Dialog should close
  await expect(dsDialog).not.toBeOpen();

  // Expect that only 2 rows remain shown
  await expect(page.locator('table[style="table-layout: fixed;"] tbody tr[data-id]')).toHaveCount(2);
});

test('close dialog by Esc hotkey', async ({ page }) => {
  await page.land('/');
  const dsDialog = await page.openDsDialog();

  await expect(dsDialog).toBeOpen();

  await dsDialog.editor.press('Escape');

  await expect(dsDialog).not.toBeOpen();

  // Check that focus isn't inside the dialog
  expect(await dsDialog.evaluate((element) => element.contains(document.activeElement))).toBeFalsy();
});
