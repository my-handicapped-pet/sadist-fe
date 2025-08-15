import { test } from './base-fixture';
import { NewDialogFragment } from '../pageobject/new-dialog-fragment';
// @ts-ignore no declaration, this is pure JS helper
import echo from '/websocket-echo.js';

export const webCrawlerProviderTest = test.extend<{ newDialog: NewDialogFragment }>({
  newDialog: async ({ page }, use) => {
    await page.routeWebSocket(/.*/, (ws) => {
      ws.onMessage(function (message) {
        console.log(`received: %s`, message);
        ws.send(echo(message));
      });
    });

    await page.land('/');
    const newDialog = await page.openNewDialog();
    await newDialog.chooseWebCrawler();
    await newDialog.setupWebCrawler();
    await newDialog.next();

    return use(newDialog);
  },
});
