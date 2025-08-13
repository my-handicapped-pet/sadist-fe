import { css, customElement, property, PropertyValues } from 'lit-element';
import {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry
} from 'geojson';
import { scaleSqrt } from 'd3-scale';
import { debugLog, line, svgNode } from './wired-lib';
import { DataPoint, WiredBaseGraph } from './wired-base-graph';

type SvgClassName =
    'net' |
    'coastline';

@customElement('wired-globe')
export class WiredGlobe extends WiredBaseGraph {
  proportion = 1;

  /**
   * Url of geojson data
   */
  @property({ type: String }) ['geojson']: string = '/static/map.geojson';

  /**
   * Spherical coordinates of the eye point, in degrees
   */
  @property({ type: Object }) eye = [0, 30];

  /**
   * Radius of the Earth, in pixels
   */
  @property({ type: Number }) r: number = 0;

  /**
   * Radius of the data points (maximum)
   */
  @property({ type: Number }) ['data-point-r']: number = 100;

  protected coastline?: Array<Feature<Geometry, GeoJsonProperties>>;
  protected svgByClass: { [c in SvgClassName]: SVGElement[]; } = {
    'net': [],
    'coastline': [],
  };
  private grabpoint?: [number, number];
  protected xc: number = 0;
  protected yc: number = 0;

  static get styles() {
    return css`
      ${super.styles}
      :host {
        cursor: grab;
      }

      .net {
        stroke: #808080;
      }

      .coastline {
        stroke: #292929;
        stroke-width: 3;
        fill: #80d080;
      }

      .coastline.hole {
        fill: #fff;
      }
    `;
  }

  protected firstUpdated(changed: PropertyValues) {
    super.firstUpdated(changed);
    fetch(this['geojson'])
        .then(result => result.json())
        .then(value => {
          this.coastline = ( value as FeatureCollection ).features;
          this.requestUpdate();
        });

    // mouse events on globe. they are distinct from the events on data points.
    this.addEventListener('mousedown', this.onMouseDownOnGraph);
    this.addEventListener('mouseup', this.onMouseUpOnGraph);
    this.addEventListener('mousemove', this.onMouseMoveOnGraph);
    this.addEventListener('wheel', this.onWheelOnGraph);
  }

  protected updated(changedProperties?: PropertyValues) {
    const lastSize = [...this.lastSize];

    super.updated(changedProperties);

    const rect = this.getBoundingClientRect();
    if (!( lastSize[0] === rect.width && lastSize[1] === rect.height )) {
      this.xc = rect.width / 2;
      this.yc = rect.height / 2;
      if (this.r === 0) {
        this.r = Math.min(rect.width, rect.height) / 2;
      }
    }

    // draw coordinates net
    let t = Date.now();
    this.removeWiredShapesByClass('net');
    for (let lat = 80; lat > -90; lat -= 20) {
      let step = 10;
      for (let lng = -180; lng < 180; lng += step) {
        this.line(lng, lat, lng + step, lat, 'net');
      }
    }
    for (let lng = -180; lng < 180; lng += 20) {
      let step = 10;
      for (let lat = 90; lat > -90; lat -= step) {
        this.line(lng, lat, lng, lat + step, 'net');
      }
    }
    debugLog(`net: ${Date.now() - t}`);

    // draw coastline
    t = Date.now();
    this.removeWiredShapesByClass('coastline');
    if (this.coastline) {
      for (const feature of this.coastline) {
        this._feature(feature, 'coastline');
      }
    }
    debugLog(`coastline: ${Date.now() - t}`);

    // if eye or r changed, we need to re-pose data
    if (changedProperties?.has('r') || changedProperties?.has('eye')) {
      this.poseData();
    }
  }

  get datapoints() {
    return super.datapoints?.filter(this.isGeoDataPoint);
  }

  protected getBaseScale() {
    // let use marker as a point, so scale will be quadratic.
    // further we can use other such as color, etc.
    return scaleSqrt([0, this['data-point-r']]);
  }

