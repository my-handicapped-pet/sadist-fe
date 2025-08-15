/**
 * Tests on wired-elements separately.
 */

import { expect, test } from './fixture/base-fixture';
import { BasePage } from './pageobject/base-page';
import {
  WiredComboLazyFragment,
  WiredListboxFragment
} from './pageobject/element-fragment';
import { WiredCombo, WiredComboLazy, WiredListbox, WiredGlobe } from '/wired-elements/lib/wired-elements';

test.describe('wired-globe', () => {
  test('wired-globe should update data points on data change', async ({ page }) => {
    // land() is needed to load all JS
    await page.land();

    // replace all page content with our fixture
    await page.setContent(`
      <wired-globe style="width: 900px;">
      </wired-globe>
    `);

    await page.$eval('wired-globe', (element) => {
      ( element as WiredGlobe ).data = [
        {
          id: { name: 'Moscow', loc: { type: 'Point', coordinates: [37.61556, 55.75222] } },
          values: { count: 1 },
        },
        {
          id: { name: 'Paris', loc: { type: 'Point', coordinates: [2.3488, 48.85341] } },
          values: { count: 1 },
        }
      ];
    });
    // Playwright can query nested element in the shadow root
    await expect(page.locator('wired-globe wired-marker')).toHaveCount(2);
    await expect(page.locator('wired-globe wired-marker').nth(0)).toHaveCSS('left', '550.604px');

    await page.$eval('wired-globe', (element) => {
      ( element as WiredGlobe ).data = [
        {
          id: { name: 'Russia', loc: { type: 'Point', coordinates: [55.3947, 53.3846] } },
          values: { count: 1 },
        },
        {
          id: { name: 'France', loc: { type: 'Point', coordinates: [2.8275, 47.0074] } },
          values: { count: 1 },
        }
      ];
    });
    await expect(page.locator('wired-globe wired-marker')).toHaveCount(2);
    await expect(page.locator('wired-globe wired-marker').nth(0)).toHaveCSS('left', '502.429px');
  });
});

