import { css, CSSResult, html, property, PropertyValues } from 'lit-element';
import { WiredBase } from './wired-base';

export abstract class WiredShape extends WiredBase {

  @property({ type: Boolean, reflect: true }) selected?: boolean;

  static get styles(): CSSResult {
    return css`
      svg {
        stroke: var(--color, black);
        stroke-width: 1;
      }

      :host(.wired-shape-hovered) {
        cursor: pointer;
        z-index: 10; // it must be over the legend
      }

      :host(.wired-shape-hovered) svg, :host(.wired-shape-selected) svg {
        stroke-width: 3;
      }

      .label {
        position: absolute;
        display: none;
        left: 5px;
        top: 5px;
        z-index: 1;
        border: solid 1px #cdcdcd;
        border-radius: 3px;
        background: #292929;
        color: #fff;
      }

      :host(.wired-shape-hovered) .label {
        display: block;
      }

      #border {
        stroke: #505050;
        stroke-width: 1;
        fill: none;
      }

      :host(.wired-shape-selected) #border {
        stroke: black;
        stroke-width: 4;
      }
    `
  }

  protected render(): unknown {
    return html`
      <svg/>
      <div id="label" class="label">
        <slot id="slot"></slot>
      </div>
    `
  }

  updated(changed?: PropertyValues) {
    // skip update if it's caused by resize
    if (changed?.has('size')) {
      return;
    }

    super.updated(changed);
    if (changed?.has('selected')) {
      if (this.selected) {
        this.classList.add('wired-shape-selected');
      } else {
        this.classList.remove('wired-shape-selected');
      }
    }
  }

  /**
   * Hover element programmatically. This is needed because HTML element's
   * boundaries are not coincide with the actual graphical disposition.
   * @param hover true to hover, false to unhover
   */
  hover(hover: boolean) {
    const wasHover = this.classList.contains('wired-shape-hovered');
    if (wasHover != hover) {
      if (hover) {
        this.classList.add('wired-shape-hovered');
      } else {
        this.classList.remove('wired-shape-hovered');
      }
      // this.requestUpdate();
    }
  }

  /**
   * Check if this shape contains a point with  the given coordinates
   * @param x x coordinate relative to the graph's top-left corner
   * @param y y coordinate relative to the graph's top-left corner
   * @return if this data point of the graph contains (x, y) point
   */
  abstract containsPoint(x: number, y: number): boolean;
}