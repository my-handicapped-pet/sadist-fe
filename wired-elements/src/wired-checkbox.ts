import {
  css,
  CSSResultArray,
  customElement,
  html,
  property, PropertyValues,
  query,
  TemplateResult
} from 'lit-element';
import { fire, line, Point, svgNode } from './wired-lib';
import { BaseCSS, WiredBase } from './wired-base';

@customElement('wired-checkbox')
export class WiredCheckbox extends WiredBase {
  @property({ type: Boolean }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property() private focused = false;

  @query('input') private input?: HTMLInputElement;

  private svgCheck?: SVGElement;

  static get styles(): CSSResultArray {
    return [
      BaseCSS,
      css`
        :host {
          display: inline-block;
          font-family: inherit;
        }

        :host([disabled]) {
          opacity: 0.6 !important;
          cursor: default;
          pointer-events: none;
        }

        :host([disabled]) svg {
          background: rgba(0, 0, 0, 0.07);
        }

        #container {
          display: flex;
          flex-direction: row;
          position: relative;
          user-select: none;
          min-height: 24px;
          cursor: pointer;
        }

        span {
          margin-left: 1.5ex;
          line-height: 24px;
        }

        input {
          opacity: 0;
        }

        path {
          stroke: var(--wired-checkbox-icon-color, currentColor);
          stroke-width: var(--wired-checkbox-default-swidth, 0.7);
        }

        g path {
          stroke-width: 2.5;
        }

        #container.focused {
          --wired-checkbox-default-swidth: 1.5;
        }
      `
    ];
  }

  render(): TemplateResult {
    return html`
      <label id="container" class="${this.focused ? 'focused' : ''}">
        <input type="checkbox" .checked="${this.checked}"
               ?disabled="${this.disabled}"
               @change="${this.onChange}"
               @focus="${() => this.focused = true}"
               @blur="${() => this.focused = false}">
        <span><slot></slot></span>
        <div id="overlay">
          <svg data-wired-shape="rectangle"></svg>
        </div>
      </label>
    `;
  }

  protected updated(changed?: PropertyValues) {
    super.updated(changed);
    this.refreshCheckVisibility();
  }

  protected getSize(): Point {
    return [24, 24];
  }

  protected renderWiredShapes() {
    super.renderWiredShapes();
    this.svgCheck = svgNode('g');
    this.svg!.appendChild(this.svgCheck);
    const size = this.getSize();
    line(this.svgCheck, size[0] * 0.3, size[1] * 0.4, size[0] * 0.5, size[1] * 0.7);
    line(this.svgCheck, size[0] * 0.5, size[1] * 0.7, size[0] + 5, -5);
  }

  focus() {
    if (this.input) {
      this.input.focus();
    } else {
      super.focus();
    }
  }

  private onChange() {
    this.checked = this.input!.checked;
    this.refreshCheckVisibility();
    fire(this, 'change', { checked: this.checked });
  }

  private refreshCheckVisibility() {
    if (this.svgCheck) {
      this.svgCheck.style.display = this.checked ? '' : 'none';
    }
  }
}