import { Page } from '@playwright/test';

import { dsDialogFragment, DsDialogFragment } from './ds-dialog-fragment';
import { newDialogFragment, NewDialogFragment } from './new-dialog-fragment';
import {
  wiredComboFragment,
  WiredComboFragment,
  wiredComboLazyFragment,
  WiredComboLazyFragment,
  wiredListboxFragment,
  WiredListboxFragment
} from './element-fragment';

export interface BasePage extends Page {
  dsDialog?: DsDialogFragment;
  newDialog?: NewDialogFragment;

  land(url?: string): Promise<BasePage>;

  openDsDialog(): Promise<DsDialogFragment>;

  openNewDialog(): Promise<NewDialogFragment>;

  /**
   * Fixture for component test, page content is just replaced by the given fixture
   * @param html new page content
   */
  htmlFixture(html: `${string}<wired-combo${string}`): Promise<WiredComboFragment>;
  htmlFixture(html: `${string}<wired-combo-lazy${string}`): Promise<WiredComboLazyFragment>;
  htmlFixture(html: `${string}<wired-listbox${string}`): Promise<WiredListboxFragment>;
}

export const basePage = (page: Page) => {
  const p: BasePage = Object.create(page);

  p.land = async function (url: string = '/') {
    await this.goto(url);
    return this;
  }

  p.openDsDialog = async function () {
    await this.locator('#ds').hover();
    await this.getByRole('img', { name: 'Filtering' }).click();

    return dsDialogFragment(this);
  }

  p.openNewDialog = async function() {
    await page.locator('#ds > wired-combo #text').click();
    await page.getByRole('button', { name: '[+]New' }).click();

    return newDialogFragment(this);
  }

  // @ts-ignore
  p.htmlFixture = async function(html: string) {
    // land() is needed to load all JS
    await this.land();

    // replace page content with our fixture
    await this.setContent(`<!DOCTYPE html>${html}`);

    // parse HTML to determine which fixture to return
    const match = html.match(/<(wired-[\w-]+)/);
    if (match) {
      switch (match[1]) {
        case 'wired-combo':
          return wiredComboFragment(this);
        case 'wired-combo-lazy':
          return wiredComboLazyFragment(this);
        case 'wired-listbox':
          return wiredListboxFragment(this);
        default:
          throw new Error(`${match[1]} fragment is not defined in pageobject`);
      }
    }

    throw new Error(`Tag is not find in HTML: ${html}`);
  }

  return p;
}