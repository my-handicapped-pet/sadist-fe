import { customElement, property } from 'lit-element';
import { hachureFill, rectangle } from './wired-lib'
import { WiredShape } from './wired-shape';

@customElement('wired-bar')
export class WiredBar extends WiredShape {

  /**
   * Direction of the value area
   */
  @property({ type: String }) direction?: '→' | '←' | '↓' | '↑';

  /**
   * Length of the value area
   */
  @property({ type: Number }) value: number = 0;

  /**
   * If a bar is clickable (selectable) on the whole area,
   * or just the filled one which represents the value.
   */
  @property({ type: String }) ['selectable-area']: 'all' | 'filled' = 'all';

  protected x0?: number;
  protected y0?: number;
  protected x1?: number;
  protected y1?: number;

  protected renderWiredShapes() {
    const rect = this.getBoundingClientRect();
    let x0 = 0;
    let x1 = rect.width;
    let y0 = 0;
    let y1 = rect.height;

    // Apply value
    switch (this.direction) {
      case '→':
        x1 = this.value;
        break;
      case '←':
        x0 = x1 - this.value;
        break;
      case '↓':
        y1 = this.value;
        break;
      case '↑':
        y0 = y1 - this.value;
        break;
    }

    const rectSvg = hachureFill([[x0, y0], [x0, y1], [x1, y1], [x1, y0]]);
    this.svg?.append(rectSvg);
    rectangle(rectSvg, x0, y0, x1 - x0, y1 - y0).id = 'border';
  }

  containsPoint(x: number, y: number): boolean {
    const x0 = this.x0;
    const x1 = this.x1;
    const y0 = this.y0;
    const y1 = this.y1;
    if (x0 !== undefined && x1 !== undefined && y0 !== undefined && y1 !== undefined) {
      const rect = this.getBoundingClientRect();
      const xLocal = x - rect.x;
      const yLocal = y - rect.y;
      return this['selectable-area'] === 'all' ?
          // all vertical area is selectable (bars in the histogram are only vertical so far)
          x0 <= xLocal && xLocal <= x1 :
          // only vertical area within the bar is selectable
          x0 <= xLocal && xLocal <= x1 && y0 <= yLocal && yLocal <= y1;
    }
    return false;
  }
}