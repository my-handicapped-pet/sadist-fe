import { css, CSSResult, customElement, html, property, PropertyValues, query, TemplateResult } from 'lit-element';
import { fire } from './wired-lib';
import { WiredBase } from "./wired-base";
import { WiredCard } from './wired-card';
import { WiredItem } from './wired-item';

interface ComboValue {
  value: string;
  text: string;
}

// todo move this to a separate lib and share with wired-combo
declare global {
  interface String {
    replaceAccent(): string;
  }
}

const m = {
  "À": "A",
  "Á": "A",
  "Â": "A",
  "Ã": "A",
  "Ä": "A",
  "Å": "A",
  "Æ": "AE",
  "Ç": "C",
  "È": "E",
  "É": "E",
  "Ê": "E",
  "Ë": "E",
  "Ì": "I",
  "Í": "I",
  "Î": "I",
  "Ï": "I",
  "Ð": "D",
  "Ñ": "N",
  "Ò": "O",
  "Ó": "O",
  "Ô": "O",
  "Õ": "O",
  "Ö": "O",
  "Ø": "O",
  "Ù": "U",
  "Ú": "U",
  "Û": "U",
  "Ü": "U",
  "Ý": "Y",
  "Þ": "p",
  "ß": "s",
  "à": "a",
  "á": "a",
  "â": "a",
  "ã": "a",
  "ä": "a",
  "å": "a",
  "æ": "ae",
  "ç": "c",
  "è": "e",
  "é": "e",
  "ê": "e",
  "ë": "e",
  "ì": "i",
  "í": "i",
  "î": "i",
  "ï": "i",
  "ð": "d",
  "ñ": "n",
  "ò": "o",
  "ó": "o",
  "ô": "o",
  "õ": "o",
  "ö": "o",
  "ø": "o",
  "ù": "u",
  "ú": "u",
  "û": "u",
  "ü": "u",
  "ý": "y",
  "þ": "p",
  "ÿ": "y",
  "Œ": "OE",
  "œ": "oe",
  "Š": "S",
  "š": "s",
  "Ÿ": "Y",
  "ƒ": "f"
}
const re = new RegExp(`[${Object.keys(m).join('')}]`, 'g');
String.prototype.replaceAccent = function () {
  // @ts-ignore
  return this.replace(re, function (match: string, group: string) {
    // @ts-ignore
    return m[match];
  })
}

@customElement('wired-combo-lazy')
export class WiredComboLazy extends WiredBase {
  @property({ type: Array }) values: ComboValue[] = [];
  @property() get value(): ComboValue | undefined {
    return this.selectedValue;
  }

  set value(value: ComboValue | undefined) {
    this.select(value?.value);
    this.selectedValue = value;
    this.requestUpdate();
  }

  @property({ type: String }) get selected(): string {
    return this.selectedValue?.value || '';
  }