  protected removeWiredShapesByClass(className: SvgClassName): void {
    let svg;
    while (svg = this.svgByClass[className].pop()) {
      if (svg.parentNode == this.svg) {
        this.svg?.removeChild(svg);
      }
    }
  }

  protected xyz([lng, lat]: [number, number]): [number, number, number] {
    // transform coordinates on sphere (longitude, latitude), in degrees,
    // to normal coordinates (x, y, z)
    const c = Math.PI / 180;
    const r = this.r;
    const [phi0, theta0] = [this.eye[0] * c, this.eye[1] * c];
    const [phi, theta] = [lng * c + phi0, lat * c];
    return [
      this.xc + r * Math.cos(theta) * Math.cos(phi),
      this.yc - r * ( Math.sin(theta0) * Math.cos(theta) * Math.sin(phi) + Math.cos(theta0) * Math.sin(theta) ),
      -r * ( Math.cos(theta0) * Math.cos(theta) * Math.sin(phi) - Math.sin(theta0) * Math.sin(theta) ),
    ];
  }

  private _feature(feature: Feature, className?: SvgClassName): SVGElement[] {
    let result: SVGElement[] = [];
    switch (feature.geometry.type) {
      case 'LineString':
        result = this._linestring(feature.geometry.coordinates, className);
        break;
      case 'MultiLineString':
        for (let ls of feature.geometry.coordinates) {
          result = result.concat(this._linestring(ls, className));
        }
        break;
      case 'Polygon':
        result = this._polygon(feature.geometry.coordinates, className);
        break;
      case 'MultiPolygon':
        for (let pp of feature.geometry.coordinates) {
          result = result.concat(this._polygon(pp, className));
        }
        break;
    }
    return result;
  }

  private _linestring(coordinates: number[][], className?: SvgClassName): SVGElement[] {
    const result = [];
    for (let i = 1; i < coordinates.length; i++) {
      let p0 = coordinates[i - 1];
      let p1 = coordinates[i];
      let svg = this.line(p0[0], p0[1], p1[0], p1[1], className);
      if (svg) {
        result.push(svg);
      }
    }
    return result;
  }

  private _polygon(coordinates: number[][][], className?: SvgClassName): SVGElement[] {

    const result = [];

    // main polygon
    const p1 = coordinates[0];
    const result1 = this.polygon(p1, className);
    for (let svg of result1) {
      result.push(svg);
    }

    // holes
    for (let p of coordinates.slice(1)) {
      let result2 = this.polygon(p, className);
      for (let svg of result2) {
        svg.classList.add('hole');
        result.push(svg);
      }
    }

    return result;
  }

  private _withClass(svg: SVGElement, className?: SvgClassName): SVGElement {
    if (className) {
      svg.classList.add(className);
      this.svgByClass[className].push(svg);
    }
    return svg;
  }

  protected line(lng1: number, lat1: number, lng2: number, lat2: number, className?: SvgClassName): SVGElement | undefined {
    // for simplicity, draw line if at list one point is on the visible side
    let svg;
    const [x1, y1, z1] = this.xyz([lng1, lat1]);
    const [x2, y2, z2] = this.xyz([lng2, lat2]);
    if (z1 >= 0 || z2 >= 0) {
      svg = line(this.svg!, x1, y1, x2, y2);
      return this._withClass(svg, className);
    }
    return undefined;
  }

