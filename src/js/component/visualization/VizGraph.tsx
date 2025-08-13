import React, { CSSProperties, Dispatch, useRef, useState } from 'react';
import equal from 'deep-equal';
import VizError from './VizError';
import {
  ColSpecificProps,
  Filter,
  MultiselectFilter,
  RangeFilter,
  VizData,
  VizDataItem,
  VizGraphMeta
} from '../../model/ds';
import { DsInfoAction, DsInfoActionType } from '../../reducer/dsInfo-reducer';
import { select } from '../../helper/json-helper';

type GraphType = 'wired-histogram' |
    'wired-globe';
type GraphComponentType = React.ComponentType<React.ComponentProps<
    GraphType
>> | GraphType;
type GraphRef<K extends keyof JSX.IntrinsicElements = GraphType> =
    JSX.IntrinsicElements[K] extends React.DetailedHTMLProps<React.HTMLAttributes<infer E>, infer E> ? E : never;

interface VizGraphProps {
  style?: CSSProperties;
  meta: VizGraphMeta;
  data: VizData;
  filters?: Filter[];
  dispatchDsInfo?: Dispatch<DsInfoAction>;
}

const VizGraph = (props: VizGraphProps) => {

  const {
    style, meta, data, filters, dispatchDsInfo
  } = props;

  const graphRef = useRef<GraphRef | null>(null);

  const [error, setError] = useState<string | undefined>();

  let filter: Filter | undefined,
      isSelected: (arg0: VizDataItem) => boolean | undefined,
      onSelected: ( (e: CustomEvent) => void ) | undefined;
  filter = filters?.find(f =>
      ( f.type === 'multiselect' || f.type === 'range' )
      && f.col === ( meta.props as ColSpecificProps ).col
      && f.label === ( meta.props as ColSpecificProps ).label);
  if (filter && filter.type === 'multiselect') {
    isSelected = (v: VizDataItem): boolean =>
        !!( filter as MultiselectFilter<any> ).selected.find(i => equal(i, v.id));
    onSelected = (e: CustomEvent): void => {
      e.stopPropagation();
      const id = e.detail.id;
      if (id) {
        if (e.detail.sourceEvent.shiftKey) {
          ( filter as MultiselectFilter<any> ).selected.push(id);
        } else {
          ( filter as MultiselectFilter<any> ).selected = [id];
        }
        dispatchDsInfo?.({
          type: DsInfoActionType.APPLY_FILTER,
        });
      }
    }
  }

  if (filter && filter.type === 'range') {
    isSelected = (v) => {
      const range = v.id.range;
      return range && range[0] != undefined && range[1] != undefined &&
          typeof range[0] == 'number' && typeof range[1] == 'number' &&
          !( filter as RangeFilter ).all &&
          !( filter as RangeFilter ).uncategorized &&
          !( filter as RangeFilter ).outliers &&
          ( filter as RangeFilter ).range_min <= range[0] &&
          range[1] <= ( filter as RangeFilter ).range_max;
    };
    onSelected = (e: CustomEvent): void => {
      e.stopPropagation();
      const id = e.detail.id;
      const range = id.range;
      if (range && range[0] != undefined && range[1] != undefined &&
          typeof range[0] == 'number' && typeof range[1] == 'number') {
        if (e.detail.sourceEvent.shiftKey) {
          ( filter as RangeFilter ).range_min = Math.min(( filter as RangeFilter ).range_min, range[0]);
          ( filter as RangeFilter ).range_max = Math.max(( filter as RangeFilter ).range_max, range[1]);
        } else {
          ( filter as RangeFilter ).range_min = range[0];
          ( filter as RangeFilter ).range_max = range[1];
        }
        ( filter as RangeFilter ).all = false;
        ( filter as RangeFilter ).uncategorized = false;
        ( filter as RangeFilter ).outliers = false;
        dispatchDsInfo?.({
          type: DsInfoActionType.APPLY_FILTER,
        });
      }
    }
  }

  // map graph type to the actual graph element
  const Graph: GraphComponentType = `wired-${meta.type}`;

  // bind data to the graph
  React.useEffect(() => {
    if (graphRef.current) {
      try {
        graphRef.current.data = data.map((d) => {
          // remember and remove id. all other entries go to values
          const id = d.id;
          const label = select(meta.labelselector, d) || d.id;
          const selected = isSelected(d);
          const values: { [p: string]: number } = Object
              .fromEntries(
                  Object.entries(d)
                      .filter(([k, v]) => k !== 'id' && typeof v === 'number')
              ) as { [p: string]: number };

          return {
            id,
            values,
            label,
            selected,
          };
        });
      } catch (e: any) {
        console.error(e);
        setError(e.toString());
      }
    }
  });

  return <>
    {error && <VizError meta={meta} message={error}/>}
    {/*// @ts-ignore require union instead of intersection here, why???*/}
    <Graph ref={graphRef} style={style} onselected={onSelected}
           onupdate={() => {
             setError(undefined);
           }}
           onerror={(err) => {
             // to be able to see stacktrace...
             console.error(err.detail);
             setError(err.detail.toString());
           }}
    />
  </>;
}

export default VizGraph;
