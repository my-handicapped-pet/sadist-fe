import { css, CSSResultArray, customElement, html, property, PropertyValues, TemplateResult } from 'lit-element';
import { fire } from './wired-lib';
import { BaseCSS, WiredBase } from "./wired-base";

interface WiredListboxItem extends HTMLElement {
  value: string;
  selected: boolean;
}

interface ListboxValue {
  value: string;
  text: string;
}

@customElement('wired-listbox')
export class WiredListbox extends WiredBase {
  @property({ type: Boolean }) horizontal = false;

  @property() get value(): ListboxValue | undefined {
    return this.selectedValue;
  }

  @property({ type: Boolean }) multiselect = false;

  set value(value: ListboxValue | undefined) {
    this.select(value?.value, {});
    this.selectedValue = value;
    this.requestUpdate();
  }

  @property({ type: String }) get selected(): string {
    return this.selectedValue?.value || '';
  }

  set selected(selected: string | undefined) {
    this.select(selected, {});
    this.selectedValue = this.getListboxValue(this.selectedItem) ||
        ( selected ? { value: selected, text: '' } : undefined );
    this.requestUpdate();
  }

  private itemNodes: WiredListboxItem[] = [];
  private selectedItem?: WiredListboxItem;
  private selectedValue?: ListboxValue;
  private itemClickHandler = this.onItemClick.bind(this);

  static get styles(): CSSResultArray {
    return [
      BaseCSS,
      css`
        :host {
          display: inline-block;
          font-family: inherit;
          position: relative;
          padding: 5px;
          outline: none;
        }

        :host(:focus) path {
          stroke-width: 1.5;
        }

        ::slotted(wired-item) {
          display: block;
        }

        :host(.wired-horizontal) ::slotted(wired-item) {
          display: inline-block;
        }

        #item-container {
          height: inherit;
          max-height: inherit;
          overflow-y: auto;
        }
      `
    ];
  }

  render(): TemplateResult {
    return html`
      <div id="item-container">
        <slot id="slot" @slotchange="${(this.onSlotChanged)}"></slot>
      </div>
      <div id="overlay">
        <svg id="svg"></svg>
      </div>
    `;
  }

  firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties)
    this.setAttribute(WiredListbox.SHAPE_ATTR, 'rectangle');
    this.setAttribute('role', 'listbox');
    this.tabIndex = +((this.getAttribute('tabindex') || 0));
    this.addEventListener('click', this.itemClickHandler);
    this.addEventListener('keydown', (event) => {
      switch (event.keyCode) {
        case 37:
        case 38:
          event.preventDefault();
          this.selectPrevious(event);
          break;
        case 39:
        case 40:
          event.preventDefault();
          this.selectNext(event);
          break;
      }
    });
  }

  updated(_changed?: PropertyValues) {
    super.updated(_changed);
    if (this.horizontal) {
      this.classList.add('wired-horizontal');
    } else {
      this.classList.remove('wired-horizontal');
    }
  }

  private getItem(value: string | undefined = this.selected) {
    //first time look up item by "selected" attribute
    if (value) {
      return this.itemNodes.filter(node => node.value === value)[0];
    }
    return undefined;
  }

  private select(item: WiredListboxItem | string | undefined, p: {
    shiftKey?: boolean;
    ctrlKey?: boolean
  }): { selected: string[], unselected: string[] } {
    // if string, find an actual item
    if (typeof item == 'string') {
      item = this.getItem(item);
    }

    const selected: string[] = [];
    const unselected: string[] = [];

    if (p.ctrlKey && this.multiselect && item) {
      // change selected to the opposite
      item.selected = !item.selected;
      if (item.selected) {
        item.setAttribute('aria-selected', 'true');
        selected.push(item.value);
      } else {
        item.removeAttribute('aria-selected');
        unselected.push(item.value);
      }
      return { selected, unselected };
    }

    if (p.shiftKey && this.multiselect && item && this.selectedItem) {
      // select everything between this.selectedItem and item
      const i1 = this.itemNodes.indexOf(item);
      const i2 = this.itemNodes.indexOf(this.selectedItem);
      for (let i = Math.min(i1, i2); i <= Math.max(i1, i2); i++) {
        this.itemNodes[i].selected = true;
        this.itemNodes[i].setAttribute('aria-selected', 'true');
        selected.push(item.value);
      }
      // TODO unselect the interval previously selected with shift
      return { selected, unselected };
    }

    if (this.selectedItem) {
      this.selectedItem.selected = false;
      this.selectedItem.removeAttribute('aria-selected');
      unselected.push(this.selectedItem.value);
    }
    if (item) {
      item.selected = true;
      item.setAttribute('aria-selected', 'true');
      selected.push(item.value);
    }
    this.selectedItem = item;
    return { selected, unselected };
  }

  private fireSelected(p: { selected: string[]; unselected: string[] }) {
    this.selectedValue = this.getListboxValue(this.selectedItem);
    let detail: { selected: string | string[], unselected?: string[] };
    if (!this.multiselect) {
      detail = { selected: this.selected };
    } else {
      detail = { selected: p.selected, unselected: p.unselected };
    }
    fire(this, 'selected', detail);
  }

  private onItemClick(event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
    const { shiftKey, ctrlKey } = event;
    const { selected, unselected } = this.select(event.target as WiredListboxItem, { shiftKey, ctrlKey });
    this.fireSelected({ selected, unselected });
  }

  private selectPrevious(event: KeyboardEvent) {
    const item = this.selectedItem?.previousElementSibling ?
      this.selectedItem.previousElementSibling : this.itemNodes[this.itemNodes.length - 1];
    const { shiftKey, ctrlKey } = event;
    const { selected, unselected } = this.select(item as WiredListboxItem, { shiftKey, ctrlKey });
    this.fireSelected({ selected, unselected });
  }

  private selectNext(event: KeyboardEvent) {
    const item = this.selectedItem?.nextElementSibling ?
      this.selectedItem.nextElementSibling : this.itemNodes[0];
    const { shiftKey, ctrlKey } = event;
    const { selected, unselected } = this.select(item as WiredListboxItem, { shiftKey, ctrlKey });
    this.fireSelected({ selected, unselected });
  }

  private onSlotChanged() {
    this.itemNodes = [];
    this.selectedItem = undefined;
    const nodes = (this.shadowRoot!.getElementById('slot') as HTMLSlotElement).assignedNodes();
    if (nodes && nodes.length) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i] as WiredListboxItem;
        if (node.tagName === 'WIRED-ITEM') {
          node.setAttribute('role', 'option');
          this.itemNodes.push(node);
          if (node.value === this.selected) {
            this.select(node, {});
            this.selectedValue = this.getListboxValue(node);
          }
        }
      }
    }
    this.requestUpdate();
  }

  private getListboxValue(item: WiredListboxItem | undefined) {
    return item ? { value: item.value, text: item.textContent || '' } : undefined;
  }
}