  protected polygon(coordinates: number[][], className?: SvgClassName): SVGElement[] {
    if (!coordinates.length) {
      return [];
    }

    let shapes: number[][][] = [];
    let shape: number[][] = [];
    let xyzcoordinates = coordinates.map(([lng, lat]) => this.xyz([lng, lat]));
    const append = () => {
      if (shape.length > 0) {
        shapes.push(shape);
      }
      shape = [];
    }
    for (const [x, y, z] of xyzcoordinates.concat([xyzcoordinates[0]])) {
      if (z >= 0) {
        shape.push([x, y]);
      } else {
        append();
      }
    }
    append();
    if (shapes.length > 1) {
      const shape1 = shapes[shapes.length - 1];
      const shape2 = shapes[0];
      const [x1, y1] = shape1[shape1.length - 1];
      const [x2, y2] = shape2[0];
      if (x1 == x2 && y1 == y2) {
        shape1.pop();
        shapes.pop();
        shapes[0] = shape1.concat(shape2);
      }
    }

    const multiShapes: number[][][][] = [];
    if (shapes.length === 1) {
      multiShapes.push([shapes[0]]);
    } else if (shapes.length > 1) {
      let skyline: { i: number; ii: number[]; angle: number; onward: boolean; }[] = [];
      for (let i = 0; i < shapes.length; i++) {
        const shape1 = shapes[i];
        skyline.push({
          i,
          ii: [],
          angle: this.toPolar(shape1[0][0], shape1[0][1]),
          onward: true
        });
        skyline.push({
          i,
          ii: [],
          angle: this.toPolar(shape1[shape1.length - 1][0], shape1[shape1.length - 1][1]),
          onward: false
        });
      }
      skyline.sort((a, b) => a.angle - b.angle);
      const getAngleBetween = (a1: number, a2: number): number => {
        // implying a2 >= a1
        const a = a2 - a1;
        return a < Math.PI ? a : 2 * Math.PI - a;
      }
      let start = 0,
          gap = getAngleBetween(skyline[0].angle, skyline[skyline.length - 1].angle);
      for (let i = 1; i < skyline.length; i++) {
        let gap1 = getAngleBetween(skyline[i - 1].angle, skyline[i].angle);
        if (gap1 > gap) {
          start = i;
          gap = gap1;
        }
      }
      if (start) {
        skyline = skyline.slice(start).concat(skyline.slice(0, start));
      }

      // rectifier
      const stack0: { i: number; ii: number[]; angle: number; onward: boolean; }[] = [];
      for (let i = 0; i < skyline.length; i++) {
        const p = skyline[i];
        if (!stack0.find(p1 => p.i === p1.i)) {
          stack0.push(p);
        } else {
          const p0 = stack0.pop()!;
          if (p0.i !== p.i) {
            const j = skyline.findIndex((p1, i1) => i1 > i && p1.i === p0.i);
            console.assert(j !== -1);
            skyline[i] = skyline[j];
            skyline[j] = p;
          }
        }
      }

      const stack: { i: number; ii: number[]; angle: number; onward: boolean; }[] = [];
      for (let i = 0; i < skyline.length; i++) {
        const p = skyline[i];
        if (!stack.find(p1 => p.i === p1.i)) {
          stack.push(p);
        } else {
          const p0 = stack.pop()!;
          console.assert(p0.i === p.i);
          if (stack.length % 2 === 0) {
            multiShapes.push([shapes[p0.i]].concat(p0.ii.map(i1 => shapes[i1])));
          } else {
            stack[stack.length - 1].ii = stack[stack.length - 1].onward ?
                [p0.i, ...stack[stack.length - 1].ii] : [...stack[stack.length - 1].ii, p0.i];
          }
        }
      }
    }

    const result: SVGElement[] = [];
    for (let i = 0; i < multiShapes.length; i++) {
      const multiShape = multiShapes[i];
      let path: string = '';
      for (let j = 0; j < multiShape.length; j++) {
        let shape = multiShape[j];
        let x: number;
        let y: number;
        for (let k = 0; k < shape.length; k++) {
          [x, y] = shape[k];
          if (j === 0 && k === 0) {
            path = `M ${x} ${y}`;
          } else {
            path += `L ${x} ${y}`;
          }
        }
        const x1 = x!, y1 = y!;
        const [x2, y2] = multiShape[( j + 1 ) % multiShape.length][0];
        if (!( x1 == x2 && y1 == y2 )) {
          const phi1 = this.toPolar(x1, y1), phi2 = this.toPolar(x2, y2);
          const isclokwise = ( phi2 - phi1 + 2 * Math.PI ) % ( 2 * Math.PI ) < Math.PI ? 0 : 1;
          path += `A ${this.r} ${this.r} 0 0 ${isclokwise} ${x2} ${y2}`;
        }
      }

      const svg = svgNode('path', { d: path });
      this.svg?.append(svg);
      result.push(this._withClass(svg, className));
    }

    return result;
  }

