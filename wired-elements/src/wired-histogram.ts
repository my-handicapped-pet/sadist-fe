import { customElement } from 'lit-element';
import { WiredBaseGraph } from './wired-base-graph';
import { ScaleLinear, scaleLinear } from 'd3-scale';

@customElement('wired-histogram')
export class WiredHistogram extends WiredBaseGraph {

  protected getBaseScale(): ScaleLinear<number, number, never> {
    return scaleLinear().range([0, this.getBoundingClientRect().height]);
  }

  protected poseData() {
    // define w and h of a whole histogram
    const rect = this.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // if no data available, just return
    const groupCount = this.data?.length;
    if (!groupCount) {
      return;
    }

    // define w of a group of bars belonging to one data-id
    let groupW = Math.floor(w / groupCount);
    const groupMargin = this.legend.length === 1 ? 0 : Math.ceil(.1 * groupW);

    // define w of a single bar
    let barW = Math.max(Math.floor(( groupW - 2 * groupMargin ) / this.legend.length), 1);
    let barMargin = 0;
    if (barW > .1 * h) {
      // make a bar not wider than .1 of its possible maximum height
      barW = Math.floor(.1 * h);
      groupW = this.legend.length * barW + 2 * groupMargin;
      barMargin = Math.ceil(( w - groupCount * groupW ) / 2);
    }

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
        .style('bottom', '0px')
        .style('height', h)
        .style('left', function (d) {
          // i is the index of data-id in data entries
          const i = thisGraph.data!.findIndex((e) => e.id === d['data-id']);
          // j is the index of data-name in legend
          const j = thisGraph.legend!.findIndex((e) => e.name === d['data-name']);

          return `${groupMargin + i * groupW + barMargin + j * barW}px`;
        })
        .style('width', `${barW}px`);
  }
}