  set selected(selected: string | undefined) {
    this.select(selected);
    this.selectedValue = this.getComboValue(this.selectedItem) ||
        ( selected ? { value: selected, text: '' } : undefined );
    this.requestUpdate();
  }

  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: String }) placeholder = '';

  @query('#card') private card?: WiredCard;
  private cardShowing = false;
  private itemNodes: WiredItem[] = [];
  private selectedItem?: WiredItem;
  private selectedValue?: ComboValue;

  // maximum number of items displayed at once
  private depth = 10;

  static get styles(): CSSResult {
    return css`
    :host {
      width: 140px;
      display: inline-block;
      font-family: inherit;
      position: relative;
      outline: none;
      opacity: 0;
    }
  
    :host(.wired-disabled) {
      opacity: 0.5 !important;
      cursor: default;
      pointer-events: none;
      background: rgba(0, 0, 0, 0.02);
    }
    
    :host(.wired-rendered) {
      opacity: 1;
    }

    :host(:focus-within) path {
      stroke-width: 1.5;
    }
  
    #container {
      white-space: nowrap;
      position: relative;
    }
  
    .inline {
      display: inline-block;
      vertical-align: top
    }
  
    #textPanel {
      width: calc(100% - 50px);
      min-height: 18px;
      padding: 8px;
    }
  
    #dropPanel {
      width: 34px;
      cursor: pointer;
    }
  
    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
    }
  
    svg {
      display: block;
    }
  
    path {
      stroke: currentColor;
      stroke-width: 0.7;
      fill: transparent;
    }
  
    #card {
      width: calc(100% - 20px);
      position: absolute;
      background: var(--wired-combo-popup-bg, white);
      z-index: 100;
      box-shadow: 1px 5px 15px -6px rgba(0, 0, 0, 0.8);
    }

    #itemContainer {
      max-height: 200px;
      overflow-y: scroll;
    }

    ::slotted(wired-item) {
      display: block;
    }
    
    #searchInput {
      width: calc(100% - 50px);
      display: none;
      outline: none;
      position: absolute;
      top: 0;
      left: 0;
      border: none;
      padding: 8px;
      font-size: inherit;
      font-family: inherit;
      /* for debug */
      /*background-color: gray;*/
    }
    `;
  }

  render(): TemplateResult {
    return html`
    <input id="searchInput" @keyup="${this.onSearch}">
    <div id="container" @click="${this.onCombo}">
      <div id="textPanel" class="inline" data-wired-shape="rectangle">
        <div id="text">
          <span>${this.value && this.value.text || this.placeholder}</span>
        </div>
      </div><!-- to remove whitespace
      --><div id="dropPanel" class="inline" data-wired-shape="rectangle;arrow-down:offset-top=5,offset-left=8,offset-bottom=5,offset-right=8"></div>
      <div class="overlay">
        <svg id="svg"></svg>
      </div>
    </div>
    <wired-card id="card" tabindex="-1" role="listbox" @mousedown="${this.onItemClick}" @touchstart="${this.onItemClick}"
      style="display: none;">
      <div id="itemContainer">
        <!-- place for items to append in run-time -->
      </div>
    </wired-card>
    `;
  }

  focus(options?: FocusOptions) {
    super.focus(options);
    this.setCardShowing(true);
  }

  firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    this.setAttribute('role', 'combobox');
    this.setAttribute('aria-haspopup', 'listbox');

    this.addEventListener('blur', () => {
      if (this.cardShowing) {
        this.setCardShowing(false);
      }
    });
    this.addEventListener('keydown', (event) => {
      // here we break (fix?) legacy behaviour:
      // arrow up,down only select item in the list but do not actually fire
      // "selected" event, <Enter> fires selected, <Esc> selects last selected value
      switch (event.keyCode) {
        case 38:
          event.preventDefault();
          if (!this.cardShowing) {
            this.setCardShowing(true);
          }
          this.selectPrevious();
          break;
        case 40:
          event.preventDefault();
          if (!this.cardShowing) {
            this.setCardShowing(true);
          }
          this.selectNext();
          break;
        case 27:
          event.preventDefault();
          if (this.cardShowing) {
            this.select(this.selected);
            this.setCardShowing(false);
          }
          break;
        case 13:
          event.preventDefault();
          if (this.cardShowing) {
            this.fireSelected();
            this.setCardShowing(false);
          } else {
            this.setCardShowing(true);
          }
          break;
        case 32:
          if (!this.cardShowing) {
            event.preventDefault();
            this.setCardShowing(true);
          }
          break;
      }
    });
  }

  protected updated(changed?: PropertyValues) {
    if (changed?.has('disabled')) {
      this.refreshDisabledState();
    }
    const textBounds = this.shadowRoot!.getElementById('textPanel')!.getBoundingClientRect();
    this.shadowRoot!.getElementById('dropPanel')!.style.minHeight = textBounds.height + 'px';
    super.updated(changed);

    // aria
    this.setAttribute('aria-expanded', `${this.cardShowing}`);
    if (changed?.has('values')) {
      this.selectedValue = this.values.find(value1 => value1.value === this.selected);
      this.updateItemNodes(this.values.slice(0, this.depth));
    }
    if (changed?.has('selected') && !this.selected) {
      (this.shadowRoot!.getElementById('searchInput') as HTMLInputElement).value = '';
    }
  }

  private refreshDisabledState() {
    if (this.disabled) {
      this.classList.add('wired-disabled');
    } else {
      this.classList.remove('wired-disabled');
    }
    this.tabIndex = this.disabled ? -1 : +(this.getAttribute('tabindex') || 0);
  }

  private getItem(value: string | undefined = this.selected) {
    if (!this.itemNodes || !value) {
      return undefined;
    }

    return this.itemNodes.find(node => {
      return node.tagName === "WIRED-ITEM" && value === node.value;
    });
  }

  private setCardShowing(showing: boolean) {
    if (!this.card) {
      return;
    }
    this.cardShowing = showing;
    this.card.style.display = showing ? '' : 'none';
    // show search input
    const searchInput = this.shadowRoot!.getElementById('searchInput') as HTMLInputElement;
    searchInput.style.display = showing ? 'block' : 'none';
    // and immediately activate
    if (showing) {
      searchInput.focus();
      if (searchInput.value) {
        searchInput.select();
      }
    } else {
      // restore focus on the host
      super.focus();
    }
    // only show text when drop-down isn't open
    const text = this.shadowRoot!.getElementById('text') as HTMLElement;
    text.style.display = showing ? 'none': '';
    if (showing) {
      setTimeout(() => {
        this.card!.requestUpdate();
        this.itemNodes.forEach((item) => {
          item.requestUpdate();
        });
      }, 10);
    }
    this.setAttribute('aria-expanded', `${this.cardShowing}`);
  }

  private select(item: WiredItem | string | undefined) {
    // if not itemNodes, component has not yet initialized.
    // thus make the method safe, during @slotchange item will be selected in UI
    if (!this.itemNodes.length) {
      return;
    }

    // if string, find an actual item
    if (typeof item == 'string') {
      item = this.getItem(item);
    }

    // update displaying item
    if (this.selectedItem) {
      this.selectedItem.selected = false;
      this.selectedItem.removeAttribute('aria-selected');
    }
    if (item) {
      item.selected = true;
      item.setAttribute('aria-selected', 'true');

      // scroll to the item if it's out of visible area
      const area = this.shadowRoot?.getElementById('itemContainer') as HTMLElement;
      const item0Offset = this.itemNodes[0].offsetTop;
      if (area.scrollTop + area.offsetHeight < item.offsetTop - item0Offset
        || item.offsetTop - item0Offset < area.scrollTop) {
        area.scrollTo({ top: item.offsetTop - item0Offset });
      }
    }

    // update selected item for internal usage,
    // but not "selected" and "value" attributes,
    // since for consistence they are only updated
    // when "selected" event is fired
    this.selectedItem = item;
  }

  private onItemClick(event: CustomEvent) {
    event.stopPropagation();
    this.select(event.target as WiredItem);
    this.fireSelected();
    setTimeout(() => {
      this.setCardShowing(false);
    });
  }

  private fireSelected() {
    this.selectedValue = this.getComboValue(this.selectedItem);
    this.requestUpdate();
    fire(this, 'selected', { selected: this.selected });
  }

  private selectPrevious() {
    if (!this.itemNodes.length) {
      return;
    }
    const item = this.selectedItem?.previousElementSibling as WiredItem
      || this.itemNodes[this.itemNodes.length - 1];
    this.select(item);

    const searchInput = this.shadowRoot!.getElementById('searchInput') as HTMLInputElement;
    searchInput.value = item.textContent || '';
  }

  private selectNext() {
    if (!this.itemNodes.length) {
      return;
    }
    let item = this.selectedItem?.nextElementSibling as WiredItem
      || this.itemNodes[0];
    this.select(item);

    const searchInput = this.shadowRoot!.getElementById('searchInput') as HTMLInputElement;
    searchInput.value = item.textContent || '';
  }

  private onSearch(event: KeyboardEvent) {
    if ([38, 40].indexOf(event.keyCode) !== -1) {
      return;
    }

    const searchInput = this.shadowRoot!.getElementById('searchInput') as HTMLInputElement;
    const searchValue = searchInput.value.toLocaleLowerCase().replaceAccent();

    // 1) values starting with a search term
    let values = this.values.filter(value => {
      return value.text?.toLocaleLowerCase()?.replaceAccent()?.startsWith(searchValue)
    }).slice(0, this.depth);
    if (values.length) {
      this.updateItemNodes(values);
      this.select(this.itemNodes[0]);
      return;
    }

    // 2) items containing a search term
    values = this.values.filter(value => {
      return value.text && value.text.toLocaleLowerCase().replaceAccent().indexOf(searchValue) !== -1
    }).slice(0, this.depth);
    this.updateItemNodes(values);
    this.select(this.itemNodes[0]);
  }

  private onCombo(event: Event) {
    event.stopPropagation();
    this.setCardShowing(!this.cardShowing);
  }

  private updateItemNodes(values: ComboValue[]) {
    const itemContainer = this.shadowRoot!.getElementById('itemContainer')!;
    while (itemContainer.hasChildNodes()) {
      itemContainer.removeChild(itemContainer.lastChild!);
    }
    this.itemNodes = [];
    for (const value of values) {
      const item = new WiredItem();
      item.value = value.value;
      item.textContent = value.text;
      item.style.width = '100%';
      itemContainer.appendChild(item);
      this.itemNodes.push(item);
    }

    this.requestUpdate();
    if (this.cardShowing) {
      (this.shadowRoot!.getElementById('card') as WiredCard).requestUpdate();
    }
  }

  private getComboValue(node: WiredItem | undefined) {
    return node ? { value: node.value, text: node.textContent || '' } : undefined;
  }
}
