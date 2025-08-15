import {
  css,
  CSSResultArray,
  customElement,
  html,
  property,
  PropertyValues,
  query,
  TemplateResult
} from 'lit-element';
import { BaseCSS, WiredBase } from './wired-base';
import { WiredSlider } from './wired-slider';
import { fire, line, Point } from './wired-lib';

@customElement('wired-dual-slider')
export class WiredDualSlider extends WiredBase {
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Number }) step = 1;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) greyed = false;
  @property({ type: Boolean }) ['label-enabled'] = false;
  @property({ type: String }) ['label-format'] = 'number';

  @query('#slider-min') private sliderMin?: WiredSlider;
  @query('#slider-max') private sliderMax?: WiredSlider;
  private pendingValueMin?: number;
  private pendingValueMax?: number;

  static get styles(): CSSResultArray {
    return [
      BaseCSS,
      css`
          :host {
              display: flex;
              position: relative;
              width: 200px;
          }

          #slider-min, #slider-max {
              pointer-events: none;
              position: absolute;
              width: 100%;
          }

          #slider-min {
              --wired-slider-bar-color: var(--wired-slider-bar-color);
              --wired-slider-knob-color: var(--wired-slider-left-knob-color);
          }

          #slider-max {
              --wired-slider-bar-color: var(--wired-slider-bar-color);
              --wired-slider-knob-color: var(--wired-slider-right-knob-color);
          }

          .value-bar {
              stroke: var(--wired-slider-value-bar-color, rgb(24, 37, 62));
              stroke-width: var(--wired-slider-value-bar-width, 3px);
          }
      `
    ];
  }

  get value(): { min: number, max: number } {
    return {
      min: this.sliderMin?.value || this.min,
      max: this.sliderMax?.value || this.max
    };
  }

  set value(value: { min: number, max: number }) {
    if (this.sliderMin) {
      this.sliderMin.value = value.min;
    } else {
      this.pendingValueMin = value.min;
    }
    if (this.sliderMax) {
      this.sliderMax.value = value.max;
    } else {
      this.pendingValueMax = value.max;
    }
  }

  protected render(): TemplateResult {
    return html`
      <wired-slider
        id="slider-min"
        min="${this.min}"
        max="${this.max}"
        step="${this.step}"
        ?disabled="${this.disabled}"
        ?greyed="${this.greyed}"
        ?label-enabled="${this['label-enabled']}"
        label-format="${this['label-format']}"
        label-orientation="left"
        @input="${this.onInputMin}"
        @change=${this.onChangeMin}
      ></wired-slider>
      <wired-slider
        id="slider-max"
        min="${this.min}"
        max="${this.max}"
        step="${this.step}"
        ?disabled="${this.disabled}"
        ?greyed="${this.greyed}"
        ?label-enabled="${this['label-enabled']}"
        label-format="${this['label-format']}"
        label-orientation="right"
        @input="${this.onInputMax}"
        @change="${this.onChangeMax}"
      ></wired-slider>
      <div id="overlay">
        <svg></svg>
      </div>
    `;
  }

  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    this.value = {
      min: this.pendingValueMin || this.min,
      max: this.pendingValueMax || this.max,
    };
    delete this.pendingValueMin;
    delete this.pendingValueMax;
  }

  protected updated(changed?: PropertyValues) {
    super.updated(changed);
    // since underlying `wired-slider`s are absolutely positioned,
    // have to set height by the script; todo check if it will work with resize
    this.style.height = `${this.sliderMin?.getBoundingClientRect().height}px`;
  }

  protected renderWiredShapes() {
    super.renderWiredShapes();
    this.updateValueBar();
  }

  protected getSize(): Point {
    const rect = this.sliderMin?.getBoundingClientRect();
    return [rect?.width || 0, rect?.height || 0];
  }

  protected onInputMin(event: CustomEvent) {
    event.stopPropagation();
    if (this.sliderMin && this.sliderMax &&
        this.sliderMin.value > this.sliderMax.value) {
      this.sliderMin.value = this.sliderMax.value;
    }
    this.updateValueBar();
    fire(this, 'input', { value: this.value });
  }

  protected onInputMax(event: CustomEvent) {
    event.stopPropagation();
    if (this.sliderMin && this.sliderMax &&
        this.sliderMax.value < this.sliderMin.value) {
      this.sliderMax.value = this.sliderMin.value;
    }
    this.updateValueBar();
    fire(this, 'input', { value: this.value });
  }

  protected onChangeMin(event: CustomEvent) {
    event.stopPropagation();
    fire(this, 'change', { value: this.value });
  }

  protected onChangeMax(event: CustomEvent) {
    event.stopPropagation();
    fire(this, 'change', { value: this.value });
  }

  private valueBar?: SVGElement;

  private updateValueBar() {
    if (this.valueBar && this.valueBar.parentNode == this.svg) {
      this.svg?.removeChild(this.valueBar);
      this.valueBar = undefined;
    }
    if (this.sliderMin && this.sliderMax && this.svg) {
      const size = this.getSize();
      const midY = Math.round(size[1] / 2);
      const startX = Math.round(( this.sliderMin.value - this.min ) * ( size[0] - 20 ) / ( this.max - this.min )) + 10;
      const endX = Math.round(( this.sliderMax.value - this.min ) * ( size[0] - 20 ) / ( this.max - this.min )) + 10;
      this.valueBar = line(this.svg, startX, midY, endX, midY);
      this.valueBar.classList.add('value-bar');
    }
  }
}