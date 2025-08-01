import { Frame } from '@playwright/test';
import { expect, test } from './fixture/base-fixture';
import { webCrawlerProviderTest } from './fixture/webcrawler-provider-fixture';

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
});

test('that entering values into the webcrawler\'s setup fields does not raspidoraśivat them', async ({ page }) => {
  await page.land();
  const newDialog = await page.openNewDialog();

  await newDialog.chooseWebCrawler();
  const w_url0 = await newDialog.url.evaluate((element) => element.clientWidth);
  const w_combo0 = await newDialog.template.evaluate((element) => element.clientWidth);

  await newDialog.setupWebCrawler();
  const w_url1 = await newDialog.url.evaluate((element) => element.clientWidth);
  const w_combo1 = await newDialog.template.evaluate((element) => element.clientWidth);

  expect(w_url1).toEqual(w_url0);
  expect(w_combo1).toEqual(w_combo0);
});

webCrawlerProviderTest('resize the blocks', async ({ page, newDialog }) => {
  // Remember right block width
  const w0 = await newDialog.locator('.site-html-tree-block').evaluate(
      (element) => element.clientWidth,
  );
  const w_editor0 = await newDialog.locator('#script .monaco-editor').evaluate(
      (element) => element.clientWidth,
  );

  // Click vertical divider
  await newDialog.locator('.dialog-content div > div:nth-child(2) wired-divider').first().dblclick();

  // New size
  const w1 = await newDialog.locator('.site-html-tree-block').evaluate(
      (element) => element.clientWidth,
  );
  const w_editor1 = await newDialog.locator('#script .monaco-editor').evaluate(
      (element) => element.clientWidth,
  );
  expect(w1).toBeGreaterThan(w0);
  expect(w_editor1).toBeGreaterThan(w_editor0);

  // Bug: it crawls to the right indefinitely...
  await page.waitForTimeout(500);
  const w2 = await newDialog.locator('.site-html-tree-block').evaluate(
      (element) => element.clientWidth,
  );
  const w_editor2 = await newDialog.locator('#script .monaco-editor').evaluate(
      (element) => element.clientWidth,
  )
  expect(w2).toEqual(w1);
  expect(w_editor2).toEqual(w_editor1);
});

webCrawlerProviderTest('switch to full screen, switch back, close the dialog and open again', async ({ page, newDialog }) => {
  // Remember original dialog's card size
  // @ts-ignore
  const [card_w0, card_h0] = await page.locator('.new-dialog #container > div > div > wired-card')
      .evaluate((element) => [element.clientWidth, element.clientHeight]);

  await newDialog.getByRole('img', { name: 'Full Screen' }).click();

  // Check that dialog's card fit the window
  const [card_w, card_h] = await page.locator('.new-dialog #container > div > div > wired-card')
      .evaluate((element) => [element.clientWidth, element.clientHeight]);
  const [win_w, win_h] = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
  expect(card_w).toEqual(win_w);
  expect(card_h).toEqual(win_h);

  await newDialog.getByRole('img', { name: 'Full Screen' }).click();

  // Check that dialog's card restores its original size
  // TODO sh**ty monaco-editor doesn't keep initial height, fix it!
  const [card_w1, card_h1] = await page.locator('.new-dialog #container > div > div > wired-card')
      .evaluate((element) => [element.clientWidth, element.clientHeight]);
  expect(card_w1).toEqual(card_w0);
  // expect(card_h1).toEqual(card_h0);

  await newDialog.getByRole('img', { name: 'Close' }).click();
  await page.openNewDialog();

  // Check that dialog's card has the same size as before
  const [card_w2, card_h2] = await page.locator('.new-dialog #container > div > div > wired-card')
      .evaluate((element) => [element.clientWidth, element.clientHeight]);
  expect(card_w2).toEqual(card_w1);
  expect(card_h2).toEqual(card_h1);
  // Check that svg follows thr card's size
  expect(await page.locator('.new-dialog #container > div > div > wired-card #overlay > svg')
      .evaluate((element) => element.clientHeight)).toBeGreaterThanOrEqual(card_h2);
});

webCrawlerProviderTest('construct script from the template', async ({ newDialog }) => {
  await newDialog.getByRole('searchbox', { name: 'css selector' }).click();
  await newDialog.getByRole('searchbox', { name: 'css selector' }).fill('tr');
  await newDialog.getByRole('searchbox', { name: 'css selector' }).press('Enter');

  await newDialog.getByText('Use as row').click();
  await expect(newDialog.locator('#script .view-lines')).toContainText('page.$$("tr")');

  await newDialog.getByRole('searchbox', { name: 'css selector' }).fill('td:nth-child(1)');
  await newDialog.getByRole('searchbox', { name: 'css selector' }).press('Enter');

  await newDialog.getByText('Use as field').click();
  await newDialog.getByRole('textbox', { name: 'Editor content' }).pressSequentially('company');
  await expect(newDialog.locator('#script .view-lines')).toContainText('const company = row.querySelector("td:nth-child(1)")?.textContent?.trim();');
});

webCrawlerProviderTest('execute script via websocket', async ({ page, newDialog }) => {
  // websocket mocked in the fixture

  await page.getByRole('img', { name: 'Edit script' }).click();

  await newDialog.editor.setContent('ABOBA');
  await newDialog.getByRole('img', { name: '>' }).click();
  await expect(newDialog.locator('.script-result-block span:nth-child(1)')).toHaveText('[["script"],["ABOBA"]]');

  // expect that request with the grabbed data is sent
  let requestData: string | null | undefined = undefined;
  page.route('/ds', (route) => {
    if (route.request().method() === 'PUT') {
      requestData = route.request().postData();
    }
  });
  await newDialog.getByRole('button', { name: 'Create' }).click();
  expect(requestData, { message: 'Expected PUT request' }).toBeTruthy();
  // to properly parse form data isn't easy here, so test string inclusion
  expect(requestData).toContain('script\nABOBA');
});
