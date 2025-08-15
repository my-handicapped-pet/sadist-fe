import { customElement, CSSResult, css, html, property } from 'lit-element';
import { WiredBase } from './wired-base';

@customElement('wired-legend')
export class WiredLegend extends WiredBase {
  @property({ type: Object, reflect: false })
  legend: { name: string; style?: { [p: string]: string; }; }[] = [];

  static get styles(): CSSResult {
    return css`
      #container {
        display: block;
        position: relative;
        background-color: #cecece;
        margin: 5px;
        padding: 5px;
      }

      #overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }

      .line {
        width: 100%;
      }

      .marker {
        display: inline-block;
        width: 20px;
        height: 20px;
        margin-right: 5px;
      }
    `;
  }

  protected render() {
    return html`
      <div id="container">
        <div id="overlay">
          <svg/>
        </div>
        ${this.legend.map(i => html`
          <div class="line">
            <div class="marker" data-wired-shape="rectangle:fill=hachure ${i.style?.color},border=#505050"></div>
            ${i.name}
          </div>
        `)}
      </div>
    `;
  }
}