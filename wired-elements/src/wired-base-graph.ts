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
import { fire, formatNumber, ncolor } from './wired-lib';
import { WiredBase } from './wired-base';
import { WiredShape } from './wired-shape';
import { WiredLegend } from './wired-legend';

type Scale = 'auto' | number | [number, number];

/**
 * Entry of the data. Each entry has the same group id (i.e.
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

  updated(changed?: PropertyValues) {
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
   * Do all preparations needed before pose data.
   * This includes
   *  - initialize scales
   *  - initialize legend
   *  - draw axes
   *  - ........
   * @protected
   */
  protected prePoseData() {
    // prepare scaleByBasket to initialize scaleByName
    const scaleByBasket = this.getScaleByBasket();

    // initialize legend and scaleByName (we imply that all data entries have
    // the same values keys)
    this.legend = [];
    this.scaleByName = {};
    if (this.data && this.data.length) {
      Object.keys(this.data[0].values).forEach((name: string) => {
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

        // fill the legend. it's used both to display it to a user,
        // and to more easily navigate through data points.
        // currently assign next default color to each data series,
        // in the future we'll probably allow user to customize the style
        this.legend.push({
          name,
          style: { color: ncolor(this.legend.length) }
        });

        // fill the scaleByName
        this.scaleByName[name] = scaleByBasket[basket];
      });

      if (this.legendElement) {
        this.legendElement.legend = this.legend;
      }
    }
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
      return Object.fromEntries(Object.entries(b0).map(([basket, { range }]) =>
          [basket, { range: [Math.min(range[0], b1[basket].range[0]), Math.max(range[1], b1[basket].range[1])] }]
      ));
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

  /**
   * Get basket (scale index) given data series name
   *
   * @param name data series name
   * @return basket name for the data series name, or null
   * if the scale is already set as a number or a range
   * @private
   */
  private getBasketByName(name: string): string | null {
    if (this.scale === 'auto') {
      return 'auto';
    } else if (typeof this.scale === 'number' || this.scale instanceof Array) {
      return null;
    } else {
      const scale = this.scale[name];
      if (typeof scale === 'string') {
        return scale || 'auto' === 'auto' ? `$${name}` : scale;
      } else {
        return null;
      }
    }
  }
}