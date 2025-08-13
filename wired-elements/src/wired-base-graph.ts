import {
  css,
  CSSResult,
  html,
  property,
  PropertyValues,
  query,
  TemplateResult
} from 'lit-element';
import { ScaleContinuousNumeric } from 'd3-scale';
import { BaseType, select, Selection } from 'd3-selection';
import { Axis } from 'd3-axis';
import { fire, formatNumber, ncolor, svgNode } from './wired-lib';
import { WiredBase } from './wired-base';
import { WiredShape } from './wired-shape';
import { WiredLegend } from './wired-legend';

type Scale = 'auto' | number | [number, number];

/**
 * Entry of the data. Each entry has a unique group id (i.e.
 * category or range), and can map to one or more data points
 */
export interface DataEntry {
  id: any;
  values: {
    [name: string]: number;
  }
  label?: string;
  selected?: boolean;
}

/**
 * A data poinţ corresponds to a single graph element such as
 * a bar or a pie
 */
export interface DataPoint {
  ['data-id']: any;
  ['data-name']: string;
  ['data-value']: number;
  ['data-label']?: string;
  selected?: boolean;
  scale: ScaleContinuousNumeric<number, number>;
}

/**
 * Definition of an axis in the graph. Wraps native d3 axis and adds
 * any needed additional information
 */
export interface AxisDefinition {
  axis: Axis<any>;
  alignment: 'left' | 'bottom' | 'right' | 'top';
  offset?: number;
}

/**
 * A map of the basket (scale index) to a numeric range
 */
type Basketory = {
  [basket: string]: {
    range: [number, number];
  }
};

export abstract class WiredBaseGraph extends WiredBase {

  /**
   * Width / height proportion of the graph
   */
  @property({ type: Number }) proportion: number = 1.62;

  /**
   * Scale of the graph data points;
   *
   * can be a number (upper bound of the data points' values),
   * interval (lower and upper bounds of the data points),
   * 'auto' in which case it's calculated by the provided data,
   * or a map of data point's names to either number, 'auto',
   * or '$<name>', in which case it's calculated separately
   * for a data point series with a certain name, or refer to
   * a scale of the other data point series
   */
  @property({ type: Object }) scale: { [x: string]: Scale | `$${string}` } | Scale = 'auto';

  /**
   * Data
   */
  @property({ type: Array, reflect: false }) data: DataEntry[] | undefined;

  /**
   * A legend element which can also contain controls to manage or
   * customize the graph
   * @protected
   */
  @query("#legend") protected legendElement?: WiredLegend;

  /**
   * A graph's legend, which map data series names to all meta-info
   * about this series such as scale and styling.
   * @protected
   */
  protected legend: { name: string; style?: { [p: string]: string }; }[] = [];

  /**
   * Map of data series names to d3 scale
   * @protected
   */
  protected scaleByName: { [name: string]: ScaleContinuousNumeric<number, number> } = {};

  /**
   * A pointed i.e. hovered data point
   * @protected
   */
  protected pointed?: [WiredShape, unknown | DataPoint];

  /**
   * Rect which contains the graph itself, without axes
   * @protected
   */
  protected _effectiveRect?: DOMRect;

  static get styles(): CSSResult {
    return css`
      :host {
        display: inline-block;
        position: relative;
        width: 100%;
        height: auto;
      }

      #container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }

      #overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }

      #legend {
        display: block;
        position: inherit;
        float: right;
        z-index: 2;
        opacity: .75;
      }
      
      .axis {
        font-size: 10px;
        font-family: sans-serif;
      }
      
      .axis.left {
        text-anchor: end;
      }
    `;
  }

