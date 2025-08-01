import { Locator, Page } from '@playwright/test';

/**
 * Fragment corresponding to any wired element
 * descendant from WiredBase
 * ```
 * <wired-***>...</wired-***>
 * ```
 */
export interface WiredElementFragment extends Locator {
  container: Locator;
}

/**
 * Fragment corresponding to WiredCombo
 * ```
 * <wired-combo>
 *   <wired-item>...</wired-item>
 *   ...
 * </wired-combo>
 * ```
 */
export interface WiredComboFragment extends WiredElementFragment {
  searchInput: Locator;
  card: Locator;
  item: Locator;
}

/**
 * Fragment corresponding to WiredComboLazy
 * ```
 * <wired-combo-lazy>...</wired-combo-lazy>
 * ```
 */
export interface WiredComboLazyFragment extends WiredElementFragment {
  searchInput: Locator;
  card: Locator;
  item: Locator;
}

/**
 * Fragment corresponding to WiredListbox
 * ```
 * <wired-listbox>...</wired-listbox>
 * ```
 */
export interface WiredListboxFragment extends WiredElementFragment {
  item: Locator;
}

export function wiredComboFragment(page: Page): WiredComboFragment {
  const p: WiredComboFragment = Object.create(page.locator('wired-combo'));

  p.container = p.locator('#container');
  p.searchInput = p.locator('#searchInput');
  p.card = p.locator('wired-card');
  p.item = p.locator('wired-item');
  return p;
}

export function wiredComboLazyFragment(page: Page): WiredComboLazyFragment {
  const p: WiredComboLazyFragment = Object.create(page.locator('wired-combo-lazy'));

  p.container = p.locator('#container');
  p.searchInput = p.locator('#searchInput');
  p.card = p.locator('wired-card');
  p.item = p.locator('wired-item');
  return p;
}

export function wiredListboxFragment(page: Page) {
  const p: WiredListboxFragment = Object.create(page.locator('wired-listbox'));

  p.container = p.locator('#container');
  p.item = p.locator('wired-item');
  return p;
}
