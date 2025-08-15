import { css, LitElement, PropertyValues, query } from "lit-element";
import {
  debugLog,
  ellipse,
  hachureFill,
  Point,
  polygon,
  rectangle,
  renderElevation
} from "./wired-lib";

export const BaseCSS = css`
:host {
  opacity: 0;
}
:host(.wired-rendered) {
  opacity: 1;
}
#overlay {
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
.hidden {
  display: none !important;
}
`;

export abstract class WiredBase extends LitElement {
  @query('svg') protected svg?: SVGSVGElement;
  protected lastSize: Point = [0, 0];

  static SHAPE_ATTR = 'data-wired-shape';

  static resizeobserver = new ResizeObserver((entries, _observer) => {
    for (let entry of entries) {
      if (entry.target instanceof WiredBase) {
        const changed = new Map();
        changed.set('size', entry.target.lastSize);
        entry.target.updated(changed);
      }
    }
  });

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    WiredBase.resizeobserver.observe(this);
  }

  protected updated(changed?: PropertyValues) {
    if (this.svg) {
      // condition to render: size is changed
      const point = this.getSize();
      if (!this.shouldUpdateWiredShapes(point, changed)) {
        return;
      }
      // set size of svg to size of this
      this.svg.setAttribute('width', `${point[0]}`);
      this.svg.setAttribute('height', `${point[1]}`);
      // remove old shapes
      this.removeWiredShapes();
      // draw new shapes
      this.renderWiredShapes();
      this.lastSize = point;
      this.classList.add('wired-rendered');
    }
  }

  protected performUpdate(): void | Promise<unknown> {
    // see https://github.com/lit/lit-element/issues/953 for error handling approach
    try {
      super.performUpdate();
      this.dispatchEvent(new CustomEvent('update'));
    } catch (err) {
      this.dispatchEvent(new CustomEvent('error', { detail: err }));
    }
  }

  protected getSize(): Point {
    // consider elevation
    let elev = 0;
    if (this.hasAttribute(WiredBase.SHAPE_ATTR) && /elevation=\d+/.test(this.getAttribute(WiredBase.SHAPE_ATTR)!)) {
      elev = Math.min(parseInt(/elevation=(\d+)/.exec(this.getAttribute(WiredBase.SHAPE_ATTR)!)![1]), 5);
    }
    let rect = this.getBoundingClientRect();
    let width = rect.width + (elev ? elev - 1 : 0);
    let height = rect.height + (elev ? elev - 1 : 0);
    return [width,height];
  }

  protected shouldUpdateWiredShapes(size: Point, _changed: PropertyValues | undefined): boolean | undefined {
    return size[0] !== this.lastSize[0] || size[1] !== this.lastSize[1];
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    WiredBase.resizeobserver.unobserve(this);
  }

  protected removeWiredShapes() {
    while (this.svg!.hasChildNodes()) {
      this.svg!.removeChild(this.svg!.lastChild!);
    }
  }

  /**
   * Render wired shapes, by the attributes 'data-wired-shape'
   * of the nested elements
   *
   * Syntax of `data-wired-shape` attribute:
   *
   * wired-shape  ::= single-shape[;single-shape;...]
   * single-shape ::= shape[:k=v,k=v,...]
   * shape        ::= 'rectangle'|'ellipse'|'arrow-down'|'arrow-up'
   * k            ::= 'offset'|'offset-top'|'offset-left'|'offset-bottom'|'offset-right'|'fill'|
   *                  'border'|'elevation'|'class'
   * v            ::= number|string
   */
  protected renderWiredShapes() {
    // implying svg is absolutely positioned at 0,0
    // hence we'll calculate positions of the shapes drawn as position of element's rect
    // relative to this rect

    const anchor = this.getBoundingClientRect();
    this.renderWiredShapesForElementAndChildren(this, anchor.x, anchor.y);
  }

  private renderWiredShapesForElementAndChildren(element: HTMLElement, anchorX: number, anchorY: number) {
    // render element
    if (element.hasAttribute(WiredBase.SHAPE_ATTR)) {
      const attribute = element.getAttribute(WiredBase.SHAPE_ATTR)!;
      const drawSingleShape = (singleShape: string) => {
        const arr = singleShape.split(':');
        const shape = arr[0];
        const properties: any = {};
        if (arr.length > 1) {
          arr[1].split(',').forEach(p => {
            const parr = p.split('=');
            properties[parr[0]] = parr.length > 1 ? parr[1] : true;
          })
        }
        // calculate element's rectangle
        const rect = element.getBoundingClientRect();
        let x0 = rect.left - anchorX, y0 = rect.top - anchorY, x1 = x0 + rect.width, y1 = y0 + rect.height;
        // consider offsets
        if (properties.offset) {
          properties["offset-top"] ||= properties.offset;
          properties["offset-left"] ||= properties.offset;
          properties["offset-bottom"] ||= properties.offset;
          properties["offset-right"] ||= properties.offset;
        }
        if (properties["offset-top"]) {
          y0 += parseInt(properties["offset-top"]);
        }
        if (properties["offset-left"]) {
          x0 += parseInt(properties["offset-left"]);
        }
        if (properties["offset-bottom"]) {
          y1 -= parseInt(properties["offset-bottom"]);
        }
        if (properties["offset-right"]) {
          x1 -= parseInt(properties["offset-right"]);
        }
        let svg: SVGElement | undefined;  // drawn shape
        debugLog(`${shape}(${x0}, ${y0}, ${x1}, ${y1})`);
        let fillStyle, fillColor;
        if (properties.fill) {
          for (let p of properties.fill.split(' ')) {
            if (p === 'hachure') {
              fillStyle = p;
            } else {
              fillColor = p;
            }
          }
        }
        switch (shape) {
          case "rectangle":
            // inner area
            switch (fillStyle) {
              case "hachure":
                svg = hachureFill([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
                if (fillColor) {
                  svg.style.stroke = fillColor;
                }
                this.svg?.appendChild(svg);
                break;
            }
            if (svg && properties.class) {
              svg.classList.add(properties.class);
            }
            // border
            switch (properties.border) {
              case "none":
                break;
              default:
                svg = rectangle(this.svg!, x0, y0, x1 - x0, y1 - y0);
                if (properties.border) {
                  svg.style.stroke = properties.border;
                }
                break;
            }
            // elevation
            let elev = properties.elevation ? Math.min(parseInt(properties.elevation), 5) : 0;
            if (elev > 1) {
              renderElevation(this.svg!, x0, y0, x1, y1, elev);
            }
            break;
          case "ellipse":
            svg = ellipse(this.svg!, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0);
            break;
          case "arrow-down":
            svg = polygon(this.svg!, [[x0, y0], [x1, y0], [(x0 + x1) / 2, y1]]);
            break;
          case "arrow-up":
            svg = polygon(this.svg!, [[x0, y1], [x1, y1], [(x0 + x1 / 2), y0]]);
            break;
        }
        if (svg && fillColor && fillStyle !== "hachure") {
          svg.style.fill = fillColor;
        }
      }
      for (let singleShape of attribute.split(';')) {
        drawSingleShape(singleShape);
      }
    }

    // render children
    (element.shadowRoot ? element.shadowRoot.childNodes : element.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        this.renderWiredShapesForElementAndChildren(<HTMLElement>node, anchorX, anchorY);
      }
    });
  }
}