  protected toPolar(x: number, y: number): number {
    return Math.atan2(this.yc - y, x - this.xc);
  }

  protected isGeoDataPoint(dp: DataPoint): boolean {
    // TODO consider other types of geo data points, e.g. rectangles
    const id = dp['data-id'];
    return id && typeof id.loc == 'object'
        && id.loc.type == 'Point'
        && id.loc.coordinates
        && typeof id.loc.coordinates[0] == 'number'
        && typeof id.loc.coordinates[1] == 'number';
  }

  get nonGeoDatapoints(): DataPoint[] | undefined {
    return super.datapoints?.filter((dp: DataPoint) => !this.isGeoDataPoint(dp));
  }

  protected poseData(): void {
    const rect = this.getBoundingClientRect();

    // extend selection data to include x, y, z, r
    this.selectData(this.datapoints?.map((d) => {
      const id = d['data-id'];
      const [x, y, z] = this.xyz([id.loc.coordinates[0], id.loc.coordinates[1]]);
      const r = Math.floor(Math.max(10, d.scale(d['data-value'])));
      return { ...d, x, y, z, r };
    }))?.join('wired-marker')
        .text(this.getDataPointText)
        .attr('selected', this.getDataPointSelected)
        .style('--color', (d) => {
          return this.legend
              .find((l) => l.name === d['data-name'])?.style?.color ?? 'black';
        })
        .style('position', 'absolute')
        .style('display', function (d) {
          const { x, y, z } = d;
          return 0 <= z && 0 <= x && x <= rect.width && 0 <= y && y <= rect.height ? 'block' : 'none';
        })
        .style('left', function (d) {
          const { x, r } = d;
          return `${x - r}px`;
        })
        .style('top', function (d) {
          const { y, r } = d;
          return `${y - r}px`;
        })
        .style('width', function (d) {
          const { r } = d;
          return `${2 * r}px`;
        })
        .style('height', function (d) {
          const { r } = d;
          return `${2 * r}px`;
        });
  }

  protected onMouseDownOnGraph(event: MouseEvent) {
    if (event.button === 0) {
      this.style.cursor = 'grabbing';
      this.grabpoint = [event.clientX, event.clientY];
    }
  }

  protected onMouseUpOnGraph(event: MouseEvent) {
    if (event.button === 0) {
      this.style.cursor = 'grab';
      this.grabpoint = undefined;
    }
  }

  protected onMouseMoveOnGraph(event: MouseEvent) {
    if (this.grabpoint) {
      const oldValue = [...this.eye];
      const x = event.clientX;
      const y = event.clientY;
      const dx = x - this.grabpoint[0];
      const dy = y - this.grabpoint[1];
      const rect = this.getBoundingClientRect();
      const c = 180 / Math.PI;
      const tilt = this.eye[1] / c + Math.atan2(this.yc - ( y - rect.y ), this.r);
      const dphi = 2 * Math.atan2(dx / 2, this.r * Math.cos(tilt)) * c;
      const dtheta = 2 * Math.atan2(dy / 2, this.r) * c;

      this.eye[0] += dphi;
      this.eye[1] += dtheta;
      if (this.eye[0] !== oldValue[0] || this.eye[1] !== oldValue[1]) {
        this.requestUpdate('eye', oldValue);
      }

      this.grabpoint = [x, y];
    }
  }

  protected onWheelOnGraph(event: WheelEvent) {
    const R_MIN = 10;
    const R_MAX = 10000;

    if (event.deltaY) {
      const rect = this.getBoundingClientRect();
      let c = ( rect.height - event.deltaY ) / rect.height;
      if (c > 2) c = 2;
      if (c < .5) c = .5;
      let r = this.r * c;
      if (r < R_MIN) r = R_MIN;
      if (r > R_MAX) r = R_MAX;
      this.r = r;
    }
  }
}