  render(): TemplateResult {
    return html`
      <wired-legend id="legend"></wired-legend>
      <div id="overlay">
        <svg/>
      </div>
      <div id="container">
      </div>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const rect = this.getBoundingClientRect();
    if (rect.height === 0) {
      const h = Math.ceil(rect.width / this.proportion);
      this.style.height = `${h}px`;
      // this.requestUpdate();
    }
  }

  protected updated(changed?: PropertyValues) {
    const size = this.lastSize;

    super.updated(changed);
    const newSize = this.getSize();
    if (
        // data has changed
        changed?.has('data')
        // or size has changed
        ||
        size[0] !== newSize[0] || size[1] !== newSize[1]
    ) {
      // prepare for posing data
      this.prePoseData();

      // re-pose data
      this.poseData();

      // post pose data
      this.postPoseData();
    }
  }

  /**
   * Select graph's root (the node which all data points attached to)
   */
  selectRoot(): Selection<any, unknown, HTMLElement, any> {
    // @ts-ignore
    return select(this.shadowRoot).select('#container');
  }

  /**
   * Read-only property which maps data entries to the flat array of data points.
   *
   * **warning!!!**
   * Make sure {@link WiredBaseGraph.prePoseData} is called before - its
   * needed to correctly initialize scales.
   */
  get datapoints(): DataPoint[] | undefined {
    // map data entries to data points
    return this.data
        ?.map((entry: DataEntry): DataPoint[] => {
          const id = entry.id;
          const label = entry.label;
          const selected = entry.selected;
          return Object.entries(entry.values).map(([name, value]): DataPoint => ( {
            'data-id': id,
            'data-name': name,
            'data-value': value,
            'data-label': label,
            selected,
            scale: this.scaleByName[name],
          } ));
        })
        .reduce((l, r) => l.concat(r));
  }

  /**
   * Safely get effective rect, fallback to bounding client rect
   * if effective rect isn't yet set
   */
  get effectiveRect(): DOMRect {
    return this._effectiveRect || this.getBoundingClientRect();
  }

  /**
   * Set effective rect
   * @param rect
   */
  set effectiveRect(rect: DOMRect) {
    this._effectiveRect = rect;
  }

  /**
   * Do all preparations needed before pose data.
   * This includes
   *  - initialize scales
   *  - initialize legend
   *  - draw axes
   *  - ........
   * @protected
   */
  protected prePoseData() {
    // First, define effective area as a whole component area,
    // define scales and draw axes correspondingly
    this.effectiveRect = this.getBoundingClientRect();
    this.initLegend();
    this.initScale();
    this.removeAxes();
    const newEffectiveRect = this.poseAxes();

    if (
        newEffectiveRect.x !== this.effectiveRect.x ||
        newEffectiveRect.y !== this.effectiveRect.y ||
        newEffectiveRect.width !== this.effectiveRect.width ||
        newEffectiveRect.height !== this.effectiveRect.height
    ) {
      // Adjust effective area to dispose axes as well
      this.effectiveRect = newEffectiveRect;

      // Define scale and draw axes in accordance with the new effective area
      this.initScale();
      this.removeAxes();
      this.poseAxes();
    }
  }

  /**
   * Initialize {@link legend}
   * @protected
   */
  protected initLegend() {
    this.legend = [];
    if (this.data && this.data.length) {
      this.getNames().forEach((name: string) => {
        // fill the legend. it's used both to display it to a user,
        // and to more easily navigate through data points.
        // currently assign next default color to each data series,
        // in the future we'll probably allow user to customize the style
        this.legend.push({
          name,
          style: { color: ncolor(this.legend.length) }
        });
      });
    }

    if (this.legendElement) {
      this.legendElement.legend = this.legend;
    }
  }

  /**
   * Initialize {@link scaleByName}
   * @protected
   */
  protected initScale() {
    // prepare scaleByBasket to initialize scaleByName
    const scaleByBasket = this.getScaleByBasket();

    // initialize scaleByName
    this.scaleByName = {};
    if (this.data && this.data.length) {
      this.getNames().forEach((name: string) => {
        // get basket based on name and this.scale. TODO possibly simplify it
        let basket: string | null = this.getBasketByName(name);
        if (!basket) {
          if (typeof this.scale === 'number') {
            basket = 'predefined';
            scaleByBasket[basket] ||= this.getBaseScale().domain([0, this.scale]);
          } else if (this.scale instanceof Array) {
            basket = 'predefined';
            scaleByBasket[basket] ||= this.getBaseScale().domain(this.scale);
          } else if (typeof this.scale === 'object') {
            const scaleElement = this.scale[name];
            if (typeof scaleElement === 'number') {
              basket = `${scaleElement}`;
              scaleByBasket[basket] ||= this.getBaseScale().domain([0, scaleElement]);
            } else if (scaleElement instanceof Array) {
              basket = `${scaleElement[0]}-${scaleElement[1]}`;
              scaleByBasket[basket] ||= this.getBaseScale().domain(scaleElement);
            }
          }
        }

        // this should never happen if the logic above is correct and this.scale
        // follows type declaration
        if (!basket) {
          throw new Error('Internal error calculating scale for ' + name);
        }

        // fill the scaleByName
        this.scaleByName[name] = scaleByBasket[basket];
      });
    }
  }

  /**
   * Get all names for the data entries
   * @protected
   */
  protected getNames() {
    // return Object.keys(this.data[0].values);
    return this.data?.map((d) => Object.keys(d.values))
        .reduce((keys, keys1) => {
          for (const key of keys1) {
            if (!keys.includes(key)) {
              keys.push(key);
            }
          }
          return keys;
        }) || [];
  }

  /**
   * Do all post-actions after pose data, currently bind events
   * @protected
   */
  protected postPoseData() {
    // map events via d3
    const thisGraph = this;
    this.selectRoot()
        .selectAll('*')
        // .selectAll('wired-bar')
        .on('mousemove', function (e, d) {
          thisGraph.onMouseMove(this, e, d);
        })
        .on('mouseout', function () {
          thisGraph.onMouseOut();
        })
        .on('click', function (e, d) {
          thisGraph.onClick(this, e, d);
        });
  }

  /**
   * Get default text assigned to a datapoint
   * @param d datapoint
   * @protected
   */
  protected getDataPointText(d: DataPoint) {
    return `${d['data-label'] || d['data-id']}: ${formatNumber(d['data-value'])}`;
  }

  /**
   * Get selected value of a datapoint
   * @param d datapoint
   * @protected
   */
  protected getDataPointSelected(d: DataPoint) {
    return d.selected || null;
  }

  /**
   * Get base scale for all series. It depends on graph's type, size,
   * setting etc.
   * @protected
   */
  protected abstract getBaseScale(): ScaleContinuousNumeric<number, number>;

  /**
   * Get all axes of the graph
   * @protected
   */
  protected getAxes(): AxisDefinition[] {
    return [];
  }

  /**
   * Get actual scales for each basket.
   * @protected
   */
  protected getScaleByBasket(): {
    [p: string]: ScaleContinuousNumeric<number, number>
  } {
    if (!this.data) {
      return {};
    }

    // step #1: define ranges for each basket
    const basketory = this.data.map((entry) => (
        Object.entries(entry.values).map(([name, value]) => {
          const basket = this.getBasketByName(name);
          return [basket, value];
        }).reduce(function (basketory: Basketory, [basket, value]): Basketory {
          if (typeof basket === 'string' && typeof value === 'number') {
            basketory[basket] ||= { range: [0, 0] };
            basketory[basket].range[0] = Math.min(basketory[basket].range[0], value);
            basketory[basket].range[1] = Math.max(basketory[basket].range[1], value);
          }

          return basketory;
        }, {})
    )).reduce(function (b0: Basketory, b1: Basketory): Basketory {
      // merge baskets b1 into b0 and return b0
      for (const [basket, { range }] of Object.entries(b1)) {
        if (basket in b0) {
          b0[basket] = {
            range: [
              Math.min(b0[basket].range[0], range[0]),
              Math.max(b0[basket].range[1], range[1]),
            ]
          }
        } else {
          b0[basket] = { range };
        }
      }
      return b0;
    });

    // step #2: calculate scale (in terms of d3-scale this time) for each basket.
    return Object.fromEntries(Object.entries(basketory).map(([basket, ranges]) =>
        [basket, this.getBaseScale().domain(ranges.range)]
    ));
  }

  /**
   * Make a selection, bind it to datapoints and assign proper attributes
   *
   * todo this is similar for all graphs. move logic here, and make a method
   * which with a single function defining text, style, attr for a data point
   * instead of defining a function for each property
   * @protected
   */
  protected abstract poseData(): void;

  /**
   * Make a selection, bind it to datapoints and return.
   *
   * @example
   * // To bind default datapoints
   * this.selection(this.datapoints)
   *
   * @example
   * // To preprocess-datapoints before binding
   * this.selection(this.datapoints?.map((dp) => {
   *   let x = {};
   *   // fill x with preprocessed dp here...
   *   return x;
   * }))
   *
   * @protected
   */
  protected selectData<T>(data?: T[]) {
    if (!data) {
      return;
    }

    return this.selectRoot()
        .selectAll('*')
        .data(data);
  }

  /**
   * Get basket (scale index) given data series name
   *
   * @param name data series name
   * @return basket name for the data series name, or null
   * if the scale is already set as a number or a range
   * @private
   */
  protected getBasketByName(name: string): string | null {
    if (this.scale === 'auto') {
      return 'auto';
    } else if (typeof this.scale === 'number' || this.scale instanceof Array) {
      return null;
    } else {
      const scale = this.scale[name];
      if (scale === undefined || typeof scale === 'string') {
        return scale || 'auto' === 'auto' ? `$${name}` : scale;
      } else {
        return null;
      }
    }
  }

  /**
   * Add axes to the graph. Each axis is added to one of the sides,
   * and effective size (size of the graph area itself) decreases
   * correspondingly
   * @return {DOMRect} Remained decreased effective rect of the graph
   * @protected
   */
  protected poseAxes(): DOMRect {
    const totalRect = this.getBoundingClientRect();
    const effectiveRect = this.effectiveRect;
    // total transformations for each side
    let tl = 0, tb = totalRect.height, tr = totalRect.width, tt = 0;
    // define existing deltas between this rect and effective rect
    let dl = effectiveRect.left - totalRect.left,
        db = effectiveRect.bottom - totalRect.top,
        dr = effectiveRect.right - totalRect.left,
        dt = effectiveRect.top - totalRect.top;

    const axes = this.getAxes();
    for (let i = 0; i < axes.length; i++){
      const def = axes[i];
      // first, add a g to svg
      const g = svgNode('g');
      g.id = `axis-${i}`;
      g.classList.add('axis', def.alignment);
      this.svg?.append(g);

      // attach the axis to the newly added g
      // @ts-ignore
      select(this.shadowRoot).select<SVGGElement>(`svg g#${g.id}`)
          .call(def.axis);

      // get the size of the resulting element
      const rect = g.getBoundingClientRect();

      // if offset is set, don't put an axis to the side and decease graph size,
      // but put an axis over the graph with the given offset
      if (typeof def.offset == 'number') {
        switch (def.alignment) {
          case "left":
            g.style.transform = `translate(${dl + def.offset}px, ${dt}px)`;
            break;
          case "bottom":
            g.style.transform = `translate(${dl}px, ${db - def.offset}px)`;
            break;
          case "right":
            g.style.transform = `translate(${dr - def.offset}px, ${dt}px)`;
            break;
          case "top":
            g.style.transform = `translate(${dl}px, ${dt + def.offset}px)`;
            break;
        }
      } else {

        // transform the element and increase transformation values
        switch (def.alignment) {
          case "left":
            tl += rect.width;
            g.style.transform = `translate(${tl}px, ${dt}px)`;
            break;
          case "bottom":
            tb -= rect.height;
            g.style.transform = `translate(${dl}px, ${tb}px)`;
            break;
          case "right":
            tr -= rect.width;
            g.style.transform = `translate(${tr}px, ${dt}px)`;
            break;
          case "top":
            tt += rect.height;
            g.style.transform = `translate(${dl}px, ${tt}px)`;
            break;
        }
      }
    }

    // return new effective rect
    return new DOMRect(totalRect.x + tl, totalRect.y + tt, tr - tl, tb - tt);
  }

  /**
   * Remove all axes from the graph
   * @protected
   */
  protected removeAxes() {
    let g;
    while (g = this.svg?.querySelector('.axis')) {
      this.svg?.removeChild(g);
    }
  }

  protected onMouseMove(element: BaseType, event: MouseEvent, dp: unknown) {
    if (this.pointed && !this.pointed[0].containsPoint(event.clientX, event.clientY)) {
      this.pointed[0].hover(false);
      this.pointed = undefined;
    }
    if (!this.pointed && element instanceof WiredShape) {
      this.pointed = [element, dp]
      element.hover(true);
    }
  }

  protected onMouseOut() {
    if (this.pointed) {
      this.pointed[0].hover(false);
      this.pointed = undefined;
    }
  }

  protected onClick(element: BaseType, event: MouseEvent, dp: unknown | DataPoint) {
    // move again to actual point just in case
    this.onMouseMove(element, event, dp);
    if (this.pointed) {
      fire(this, 'selected', {
        id: ( dp as DataPoint )?.['data-id'],
        element: this.pointed[0],
        sourceEvent: event
      });
    }
  }
}