test.describe('wired-combo', () => {
  test('wired-combo should show menu items on click', async ({ page }) => {
    const combo = await page.htmlFixture(`
    <wired-combo>
      <wired-item value="apple">Apple</wired-item>
      <wired-item value="banana">Banana</wired-item>
    </wired-combo>
    `);

    await expect(combo.card).not.toBeVisible();
    await combo.click();
    await expect(combo.card).toBeVisible();
  });

  test('wired-combo should move to an item according to search input', async ({ page }) => {
    const combo = await page.htmlFixture(`
    <wired-combo>
      <wired-item value="apple">Apple</wired-item>
      <wired-item value="banana">Banana</wired-item>
      <wired-item value="cherry">Cherry</wired-item>
    </wired-combo>
    `);

    await combo.click();
    await expect(combo.item.nth(0)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(1)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(2)).not.toHaveAttribute('aria-selected');

    await page.keyboard.type('ba');
    await expect(combo.item.nth(0)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(1)).toHaveAttribute('aria-selected');
    await expect(combo.item.nth(2)).not.toHaveAttribute('aria-selected');
  });

  test('wired-combo should move back and forth by arrows', async ({ page }) => {
    const combo = await page.htmlFixture(`
    <wired-combo>
      <wired-item value="apple">Apple</wired-item>
      <wired-item value="banana">Banana</wired-item>
      <wired-item value="cherry">Cherry</wired-item>
    </wired-combo>
    `);

    await combo.click();
    await expect(combo.item.nth(0)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(1)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(2)).not.toHaveAttribute('aria-selected');

    await page.keyboard.press('ArrowDown');
    await expect(combo.item.nth(0)).toHaveAttribute('aria-selected');
    await expect(combo.item.nth(1)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(2)).not.toHaveAttribute('aria-selected');

    await page.keyboard.press('ArrowDown');
    await expect(combo.item.nth(0)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(1)).toHaveAttribute('aria-selected');
    await expect(combo.item.nth(2)).not.toHaveAttribute('aria-selected');

    await page.keyboard.press('ArrowUp');
    await expect(combo.item.nth(0)).toHaveAttribute('aria-selected');
    await expect(combo.item.nth(1)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(2)).not.toHaveAttribute('aria-selected');
  });

  test('wired-combo should move to an item according to search input (items added dynamically)', async ({ page }) => {
    const combo = await page.htmlFixture(`
    <wired-combo>
    </wired-combo>
    `);

    for (const [value, text] of [['apple', 'Apple'], ['banana', 'Banana'], ['cherry', 'Cherry']]) {
      await combo.evaluate((element, [value, text]) => {
        const item = document.createElement('wired-item');
        item.setAttribute('value', value);
        item.innerHTML = text;
        element.appendChild(item);
      }, [value, text]);
    }

    await combo.click();
    await expect(combo.item).toHaveCount(3);
    await expect(combo.item.nth(0)).toHaveText('Apple');
    await expect(combo.item.nth(1)).toHaveText('Banana');
    await expect(combo.item.nth(2)).toHaveText('Cherry');
    await expect(combo.item.nth(0)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(1)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(2)).not.toHaveAttribute('aria-selected');

    await page.keyboard.type('ba');
    await expect(combo.item.nth(0)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(1)).toHaveAttribute('aria-selected');
    await expect(combo.item.nth(2)).not.toHaveAttribute('aria-selected');
  });

  test('wired-combo should render combo, cards and edit box of the same size', async ({ page }) => {
    const combo = await page.htmlFixture(`
    <wired-combo>
      <wired-item value="apple">Apple</wired-item>
      <wired-item value="banana">Banana</wired-item>
      <wired-item value="cherry">Cherry</wired-item>
    </wired-combo>
    `);

    await combo.click();
    const r1 = await combo.container.evaluate((element) => element.getBoundingClientRect());
    const r2 = await combo.card.evaluate((element) => element.getBoundingClientRect());
    const r3 = await combo.searchInput.evaluate((element) => element.getBoundingClientRect());
    expect(r1.width).toEqual(r2.width);
    expect(r1.width).toEqual(r3.width + 34 /* dropdown width */);
  });

  test('wired-combo should display selected item by default', async ({ page }) => {
    const combo = await page.htmlFixture(`
      <wired-combo selected="banana">
        <wired-item value="apple">Apple</wired-item>
        <wired-item value="banana">Banana</wired-item>
        <wired-item value="cherry">Cherry</wired-item>
      </wired-combo>
    `);

    await expect(combo.item.nth(1)).toHaveAttribute('aria-selected');
    await expect(combo.locator('#text')).toHaveText('Banana');
  });

  test('wired-combo should display selected item when value changed from code', async ({ page }) => {
    const combo = await page.htmlFixture(`
      <wired-combo selected="banana">
        <wired-item value="apple">Apple</wired-item>
        <wired-item value="banana">Banana</wired-item>
        <wired-item value="cherry">Cherry</wired-item>
      </wired-combo>
    `);

    await combo.evaluate((element) => {
      ( element as WiredCombo ).value = { value: 'apple', text: 'Apple' };
    });
    await expect(combo.item.nth(0)).toHaveAttribute('aria-selected');
    await expect(combo.locator('#text')).toHaveText('Apple');
  });

  test('wired-combo should display selected item when selected changed from code', async ({ page }) => {
    const combo = await page.htmlFixture(`
      <wired-combo selected="banana">
        <wired-item value="apple">Apple</wired-item>
        <wired-item value="banana">Banana</wired-item>
        <wired-item value="cherry">Cherry</wired-item>
      </wired-combo>
    `);

    await combo.evaluate((element) => {
      ( element as WiredCombo ).selected = 'apple';
    });
    await expect(combo.item.nth(0)).toHaveAttribute('aria-selected');
    await expect(combo.locator('#text')).toHaveText('Apple');
  });

  test('wired-combo should display the last selected value after pressing Esc', async ({ page }) => {
    const combo = await page.htmlFixture(`
      <wired-combo selected="banana">
        <wired-item value="apple">Apple</wired-item>
        <wired-item value="banana">Banana</wired-item>
        <wired-item value="cherry">Cherry</wired-item>
      </wired-combo>
    `);

    await combo.click();
    await page.keyboard.press('ArrowDown');
    await expect(combo.item.nth(0)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(1)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(2)).toHaveAttribute('aria-selected');

    await page.keyboard.press('Escape');
    await expect(combo.item.nth(0)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(1)).toHaveAttribute('aria-selected');
    await expect(combo.item.nth(2)).not.toHaveAttribute('aria-selected');
    await expect(combo.locator('#text')).toHaveText('Banana');
  });

  test('wired-combo should display the last selected value when the component lose the focus', async ({ page }) => {
    const combo = await page.htmlFixture(`
      <wired-combo selected="banana">
        <wired-item value="apple">Apple</wired-item>
        <wired-item value="banana">Banana</wired-item>
        <wired-item value="cherry">Cherry</wired-item>
      </wired-combo>
    `);

    await combo.click();
    await page.keyboard.press('ArrowDown');
    await expect(combo.item.nth(0)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(1)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(2)).toHaveAttribute('aria-selected');

    await combo.blur();
    await expect(combo.item.nth(0)).not.toHaveAttribute('aria-selected');
    await expect(combo.item.nth(1)).toHaveAttribute('aria-selected');
    await expect(combo.item.nth(2)).not.toHaveAttribute('aria-selected');
    await expect(combo.locator('#text')).toHaveText('Banana');
  });
});

