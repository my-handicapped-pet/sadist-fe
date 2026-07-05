/**
 * All custom elements from packages will be here.
 * (inspired by {@link https://coryrylan.com/blog/how-to-use-web-components-with-typescript-and-react}).
 */
import { HTMLProps } from "react";
import "/wired-elements/lib/wired-elements";
import {
  WiredDivider,
  WiredSpinner,
  WiredItem,
  WiredListbox,
  WiredDialog,
  WiredCard,
  WiredButton,
  WiredCombo,
  WiredRadio,
  WiredInput,
  WiredSearchInput,
  WiredSlider,
  WiredCheckbox,
  WiredComboLazy,
  WiredBar,
  WiredMarker,
  WiredHistogram,
  WiredGlobe,
  WiredDualSlider,
  WiredTabs,
  WiredTab
} from '/wired-elements/lib/wired-elements';

type CustomElement<T, K extends string = never> = Partial<Omit<T, keyof HTMLElement> & Omit<HTMLProps<T>, keyof Omit<T, keyof HTMLElement>>> &
    { [k in `on${'update' | 'error' | K}`]?: (e: CustomEvent) => void };

declare global {
  namespace React.JSX {
    interface IntrinsicElements {
      ['wired-divider']: CustomElement<WiredDivider>;
      ['wired-spinner']: CustomElement<WiredSpinner>;
      ['wired-item']: CustomElement<WiredItem>;
      ['wired-listbox']: CustomElement<WiredListbox, 'selected'>;
      ['wired-dialog']: CustomElement<WiredDialog>;
      ['wired-card']: CustomElement<WiredCard>;
      ['wired-button']: CustomElement<WiredButton>;
      ['wired-combo']: CustomElement<WiredCombo, 'selected'>;
      ['wired-radio']: CustomElement<WiredRadio, 'change'>;
      ['wired-input']: CustomElement<WiredInput, 'change' | 'input'>;
      ['wired-search-input']: CustomElement<WiredSearchInput, 'change' | 'input' | 'close'>;
      ['wired-slider']: CustomElement<WiredSlider, 'change' | 'input'>;
      ['wired-dual-slider']: CustomElement<WiredDualSlider, 'change' | 'input'>;
      ['wired-checkbox']: CustomElement<WiredCheckbox, 'change'>;
      ['wired-combo-lazy']: CustomElement<WiredComboLazy, 'selected'>;
      ['wired-tab']: CustomElement<WiredTab>;
      ['wired-tabs']: CustomElement<WiredTabs>;
      ['wired-bar']: CustomElement<WiredBar>;
      ['wired-marker']: CustomElement<WiredMarker>;
      ['wired-histogram']: CustomElement<WiredHistogram, 'selected'>;
      ['wired-globe']: CustomElement<WiredGlobe, 'selected'>;
    }
  }
}
