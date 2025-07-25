import { customElement } from 'lit-element';
import { scaleBand, ScaleLinear, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { AxisDefinition, WiredBaseGraph } from './wired-base-graph';

/**
 * Size of a single element of a histogram
 */
interface BarSize {
  count: number;
  w: number;
  h: number;
  margin: number;
}

/**
 * Size of a histogram and each element of the histogram
 */
interface HistogramSize extends BarSize {
  margin: number;
  group: BarSize;
  bar: BarSize;
}

@customElement('wired-histogram')
export class WiredHistogram extends WiredBaseGraph {

  protected size: HistogramSize = {
    count: 1,
    w: 0,
    h: 0,
    margin: 0,
    group: { count: 0, w: 0, h: 0, margin: 0 },
    bar: { count: 0, w: 0, h: 0, margin: 0 },
  };

  protected getBaseScale(): ScaleLinear<number, number, never> {
    return scaleLinear([0, this.effectiveRect.height]);
  }

  protected getAxes(): AxisDefinition[] {
    const { h, margin, group } = this.size;
    const axes: AxisDefinition[] = [];

    // define categorical axis on the bottom
    const catScale = scaleBand()
        .domain(this.data!.map((e) => e.label || `${e.id}`).map((label) => {
          // cut long text, in order not to use BBox or measureText,
          // just assume the rate 16px ~= 3 symbols
          const rate = 3 / 16;
          if (label.length / group.w > rate) {
            label = label.substring(0, Math.floor(rate * label.length)).trim() + '…';
          }
          return label;
        }))
        .range([margin, margin + group.count * group.w]);
    axes.push({
      axis: axisBottom(catScale).tickSize(0),
      alignment: 'bottom',
    });

    // define numeric axis on the left for each unique scale
    new Set(Object.values(this.scaleByName)).forEach((numScale) => {
      axes.push({
        axis: axisLeft(
          // replace range to make the axis bottom-to-top
          scaleLinear([h, 0]).domain(numScale.domain())
        ),
        alignment: 'left',
        offset: margin > 0 ? margin : undefined,
      });
    });

    return axes;
  }

  protected initScale() {
    // scales and axes depends on size
    this.initSize();

    // do normal algorithm of scales initialization
    super.initScale();
  }

  protected poseData() {
    const { h, margin, bar, group } = this.size;
    const totalRect = this.getBoundingClientRect();
    const effectiveRect = this.effectiveRect;
    const bottom = totalRect.bottom - effectiveRect.bottom;
    const left = effectiveRect.left - totalRect.left;

    const thisGraph = this;
    this.selectData(this.datapoints)?.join('wired-bar')
        .text(this.getDataPointText)
        .attr('selected', this.getDataPointSelected)
        .attr('direction', '↑')
        .attr('value', function (d) {
          const barH = d.scale(d['data-value']);
          return barH;
        })
        .style('--color', function (d) {
            return thisGraph.legend
                .find((l) => l.name === d['data-name'])?.style?.color
                ?? 'black';
        })
        .style('position', 'absolute')
        .style('bottom', `${bottom}px`)
        .style('height', `${h}px`)
        .style('left', function (d) {
          // i is the index of data-id in data entries
          const i = thisGraph.data!.findIndex((e) => e.id === d['data-id']);
          // j is the index of data-name in legend
          const j = thisGraph.legend!.findIndex((e) => e.name === d['data-name']);

          return `${left + margin + group.margin + i * group.w + j * bar.w}px`;
        })
        .style('width', `${bar.w}px`);
  }

  /**
   * Initialize {@link size}
   * @protected
   */
  protected initSize() {
    // define w and h of a whole histogram
    this.size.w = this.effectiveRect.width;
    this.size.h = this.effectiveRect.height;
    this.size.margin = 0;

    // if no data available, just return
    this.size.group.count = this.data?.length ?? 0;
    if (!this.size.group.count) {
      return;
    }

    // define w of a group of bars belonging to one data-id
    this.size.group.w = Math.floor(this.size.w / this.size.group.count);
    this.size.group.margin = this.legend.length === 1 ? 0 : Math.ceil(.1 * this.size.group.w);

    // define w of a single bar
    this.size.bar.count = this.legend.length;
    this.size.bar.w = Math.max(Math.floor(( this.size.group.w - 2 * this.size.group.margin ) / this.size.bar.count), 1);
    if (this.size.bar.w > .1 * this.size.h) {
      // make a bar not wider than .1 of its possible maximum height
      this.size.bar.w = Math.floor(.1 * this.size.h);
      this.size.group.w = this.size.bar.count * this.size.bar.w + 2 * this.size.group.margin;
      this.size.margin += Math.ceil(( this.size.w - this.size.group.count * this.size.group.w ) / 2);
    }
  }
}