test.describe('wired-combo-lazy', () => {
  async function fixture1(page: BasePage, selected?: string): Promise<WiredComboLazyFragment> {
    /**
     * Fixture for every test but with different selected.
     * It's easier to make a function rather than proper Playwright's fixture...
     */
    const values = [
      { value: 'apple', text: 'Apple' },
      { value: 'banana', text: 'Banana' },
      { value: 'cherry', text: 'Cherry' },
    ];

    const combo = await page.htmlFixture(`<wired-combo-lazy></wired-combo-lazy>`);
    await combo.evaluate((element, [{ values, selected }]) => {
      ( element as WiredComboLazy ).values = values;
      ( element as WiredComboLazy ).selected = selected;
    }, [{ values, selected }]);

    return combo;
  }

  test('wired-combo-lazy should show menu items on click', async ({ page }) => {
    const combo = await fixture1(page);

    await combo.click();
    await expect(combo.card).toBeVisible();
    await expect(combo.item).toHaveCount(3);
    await expect(combo.item.nth(0)).toHaveText('Apple');
    await expect(combo.item.nth(1)).toHaveText('Banana');
    await expect(combo.item.nth(2)).toHaveText('Cherry');
  });

  test('wired-combo-lazy should display selected item by default', async ({ page }) => {
    const combo = await fixture1(page, 'banana');

    await expect(combo.locator('#text')).toHaveText('Banana');
  });

  test('wired-combo-lazy should display selected item when value changed from code', async ({ page }) => {
    const combo = await fixture1(page);

    await combo.evaluate((element) => {
      ( element as WiredComboLazy ).value = { value: 'banana', text: 'Banana' };
    });
    await expect(combo.locator('#text')).toHaveText('Banana');
  });

  test('wired-combo-lazy should display selected item when selected changed from code', async ({ page }) => {
    const combo = await fixture1(page, 'banana');

    await combo.evaluate((element) => {
      ( element as WiredComboLazy ).selected = 'apple';
    });
    await expect(combo.locator('#text')).toHaveText('Apple');
  });

  test('wired-combo-lazy should display the last selected value after pressing Esc', async ({ page }) => {
    const combo = await fixture1(page, 'banana');

    await combo.click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(combo.locator('#text')).toHaveText('Banana');
  });

  test('wired-combo-lazy should display the last selected value when the component lose the focus', async ({ page }) => {
    const combo = await fixture1(page, 'banana');

    await combo.click();
    await page.keyboard.press('ArrowDown');
    await combo.blur();
    await expect(combo.locator('#text')).toHaveText('Banana');
  });
});

test.describe('wired-listbox', () => {
  /**
   * Wait for 'selected' event on a listbox. Return event's detail
   * @param listbox
   */
  function waitForEvent(listbox: WiredListboxFragment): Promise<any> {
    return listbox.evaluate((element) => {
      return new Promise((resolve) => {
        const listener = (e: Event) => {
          resolve(( e as CustomEvent ).detail);
          ( element as WiredListbox ).removeEventListener('selected', listener);
        };
        ( element as WiredListbox ).addEventListener('selected', listener);
      });
    });
  }

  test('wired-listbox should select listbox item on click', async ({ page }) => {
    const listbox = await page.htmlFixture(`
    <wired-listbox>
      <wired-item value="1">Item #1</wired-item>
      <wired-item value="2">Item #2</wired-item>
      <wired-item value="3">Item #3</wired-item>
    </wired-listbox>
    `);

    const detailPromise = waitForEvent(listbox);

    await listbox.item.nth(1).click();
    await expect(listbox.item.nth(1)).toHaveAttribute('aria-selected');
    const detail = await detailPromise;
    expect(detail.selected).toEqual('2');
  });

  test('wired-listbox should display selected item by default', async ({ page }) => {
    const listbox = await page.htmlFixture(`
      <wired-listbox selected="1">
        <wired-item value="1">Item #1</wired-item>
        <wired-item value="2">Item #2</wired-item>
        <wired-item value="3">Item #3</wired-item>
      </wired-listbox>
    `);

    await expect(listbox.item.nth(0)).toHaveAttribute('aria-selected');
  });

  test('wired-listbox should update value from code', async ({ page }) => {
    const listbox = await page.htmlFixture(`
      <wired-listbox selected="1">
        <wired-item value="1">Item #1</wired-item>
        <wired-item value="2">Item #2</wired-item>
        <wired-item value="3">Item #3</wired-item>
      </wired-listbox>
    `);

    await listbox.evaluate((element) => {
      ( element as WiredListbox ).value = { value: '2', text: 'Item #2' };
    });
    await expect(listbox.item.nth(1)).toHaveAttribute('aria-selected');
  });

  test('wired-listbox should update selected from code', async ({ page }) => {
    const listbox = await page.htmlFixture(`
      <wired-listbox selected="1">
        <wired-item value="1">Item #1</wired-item>
        <wired-item value="2">Item #2</wired-item>
        <wired-item value="3">Item #3</wired-item>
      </wired-listbox>
    `);

    await listbox.evaluate((element) => {
      ( element as WiredListbox ).selected = '2';
    });
    await expect(listbox.item.nth(1)).toHaveAttribute('aria-selected');
  });
});
